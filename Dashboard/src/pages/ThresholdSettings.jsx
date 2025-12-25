import { useState, useEffect } from "react";
import { useMqtt } from "../context/MqttContext";
import { API_BASE_URL } from "../config";
import CollapsibleSection from "../components/CollapsibleSection";

export default function ThresholdSettings() {
    const { settings, updateSettings, DEFAULT_SETTINGS } = useMqtt();
    const [thresholdData, setThresholdData] = useState({
        thresholds: settings.thresholds || DEFAULT_SETTINGS.thresholds,
        enableThresholds: settings.enableThresholds !== undefined ? settings.enableThresholds : true,
        telegramConfig: settings.telegramConfig || { bot_token: "", chat_id: "", enabled: false },
    });

    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [saved, setSaved] = useState(false);
    const [savedType, setSavedType] = useState("");
    const [validationError, setValidationError] = useState("");
    const [showThresholdResetModal, setShowThresholdResetModal] = useState(false);

    const [expandedSections, setExpandedSections] = useState({
        telegram: true,
        dht22: true,
        mq2: false,
        pzem: false,
        bh1750: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    useEffect(() => {
        fetchThresholdSettings();
    }, []);

    const fetchThresholdSettings = async () => {
        setIsLoadingSettings(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.settings?.thresholds) {
                    const fetchedData = {
                        thresholds: data.settings.thresholds,
                        enableThresholds: data.settings.enable_thresholds ?? true,
                        telegramConfig: data.settings.telegram_config || { bot_token: "", chat_id: "", enabled: false }
                    };
                    setThresholdData(fetchedData);
                    updateSettings(fetchedData);
                }
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        } finally {
            setIsLoadingSettings(false);
        }
    };

    const handleThresholdChange = (sensor, field, value) => {
        setThresholdData((prev) => ({
            ...prev,
            thresholds: {
                ...prev.thresholds,
                [sensor]: {
                    ...prev.thresholds[sensor],
                    [field]: value === "" ? "" : parseFloat(value),
                },
            },
        }));
    };

    const validateThresholds = () => {
        const t = thresholdData.thresholds;
        const errors = [];
        if (t.dht22) {
            if (t.dht22.tempMin !== "" && t.dht22.tempMax !== "" && t.dht22.tempMin > t.dht22.tempMax) errors.push("Suhu Min > Suhu Max");
            if (t.dht22.humMin !== "" && t.dht22.humMax !== "" && t.dht22.humMin > t.dht22.humMax) errors.push("Kelembaban Min > Kelembaban Max");
        }
        if (t.mq2 && t.mq2.smokeWarn > t.mq2.smokeMax) errors.push("Smoke Waspada > Smoke Bahaya");
        if (t.pzem004t && t.pzem004t.voltageMin > t.pzem004t.voltageMax) errors.push("Tegangan Min > Tegangan Max");
        if (t.bh1750 && t.bh1750.luxMin > t.bh1750.luxMax) errors.push("Cahaya Min > Cahaya Max");
        return errors;
    };

    const handleThresholdSubmit = async (e) => {
        e.preventDefault();
        const errors = validateThresholds();
        if (errors.length > 0) {
            setValidationError(errors.join("; "));
            return;
        }

        setIsSavingSettings(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    thresholds: thresholdData.thresholds,
                    enable_thresholds: thresholdData.enableThresholds,
                    telegram_config: thresholdData.telegramConfig
                }),
            });

            if (res.ok) {
                updateSettings({
                    thresholds: thresholdData.thresholds,
                    enableThresholds: thresholdData.enableThresholds,
                    telegramConfig: thresholdData.telegramConfig
                });
                setSavedType("threshold");
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (err) {
            setValidationError("Gagal menyimpan ke server");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const confirmThresholdReset = async () => {
        setIsSavingSettings(true);
        try {
            const res = await fetch(`${API_BASE_URL}/settings/reset`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                const resetData = {
                    thresholds: data.thresholds,
                    enableThresholds: data.enable_thresholds ?? false,
                    telegramConfig: data.telegram_config || { bot_token: "", chat_id: "", enabled: false }
                };
                setThresholdData(resetData);
                updateSettings(resetData);
                setSavedType("threshold");
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (err) {
            setValidationError("Gagal mereset");
        } finally {
            setIsSavingSettings(false);
            setShowThresholdResetModal(false);
        }
    };

    const [isTestLoading, setIsTestLoading] = useState(false);
    const handleTelegramTest = async () => {
        if (!thresholdData.telegramConfig.bot_token || !thresholdData.telegramConfig.chat_id) {
            setValidationError("Isi Bot Token dan Chat ID untuk test");
            return;
        }
        setIsTestLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/notify/telegram/test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bot_token: thresholdData.telegramConfig.bot_token,
                    chat_id: thresholdData.telegramConfig.chat_id
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSavedType("telegram_test");
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            setValidationError("Error koneksi server");
        } finally {
            setIsTestLoading(false);
        }
    };

    return (
        <div className="page-section">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Pengaturan Threshold</h2>
                <p className="text-slate-600 mt-1">Konfigurasi batas nilai sensor untuk notifikasi peringatan</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
                {isLoadingSettings ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : (
                    <form className="space-y-6" onSubmit={handleThresholdSubmit}>
                        <div className="mb-6 s-4 bg-slate-50 p-4 rounded-lg flex items-center justify-between border border-slate-200">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700">Notifikasi Sistem</h4>
                                <p className="text-xs text-slate-500">Aktifkan atau nonaktifkan semua peringatan.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={thresholdData.enableThresholds} onChange={(e) => setThresholdData(prev => ({ ...prev, enableThresholds: e.target.checked }))} />
                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>

                        <div className={!thresholdData.enableThresholds ? 'opacity-50 pointer-events-none' : ''}>
                            <CollapsibleSection title="Notifikasi Telegram" isOpen={expandedSections.telegram} onToggle={() => toggleSection('telegram')}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-slate-700">Status Aktif</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={thresholdData.telegramConfig?.enabled || false} onChange={(e) => setThresholdData(prev => ({ ...prev, telegramConfig: { ...prev.telegramConfig, enabled: e.target.checked } }))} />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-sky-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {thresholdData.telegramConfig?.enabled && (
                                    <div className="space-y-4">
                                        <input type="text" value={thresholdData.telegramConfig?.bot_token || ""} onChange={(e) => setThresholdData(prev => ({ ...prev, telegramConfig: { ...prev.telegramConfig, bot_token: e.target.value } }))} placeholder="Bot Token" className="w-full px-3 py-2 border rounded-lg text-sm" />
                                        <div className="flex gap-2">
                                            <input type="text" value={thresholdData.telegramConfig?.chat_id || ""} onChange={(e) => setThresholdData(prev => ({ ...prev, telegramConfig: { ...prev.telegramConfig, chat_id: e.target.value } }))} placeholder="Chat ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
                                            <button type="button" onClick={handleTelegramTest} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-semibold">{isTestLoading ? "..." : "Test"}</button>
                                        </div>
                                    </div>
                                )}
                            </CollapsibleSection>

                            <CollapsibleSection title="DHT22 (Suhu & Kelembaban)" isOpen={expandedSections.dht22} onToggle={() => toggleSection('dht22')} color="bg-blue-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-medium">Temp Max</label><input type="number" value={thresholdData.thresholds.dht22?.tempMax ?? ""} onChange={(e) => handleThresholdChange("dht22", "tempMax", e.target.value)} className="w-full border p-2 rounded" /></div>
                                    <div><label className="text-xs font-medium">Temp Min</label><input type="number" value={thresholdData.thresholds.dht22?.tempMin ?? ""} onChange={(e) => handleThresholdChange("dht22", "tempMin", e.target.value)} className="w-full border p-2 rounded" /></div>
                                </div>
                            </CollapsibleSection>

                            <CollapsibleSection title="MQ2 (Kualitas Udara)" isOpen={expandedSections.mq2} onToggle={() => toggleSection('mq2')} color="bg-orange-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-medium">Smoke Max</label><input type="number" value={thresholdData.thresholds.mq2?.smokeMax ?? ""} onChange={(e) => handleThresholdChange("mq2", "smokeMax", e.target.value)} className="w-full border p-2 rounded" /></div>
                                    <div><label className="text-xs font-medium">Smoke Warn</label><input type="number" value={thresholdData.thresholds.mq2?.smokeWarn ?? ""} onChange={(e) => handleThresholdChange("mq2", "smokeWarn", e.target.value)} className="w-full border p-2 rounded" /></div>
                                </div>
                            </CollapsibleSection>

                            <CollapsibleSection title="PZEM004T (Listrik)" isOpen={expandedSections.pzem} onToggle={() => toggleSection('pzem')} color="bg-yellow-500">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-medium">Voltage Max</label><input type="number" value={thresholdData.thresholds.pzem004t?.voltageMax ?? ""} onChange={(e) => handleThresholdChange("pzem004t", "voltageMax", e.target.value)} className="w-full border p-2 rounded" /></div>
                                    <div><label className="text-xs font-medium">Power Max</label><input type="number" value={thresholdData.thresholds.pzem004t?.powerMax ?? ""} onChange={(e) => handleThresholdChange("pzem004t", "powerMax", e.target.value)} className="w-full border p-2 rounded" /></div>
                                </div>
                            </CollapsibleSection>
                        </div>

                        {validationError && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{validationError}</div>}
                        {saved && savedType === "threshold" && <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">Berhasil disimpan!</div>}

                        <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowThresholdResetModal(true)}
                                className="w-full md:w-32 px-6 py-3 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all duration-200"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingSettings}
                                className="w-full md:w-48 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingSettings ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {showThresholdResetModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Reset Threshold?</h3>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowThresholdResetModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                            <button onClick={confirmThresholdReset} className="px-4 py-2 bg-amber-600 text-white rounded-lg">Ya, Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
