import { useState } from "react";
import { useMqtt } from "../context/MqttContext";

export default function BrokerSettings() {
    const { settings, updateSettings, connect, DEFAULT_SETTINGS } = useMqtt();
    const [brokerData, setBrokerData] = useState({
        host: settings.host,
        port: settings.port,
        updateInterval: settings.updateInterval,
    });
    const [saved, setSaved] = useState(false);
    const [validationError, setValidationError] = useState("");
    const [showBrokerModal, setShowBrokerModal] = useState(false);

    const handleBrokerChange = (e) => {
        const { name, value } = e.target;
        setBrokerData((prev) => ({
            ...prev,
            [name]:
                name === "port" || name === "updateInterval"
                    ? value === "" ? "" : parseInt(value) || ""
                    : value,
        }));
    };

    const handleBrokerSubmit = (e) => {
        e.preventDefault();
        setValidationError("");

        if (!brokerData.host || brokerData.host.trim() === "") {
            setValidationError("MQTT Host harus diisi");
            return;
        }
        if (brokerData.port === "" || brokerData.port === null) {
            setValidationError("MQTT Port harus diisi");
            return;
        }
        if (brokerData.updateInterval === "" || brokerData.updateInterval === null) {
            setValidationError("Update Interval harus diisi");
            return;
        }

        setShowBrokerModal(true);
    };

    const confirmBrokerSave = () => {
        const newSettings = {
            ...settings,
            host: brokerData.host,
            port: Number(brokerData.port),
            updateInterval: Number(brokerData.updateInterval),
        };
        updateSettings(newSettings);
        setShowBrokerModal(false);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            connect();
        }, 1500);
    };

    const handleBrokerReset = () => {
        setBrokerData({
            host: DEFAULT_SETTINGS.host,
            port: DEFAULT_SETTINGS.port,
            updateInterval: DEFAULT_SETTINGS.updateInterval,
        });
    };

    return (
        <div className="page-section">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Pengaturan Broker</h2>
                <p className="text-slate-600 mt-1">Konfigurasi koneksi MQTT untuk sinkronisasi data sensor</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                <form className="space-y-6" onSubmit={handleBrokerSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                MQTT Host
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="host"
                                type="text"
                                value={brokerData.host}
                                onChange={handleBrokerChange}
                                placeholder="contoh: broker.hivemq.com"
                                required
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                            />
                            <p className="mt-1 text-xs text-slate-500">Alamat host MQTT broker</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                MQTT Port
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="port"
                                type="number"
                                value={brokerData.port}
                                onChange={handleBrokerChange}
                                placeholder="contoh: 8000"
                                min="1"
                                max="65535"
                                required
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                            />
                            <p className="mt-1 text-xs text-slate-500">Port MQTT broker (default: 8884 untuk WSS)</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Update Interval (detik)
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="updateInterval"
                            type="number"
                            value={brokerData.updateInterval}
                            onChange={handleBrokerChange}
                            min="1"
                            max="3600"
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                        />
                        <p className="mt-1 text-xs text-slate-500">Interval update data dalam detik (1-3600)</p>
                    </div>

                    {validationError && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                            {validationError}
                        </div>
                    )}

                    {saved && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                            Pengaturan broker berhasil disimpan! Menghubungkan ulang ke broker...
                        </div>
                    )}

                    <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleBrokerReset}
                            className="w-full md:w-32 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all duration-200"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="w-full md:w-48 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20 active:scale-[0.98]"
                        >
                            Simpan
                        </button>
                    </div>
                </form>
            </div>

            {showBrokerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Simpan Konfigurasi Broker?</h3>
                            <p className="text-slate-600 mb-6 font-medium">
                                Perubahan ini akan <span className="text-red-500 font-bold">memutus koneksi saat ini</span> dan menghubungkan ulang ke broker baru.
                            </p>
                            <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => setShowBrokerModal(false)}
                                    className="w-full md:w-32 px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all duration-200"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmBrokerSave}
                                    className="w-full md:w-48 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20 active:scale-[0.98]"
                                >
                                    Ya, Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
