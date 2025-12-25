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

const defaultPZEMData = { power: [], voltage: [], current: [], energy: [], pf: [], time: [] }

export default function SensorPZEM() {
  const { sensorData, isConnected } = useMqtt()

  const pzem = sensorData.pzem004t || defaultPZEMData

  const [viewMode, setViewMode] = useState('realtime')
  const [historyRange, setHistoryRange] = useState('1h')
  const [isLoading, setIsLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  const [historyData, setHistoryData] = useState({
    labels: [],
    power: [],
    voltage: [],
    current: [],
    energy: [],
    power_factor: []
  })

  const [historyStats, setHistoryStats] = useState(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  useEffect(() => {
    const hasPzemData =
      pzem &&
      Array.isArray(pzem.power) && pzem.power.length > 0 &&
      Array.isArray(pzem.voltage) && pzem.voltage.length > 0

    setHasData(hasPzemData)

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [pzem])

  useEffect(() => {
    if (viewMode !== 'history') return

    const controller = new AbortController()

    const fetchHistory = async () => {
      try {
        setIsHistoryLoading(true)
        setHistoryError(null)
        setHistoryStats(null)

        const [dataRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/history/pzem004t?range=${historyRange}`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/stats/pzem004t?range=${historyRange}`, { signal: controller.signal })
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

        // Map API fields
        const powers = records.map(item => Number(item.power ?? 0))
        const voltages = records.map(item => Number(item.voltage ?? 0))
        const currents = records.map(item => Number(item.current ?? 0))
        const energies = records.map(item => Number(item.energy ?? 0))
        const pfs = records.map(item => Number(item.power_factor ?? 0))

        setHistoryData({
          labels,
          power: powers,
          voltage: voltages,
          current: currents,
          energy: energies,
          power_factor: pfs
        })

        setHistoryStats(statsJson.stats)

      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch PZEM history:', err)
        setHistoryError('Gagal mengambil data riwayat')
        setHistoryData({ labels: [], power: [], voltage: [], current: [], energy: [], power_factor: [] })
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
  const createChartData = (label, color, realtimeData, dataHistory) => {
    if ((viewMode === 'realtime' && (!hasData || !pzem)) || (viewMode === 'history' && historyData.labels.length === 0)) {
      return { labels: [], datasets: [] }
    }

    const isDt = viewMode === 'realtime'
    const labels = isDt ? (pzem.time || []) : historyData.labels
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

  const chartPower = useMemo(() => createChartData('Power (W)', { border: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.5)', bgFade: 'rgba(75, 192, 192, 0.05)' }, pzem.power, historyData.power), [pzem, hasData, viewMode, historyData])
  const chartVoltage = useMemo(() => createChartData('Voltage (V)', { border: 'rgb(201, 203, 207)', bg: 'rgba(201, 203, 207, 0.5)', bgFade: 'rgba(201, 203, 207, 0.05)' }, pzem.voltage, historyData.voltage), [pzem, hasData, viewMode, historyData])
  const chartCurrent = useMemo(() => createChartData('Current (A)', { border: 'rgb(255, 159, 64)', bg: 'rgba(255, 159, 64, 0.5)', bgFade: 'rgba(255, 159, 64, 0.05)' }, pzem.current, historyData.current), [pzem, hasData, viewMode, historyData])
  const chartEnergy = useMemo(() => createChartData('Energy (kWh)', { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.5)', bgFade: 'rgba(54, 162, 235, 0.05)' }, pzem.energy, historyData.energy), [pzem, hasData, viewMode, historyData])
  // Note: pzem.pf in MQTT vs historyData.power_factor
  const chartPowerFactor = useMemo(() => createChartData('Power Factor', { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.5)', bgFade: 'rgba(153, 102, 255, 0.05)' }, pzem.pf, historyData.power_factor), [pzem, hasData, viewMode, historyData])


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

  const pfOptions = {
    ...baseChartOptions,
    scales: {
      ...baseChartOptions.scales,
      y: { ...baseChartOptions.scales.y, min: 0, max: 1.1 }
    }
  }

  const latestPower = pzem.power?.length ? pzem.power[pzem.power.length - 1].toFixed(1) : '--'
  const latestVoltage = pzem.voltage?.length ? pzem.voltage[pzem.voltage.length - 1].toFixed(1) : '--'
  const latestCurrent = pzem.current?.length ? pzem.current[pzem.current.length - 1].toFixed(2) : '--'
  const latestEnergy = pzem.energy?.length ? pzem.energy[pzem.energy.length - 1].toFixed(3) : '--'
  const latestPF = pzem.pf?.length ? pzem.pf[pzem.pf.length - 1].toFixed(2) : '--'

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

  const realtimeStatsPower = calcStats(pzem.power)
  const realtimeStatsVoltage = calcStats(pzem.voltage)
  const realtimeStatsCurrent = calcStats(pzem.current)
  const realtimeStatsEnergy = calcStats(pzem.energy)
  const realtimeStatsPF = calcStats(pzem.pf)

  const formatLocalStats = (s, key) => s ? ({ [`${key}_min`]: s.min, [`${key}_avg`]: s.avg, [`${key}_max`]: s.max }) : null

  // EXPORT HANDLER
  const handleExport = () => {
    window.location.href = `${API_BASE_URL}/export/pzem004t`;
  };

  if (isLoading) return <div className="page-section"><div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div></div>
  if (!isConnected) return <div className="page-section"><div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-700">Tidak terhubung ke MQTT Broker.</div></div>
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
                Menunggu data sensor PZEM. Pastikan perangkat sensor terhubung dan mengirim data.
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
          <h2 className="text-2xl font-bold text-slate-800">Sensor PZEM004T</h2>
          <p className="text-slate-600 mt-1">Monitoring konsumsi daya listrik</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('realtime')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'realtime' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Realtime
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm font-medium text-slate-500">Power</p>
          <h3 className="text-3xl font-bold text-teal-500">{viewMode === 'realtime' ? `${latestPower} W` : (historyStats?.power_avg ? `${Number(historyStats.power_avg).toFixed(1)} W` : '--')}</h3>
          <HistoryStats stats={viewMode === 'realtime' ? formatLocalStats(realtimeStatsPower, 'power') : historyStats} label="power" unit="W" color="teal" isRealtime={viewMode === 'realtime'} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm font-medium text-slate-500">Voltage</p>
          <h3 className="text-3xl font-bold text-slate-500">{viewMode === 'realtime' ? `${latestVoltage} V` : (historyStats?.voltage_avg ? `${Number(historyStats.voltage_avg).toFixed(1)} V` : '--')}</h3>
          <HistoryStats stats={viewMode === 'realtime' ? formatLocalStats(realtimeStatsVoltage, 'voltage') : historyStats} label="voltage" unit="V" color="slate" isRealtime={viewMode === 'realtime'} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm font-medium text-slate-500">Current</p>
          <h3 className="text-3xl font-bold text-orange-500">{viewMode === 'realtime' ? `${latestCurrent} A` : (historyStats?.current_avg ? `${Number(historyStats.current_avg).toFixed(2)} A` : '--')}</h3>
          <HistoryStats stats={viewMode === 'realtime' ? formatLocalStats(realtimeStatsCurrent, 'current') : historyStats} label="current" unit="A" color="orange" isRealtime={viewMode === 'realtime'} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm font-medium text-slate-500">Energy</p>
          <h3 className="text-3xl font-bold text-indigo-500">{viewMode === 'realtime' ? `${latestEnergy} kWh` : (historyStats?.energy_avg ? `${Number(historyStats.energy_avg).toFixed(3)} kWh` : '--')}</h3>
          <HistoryStats stats={viewMode === 'realtime' ? formatLocalStats(realtimeStatsEnergy, 'energy') : historyStats} label="energy" unit="kWh" color="blue" isRealtime={viewMode === 'realtime'} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
          <p className="text-sm font-medium text-slate-500">Power Factor</p>
          <h3 className="text-3xl font-bold text-purple-500">{viewMode === 'realtime' ? latestPF : (historyStats?.power_factor_avg ? Number(historyStats.power_factor_avg).toFixed(2) : '--')}</h3>
          <HistoryStats stats={viewMode === 'realtime' ? formatLocalStats(realtimeStatsPF, 'power_factor') : historyStats} label="power_factor" unit="" color="purple" isRealtime={viewMode === 'realtime'} />
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Power (W)" data={chartPower} options={baseChartOptions} loading={isHistoryLoading && viewMode === 'history'} viewMode={viewMode} />
        <ChartCard title="Voltage (V)" data={chartVoltage} options={baseChartOptions} loading={isHistoryLoading && viewMode === 'history'} viewMode={viewMode} />
        <ChartCard title="Current (A)" data={chartCurrent} options={baseChartOptions} loading={isHistoryLoading && viewMode === 'history'} viewMode={viewMode} />
        <ChartCard title="Power Factor" data={chartPowerFactor} options={pfOptions} loading={isHistoryLoading && viewMode === 'history'} viewMode={viewMode} />
        <div className="md:col-span-2">
          <ChartCard title="Energy (kWh)" data={chartEnergy} options={baseChartOptions} loading={isHistoryLoading && viewMode === 'history'} viewMode={viewMode} />
        </div>
      </div>

      {viewMode === 'realtime' && (
        <p className="text-xs text-slate-400 mt-4 text-center">
          Terakhir diperbarui: {pzem.time[pzem.time.length - 1]}
        </p>
      )}
    </div>
  )
}

function ChartCard({ title, data, options, loading, viewMode }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100/50 chart-container-enter transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {viewMode === 'realtime' && (
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
            Min/Max/Avg: 100 data terakhir
          </span>
        )}
      </div>
      <div style={{ height: 260 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
    </div>
  )
}
