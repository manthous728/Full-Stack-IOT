import { useMemo, useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import { useMqtt } from '../context/MqttContext'
import HistoryStats from '../components/HistoryStats'
import { API_BASE_URL } from '../config'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, zoomPlugin)

const defaultBH1750Data = { lux: [], time: [] }

export default function SensorBH1750() {
  const { sensorData, isConnected } = useMqtt()

  const luxData = sensorData.bh1750 || defaultBH1750Data

  const [viewMode, setViewMode] = useState('realtime') // 'realtime' | 'history'
  const [historyRange, setHistoryRange] = useState('1h') // 1h,6h,12h,24h,7d
  const [isLoading, setIsLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [historyData, setHistoryData] = useState({ labels: [], lux: [] })
  const [historyStats, setHistoryStats] = useState(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const [showLuxLevelModal, setShowLuxLevelModal] = useState(false)

  useEffect(() => {
    const hasLuxData =
      Array.isArray(luxData.lux) && luxData.lux.length > 0

    setHasData(hasLuxData)

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [luxData])

  useEffect(() => {
    if (viewMode !== 'history') return

    const controller = new AbortController()

    const fetchHistory = async () => {
      try {
        setIsHistoryLoading(true)
        setHistoryError(null)
        setHistoryStats(null)

        const [dataRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/history/bh1750?range=${historyRange}`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/stats/bh1750?range=${historyRange}`, { signal: controller.signal })
        ])

        if (!dataRes.ok) throw new Error(`History HTTP ${dataRes.status}`)
        if (!statsRes.ok) throw new Error(`Stats HTTP ${statsRes.status}`)

        const dataJson = await dataRes.json()
        const statsJson = await statsRes.json()

        const records = Array.isArray(dataJson) ? dataJson : (dataJson.data || [])

        const labels = records.map((item) => {
          if (!item.time_bucket) return item.timestamp ? new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
          const d = new Date(item.time_bucket)
          return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
        })

        const luxs = records.map(item => Number(item.lux ?? 0))

        setHistoryData({ labels, lux: luxs })
        setHistoryStats(statsJson.stats)

      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch BH1750 history:', err)
        setHistoryError('Gagal mengambil data riwayat')
        setHistoryData({ labels: [], lux: [] })
      } finally {
        setIsHistoryLoading(false)
      }
    }

    fetchHistory()

    return () => {
      controller.abort()
    }
  }, [viewMode, historyRange])

  // Single metric chart for light intensity
  const chartLux = useMemo(() => {
    if ((viewMode === 'realtime' && (!hasData || !luxData)) || (viewMode === 'history' && historyData.labels.length === 0)) {
      return { labels: [], datasets: [] }
    }

    const isDt = viewMode === 'realtime'
    const labels = isDt ? (luxData.time || []) : historyData.labels
    const data = isDt ? (luxData.lux || []) : historyData.lux

    return {
      labels,
      datasets: [
        {
          label: 'Intensitas Cahaya (lux)',
          data: data.map(Number).filter(n => !isNaN(n)),
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(255, 205, 86, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 205, 86, 0.05)');
            return gradient;
          },
          tension: 0.4, // Smoother curve
          pointRadius: isDt ? 2 : 0,
          pointHoverRadius: 4,
          cubicInterpolationMode: 'monotone', // Modern curve
          spanGaps: true,
          fill: true
        }
      ]
    }
  }, [luxData, hasData, viewMode, historyData])

  // Simple Base Options
  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 8,
        usePointStyle: true,
      },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { autoSkip: true, maxTicksLimit: 5, color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', font: { size: 10 } },
        beginAtZero: false,
      },
    },
  }

  const latestLux = luxData.lux.length > 0
    ? luxData.lux[luxData.lux.length - 1].toFixed(0)
    : '--'

  const calcStats = (values) => {
    if (!values || values.length === 0) return null
    // Ambil 100 data terakhir
    const last100Values = values.slice(-100)
    const nums = last100Values.map(Number).filter(n => !isNaN(n))
    if (nums.length === 0) return null
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    return { min, avg, max }
  }

  const realtimeStatsLux = calcStats(luxData.lux)

  const formatLocalStats = (s, key) => s ? ({ [`${key}_min`]: s.min, [`${key}_avg`]: s.avg, [`${key}_max`]: s.max }) : null

  // EXPORT HANDLER
  const handleExport = () => {
    window.location.href = `${API_BASE_URL}/export/bh1750`;
  };

  if (isLoading) {
    return (
      <div className="page-section">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="page-section">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Tidak terhubung ke MQTT Broker. Pastikan koneksi internet Anda stabil dan MQTT Broker berjalan.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="page-section">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Menunggu data sensor BH1750. Pastikan perangkat sensor terhubung dan mengirim data.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const TIME_RANGES = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '12h', label: '12 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
  ]

  const getLightLevel = (lux) => {
    if (lux === '--' || lux === null || lux === undefined) return 'N/A'
    const luxNum = parseFloat(lux)
    if (isNaN(luxNum)) return 'N/A'
    if (luxNum < 50) return 'Ekstra Rendah'
    if (luxNum < 150) return 'Rendah'
    if (luxNum < 175) return 'Sedang'
    if (luxNum < 200) return 'Standar I'
    if (luxNum < 300) return 'Standar II'
    if (luxNum < 450) return 'Standar III'
    if (luxNum < 700) return 'Tinggi'
    return 'Sangat Tinggi'
  }

  const getLightLevelColor = (lux) => {
    if (lux === '--' || lux === null || lux === undefined) return 'text-slate-400'
    const luxNum = parseFloat(lux)
    if (isNaN(luxNum)) return 'text-slate-400'
    if (luxNum < 50) return 'text-gray-500'
    if (luxNum < 150) return 'text-amber-600'
    if (luxNum < 175) return 'text-yellow-500'
    if (luxNum < 200) return 'text-lime-500'
    if (luxNum < 300) return 'text-green-500'
    if (luxNum < 450) return 'text-emerald-500'
    if (luxNum < 700) return 'text-teal-500'
    return 'text-cyan-500'
  }

  return (
    <div className="page-section sensor-card-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sensor BH1750</h2>
          <p className="text-slate-600 mt-1">Monitoring intensitas cahaya</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('realtime')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'realtime'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Realtime
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'history'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              History
            </button>
          </div>

          {viewMode === 'history' && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Excel
            </button>
          )}
        </div>
      </div>

      {viewMode === 'history' && (
        <div className="mb-6 flex justify-end">
          {/* Mobile Dropdown */}
          <div className="md:hidden w-full">
            <select
              value={historyRange}
              onChange={(e) => setHistoryRange(e.target.value)}
              className="w-full p-2 border border-slate-100/50 rounded-lg bg-white text-slate-700 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex bg-white border border-slate-100/50 rounded-md shadow-sm overflow-hidden">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setHistoryRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium border-r border-slate-100/50 last:border-0 hover:bg-slate-50 transition-colors ${historyRange === range.value ? 'bg-teal-50 text-teal-600' : 'text-slate-600'
                  }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Intensitas Cahaya</p>
            {/* <div className="p-2 rounded-full bg-yellow-100">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div> */}
          </div>
          <h3 className="text-3xl font-bold text-yellow-500 mt-2">{viewMode === 'realtime' ? `${latestLux} lux` : (historyStats?.lux_avg ? `${Number(historyStats.lux_avg).toFixed(0)} lux` : '--')}</h3>

          {viewMode === 'realtime' && (
            <HistoryStats stats={formatLocalStats(realtimeStatsLux, 'lux')} label="lux" unit=" lx" color="yellow" isRealtime={true} />
          )}
          {viewMode === 'history' && (
            <HistoryStats stats={historyStats} label="lux" unit=" lx" color="yellow" />
          )}
        </div>
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          onClick={() => setShowLuxLevelModal(true)}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Tingkat Pencahayaan</p>
            {/* <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg> */}
          </div>
          <h3 className={`text-3xl font-bold mt-2 ${viewMode === 'history' && historyStats ? getLightLevelColor(historyStats.lux_avg) : getLightLevelColor(latestLux)}`}>
            {viewMode === 'history' && historyStats ? getLightLevel(historyStats.lux_avg) : getLightLevel(latestLux)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Kondisi saat ini: {viewMode === 'history' ? 'Rata-rata' : 'Langsung'}</p>
          <p className="text-xs text-teal-500 mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Klik untuk lihat referensi
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 chart-container-enter transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {viewMode === 'realtime' ? 'Intensitas Cahaya' : 'Grafik Riwayat Cahaya'}
          </h3>
          {viewMode === 'realtime' && (
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
              Min/Max/Avg: 100 data terakhir
            </span>
          )}
        </div>

        {isHistoryLoading && viewMode === 'history' ? (
          <div className="h-[260px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div style={{ height: 260 }}>
            <Line data={chartLux} options={baseChartOptions} />
          </div>
        )}
      </div>

      {viewMode === 'realtime' && (
        <p className="text-xs text-slate-400 mt-4 text-center">
          Terakhir diperbarui: {luxData.time[luxData.time.length - 1]}
        </p>
      )}

      {/* Lux Level Reference Modal */}
      {showLuxLevelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLuxLevelModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 border-b border-slate-100/50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Referensi Tingkat Lux</h3>
              <button
                onClick={() => setShowLuxLevelModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-sm"><strong className="text-gray-600">Ekstra Rendah</strong> - &lt;50 Lux</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm"><strong className="text-amber-600">Rendah</strong> - &lt;150 Lux</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-sm"><strong className="text-yellow-600">Sedang</strong> - 150-175 Lux</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-lime-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-lime-500"></div>
                <span className="text-sm"><strong className="text-lime-600">Standar I</strong> - 200 Lux</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm"><strong className="text-green-600">Standar II</strong> - 300 Lux</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm"><strong className="text-emerald-600">Standar III</strong> - 450 Lux</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-teal-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                <span className="text-sm"><strong className="text-teal-600">Tinggi</strong> - 700 Lux</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-cyan-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                <span className="text-sm"><strong className="text-cyan-600">Sangat Tinggi</strong> - &gt;700 Lux</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
