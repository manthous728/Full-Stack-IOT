import { createContext, useContext, useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

const AuthContext = createContext(null)
const API_URL = API_BASE_URL

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [adminExists, setAdminExists] = useState(null)

    useEffect(() => {
        // Check localStorage for existing session
        const storedUser = localStorage.getItem('currentUser')
        if (storedUser) {
            setUser(JSON.parse(storedUser))
        }

        // Check if admin exists
        checkAdminExists()
        setIsLoading(false)
    }, [])

    const checkAdminExists = async () => {
        try {
            const response = await fetch(`${API_URL}/auth/check-admin`)
            const data = await response.json()
            setAdminExists(data.hasAdmin)
            return data.hasAdmin
        } catch (error) {
            console.error('Error checking admin:', error)
            // Fallback to localStorage check
            const adminData = localStorage.getItem('adminUser')
            const exists = adminData !== null
            setAdminExists(exists)
            return exists
        }
    }

    const login = async (username, password) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            if (!response.ok) {
                const error = await response.json()
                return { success: false, error: error.detail || 'Login gagal' }
            }

            const data = await response.json()
            const userData = data.user
            setUser(userData)
            localStorage.setItem('currentUser', JSON.stringify(userData))
            return { success: true }
        } catch (error) {
            console.error('Login error:', error)
            // Fallback to localStorage
            const adminData = localStorage.getItem('adminUser')
            if (adminData) {
                const admin = JSON.parse(adminData)
                if (username === admin.username && password === admin.password) {
                    const userData = { username, isAdmin: true }
                    setUser(userData)
                    localStorage.setItem('currentUser', JSON.stringify(userData))
                    return { success: true }
                }
            }
            return { success: false, error: 'Username atau password salah' }
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('currentUser')
    }

    const setupAdmin = async (username, password) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role: 'admin' })
            })

            if (!response.ok) {
                const error = await response.json()
                return { success: false, error: error.detail || 'Registrasi gagal' }
            }

            setAdminExists(true)
            // Also store in localStorage as backup
            localStorage.setItem('adminUser', JSON.stringify({ username, password }))
            return { success: true }
        } catch (error) {
            console.error('Setup error:', error)
            // Fallback to localStorage
            localStorage.setItem('adminUser', JSON.stringify({ username, password }))
            setAdminExists(true)
            return { success: true }
        }
    }

    const updateProfile = async (currentPassword, newUsername, newPassword) => {
        try {
            if (!user?.id) return { success: false, error: 'User ID not found' }

            const body = {
                user_id: user.id,
                current_password: currentPassword
            }
            if (newUsername) body.username = newUsername
            if (newPassword) body.new_password = newPassword

            const response = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const error = await response.json()
                return { success: false, error: error.detail || 'Update profil gagal' }
            }

            const data = await response.json()
            const updatedUser = data.user
            setUser(updatedUser)
            localStorage.setItem('currentUser', JSON.stringify(updatedUser))

            // Update backup adminUser if it matches
            const adminData = localStorage.getItem('adminUser')
            if (adminData) {
                const admin = JSON.parse(adminData)
                if (user.username === admin.username) {
                    const newAdmin = {
                        username: updatedUser.username,
                        password: newPassword || admin.password
                    }
                    localStorage.setItem('adminUser', JSON.stringify(newAdmin))
                }
            }

            return { success: true }
        } catch (error) {
            console.error('Update profile error:', error)
            return { success: false, error: 'Gagal menghubungi server' }
        }
    }

    const updateUserLocal = (newData) => {
        if (!user) return
        const updatedUser = { ...user, ...newData }
        setUser(updatedUser)
        localStorage.setItem('currentUser', JSON.stringify(updatedUser))
    }

    const isAdminSetup = () => {
        return adminExists === true
    }

    const value = {
        user,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin || user?.role === 'admin' || false,
        isLoading,
        adminExists,
        login,
        logout,
        setupAdmin,
        isAdminSetup,
        checkAdminExists,
        checkAdminExists,
        updateProfile,
        updateUserLocal
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
