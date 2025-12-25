import { useState, useEffect } from "react";
import { useMqtt } from "../context/MqttContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

const CollapsibleSection = ({ title, isOpen, onToggle, color, children }) => (
  <div className="mb-4 border border-slate-100/50 rounded-lg overflow-hidden bg-white shadow-sm transition-all md:mb-6">
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-4 transition-colors ${isOpen ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
    >
      <h4 className="text-sm font-semibold text-slate-700 flex items-center">
        {color && <span className={`w-2 h-2 ${color} rounded-full mr-2`}></span>}
        {title}
      </h4>
      <svg
        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
    >
      <div className="p-4 border-t border-slate-100/50 bg-slate-50/50">
        {children}
      </div>
    </div>
  </div>
);

export default function Settings() {
  const { settings, updateSettings, connect, DEFAULT_SETTINGS } = useMqtt();
  const { user, updateProfile, isAdmin, updateUserLocal } = useAuth();
  const [activeTab, setActiveTab] = useState(isAdmin ? "broker" : "profile");

  // Loading states
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // UI State for Collapsible Sections
  const [expandedSections, setExpandedSections] = useState({
    telegram: true,
    dht22: true,
    mq2: false,
    pzem: false,
    bh1750: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Effect to ensure correct tab if role changes or on load
  useEffect(() => {
    if (!isAdmin && activeTab !== "profile") {
      setActiveTab("profile");
    }
  }, [isAdmin]);

  // Profile Settings
  const [profileImage, setProfileImage] = useState(
    user?.avatar_url
      ? `${API_BASE_URL}${user.avatar_url}`
      : `${API_BASE_URL}/static/default.jpg` // Fallback validation handling downstream
  );
  const [selectedFile, setSelectedFile] = useState(null);

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Create preview URL
      setProfileImage(URL.createObjectURL(file));
    }
  };



  const [profileData, setProfileData] = useState({
    currentPassword: "",
    newUsername: user?.username || "",
    newPassword: "",
    confirmPassword: ""
  });

  // Broker Settings
  const [brokerData, setBrokerData] = useState({
    host: settings.host,
    port: settings.port,
    updateInterval: settings.updateInterval,
  });

  // Threshold Settings - fetch from API on load
  const [thresholdData, setThresholdData] = useState({
    thresholds: settings.thresholds || DEFAULT_SETTINGS.thresholds,
    enableThresholds: settings.enableThresholds !== undefined ? settings.enableThresholds : true,
    telegramConfig: settings.telegramConfig || { bot_token: "", chat_id: "", enabled: false },
  });

  const [saved, setSaved] = useState(false);
  const [savedType, setSavedType] = useState("");
  const [validationError, setValidationError] = useState("");

  // Modals
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showThresholdResetModal, setShowThresholdResetModal] = useState(false);

  // Fetch threshold settings from API on mount
  useEffect(() => {
    if (isAdmin) {
      fetchThresholdSettings();
    }
  }, [isAdmin]);

  const fetchThresholdSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings?.thresholds) {
          setThresholdData({
            thresholds: data.settings.thresholds,
            enableThresholds: data.settings.enable_thresholds ?? true,
            telegramConfig: data.settings.telegram_config || { bot_token: "", chat_id: "", enabled: false }
          });
          // Also update context
          updateSettings({
            thresholds: data.settings.thresholds,
            enableThresholds: data.settings.enable_thresholds ?? true,
            telegramConfig: data.settings.telegram_config || { bot_token: "", chat_id: "", enabled: false }
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

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

  // Validate thresholds before saving
  const validateThresholds = () => {
    const t = thresholdData.thresholds;
    const errors = [];

    // DHT22 validation
    if (t.dht22) {
      if (t.dht22.tempMin !== "" && t.dht22.tempMax !== "" && t.dht22.tempMin > t.dht22.tempMax) {
        errors.push("Suhu Min tidak boleh lebih besar dari Suhu Max");
      }
      if (t.dht22.humMin !== "" && t.dht22.humMax !== "" && t.dht22.humMin > t.dht22.humMax) {
        errors.push("Kelembaban Min tidak boleh lebih besar dari Kelembaban Max");
      }
    }

    // MQ2 validation
    if (t.mq2) {
      if (t.mq2.smokeWarn !== "" && t.mq2.smokeMax !== "" && t.mq2.smokeWarn > t.mq2.smokeMax) {
        errors.push("Smoke Waspada tidak boleh lebih besar dari Smoke Bahaya");
      }
    }

    // PZEM004T validation
    if (t.pzem004t) {
      if (t.pzem004t.voltageMin !== "" && t.pzem004t.voltageMax !== "" && t.pzem004t.voltageMin > t.pzem004t.voltageMax) {
        errors.push("Tegangan Min tidak boleh lebih besar dari Tegangan Max");
      }
    }

    // BH1750 validation
    if (t.bh1750) {
      if (t.bh1750.luxMin !== undefined && t.bh1750.luxMax !== "" && t.bh1750.luxMin > t.bh1750.luxMax) {
        errors.push("Cahaya Min tidak boleh lebih besar dari Cahaya Max");
      }
    }

    return errors;
  };

  const handleBrokerSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    // Validate required fields
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

    // Show Confirmation Modal instead of saving immediately
    setShowBrokerModal(true);
  };

  const confirmBrokerSave = () => {
    const newSettings = {
      ...settings,
      host: brokerData.host,
      port: Number(brokerData.port),
      updateInterval: Number(brokerData.updateInterval),
      thresholds: settings.thresholds || DEFAULT_SETTINGS.thresholds,
    };
    updateSettings(newSettings);
    setShowBrokerModal(false);
    setSavedType("broker");
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 800);
  };

  const handleThresholdSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    // Validate thresholds
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
        const data = await res.json();
        if (data.success) {
          // Update local context
          updateSettings({
            thresholds: thresholdData.thresholds,
            enableThresholds: thresholdData.enableThresholds,
            telegramConfig: thresholdData.telegramConfig
          });
          setSavedType("threshold");
          setSaved(true);
          setTimeout(() => {
            setSaved(false);
            window.location.reload();
          }, 800);
        }
      } else {
        const errData = await res.json();
        setValidationError(errData.detail || "Gagal menyimpan pengaturan");
      }
    } catch (err) {
      setValidationError("Gagal menyimpan pengaturan ke server");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleBrokerReset = () => {
    setBrokerData({
      host: DEFAULT_SETTINGS.host,
      port: DEFAULT_SETTINGS.port,
      updateInterval: DEFAULT_SETTINGS.updateInterval,
    });
  };

  const confirmThresholdReset = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/reset`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setThresholdData({
            thresholds: data.thresholds,
            enableThresholds: data.enable_thresholds ?? false,
            telegramConfig: data.telegram_config || { bot_token: "", chat_id: "", enabled: false }
          });
          // Also update context
          updateSettings({
            thresholds: data.thresholds,
            enableThresholds: data.enable_thresholds ?? false,
            telegramConfig: data.telegram_config || { bot_token: "", chat_id: "", enabled: false }
          });
          setSavedType("threshold");
          setSaved(true);
          setTimeout(() => {
            setSaved(false);
            window.location.reload();
          }, 800);
        }
      }
    } catch (err) {
      setValidationError("Gagal mereset pengaturan");
    } finally {
      setIsSavingSettings(false);
      setShowThresholdResetModal(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (!profileData.currentPassword) {
      setValidationError("Password saat ini diperlukan");
      return;
    }

    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      setValidationError("Password baru tidak cocok");
      return;
    }

    setIsSavingSettings(true);

    try {
      // 1. Upload Photo if selected
      let uploadedAvatarUrl = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('username', user?.username || 'user');

        const res = await fetch(`${API_BASE_URL}/profile/photo`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Gagal upload foto");
        }
        const data = await res.json();
        uploadedAvatarUrl = data.url;
      }

      // 2. Update Profile
      const res = await updateProfile(
        profileData.currentPassword,
        profileData.newUsername !== user.username ? profileData.newUsername : null,
        profileData.newPassword || null
      );

      if (res.success) {
        if (uploadedAvatarUrl) {
          updateUserLocal({ avatar_url: uploadedAvatarUrl });
          setProfileImage(`${API_BASE_URL}${uploadedAvatarUrl}?${Date.now()}`);
        }

        setSavedType("profile");
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          window.location.reload();
        }, 800);

        setProfileData({ ...profileData, currentPassword: "", newPassword: "", confirmPassword: "" });
        setSelectedFile(null);
      } else {
        setValidationError(res.error || "Gagal menyimpan perubahan");
      }
    } catch (err) {
      setValidationError(err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [isTestLoading, setIsTestLoading] = useState(false);
  const handleTelegramTest = async () => {
    if (!thresholdData.telegramConfig.bot_token || !thresholdData.telegramConfig.chat_id) {
      setValidationError("Bot Token dan Chat ID harus diisi untuk test");
      return;
    }

    setIsTestLoading(true);
    setValidationError("");
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
      } else {
        setValidationError(data.message || "Gagal mengirim pesan test");
      }
    } catch (err) {
      setValidationError("Error koneksi ke server");
    } finally {
      setIsTestLoading(false);
    }
  };

  return (
    <div className="page-section">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Pengaturan Sistem</h2>
        <p className="text-slate-600 mt-1">
          Konfigurasi koneksi dan parameter sistem
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-100/50 overflow-x-auto">
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("broker")}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === "broker"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
                }`}
            >
              <svg
                className="inline-block w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
              Pengaturan Broker
            </button>
            <button
              onClick={() => setActiveTab("threshold")}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === "threshold"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-600 hover:text-slate-800"
                }`}
            >
              <svg
                className="inline-block w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Pengaturan Threshold
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === "profile"
            ? "border-teal-600 text-teal-600"
            : "border-transparent text-slate-600 hover:text-slate-800"
            }`}
        >
          <svg
            className="inline-block w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Profil User
        </button>
      </div>

      {/* Broker Settings Tab */}
      {activeTab === "broker" && (
        <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-100/50">
          <form className="space-y-6" onSubmit={handleBrokerSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full px-4 py-3 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Alamat host MQTT broker
                </p>
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
                  className="w-full px-4 py-3 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Port MQTT broker (default: 8884 untuk WSS)
                </p>
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
                className="w-full px-4 py-3 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              />
              <p className="mt-1 text-xs text-slate-500">
                Interval update data dalam detik (1-3600)
              </p>
            </div>

            {validationError && activeTab === "broker" && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                {validationError}
              </div>
            )}

            {saved && savedType === "broker" && (
              <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                Pengaturan broker berhasil disimpan! Reloading...
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleBrokerReset}
                className="px-6 py-3 border border-slate-100/50 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Reset Default
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                Simpan Broker
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Threshold Settings Tab */}
      {activeTab === "threshold" && (
        <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-100/50">
          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <span className="ml-3 text-slate-600">Memuat pengaturan...</span>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleThresholdSubmit}>
              {/* Threshold Settings */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Pengaturan Threshold Sensor
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Atur batas nilai untuk notifikasi peringatan sensor. Pengaturan ini akan tersimpan di database.
                </p>

                {/* Master Toggle */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100/50">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">Notifikasi Sistem</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Aktifkan atau nonaktifkan semua peringatan threshold.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={thresholdData.enableThresholds}
                      onChange={(e) => setThresholdData(prev => ({ ...prev, enableThresholds: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-100/50 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                {/* Disabled Overlay if Toggle is Off */}
                <div className={`relative ${!thresholdData.enableThresholds ? 'opacity-50 pointer-events-none' : ''}`}>

                  {/* Telegram Notification Settings */}
                  <CollapsibleSection
                    title="Notifikasi Telegram"
                    isOpen={expandedSections.telegram}
                    onToggle={() => toggleSection('telegram')}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                          <svg className="w-5 h-5 text-sky-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-1.01-2.4-1.61-.41-.27-.47-1.05.1-1.60.27-.26 2.39-2.27 2.45-2.26.23-.42-.03-.64-.26-.54-.3.12-2.03 1.29-2.6 1.63-.49.3-.94.49-1.9.47-.64-.01-1.52-.29-2.13-.48-1.29-.41-1.3-.96-.28-1.39 5.31-2.26 8.53-3.69 9.6-4.14 2.87-1.19 3.01-1.03 3.01.69.01.2 0 .43-.01.67z" />
                          </svg>
                          Status
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Aktifkan integrasi Telegram.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={thresholdData.telegramConfig?.enabled || false}
                          onChange={(e) => setThresholdData(prev => ({
                            ...prev,
                            telegramConfig: { ...prev.telegramConfig, enabled: e.target.checked }
                          }))}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-100/50 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>

                    {thresholdData.telegramConfig?.enabled && (
                      <div className="space-y-4 animate-fadeIn">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Bot Token
                          </label>
                          <input
                            type="text"
                            value={thresholdData.telegramConfig?.bot_token || ""}
                            onChange={(e) => setThresholdData(prev => ({
                              ...prev,
                              telegramConfig: { ...prev.telegramConfig, bot_token: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors text-sm"
                            placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxyz"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Chat ID
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={thresholdData.telegramConfig?.chat_id || ""}
                              onChange={(e) => setThresholdData(prev => ({
                                ...prev,
                                telegramConfig: { ...prev.telegramConfig, chat_id: e.target.value }
                              }))}
                              className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors text-sm"
                              placeholder="12345678"
                            />
                            <button
                              type="button"
                              onClick={handleTelegramTest}
                              disabled={isTestLoading}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-w-[80px]"
                            >
                              {isTestLoading ? "..." : "Test"}
                            </button>
                          </div>
                        </div>

                        {saved && savedType === "telegram_test" && (
                          <div className="p-2 bg-green-50 text-green-600 text-xs rounded border border-green-200">
                            ✓ Pesan test berhasil dikirim! Cek Telegram Anda.
                          </div>
                        )}
                      </div>
                    )}
                  </CollapsibleSection>

                  {/* DHT22 Threshold */}
                  <CollapsibleSection
                    title="DHT22 (Suhu & Kelembaban)"
                    isOpen={expandedSections.dht22}
                    onToggle={() => toggleSection('dht22')}
                    color="bg-blue-500"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Suhu Max (°C)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.dht22?.tempMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "dht22",
                              "tempMax",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 35"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Suhu Min (°C)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.dht22?.tempMin ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "dht22",
                              "tempMin",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Kelembaban Max (%)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.dht22?.humMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange("dht22", "humMax", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 80"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Kelembaban Min (%)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.dht22?.humMin ?? ""}
                          onChange={(e) =>
                            handleThresholdChange("dht22", "humMin", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 30"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* MQ2 Threshold */}
                  <CollapsibleSection
                    title="MQ2 (Kualitas Udara)"
                    isOpen={expandedSections.mq2}
                    onToggle={() => toggleSection('mq2')}
                    color="bg-orange-500"
                  >
                    {/* Smoke */}
                    <p className="text-xs font-medium text-slate-500 mb-2">Smoke</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Smoke Waspada
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.mq2?.smokeWarn ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "mq2",
                              "smokeWarn",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 350"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Smoke Bahaya
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.mq2?.smokeMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange("mq2", "smokeMax", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 500"
                        />
                      </div>
                    </div>

                    {/* LPG */}
                    <p className="text-xs font-medium text-slate-500 mb-2">Gas LPG</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          LPG Waspada
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.mq2?.lpgWarn ?? ""}
                          onChange={(e) =>
                            handleThresholdChange("mq2", "lpgWarn", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          LPG Bahaya
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.mq2?.lpgMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange("mq2", "lpgMax", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 1000"
                        />
                      </div>
                    </div>

                    {/* CO */}
                    <p className="text-xs font-medium text-slate-500 mb-2">Gas CO</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          CO Waspada
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.mq2?.coWarn ?? ""}
                          onChange={(e) =>
                            handleThresholdChange("mq2", "coWarn", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          CO Bahaya
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.mq2?.coMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange("mq2", "coMax", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 500"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* PZEM004T Threshold */}
                  <CollapsibleSection
                    title="PZEM004T (Daya & Tegangan)"
                    isOpen={expandedSections.pzem}
                    onToggle={() => toggleSection('pzem')}
                    color="bg-yellow-500"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Daya Max (W)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.pzem004t?.powerMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "pzem004t",
                              "powerMax",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 2000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Tegangan Min (V)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.pzem004t?.voltageMin ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "pzem004t",
                              "voltageMin",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 180"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Tegangan Max (V)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.pzem004t?.voltageMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "pzem004t",
                              "voltageMax",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 240"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Arus Max (A)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.pzem004t?.currentMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "pzem004t",
                              "currentMax",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Energi Max (kWh)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.pzem004t?.energyMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "pzem004t",
                              "energyMax",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          PF Min
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={thresholdData.thresholds.pzem004t?.pfMin ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "pzem004t",
                              "pfMin",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 0.85"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* BH1750 Threshold */}
                  <CollapsibleSection
                    title="BH1750 (Cahaya)"
                    isOpen={expandedSections.bh1750}
                    onToggle={() => toggleSection('bh1750')}
                    color="bg-green-500"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Cahaya Min (lux)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.bh1750?.luxMin ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "bh1750",
                              "luxMin",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Cahaya Max (lux)
                        </label>
                        <input
                          type="number"
                          value={thresholdData.thresholds.bh1750?.luxMax ?? ""}
                          onChange={(e) =>
                            handleThresholdChange(
                              "bh1750",
                              "luxMax",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                          placeholder="contoh: 100000"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* Close Disabled Overlay Wrapper */}
                </div>
              </div>

              {validationError && activeTab === "threshold" && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {validationError}
                </div>
              )}

              {saved && savedType === "threshold" && (
                <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Pengaturan threshold berhasil disimpan ke database!
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 flex items-center"
                >
                  {isSavingSettings ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowThresholdResetModal(true)}
                  disabled={isSavingSettings}
                  className="px-6 py-3 border border-slate-100/50 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Reset Default
                </button>
              </div>
            </form>
          )}
        </div>
      )
      }

      {/* Profile Settings Tab */}
      {
        activeTab === "profile" && (
          <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-100/50">
            <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100/50">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center md:text-left">Foto Profil</h3>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                  <img
                    src={profileImage}
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=0D9488&color=fff`; }}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                  />
                </div>
                <div className="flex-1 w-full md:w-auto text-center md:text-left">
                  <div className="flex flex-col gap-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Ganti Foto
                    </label>
                    <div className="flex gap-2 justify-center md:justify-start">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-colors"
                      />

                    </div>
                    <p className="text-xs text-slate-500">
                      Format: JPG, PNG. Maksimal 2MB.
                    </p>
                    {saved && savedType === 'profile_photo' && (
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Foto profil berhasil diperbarui
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleProfileSubmit}>
              <div className="md:w-2/3">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username Baru
                </label>
                <input
                  name="newUsername"
                  type="text"
                  value={profileData.newUsername}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="Masukkan username baru"
                />
              </div>

              <div className="md:w-2/3">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password Baru (Opsional)
                </label>
                <input
                  name="newPassword"
                  type="password"
                  value={profileData.newPassword}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                />
              </div>

              <div className="md:w-2/3">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Konfirmasi Password Baru
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={profileData.confirmPassword}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="Ulangi password baru"
                />
              </div>

              <hr className="border-slate-100/50 my-6" />

              <div className="md:w-2/3">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password Saat Ini <span className="text-red-500">*</span>
                </label>
                <input
                  name="currentPassword"
                  type="password"
                  value={profileData.currentPassword}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-3 border border-slate-100/50 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="Masukkan password saat ini untuk konfirmasi"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Diperlukan untuk menyimpan perubahan profil
                </p>
              </div>

              {validationError && activeTab === "profile" && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                  {validationError}
                </div>
              )}

              {saved && savedType === "profile" && (
                <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  Profil berhasil diperbarui!
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
                >
                  Simpan Profil
                </button>
              </div>
            </form>
          </div>
        )
      }

      {/* Broker Confirmation Modal */}
      {
        showBrokerModal && (
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
                  Perubahan ini akan <span className="text-red-500 font-bold">memutus koneksi saat ini</span> dan menghubungkan ulang ke broker baru. Sensor mungkin tidak update selama proses ini.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowBrokerModal(false)}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmBrokerSave}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-teal-500/30"
                  >
                    Ya, Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Threshold Reset Confirmation Modal */}
      {
        showThresholdResetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Reset Pengaturan Threshold?</h3>
                <p className="text-slate-600 mb-6 font-medium">
                  Semua pengaturan threshold akan dikembalikan ke nilai default. Perubahan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowThresholdResetModal(false)}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmThresholdReset}
                    disabled={isSavingSettings}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-amber-500/30 flex items-center"
                  >
                    {isSavingSettings && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    Ya, Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
