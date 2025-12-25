import { useState, useEffect, useMemo } from 'react';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import { API_BASE_URL } from '../config';
import HistoryStats from './HistoryStats';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    zoomPlugin
);

const SENSORS = [
    { id: 'dht22', name: 'Suhu & Kelembaban (DHT22)' },
    { id: 'mq2', name: 'Gas & Asap (MQ2)' },
    { id: 'pzem004t', name: 'Listrik (PZEM-004T)' },
    { id: 'bh1750', name: 'Cahaya (BH1750)' },
];

const RANGES = [
    { id: '1h', name: '1 Jam Terakhir' },
    { id: '6h', name: '6 Jam Terakhir' },
    { id: '12h', name: '12 Jam Terakhir' },
    { id: '24h', name: '24 Jam Terakhir' },
    { id: '7d', name: '7 Hari Terakhir' },
];

export default function SensorHistory() {
    const [selectedSensor, setSelectedSensor] = useState('dht22');
    const [selectedRange, setSelectedRange] = useState('24h');
    const [historyData, setHistoryData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [selectedSensor, selectedRange]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch History Data
            const historyRes = await fetch(`${API_BASE_URL}/history/${selectedSensor}?range=${selectedRange}`);
            if (!historyRes.ok) throw new Error('Gagal mengambil data history');
            const historyJson = await historyRes.json();
            setHistoryData(historyJson.data || []);

            // Fetch Stats
            const statsRes = await fetch(`${API_BASE_URL}/stats/${selectedSensor}?range=${selectedRange}`);
            if (statsRes.ok) {
                const statsJson = await statsRes.json();
                setStats(statsJson.stats);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        window.location.href = `${API_BASE_URL}/export/${selectedSensor}`;
    };

    // Prepare Chart Data
    const chartData = useMemo(() => {
        if (!historyData.length) return null;

        const labels = historyData.map(d => {
            // Adjust timestamp format based on bucket or raw timestamp
            const ts = d.time_bucket || d.timestamp;
            return new Date(ts).toLocaleString('id-ID', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        });

        let datasets = [];

        switch (selectedSensor) {
            case 'dht22':
                datasets = [
                    {
                        label: 'Suhu (°C)',
                        data: historyData.map(d => d.temperature),
                        borderColor: 'rgb(239, 68, 68)', // red-500
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        yAxisID: 'y',
                        fill: true,
                    },
                    {
                        label: 'Kelembaban (%)',
                        data: historyData.map(d => d.humidity),
                        borderColor: 'rgb(59, 130, 246)', // blue-500
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        yAxisID: 'y1',
                        fill: true,
                    }
                ];
                break;
            case 'mq2':
                datasets = [
                    {
                        label: 'Asap (Smoke)',
                        data: historyData.map(d => d.smoke),
                        borderColor: 'rgb(100, 116, 139)', // slate-500
                        backgroundColor: 'rgba(100, 116, 139, 0.1)',
                        fill: true,
                    },
                    {
                        label: 'LPG',
                        data: historyData.map(d => d.gas_lpg),
                        borderColor: 'rgb(249, 115, 22)', // orange-500
                        backgroundColor: 'rgba(0,0,0,0)',
                    },
                    {
                        label: 'CO',
                        data: historyData.map(d => d.gas_co),
                        borderColor: 'rgb(234, 179, 8)', // yellow-500
                        backgroundColor: 'rgba(0,0,0,0)',
                    }
                ];
                break;
            case 'pzem004t':
                datasets = [
                    {
                        label: 'Daya (Watt)',
                        data: historyData.map(d => d.power),
                        borderColor: 'rgb(234, 179, 8)', // yellow-500
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        yAxisID: 'y',
                        fill: true,
                    },
                    {
                        label: 'Tegangan (Volt)',
                        data: historyData.map(d => d.voltage),
                        borderColor: 'rgb(99, 102, 241)', // indigo-500
                        yAxisID: 'y1',
                        borderDash: [5, 5],
                    }
                ];
                break;
            case 'bh1750':
                datasets = [
                    {
                        label: 'Intensitas Cahaya (Lux)',
                        data: historyData.map(d => d.lux),
                        borderColor: 'rgb(245, 158, 11)', // amber-500
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        fill: true,
                    }
                ];
                break;
            default:
                break;
        }

        return { labels, datasets };
    }, [historyData, selectedSensor]);

    const chartOptions = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { position: 'top' },
            zoom: {
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x',
                },
                pan: {
                    enabled: true,
                    mode: 'x',
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: selectedSensor === 'dht22' ? 'Suhu (°C)' : 'Nilai' }
            },
            y1: {
                type: 'linear',
                display: selectedSensor === 'dht22' || selectedSensor === 'pzem004t',
                position: 'right',
                grid: { drawOnChartArea: false },
                title: { display: true, text: selectedSensor === 'dht22' ? 'Kelembaban (%)' : (selectedSensor === 'pzem004t' ? 'Volt' : '') }
            },
        },
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100/50">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <select
                        value={selectedSensor}
                        onChange={(e) => setSelectedSensor(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-100/50 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                        {SENSORS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <select
                        value={selectedRange}
                        onChange={(e) => setSelectedRange(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-100/50 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                        {RANGES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-semibold w-full md:w-auto justify-center"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Excel Data
                </button>
            </div>

            {loading && (
                <div className="flex justify-center p-12">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center">
                    {error}
                </div>
            )}

            {!loading && !error && historyData.length === 0 && (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-100/50">
                    Tidak ada data untuk rentang waktu ini.
                </div>
            )}

            {!loading && !error && historyData.length > 0 && (
                <>
                    {/* Stats Cards */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {selectedSensor === 'dht22' && (
                                <>
                                    <HistoryStats label="temperature" unit="°C" stats={stats} color="red" />
                                    <HistoryStats label="humidity" unit="%" stats={stats} color="blue" />
                                </>
                            )}
                            {selectedSensor === 'mq2' && (
                                <>
                                    <HistoryStats label="smoke" unit=" ppm" stats={stats} color="slate" />
                                    <HistoryStats label="gas_lpg" unit=" ppm" stats={stats} color="orange" />
                                    <HistoryStats label="gas_co" unit=" ppm" stats={stats} color="yellow" />
                                </>
                            )}
                            {selectedSensor === 'pzem004t' && (
                                <>
                                    <HistoryStats label="power" unit=" W" stats={stats} color="yellow" />
                                    <HistoryStats label="voltage" unit=" V" stats={stats} color="blue" />
                                    <HistoryStats label="current" unit=" A" stats={stats} color="green" />
                                </>
                            )}
                            {selectedSensor === 'bh1750' && (
                                <HistoryStats label="lux" unit=" lx" stats={stats} color="orange" />
                            )}
                        </div>
                    )}

                    {/* Chart */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100/50 h-[400px]">
                        {chartData && <Line options={chartOptions} data={chartData} />}
                    </div>

                    <p className="text-xs text-center text-slate-400">
                        Tip: Gunakan scroll mouse untuk zoom, dan drag untuk geser grafik.
                    </p>
                </>
            )}
        </div>
    );
}
