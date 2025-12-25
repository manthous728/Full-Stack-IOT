import { useState, useEffect, useCallback } from "react";
import { useMqtt } from "../context/MqttContext";
import { API_BASE_URL } from "../config";

const RELAY_COLORS = {
  1: { color: "yellow", bg: "from-yellow-100 to-yellow-50", text: "text-yellow-600" },
  2: { color: "blue", bg: "from-blue-100 to-blue-50", text: "text-blue-600" },
  3: { color: "red", bg: "from-red-100 to-red-50", text: "text-red-600" },
  4: { color: "purple", bg: "from-purple-100 to-purple-50", text: "text-purple-600" },
};

const RELAY_DESCRIPTIONS = {
  1: "Pencahayaan area depan rumah",
  2: "Sistem irigasi otomatis",
  3: "Sirkulasi udara otomatis",
  4: "Kunci elektronik gudang",
};

const icons = {
  1: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  2: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  3: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  4: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
};

export default function Relay() {
  const { isConnected, relayStates, toggleRelay } = useMqtt();
  const [apiRelays, setApiRelays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRelays = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/relays`);
      if (!res.ok) throw new Error("Gagal mengambil data relay");
      const data = await res.json();
      setApiRelays(data);
    } catch (err) {
      console.error("Failed to fetch relays:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelays();
  }, [fetchRelays]);

  // Sync relay status to API when toggled via MQTT
  const handleToggle = async (relayId) => {
    // Toggle via MQTT first
    toggleRelay(relayId);

    // Also sync to API for persistence
    const newState = !relayStates[relayId];
    try {
      await fetch(`${API_BASE_URL}/relays/${relayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newState }),
      });
    } catch (err) {
      console.error("Failed to sync relay to API:", err);
    }
  };

  // Merge API data with MQTT state (MQTT takes priority for real-time)
  const getRelayData = (relayNum) => {
    const apiData = apiRelays.find((r) => r.id === relayNum);
    return {
      num: relayNum,
      name: apiData?.name || `Relay ${relayNum}`,
      gpio: apiData?.gpio || 0,
      desc: RELAY_DESCRIPTIONS[relayNum] || "",
      isOn: isConnected ? relayStates[relayNum] : (apiData?.is_active || false),
    };
  };

  if (loading) {
    return (
      <div className="page-section">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-slate-600">Memuat data relay...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kontrol Relay</h2>
          <p className="text-slate-600 mt-1">
            Manajemen perangkat 4 channel relay
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-teal-100 text-teal-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            4 Channel Relay
          </span>
          <span
            className={`inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full ${isConnected
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
            ></span>
            {isConnected ? "MQTT Connected" : "MQTT Disconnected"}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {!isConnected && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
          ⚠️ MQTT tidak terhubung. Status relay diambil dari database (mungkin tidak real-time).
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((relayNum) => {
          const relay = getRelayData(relayNum);
          const colors = RELAY_COLORS[relayNum];

          return (
            <div
              key={relayNum}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 bg-gradient-to-br ${colors.bg} rounded-xl ${colors.text}`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d={icons[relayNum]}
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">
                      {relay.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      GPIO {relay.gpio} • Relay {relay.num}
                    </p>
                    <p className="text-sm text-slate-600 mt-2">{relay.desc}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleToggle(relay.num)}
                disabled={!isConnected}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${!isConnected
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : relay.isOn
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                    : 'bg-white text-slate-700 border border-slate-100/50 hover:bg-slate-50 hover:shadow-sm'
                  }`}
              >
                {relay.isOn ? "ON" : "OFF"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
