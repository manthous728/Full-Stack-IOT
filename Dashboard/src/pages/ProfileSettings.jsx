import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

export default function ProfileSettings() {
    const { user, updateProfile, updateUserLocal, isAuthenticated } = useAuth();
    const [profileImage, setProfileImage] = useState(
        user?.avatar_url
            ? `${API_BASE_URL}${user.avatar_url}`
            : `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=0D9488&color=fff`
    );
    const [selectedFile, setSelectedFile] = useState(null);
    const [profileData, setProfileData] = useState({
        currentPassword: "",
        newUsername: user?.username || "",
        newPassword: "",
        confirmPassword: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [savedType, setSavedType] = useState("");
    const [validationError, setValidationError] = useState("");

    if (!isAuthenticated) return null;

    const handlePhotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setProfileImage(URL.createObjectURL(file));
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

        setIsSaving(true);
        try {
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

            const res = await updateProfile(
                profileData.currentPassword,
                profileData.newUsername !== user.username ? profileData.newUsername : null,
                profileData.newPassword || null
            );

            if (res.success) {
                if (uploadedAvatarUrl) {
                    updateUserLocal({ avatar_url: uploadedAvatarUrl });
                    setProfileImage(`${API_BASE_URL}${uploadedAvatarUrl}?${Date.now()}`);
                    setSavedType("profile_photo");
                    setSaved(true);
                    setTimeout(() => {
                        setSaved(false);
                        window.location.reload();
                    }, 800);
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
            setValidationError(err.message || "Terjadi kesalahan");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-section">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Profil Pengguna</h2>
                <p className="text-slate-600 mt-1">Kelola informasi akun dan kata sandi Anda</p>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-100/50">
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
                                <label className="block text-sm font-medium text-slate-700">Ganti Foto</label>
                                <div className="flex gap-2 justify-center md:justify-start">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-colors"
                                    />
                                </div>
                                <p className="text-xs text-slate-500">Format: JPG, PNG. Maksimal 2MB.</p>
                                {saved && savedType === 'profile_photo' && (
                                    <p className="text-xs text-green-600 font-medium">✓ Foto profil diperbarui</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <form className="space-y-6" onSubmit={handleProfileSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                            <input
                                name="newUsername"
                                type="text"
                                value={profileData.newUsername}
                                onChange={handleProfileChange}
                                className="w-full px-4 py-3 border-2 border-teal-100 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none bg-white font-medium text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Password Saat Ini <span className="text-red-500">*</span></label>
                            <input
                                name="currentPassword"
                                type="password"
                                value={profileData.currentPassword}
                                onChange={handleProfileChange}
                                required
                                className="w-full px-4 py-3 border-2 border-teal-100 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none bg-white font-medium text-sm"
                                placeholder="Konfirmasi password"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Password Baru (Opsional)</label>
                            <input
                                name="newPassword"
                                type="password"
                                value={profileData.newPassword}
                                onChange={handleProfileChange}
                                className="w-full px-4 py-3 border-2 border-teal-100 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none bg-white font-medium text-sm"
                                placeholder="Kosongkan jika tidak ubah"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Konfirmasi Password Baru</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                value={profileData.confirmPassword}
                                onChange={handleProfileChange}
                                className="w-full px-4 py-3 border-2 border-teal-100 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none bg-white font-medium text-sm"
                                placeholder="Ulangi password baru"
                            />
                        </div>
                    </div>

                    {validationError && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">{validationError}</div>
                    )}
                    {saved && savedType === 'profile' && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">Profil berhasil diperbarui!</div>
                    )}

                    <div className="flex justify-end pt-6 border-t border-slate-100/50">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full md:w-60 px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? "Menyimpan..." : "Simpan Profil"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
