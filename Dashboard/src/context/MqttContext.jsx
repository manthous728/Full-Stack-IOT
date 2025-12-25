import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import mqtt from "mqtt";
import { MQTT_CONFIG, API_BASE_URL } from "../config";

const MqttContext = createContext();

const DEFAULT_SETTINGS = MQTT_CONFIG;

export function MqttProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionTime, setConnectionTime] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const MAX_RECONNECT_ATTEMPTS = 10; // Maximum number of reconnection attempts
  const RECONNECT_INTERVAL_BASE = 1000; // Base delay in ms (will be multiplied by attempt number)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("mqttSettings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [sensorData, setSensorData] = useState(() => ({
    dht22: { temp: [], hum: [], time: [] },
    mq2: { lpg: [], co: [], smoke: [], time: [] },
    pzem004t: { voltage: [], power: [], current: [], energy: [], pf: [], time: [] },
    bh1750: { lux: [], time: [] },
  }));

  const [relayStates, setRelayStates] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  // Fetch initial relay states from database on mount
  useEffect(() => {
    const fetchRelayStates = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/relays`);
        if (res.ok) {
          const data = await res.json();
          const states = {};
          data.forEach((relay) => {
            states[relay.id] = relay.is_active;
          });
          setRelayStates((prev) => ({ ...prev, ...states }));
        }
      } catch (err) {
        console.error("Failed to fetch initial relay states:", err);
      }
    };
    fetchRelayStates();
  }, []);

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("history");
    return saved ? JSON.parse(saved) : [];
  });

  // Notifications for threshold alerts
  const [notifications, setNotifications] = useState([]);
  const lastAlertRef = useRef({});
  const ALERT_COOLDOWN = 60000; // 1 minute cooldown between same alerts

  const clientRef = useRef(null);
  const isConnectedRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const lastUpdateRef = useRef({
    dht22: 0,
    mq2: 0,
    pzem004t: 0,
    bh1750: 0,
  });

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    isReconnectingRef.current = isReconnecting;
  }, [isReconnecting]);

  const addHistoryEntry = useCallback(
    (event, status, statusClass = "text-green-600") => {
      const now = new Date();
      const entry = {
        time: now.toLocaleString("id-ID"),
        event,
        status,
        statusClass,
      };
      setHistory((prev) => {
        // Hindari duplikasi langsung berurutan dengan event & status yang sama
        const last = prev[0];
        if (
          last &&
          last.event === entry.event &&
          last.status === entry.status &&
          (last.statusClass || "") === (entry.statusClass || "")
        ) {
          return prev;
        }

        const updated = [entry, ...prev].slice(0, 100);
        localStorage.setItem("history", JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem("history");
  }, []);

  // Add notification with auto-dismiss
  const addNotification = useCallback((message, type = 'warning', sensor = '') => {
    // Redundant switch for safety
    if (!settings.enableThresholds) return;

    const id = Date.now();
    const alertKey = `${sensor}-${message}`;
    const now = Date.now();

    // Check cooldown to prevent spam
    if (lastAlertRef.current[alertKey] && now - lastAlertRef.current[alertKey] < ALERT_COOLDOWN) {
      return;
    }
    lastAlertRef.current[alertKey] = now;

    setNotifications(prev => [
      { id, message, type, sensor, time: new Date().toLocaleTimeString('id-ID') },
      ...prev.slice(0, 4) // Keep max 5 notifications
    ]);

    // Auto dismiss after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 10000);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Check thresholds and trigger notifications
  const sendTelegramAlert = useCallback(async (message) => {
    // Check if thresholds are globally enabled AND telegram is specifically enabled
    if (!settings.enableThresholds || !settings.telegramConfig?.enabled) return;

    try {
      await fetch(`${API_BASE_URL}/notify/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
    } catch (err) {
      console.error("Failed to send telegram alert:", err);
    }
  }, [settings.telegramConfig]);

  const checkThresholds = useCallback((sensor, data) => {
    // Ensure we respect the global enable switch
    if (!settings.enableThresholds) return;

    const thresholds = settings.thresholds?.[sensor];
    if (!thresholds) return;

    const checkAndNotify = (val, limit, type, label, unit) => {
      if (val === undefined || val === null || limit === undefined || limit === null || limit === "") return;

      const numVal = parseFloat(val);
      const numLimit = parseFloat(limit);
      if (isNaN(numVal) || isNaN(numLimit)) return;

      let triggered = false;
      let msg = "";

      if (type === 'max' && numVal > numLimit) {
        triggered = true;
        msg = `⚠️ *PERINGATAN ${sensor.toUpperCase()}*\n${label} tinggi: *${numVal}${unit}* (Batas: ${numLimit}${unit})`;
      } else if (type === 'min' && numVal < numLimit) {
        triggered = true;
        msg = `⚠️ *PERINGATAN ${sensor.toUpperCase()}*\n${label} rendah: *${numVal}${unit}* (Batas: ${numLimit}${unit})`;
      }

      if (triggered) {
        const alertKey = `${sensor}-${label}-${type}`;
        const now = Date.now();

        // Local notification
        if (label.includes("Bahaya") || label.includes("tinggi") || label.includes("rendah")) {
          addNotification(msg.replace(/\*/g, ''), 'danger', sensor.toUpperCase());
        } else {
          addNotification(msg.replace(/\*/g, ''), 'warning', sensor.toUpperCase());
        }

        // Telegram Alert (with cooldown)
        if (!lastAlertRef.current[alertKey] || now - lastAlertRef.current[alertKey] > ALERT_COOLDOWN) {
          sendTelegramAlert(msg);
          lastAlertRef.current[alertKey] = now;
          addHistoryEntry(`${sensor.toUpperCase()}: ${label} ${type === 'max' ? '>' : '<'} ${numLimit}`, 'Alert', 'text-red-600');
        }
      }
    };

    switch (sensor) {
      case 'dht22': {
        const { temp, hum } = data;
        checkAndNotify(temp, thresholds.tempMax, 'max', 'Suhu', '°C');
        checkAndNotify(temp, thresholds.tempMin, 'min', 'Suhu', '°C');
        checkAndNotify(hum, thresholds.humMax, 'max', 'Kelembaban', '%');
        checkAndNotify(hum, thresholds.humMin, 'min', 'Kelembaban', '%');
        break;
      }
      case 'mq2': {
        const { lpg, co, smoke } = data;
        // Smoke
        checkAndNotify(smoke, thresholds.smokeMax, 'max', 'Asap (Bahaya)', ' ppm');
        checkAndNotify(smoke, thresholds.smokeWarn, 'max', 'Asap (Waspada)', ' ppm');
        // LPG
        checkAndNotify(lpg, thresholds.lpgMax, 'max', 'LPG (Bahaya)', ' ppm');
        checkAndNotify(lpg, thresholds.lpgWarn, 'max', 'LPG (Waspada)', ' ppm');
        // CO
        checkAndNotify(co, thresholds.coMax, 'max', 'CO (Bahaya)', ' ppm');
        checkAndNotify(co, thresholds.coWarn, 'max', 'CO (Waspada)', ' ppm');
        break;
      }
      case 'pzem004t': {
        const { voltage, power, current, energy, pf } = data;
        checkAndNotify(power, thresholds.powerMax, 'max', 'Daya', 'W');
        checkAndNotify(voltage, thresholds.voltageMax, 'max', 'Tegangan', 'V');
        checkAndNotify(voltage, thresholds.voltageMin, 'min', 'Tegangan', 'V');
        checkAndNotify(current, thresholds.currentMax, 'max', 'Arus', 'A');
        checkAndNotify(energy, thresholds.energyMax, 'max', 'Energi', 'kWh');
        checkAndNotify(pf, thresholds.pfMin, 'min', 'Power Factor', '');
        break;
      }
      case 'bh1750': {
        const { lux } = data;
        checkAndNotify(lux, thresholds.luxMax, 'max', 'Cahaya', ' lux');
        checkAndNotify(lux, thresholds.luxMin, 'min', 'Cahaya', ' lux');
        break;
      }
    }
  }, [settings, addNotification, addHistoryEntry, sendTelegramAlert]);

  const setupNewConnection = useCallback((isManualReconnect = false) => {
    if (isManualReconnect) {
      setReconnectAttempts(0);
      setIsReconnecting(true);
      addHistoryEntry("Initiating manual reconnect...", "Connecting", "text-yellow-600");
    }

    const protocol = settings.useSSL ? "wss" : "ws";
    const url = `${protocol}://${settings.host}:${settings.port}/mqtt`;
    const clientId = "WebDashboardClient_" + Math.random().toString(16).slice(2, 10);

    const client = mqtt.connect(url, {
      clientId,
      keepalive: 30, // Reduced from 60 to detect disconnections faster
      reconnectPeriod: 0, // We'll handle reconnection manually
      connectTimeout: 10 * 1000, // 10 seconds connection timeout
      clean: true,
      reschedulePings: true,
      rejectUnauthorized: false, // For self-signed certificates
    });

    clientRef.current = client;

    client.on("connect", () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionTime(Date.now());

      if (reconnectAttempts > 0) {
        addHistoryEntry("MQTT Reconnected", "Online", "text-green-600");
      } else {
        addHistoryEntry("MQTT Connected", "Online", "text-green-600");
      }

      setReconnectAttempts(0);

      Object.values(settings.topics).forEach((topic) => {
        if (!topic.endsWith("/")) {
          client.subscribe(topic);
        }
      });

      for (let i = 1; i <= 4; i++) {
        client.subscribe(`${settings.topics.relay_status_base}${i}`);
      }
    });

    client.on("close", () => {
      if (isConnectedRef.current) {
        setIsConnected(false);
        setConnectionTime(null);
        addHistoryEntry("MQTT Connection Closed", "Offline", "text-red-600");
      }

      // Jangan reconnect jika sudah melebihi batas percobaan
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        addHistoryEntry(
          `Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Please check your connection and try again.`,
          "Connection Failed",
          "text-red-600"
        );
        return;
      }

      // Jadwalkan reconnect dengan exponential backoff
      const delay = Math.min(
        RECONNECT_INTERVAL_BASE * Math.pow(2, reconnectAttempts),
        30000 // Max 30 seconds
      );

      setTimeout(() => {
        if (!isConnectedRef.current && !isReconnectingRef.current) {
          setIsReconnecting(true);
          setReconnectAttempts((prev) => {
            const newAttempt = prev + 1;
            addHistoryEntry(
              "Attempting to reconnect...",
              "Reconnecting",
              "text-yellow-600"
            );
            return newAttempt;
          });
          connect();
        }
      }, delay);
    });

    client.on("offline", () => {
      setIsConnected(false);
      addHistoryEntry("MQTT Connection Lost", "Offline", "text-red-600");
    });

    client.on("error", (err) => {
      setIsConnected(false);
      setReconnectAttempts((prev) => prev + 1);
      addHistoryEntry(`MQTT Error: ${err.message}`, "Error", "text-red-600");
      console.error("MQTT connection error:", err);
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString().trim());
        const time = new Date().toLocaleTimeString("id-ID");
        const nowTs = Date.now();
        const intervalMs = (settings.updateInterval || DEFAULT_SETTINGS.updateInterval) * 1000;

        if (topic === settings.topics.dht22) {
          // Validate and parse temperature and humidity from payload { temp, hum }
          const rawTemp = payload.temp ?? payload.temperature;
          const rawHum = payload.hum ?? payload.humidity;

          const temp = parseFloat(rawTemp);
          const hum = parseFloat(rawHum);

          if (!isNaN(temp) && !isNaN(hum)) {
            if (nowTs - lastUpdateRef.current.dht22 < intervalMs) return;
            lastUpdateRef.current.dht22 = nowTs;

            // Check thresholds
            checkThresholds('dht22', { temp, hum });

            setSensorData((prev) => {
              const newTemp = [...prev.dht22.temp, temp];
              const newHum = [...prev.dht22.hum, hum];
              const newTime = [...prev.dht22.time, time];

              // If canvas is full, keep the last 30 points and remove old ones gradually
              if (newTemp.length > (settings.maxDataPoints || DEFAULT_SETTINGS.maxDataPoints)) {
                const keepPoints = 30; // Keep last 30 points for smooth transition
                return {
                  ...prev,
                  dht22: {
                    temp: newTemp.slice(-keepPoints),
                    hum: newHum.slice(-keepPoints),
                    time: newTime.slice(-keepPoints),
                  },
                };
              }

              return {
                ...prev,
                dht22: {
                  temp: newTemp,
                  hum: newHum,
                  time: newTime,
                },
              };
            });
          }
        } else if (topic === settings.topics.mq2) {
          // Validate and parse MQ2 sensor data with fallbacks for different key variations
          const lpg = parseFloat(payload.lpg ?? payload.gas_lpg ?? payload.LPG);
          const co = parseFloat(payload.co ?? payload.gas_co ?? payload.CO);
          const smoke = parseFloat(payload.smoke ?? payload.Smoke);

          if (!isNaN(lpg) && !isNaN(co) && !isNaN(smoke)) {
            if (nowTs - lastUpdateRef.current.mq2 < intervalMs) return;
            lastUpdateRef.current.mq2 = nowTs;

            // Check thresholds
            checkThresholds('mq2', { lpg, co, smoke });

            setSensorData((prev) => {
              const newLpg = [...prev.mq2.lpg, lpg];
              const newCo = [...prev.mq2.co, co];
              const newSmoke = [...prev.mq2.smoke, smoke];
              const newTime = [...prev.mq2.time, time];

              // If canvas is full, keep the last 30 points and remove old ones gradually
              if (newLpg.length > (settings.maxDataPoints || DEFAULT_SETTINGS.maxDataPoints)) {
                const keepPoints = 30; // Keep last 30 points for smooth transition
                return {
                  ...prev,
                  mq2: {
                    lpg: newLpg.slice(-keepPoints),
                    co: newCo.slice(-keepPoints),
                    smoke: newSmoke.slice(-keepPoints),
                    time: newTime.slice(-keepPoints),
                  },
                };
              }

              return {
                ...prev,
                mq2: {
                  lpg: newLpg,
                  co: newCo,
                  smoke: newSmoke,
                  time: newTime,
                },
              };
            });
          }
        } else if (topic === settings.topics.pzem004t) {
          // Validate and parse PZEM sensor data
          const voltage = parseFloat(payload.voltage);
          const power = parseFloat(payload.power);
          const current = parseFloat(payload.current);
          const energy = payload.energy !== undefined ? parseFloat(payload.energy) : NaN;
          // power factor utama dari "power_factor", fallback ke "pf" jika ada
          const rawPf = payload.power_factor ?? payload.pf;
          const pf = rawPf !== undefined ? parseFloat(rawPf) : NaN;
          if (!isNaN(voltage) && !isNaN(power) && !isNaN(current)) {
            if (nowTs - lastUpdateRef.current.pzem004t < intervalMs) return;
            lastUpdateRef.current.pzem004t = nowTs;

            // Check thresholds
            checkThresholds('pzem004t', { voltage, power, current, energy, pf });

            setSensorData((prev) => {
              const newVoltage = [...prev.pzem004t.voltage, voltage];
              const newPower = [...prev.pzem004t.power, power];
              const newCurrent = [...prev.pzem004t.current, current];
              const newEnergy = !isNaN(energy) ? [...(prev.pzem004t.energy || []), energy] : (prev.pzem004t.energy || []);
              const newPf = !isNaN(pf) ? [...(prev.pzem004t.pf || []), pf] : (prev.pzem004t.pf || []);
              const newTime = [...prev.pzem004t.time, time];

              // If canvas is full, keep the last 30 points and remove old ones gradually
              if (newVoltage.length > (settings.maxDataPoints || DEFAULT_SETTINGS.maxDataPoints)) {
                const keepPoints = 30; // Keep last 30 points for smooth transition
                return {
                  ...prev,
                  pzem004t: {
                    voltage: newVoltage.slice(-keepPoints),
                    power: newPower.slice(-keepPoints),
                    current: newCurrent.slice(-keepPoints),
                    energy: newEnergy.slice(-keepPoints),
                    pf: newPf.slice(-keepPoints),
                    time: newTime.slice(-keepPoints),
                  },
                };
              }

              return {
                ...prev,
                pzem004t: {
                  voltage: newVoltage,
                  power: newPower,
                  current: newCurrent,
                  energy: newEnergy,
                  pf: newPf,
                  time: newTime,
                },
              };
            });
          }
        } else if (topic === settings.topics.bh1750) {
          // Validate and parse BH1750 sensor data
          const lux = parseFloat(payload.lux);

          if (!isNaN(lux)) {
            if (nowTs - lastUpdateRef.current.bh1750 < intervalMs) return;
            lastUpdateRef.current.bh1750 = nowTs;

            // Check thresholds
            checkThresholds('bh1750', { lux });

            setSensorData((prev) => {
              const newLux = [...prev.bh1750.lux, lux];
              const newTime = [...prev.bh1750.time, time];

              // If canvas is full, keep the last 30 points and remove old ones gradually
              if (newLux.length > (settings.maxDataPoints || DEFAULT_SETTINGS.maxDataPoints)) {
                const keepPoints = 30; // Keep last 30 points for smooth transition
                return {
                  ...prev,
                  bh1750: {
                    lux: newLux.slice(-keepPoints),
                    time: newTime.slice(-keepPoints),
                  },
                };
              }

              return {
                ...prev,
                bh1750: {
                  lux: newLux,
                  time: newTime,
                },
              };
            });
          }
        } else if (topic.startsWith(settings.topics.relay_status_base)) {
          const relayNum = parseInt(topic.split("/").pop());
          if (relayNum >= 1 && relayNum <= 4) {
            setRelayStates((prev) => ({
              ...prev,
              [relayNum]: payload.state === "ON" || payload.state === true,
            }));
          }
        }
      } catch (e) {
        console.error("Error parsing MQTT message:", e);
      }
    });

    return () => {
      client.end();
    };
  }, [settings, addHistoryEntry]);

  const connect = useCallback((isManualReconnect = false) => {
    if (clientRef.current) {
      const oldClient = clientRef.current;
      clientRef.current = null; // Prevent race conditions
      oldClient.end(true, {}, () => {
        setupNewConnection(isManualReconnect);
      });
    } else {
      setupNewConnection(isManualReconnect);
    }
  }, [setupNewConnection]);

  const toggleRelay = useCallback(
    (relayNum) => {
      if (!clientRef.current || !isConnected) return;

      // Toggle the relay state
      const newState = !relayStates[relayNum];

      // Update the UI immediately for better responsiveness
      setRelayStates(prev => ({
        ...prev,
        [relayNum]: newState
      }));

      // Prepare MQTT message
      const topic = `${settings.topics.relay_cmd}${relayNum}`;
      const payload = JSON.stringify({ state: newState ? "ON" : "OFF" });

      // Publish the message
      clientRef.current.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
          // If publish fails, revert the UI state
          setRelayStates(prev => ({
            ...prev,
            [relayNum]: !newState // Revert to previous state
          }));
          console.error('Failed to publish relay state:', err);
          addHistoryEntry(
            `Failed to toggle Relay ${relayNum}`,
            'Error',
            'text-red-600'
          );
          return;
        }

        // Success - log the action
        addHistoryEntry(
          `Relay ${relayNum} toggled`,
          newState ? "ON" : "OFF",
          newState ? "text-green-600" : "text-slate-600"
        );
      });
    },
    [isConnected, relayStates, settings.topics.relay_cmd, addHistoryEntry]
  );

  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => {
      const merged = {
        ...prev,
        ...newSettings,
        topics: newSettings.topics
          ? { ...prev.topics, ...newSettings.topics }
          : prev.topics,
        thresholds: newSettings.thresholds
          ? { ...prev.thresholds, ...newSettings.thresholds }
          : prev.thresholds,
      };

      localStorage.setItem("mqttSettings", JSON.stringify(merged));
      return merged;
    });
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const value = {
    isConnected,
    connectionTime,
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    isReconnecting,
    settings,
    sensorData,
    relayStates,
    history,
    notifications,
    connect: () => connect(true), // Wrapped to indicate manual reconnect
    toggleRelay,
    updateSettings,
    addHistoryEntry,
    clearHistory,
    addNotification,
    dismissNotification,
    clearNotifications,
    DEFAULT_SETTINGS,
  };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}

export function useMqtt() {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error("useMqtt must be used within a MqttProvider");
  }
  return context;
}
