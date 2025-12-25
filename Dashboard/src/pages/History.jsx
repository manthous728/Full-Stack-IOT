import { useState } from 'react'
import { useMqtt } from '../context/MqttContext'

export default function History() {
  const { history, clearHistory } = useMqtt()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const exportExcelLog = () => {
    if (history.length === 0) return

    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();

      const data = history.map(item => ({
        "Waktu": item.time,
        "Peristiwa": item.event,
        "Status": item.status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wscols = [{ wch: 25 }, { wch: 40 }, { wch: 15 }];
      ws['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, "Riwayat Aktivitas");
      const filename = `activity_log_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      setMobileMenuOpen(false);
    }).catch(err => {
      console.error("Gagal load xlsx:", err);
    });
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
    setMobileMenuOpen(false)
  }

  const confirmDelete = () => {
    clearHistory()
    setShowDeleteModal(false)
  }

  return (
    <div className="page-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Riwayat Aktivitas</h2>
          <p className="text-slate-600 mt-1">Pantau aktivitas sistem smart home</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Desktop Buttons */}
          <div className="hidden md:flex gap-3">
            <button
              onClick={exportExcelLog}
              disabled={history.length === 0}
              className="w-32 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={history.length === 0}
              className="w-32 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus
            </button>
          </div>

          {/* Mobile Dropdown */}
          <div className="md:hidden relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Menu Aksi"
            >
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {mobileMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-20">
                  <button
                    onClick={exportExcelLog}
                    disabled={history.length === 0}
                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Log
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    disabled={history.length === 0}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hapus Log
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Peristiwa
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Belum ada riwayat aktivitas
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-700 whitespace-nowrap text-sm">{item.time}</td>
                    <td className="px-6 py-3 text-slate-700 text-sm">{item.event}</td>
                    <td className={`px-6 py-3 font-semibold text-sm ${item.statusClass || 'text-slate-600'}`}>
                      {item.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {history.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm">
              <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Belum ada riwayat aktivitas
            </div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 border-l-4" style={{ borderColor: item.statusClass?.includes('text-green') ? '#10b981' : item.statusClass?.includes('text-red') ? '#ef4444' : item.statusClass?.includes('text-yellow') ? '#f59e0b' : '#94a3b8' }}>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{item.event}</h3>
                  <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${item.status.toLowerCase().includes('connect') ? 'bg-green-500' :
                      item.status.toLowerCase().includes('reconn') ? 'bg-yellow-500' :
                        item.status.toLowerCase().includes('off') || item.status.toLowerCase().includes('close') ? 'bg-red-500' :
                          'bg-slate-400'
                    }`} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${item.statusClass || 'bg-slate-100 text-slate-600'
                    } bg-opacity-10`}>
                    Status: {item.status}
                  </span>
                </div>
                <div className="pt-1 flex items-center gap-1.5 text-slate-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">
                    {item.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Semua Log?</h3>
              <p className="text-slate-600 mb-6">
                Tindakan ini tidak dapat dibatalkan. Semua log aktivitas akan dihapus permanen.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
