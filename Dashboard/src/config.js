export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const MQTT_CONFIG = {
    host: import.meta.env.VITE_MQTT_HOST || "broker.hivemq.com",
    port: parseInt(import.meta.env.VITE_MQTT_PORT) || 8000,
    useSSL: import.meta.env.VITE_MQTT_USE_SSL === "true",
    autoConnect: import.meta.env.VITE_AUTO_CONNECT !== "false",
    topics: {
        dht22: import.meta.env.VITE_TOPIC_DHT22 || "sensor/dht22",
        pzem004t: import.meta.env.VITE_TOPIC_PZEM || "sensor/pzem004t",
        mq2: import.meta.env.VITE_TOPIC_MQ2 || "sensor/mq2",
        bh1750: import.meta.env.VITE_TOPIC_BH1750 || "sensor/bh1750",
        relay_cmd: import.meta.env.VITE_TOPIC_RELAY_CMD || "command/relay/",
        relay_status_base: import.meta.env.VITE_TOPIC_RELAY_STATUS_BASE || "status/relay/",
    },
    updateInterval: parseInt(import.meta.env.VITE_UPDATE_INTERVAL) || 5,
    maxDataPoints: parseInt(import.meta.env.VITE_MAX_DATA_POINTS) || 50,
    thresholds: {
        dht22: {
            tempMax: 35,
            tempMin: 15,
            humMax: 80,
            humMin: 30,
        },
        mq2: {
            smokeMax: 500,
            smokeWarn: 350,
            lpgMax: 1000,
            lpgWarn: 500,
            coMax: 500,
            coWarn: 200,
        },
        pzem004t: {
            powerMax: 2000,
            voltageMin: 180,
            voltageMax: 240,
            currentMax: 10,
            energyMax: 100,
            pfMin: 0.85,
        },
        bh1750: {
            luxMax: 1000,
            luxMin: 0,
        },
    },
};
