import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const navigate = useNavigate()
  const { login, isAuthenticated, checkAdminExists } = useAuth()

  // Initial Check - redirect to setup if no admin exists
  useEffect(() => {
    const init = async () => {
      setCheckingAdmin(true)
      const hasAdmin = await checkAdminExists()
      if (!hasAdmin) {
        navigate('/setup')
        return
      }
      if (isAuthenticated) {
        navigate('/')
      }
      setCheckingAdmin(false)
    }
    init()
  }, [isAuthenticated, navigate, checkAdminExists])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(formData.username, formData.password)
    setIsLoading(false)

    if (result.success) {
      setSuccess('Login Berhasil! Mengarahkan...')
      setTimeout(() => {
        navigate('/')
      }, 800)
    } else {
      setError(result.error || 'Username atau password salah.')
    }
  }

  // Show loading while checking admin
  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400">Memeriksa status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 py-16">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-teal-600/20 rounded-full blur-3xl opacity-50 animate-pulse-glow"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl opacity-50 animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md px-4 z-10 relative">
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/20 mb-4 transform transition-transform hover:scale-105">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Smart Home</h2>
            <p className="text-slate-400 text-sm mt-2 font-medium">
              Selamat datang, silakan login
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="group">
                <label className="block text-xs font-semibold text-slate-400 mb-1 ml-1 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-slate-800/50 border-2 border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all hover:bg-slate-800/70"
                    placeholder="Masukkan username"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-semibold text-slate-400 mb-1 ml-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-slate-800/50 border-2 border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all hover:bg-slate-800/70"
                    placeholder="Masukkan password"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <p className="text-xs text-slate-400">
                Lupa Password? <span className="text-teal-400 font-medium cursor-help" title="Hubungi Administrator untuk reset password">Hubungi Admin</span>
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-shake">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full py-4 px-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-8">
          © 2024 Smart Home IoT Dashboard
        </p>
      </div>
    </div>
  )
}

