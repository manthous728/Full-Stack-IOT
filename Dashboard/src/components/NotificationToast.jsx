import { useMqtt } from '../context/MqttContext';

export default function NotificationToast() {
    const { notifications, dismissNotification, clearNotifications } = useMqtt();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 z-[100] flex flex-col gap-2 w-[92vw] md:w-auto md:max-w-sm">
            {notifications.length > 1 && (
                <button
                    onClick={clearNotifications}
                    className="self-center md:self-end text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-lg transition-all active:scale-95"
                >
                    Hapus Semua
                </button>
            )}
            {notifications.map((notif) => (
                <div
                    key={notif.id}
                    className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-toast-in flex items-start gap-3 ${notif.type === 'danger'
                        ? 'bg-red-600/90 border-red-400/50 text-white'
                        : notif.type === 'warning'
                            ? 'bg-amber-500/90 border-amber-400/50 text-white'
                            : 'bg-teal-600/90 border-teal-400/50 text-white'
                        }`}
                >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5 p-2 bg-white/20 rounded-xl">
                        {notif.type === 'danger' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        ) : notif.type === 'warning' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-90">{notif.sensor}</span>
                            <span className="text-[10px] font-medium opacity-70 bg-black/10 px-1.5 py-0.5 rounded-md">{notif.time}</span>
                        </div>
                        <p className="text-sm font-bold leading-tight tracking-tight drop-shadow-sm">{notif.message}</p>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => dismissNotification(notif.id)}
                        className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ))}

            <style jsx>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-toast-in {
          animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </div>
    );
}
