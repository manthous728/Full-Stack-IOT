import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function ForceChangePassword() {
    const { user, updateProfile, logout } = useAuth()
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Only show if user has the flag set
    if (!user?.force_password_change) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Password baru tidak sama')
            return
        }

        if (formData.newPassword.length < 4) {
            setError('Password minimal 4 karakter')
            return
        }

        setIsLoading(true)

        try {
            // Call updateProfile from AuthContext
            const result = await updateProfile(
                formData.currentPassword,
                user.username, // Keep same username
                formData.newPassword
            )

            if (result.success) {
                alert('Password berhasil diubah!')
                // Flag is cleared in backend and updated in context
            } else {
                setError(result.error || 'Gagal mengubah password')
            }
        } catch (err) {
            setError('Terjadi kesalahan sistem')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 border border-slate-100/50">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Ganti Password Diperlukan</h2>
                    <p className="text-slate-600 mt-2 text-sm">
                        Demi keamanan, Anda wajib mengganti password sementara Anda sebelum melanjutkan.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password Sementara (Saat Ini)</label>
                        <input
                            type="password"
                            required
                            value={formData.currentPassword}
                            onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-100/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-mono"
                            placeholder="Masukkan password dari admin"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password Baru</label>
                        <input
                            type="password"
                            required
                            value={formData.newPassword}
                            onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-100/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                            placeholder="Password baru Anda"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Konfirmasi Password Baru</label>
                        <input
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-100/50 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                            placeholder="Ulangi password baru"
                        />
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            {isLoading ? 'Memproses...' : 'Ubah Password & Masuk'}
                        </button>

                        <button
                            type="button"
                            onClick={logout}
                            className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
