import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MqttProvider } from './context/MqttContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import SetupAdmin from './pages/SetupAdmin'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import SensorDHT22 from './pages/SensorDHT22'
import SensorMQ2 from './pages/SensorMQ2'
import SensorPZEM from './pages/SensorPZEM'
import SensorBH1750 from './pages/SensorBH1750'
import Relay from './pages/Relay'
import History from './pages/History'
import BrokerSettings from './pages/BrokerSettings'
import ThresholdSettings from './pages/ThresholdSettings'
import ProfileSettings from './pages/ProfileSettings'
import UserManagement from './pages/UserManagement'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <MqttProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/setup" element={<SetupAdmin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="sensor/dht22" element={<SensorDHT22 />} />
              <Route path="sensor/mq2" element={<SensorMQ2 />} />
              <Route path="sensor/pzem" element={<SensorPZEM />} />
              <Route path="sensor/bh1750" element={<SensorBH1750 />} />
              <Route path="relay" element={<Relay />} />
              <Route path="history" element={<History />} />
              <Route path="settings">
                <Route index element={<Navigate to="/settings/broker" replace />} />
                <Route path="broker" element={<BrokerSettings />} />
                <Route path="threshold" element={<ThresholdSettings />} />
              </Route>
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MqttProvider>
    </AuthProvider>
  )
}

export default App
