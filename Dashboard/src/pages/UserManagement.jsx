import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL } from '../config'

export default function UserManagement() {
    const { user, isAdmin } = useAuth()
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    // Form State
    const [showAddModal, setShowAddModal] = useState(false)
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' })
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitError, setSubmitError] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await fetch(`${API_BASE_URL}/admin/users`)
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || 'Gagal mengambil data user')
            }
            const data = await response.json()
            setUsers(data.users || [])
        } catch (err) {
            if (err.message === 'Failed to fetch') {
                setError('Tidak dapat terhubung ke server. Pastikan API berjalan di ' + API_BASE_URL)
            } else {
                setError(err.message)
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Confirm Modal States
    const [deleteModal, setDeleteModal] = useState({ show: false, userId: null })
    const [resetConfirmModal, setResetConfirmModal] = useState({ show: false, userId: null, username: '' })

    // Action Handlers (Membuka Modal)
    const openDeleteModal = (userId) => {
        const id = Number(userId)
        if (id === 1) {
            alert('User dengan ID 1 tidak dapat dihapus!')
            return
        }
        setDeleteModal({ show: true, userId: id })
    }

    const openResetModal = (userId, username) => {
        const id = Number(userId)
        if (id === 1) {
            alert('Password user dengan ID 1 (Admin Utama) tidak dapat di-reset!')
            return
        }
        setResetConfirmModal({ show: true, userId: id, username })
    }

    // Execution Handlers (Dipanggil dari Modal)
    const confirmDelete = async () => {
        const id = deleteModal.userId
        setDeleteModal({ show: false, userId: null }) // Tutup modal dulu

        try {
            console.log(`Sending delete request for user ${id}...`)
            const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Gagal menghapus user')
            }

            console.log('Delete success')
            alert('User berhasil dihapus!')
            fetchUsers()
        } catch (err) {
            console.error('Delete error:', err)
            alert('Error: ' + err.message)
        }
    }

    const confirmReset = async () => {
        const { userId: id, username } = resetConfirmModal
        setResetConfirmModal({ show: false, userId: null, username: '' }) // Tutup modal

        try {
            console.log(`Sending reset request for user ${id}...`)
            const response = await fetch(`${API_BASE_URL}/admin/users/${id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Gagal reset password')
            }

            console.log('Reset success')
            setResetModal({ show: true, username, tempPassword: data.temporary_password })
        } catch (err) {
            console.error('Reset error:', err)
            alert('Error: ' + err.message)
        }
    }

    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleAddUser = async (e) => {
        e.preventDefault()
        setSubmitError('')

        if (newUser.password !== confirmPassword) {
            setSubmitError('Password dan Konfirmasi Password tidak cocok.')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Gagal membuat user')
            }

            setShowAddModal(false)
            setNewUser({ username: '', password: '', role: 'user' })
            setConfirmPassword('')
            fetchUsers()
        } catch (err) {
            if (err.message === 'Failed to fetch') {
                setSubmitError('Tidak dapat terhubung ke server. Pastikan API berjalan.')
            } else {
                setSubmitError(err.message)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const [resetModal, setResetModal] = useState({ show: false, username: '', tempPassword: '' })

    if (!isAdmin) {
        return (
            <div className="page-section">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
                    Akses Ditolak. Halaman ini hanya untuk Admin.
                </div>
            </div>
        )
    }

    return (
        <div className="page-section">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Manajemen User</h2>
                    <p className="text-slate-600 mt-1">Kelola akses pengguna sistem</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                    + Tambah User
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>
            ) : (
                <div className="space-y-4">
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dibuat</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">#{u.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{u.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                {u.id !== 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openResetModal(u.id, u.username)}
                                                        className="px-3 py-1 text-amber-600 hover:text-amber-900 hover:bg-amber-50 rounded transition-colors"
                                                        title="Reset Password"
                                                    >
                                                        Reset
                                                    </button>
                                                ) : (
                                                    <span className="px-3 py-1 text-slate-300 cursor-not-allowed" title="Password Admin Utama tidak dapat di-reset">
                                                        Reset
                                                    </span>
                                                )}
                                                {u.id !== 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal(u.id)}
                                                        className="px-3 py-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        Hapus
                                                    </button>
                                                ) : (
                                                    <span className="px-3 py-1 text-slate-300 cursor-not-allowed" title="User utama tidak dapat dihapus">
                                                        Hapus
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {users.map((u) => (
                            <div key={u.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{u.username}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">ID User: #{u.id}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                                    <span>Dibuat: {new Date(u.created_at).toLocaleDateString()}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    {u.id !== 1 ? (
                                        <button
                                            onClick={() => openResetModal(u.id, u.username)}
                                            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold border border-amber-100 active:bg-amber-100 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-1.114 3.796M15 7a2 2 0 00-1.114-1.5m4 4.5A2 2 0 0019 9a2 2 0 00-2 2M15 7a2 2 0 00-1.114 1.5M13 3v2m0 0a2 2 0 01-2-2m2 2a2 2 0 002-2m-2 2l-2-2m2 2l2-2" />
                                            </svg>
                                            Reset
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-center py-2.5 px-4 bg-slate-50 text-slate-400 rounded-lg text-sm font-bold border border-slate-100 opacity-60">
                                            Admin Utama
                                        </div>
                                    )}

                                    {u.id !== 1 ? (
                                        <button
                                            onClick={() => openDeleteModal(u.id)}
                                            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-100 active:bg-red-100 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Hapus
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-center py-2.5 px-4 bg-slate-50 text-slate-400 rounded-lg text-sm font-bold border border-slate-100 opacity-60">
                                            LOCKED
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Tambah User Baru</h3>

                        {submitError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                                {submitError}
                            </div>
                        )}

                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Konfirmasi Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="user">User Biasa</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Memproses...
                                        </>
                                    ) : (
                                        'Buat User'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            )}

            {deleteModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Hapus User?</h3>
                        <p className="text-slate-600 text-center mb-6">User yang dihapus tidak dapat dikembalikan lagi. Pastikan Anda yakin.</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal({ show: false, userId: null })}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resetConfirmModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-1.114 3.796M15 7a2 2 0 00-1.114-1.5m4 4.5A2 2 0 0019 9a2 2 0 00-2 2M15 7a2 2 0 00-1.114 1.5M13 3v2m0 0a2 2 0 01-2-2m2 2a2 2 0 002-2m-2 2l-2-2m2 2l2-2" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Reset Password?</h3>
                        <p className="text-slate-600 text-center mb-6">Password untuk user <strong>{resetConfirmModal.username}</strong> akan di-reset dan diganti dengan password acak baru.</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setResetConfirmModal({ show: false, userId: null, username: '' })}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmReset}
                                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                            >
                                Ya, Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Result Modal */}
            {resetModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Reset Password Berhasil</h3>
                        <p className="text-slate-600 text-sm mb-4">
                            Password sementara untuk user <span className="font-semibold text-slate-900">{resetModal.username}</span>:
                        </p>

                        <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 mb-6 font-mono text-xl font-bold text-slate-800 tracking-wider select-all">
                            {resetModal.tempPassword}
                        </div>

                        <button
                            onClick={() => setResetModal({ show: false, username: '', tempPassword: '' })}
                            className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
