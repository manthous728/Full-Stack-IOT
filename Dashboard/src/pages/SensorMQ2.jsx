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

const defaultMQ2Data = { lpg: [], co: [], smoke: [], time: [] }

export default function SensorMQ2() {
  const { sensorData, isConnected } = useMqtt()

  const mq2 = sensorData.mq2 || defaultMQ2Data

  const [viewMode, setViewMode] = useState('realtime') // 'realtime' | 'history'
  const [historyRange, setHistoryRange] = useState('1h') // 1h,6h,12h,24h,7d
  const [isLoading, setIsLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [historyData, setHistoryData] = useState({ labels: [], lpg: [], co: [], smoke: [] })
  const [historyStats, setHistoryStats] = useState(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  useEffect(() => {
    const hasMq2Data =
      Array.isArray(mq2.lpg) && mq2.lpg.length > 0 &&
      Array.isArray(mq2.co) && mq2.co.length > 0 &&
      Array.isArray(mq2.smoke) && mq2.smoke.length > 0

    setHasData(hasMq2Data)

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [mq2])

  useEffect(() => {
    if (viewMode !== 'history') return

    const controller = new AbortController()

    const fetchHistory = async () => {
      try {
        setIsHistoryLoading(true)
        setHistoryError(null)
        setHistoryStats(null)

        const [dataRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/history/mq2?range=${historyRange}`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/stats/mq2?range=${historyRange}`, { signal: controller.signal })
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

        // MAP: API uses 'gas_lpg' and 'gas_co' now. 'smoke' stays 'smoke'
        const lpgs = records.map(item => Number(item.gas_lpg ?? 0))
        const cos = records.map(item => Number(item.gas_co ?? 0))
        const smokes = records.map(item => Number(item.smoke ?? 0))

        setHistoryData({ labels, lpg: lpgs, co: cos, smoke: smokes })
        setHistoryStats(statsJson.stats)

      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch MQ2 history:', err)
        setHistoryError('Gagal mengambil data riwayat')
        setHistoryData({ labels: [], lpg: [], co: [], smoke: [] })
      } finally {
        setIsHistoryLoading(false)
      }
    }

    fetchHistory()

    return () => {
      controller.abort()
    }
  }, [viewMode, historyRange])

  // Chart Generators
  const createChartData = (label, color, dataKey, realtimeData, dataHistory) => {
    if ((viewMode === 'realtime' && (!hasData || !mq2)) || (viewMode === 'history' && historyData.labels.length === 0)) {
      return { labels: [], datasets: [] }
    }

    const isDt = viewMode === 'realtime'
    const labels = isDt ? (mq2.time || []) : historyData.labels
    const data = isDt ? (realtimeData || []) : dataHistory

    return {
      labels,
      datasets: [{
        label,
        data: data.map(Number).filter(n => !isNaN(n)),
        borderColor: color.border,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, color.bg);
          gradient.addColorStop(1, color.bgFade);
          return gradient;
        },
        tension: 0.4,
        pointRadius: isDt ? 2 : 0,
        pointHoverRadius: 4,
        cubicInterpolationMode: 'monotone',
        spanGaps: true,
        fill: true
      }]
    }
  }

  const chartLPG = useMemo(() => createChartData('LPG', { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.5)', bgFade: 'rgba(153, 102, 255, 0.05)' }, 'lpg', mq2.lpg, historyData.lpg), [mq2, hasData, viewMode, historyData])

  const chartCO = useMemo(() => createChartData('CO', { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.5)', bgFade: 'rgba(255, 99, 132, 0.05)' }, 'co', mq2.co, historyData.co), [mq2, hasData, viewMode, historyData])

  const chartSmoke = useMemo(() => createChartData('Smoke', { border: 'rgb(75, 85, 99)', bg: 'rgba(75, 85, 99, 0.5)', bgFade: 'rgba(75, 85, 99, 0.05)' }, 'smoke', mq2.smoke, historyData.smoke), [mq2, hasData, viewMode, historyData])

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

  const latestLpg = mq2.lpg?.length > 0 ? mq2.lpg[mq2.lpg.length - 1] : '--'
  const latestCo = mq2.co?.length > 0 ? mq2.co[mq2.co.length - 1] : '--'
  const latestSmoke = mq2.smoke?.length > 0 ? mq2.smoke[mq2.smoke.length - 1] : '--'

  const calcStats = (values) => {
    if (!values || values.length === 0) return null
    const last100Values = values.slice(-100)
    const nums = last100Values.map(Number).filter(n => !isNaN(n))
    if (nums.length === 0) return null
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    return { min, avg, max }
  }

  const realtimeStatsLpg = calcStats(mq2.lpg)
  const realtimeStatsCo = calcStats(mq2.co)
  const realtimeStatsSmoke = calcStats(mq2.smoke)

  const formatLocalStats = (s, key) => s ? ({ [`${key}_min`]: s.min, [`${key}_avg`]: s.avg, [`${key}_max`]: s.max }) : null

  // MAP HISTORY STATS
  // API returns gas_lpg_avg ... we need lpg_avg for HistoryStats if label="lpg"
  const mappedHistoryStats = historyStats ? {
    ...historyStats,
    lpg_min: historyStats.gas_lpg_min,
    lpg_avg: historyStats.gas_lpg_avg,
    lpg_max: historyStats.gas_lpg_max,

    co_min: historyStats.gas_co_min,
    co_avg: historyStats.gas_co_avg,
    co_max: historyStats.gas_co_max,

    // smoke is same
  } : null

  // EXPORT HANDLER
  const handleExport = () => {
    window.location.href = `${API_BASE_URL}/export/mq2`;
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
                Menunggu data sensor MQ2. Pastikan perangkat sensor terhubung dan mengirim data.
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

  return (
    <div className="page-section sensor-card-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sensor MQ2</h2>
          <p className="text-slate-600 mt-1">Deteksi gas LPG, CO, dan asap</p>
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
              className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setHistoryRange(range.value)}
                className={`px-3 py-1.5 text-xs font-medium border-r border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${historyRange === range.value ? 'bg-teal-50 text-teal-600' : 'text-slate-600'
                  }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
        >
          <p className="text-sm font-medium text-slate-500">LPG</p>
          <h3 className="text-3xl font-bold text-purple-500">
            {viewMode === 'realtime' ? latestLpg : (mappedHistoryStats?.lpg_avg ? Number(mappedHistoryStats.lpg_avg).toFixed(0) : '--')}
          </h3>
          {viewMode === 'realtime' && (
            <HistoryStats stats={formatLocalStats(realtimeStatsLpg, 'lpg')} label="lpg" color="purple" isRealtime={true} />
          )}
          {viewMode === 'history' && (
            <HistoryStats stats={mappedHistoryStats} label="lpg" color="purple" />
          )}
        </div>
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
        >
          <p className="text-sm font-medium text-slate-500">CO</p>
          <h3 className="text-3xl font-bold text-red-500">
            {viewMode === 'realtime' ? latestCo : (mappedHistoryStats?.co_avg ? Number(mappedHistoryStats.co_avg).toFixed(0) : '--')}
          </h3>
          {viewMode === 'realtime' && (
            <HistoryStats stats={formatLocalStats(realtimeStatsCo, 'co')} label="co" color="red" isRealtime={true} />
          )}
          {viewMode === 'history' && (
            <HistoryStats stats={mappedHistoryStats} label="co" color="red" />
          )}
        </div>
        <div
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg"
        >
          <p className="text-sm font-medium text-slate-500">Smoke</p>
          <h3 className="text-3xl font-bold text-slate-700">
            {viewMode === 'realtime' ? latestSmoke : (mappedHistoryStats?.smoke_avg ? Number(mappedHistoryStats.smoke_avg).toFixed(0) : '--')}
          </h3>
          {viewMode === 'realtime' && (
            <HistoryStats stats={formatLocalStats(realtimeStatsSmoke, 'smoke')} label="smoke" color="slate" isRealtime={true} />
          )}
          {viewMode === 'history' && (
            <HistoryStats stats={mappedHistoryStats} label="smoke" color="slate" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LPG Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              LPG {viewMode === 'realtime' ? '(Realtime)' : '(Riwayat)'}
            </h3>
          </div>
          <div style={{ height: 260 }}>
            {isHistoryLoading && viewMode === 'history' ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <Line data={chartLPG} options={baseChartOptions} />
            )}
          </div>
        </div>

        {/* CO Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              CO {viewMode === 'realtime' ? '(Realtime)' : '(Riwayat)'}
            </h3>
          </div>
          <div style={{ height: 260 }}>
            {isHistoryLoading && viewMode === 'history' ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : (
              <Line data={chartCO} options={baseChartOptions} />
            )}
          </div>
        </div>

        {/* Smoke Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Smoke {viewMode === 'realtime' ? '(Realtime)' : '(Riwayat)'}
            </h3>
          </div>
          <div style={{ height: 260 }}>
            {isHistoryLoading && viewMode === 'history' ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-500"></div>
              </div>
            ) : (
              <Line data={chartSmoke} options={baseChartOptions} />
            )}
          </div>
        </div>
      </div>

      {viewMode === 'realtime' && (
        <p className="text-xs text-slate-400 mt-4 text-center">
          Terakhir diperbarui: {mq2.time[mq2.time.length - 1]}
        </p>
      )}
    </div>
  )
}
