import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

const NAV_ITEMS = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    path: "/",
    icon: "M3 13h1v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7h1c.4 0 .77-.24.92-.62.15-.37.07-.8-.22-1.09l-8.99-9a.996.996 0 0 0-1.41 0l-9.01 9c-.29.29-.37.72-.22 1.09s.52.62.92.62Zm7 7v-5h4v5zm2-15.59 6 6V20h-2v-5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v5H6v-9.59z",
    viewBox: "0 0 24 24",
  },
  {
    id: "nav-sensor",
    label: "Sensor",
    submenu: true,
    icon: [
      "M9 9h6v6H9z",
      "M20 6c0-1.1-.9-2-2-2h-2V2h-2v2h-4V2H8v2H6c-1.1 0-2 .9-2 2v2H2v2h2v4H2v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h4v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-4h2V8h-2zM6 18V6h12v12z",
    ],
    viewBox: "0 0 24 24",
    items: [
      { label: "Lingkungan", path: "/sensor/dht22", subLabel: "Suhu & Kelembapan" },
      { label: "Gas & Asap", path: "/sensor/mq2", subLabel: "Kualitas Udara" },
      { label: "Listrik", path: "/sensor/pzem", subLabel: "Daya & Energi" },
      { label: "Cahaya", path: "/sensor/bh1750", subLabel: "Intensitas Cahaya" },
    ],
  },
  {
    id: "nav-relay",
    label: "Kontrol Relay (4)",
    path: "/relay",
    icon: "m5,15h5v6c0,.43.28.82.69.95.1.03.21.05.31.05.31,0,.62-.15.81-.41l8-11c.22-.3.25-.71.08-1.04-.17-.34-.52-.55-.89-.55h-5V3c0-.43-.28-.82-.69-.95-.41-.13-.86.01-1.12.36L4.19,13.41c-.22.3-.25.71-.08,1.04.17.34.52.55.89.55Zm7-8.92v3.92c0,.55.45,1,1,1h4.04l-5.04,6.92v-3.92c0-.55-.45-1-1-1h-4.04l5.04-6.92Z",
    viewBox: "0 0 24 24",
  },
  {
    id: "nav-history",
    label: "History",
    path: "/history",
    icon: [
      "M21.21 8.11c-.25-.59-.56-1.16-.92-1.7-.36-.53-.77-1.03-1.22-1.48s-.95-.86-1.48-1.22c-.54-.36-1.11-.67-1.7-.92-.6-.26-1.24-.45-1.88-.58-1.31-.27-2.72-.27-4.03 0-.64.13-1.27.33-1.88.58-.59.25-1.16.56-1.7.92-.53.36-1.03.77-1.48 1.22-.17.17-.32.35-.48.52L1.99 3v6h6L5.86 6.87c.15-.18.31-.36.48-.52.36-.36.76-.69 1.18-.98.43-.29.89-.54 1.36-.74.48-.2.99-.36 1.5-.47 1.05-.21 2.18-.21 3.23 0 .51.11 1.02.26 1.5.47.47.2.93.45 1.36.74.42.29.82.62 1.18.98s.69.76.98 1.18c.29.43.54.89.74 1.36.2.48.36.99.47 1.5.11.53.16 1.07.16 1.61a7.85 7.85 0 0 1-.63 3.11c-.2.47-.45.93-.74 1.36-.29.42-.62.82-.98 1.18s-.76.69-1.18.98c-.43.29-.89.54-1.36.74-.48.2-.99.36-1.5.47-1.05.21-2.18.21-3.23 0a8 8 0 0 1-1.5-.47c-.47-.2-.93-.45-1.36-.74-.42-.29-.82-.62-1.18-.98s-.69-.76-.98-1.18c-.29-.43-.54-.89-.74-1.36-.2-.48-.36-.99-.47-1.5A8 8 0 0 1 3.99 12h-2c0 .68.07 1.35.2 2.01.13.64.33 1.27.58 1.88.25.59.56 1.16.92 1.7.36.53.77 1.03 1.22 1.48s.95.86 1.48 1.22c.54.36 1.11.67 1.7.92.6.26 1.24.45 1.88.58.66.13 1.33.2 2.01.2s1.36-.07 2.01-.2c.64-.13 1.27-.33 1.88-.58.59-.25 1.16-.56 1.7-.92.53-.36 1.03-.77 1.48-1.22s.86-.95 1.22-1.48c.36-.54.67-1.11.92-1.7.26-.6.45-1.24.58-1.88.13-.66.2-1.34.2-2.01s-.07-1.35-.2-2.01c-.13-.64-.33-1.27-.58-1.88Z",
      "M11 7v6h6v-2h-4V7z",
    ],
    viewBox: "0 0 24 24",
  },
  {
    id: "nav-config",
    label: "Pengaturan",
    submenu: true,
    adminOnly: true,
    icon: [
      "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4m0 6c-1.08 0-2-.92-2-2s.92-2 2-2 2 .92 2 2-.92 2-2 2",
      "m20.42 13.4-.51-.29c.05-.37.08-.74.08-1.11s-.03-.74-.08-1.11l.51-.29c.96-.55 1.28-1.78.73-2.73l-1-1.73a2.006 2.006 0 0 0-2.73-.73l-.53.31c-.58-.46-1.22-.83-1.9-1.11v-.6c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v.6c-.67.28-1.31.66-1.9 1.11l-.53-.31c-.96-.55-2.18-.22-2.73.73l-1 1.73c-.55.96-.22 2.18.73 2.73l.51.29c-.05.37-.08.74-.08 1.11s.03.74.08 1.11l-.51.29c-.96.55-1.28 1.78-.73 2.73l1 1.73c.55.95 1.77 1.28 2.73.73l.53-.31c.58.46 1.22.83 1.9 1.11v.6c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-.6a8.7 8.7 0 0 0 1.9-1.11l.53.31c.95.55 2.18.22 2.73-.73l1-1.73c.55-.96.22-2.18-.73-2.73m-2.59-2.78c.11.45.17.92.17 1.38s-.06.92-.17 1.38a1 1 0 0 0 .47 1.11l1.12.65-1 1.73-1.14-.66c-.38-.22-.87-.16-1.19.14-.68.65-1.51 1.13-2.38 1.4-.42.13-.71.52-.71.96v1.3h-2v-1.3c0-.44-.29-.83-.71-.96-.88-.27-1.7-.75-2.38-1.4a1.01 1.01 0 0 0-1.19-.15l-1.14.66-1-1.73 1.12-.65c.39-.22.58-.68.47-1.11-.11-.45-.17-.92-.17-1.38s.06-.93.17-1.38A1 1 0 0 0 5.7 9.5l-1.12-.65 1-1.73 1.14.66c.38.22.87.16 1.19-.14.68-.65 1.51-1.13 2.38-1.4.42-.13.71-.52.71-.96v-1.3h2v1.3c0 .44.29.83.71.96.88.27 1.7.75 2.38 1.4.32.31.81.36 1.19.14l1.14-.66 1 1.73-1.12.65c-.39.22-.58.68-.47 1.11Z",
    ],
    viewBox: "0 0 24 24",
    items: [
      { label: "Broker MQTT", path: "/settings/broker" },
      { label: "Threshold Sensor", path: "/settings/threshold" },
    ],
  },
  {
    id: "nav-profile",
    label: "Profil User",
    path: "/profile",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
    viewBox: "0 0 24 24",
  },
  {
    id: "nav-users",
    label: "Users",
    path: "/users",
    icon: "M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    viewBox: "0 0 24 24",
    adminOnly: true,
  },
];

// Profile Section Component
function ProfileSection({ isCollapsed, onClose }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
    if (onClose) onClose();
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setProfileOpen(!profileOpen)}
        className={`w-full flex items-center gap-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors ${isCollapsed ? "md:justify-center" : ""
          }`}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
          <img
            src={user?.avatar_url ? `${API_BASE_URL}${user.avatar_url}` : `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=0D9488&color=fff`}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden w-full h-full items-center justify-center">
            {user?.username?.charAt(0).toUpperCase() || "A"}
          </div>
        </div>
        <div className={`text-left flex-1 ${isCollapsed ? "md:hidden" : ""}`}>
          <p className="text-sm font-medium text-white truncate">
            {user?.username || "Guest"}
          </p>
          <p className="text-xs text-teal-400 capitalize">{user?.role || "User"}</p>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""
            } ${isCollapsed ? "md:hidden" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {profileOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setProfileOpen(false)}
          />
          <div
            className={`absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-lg shadow-xl border border-slate-800 overflow-hidden z-20 ${isCollapsed ? "md:left-0 md:right-auto md:w-48" : ""
              }`}
          >
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-3"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Keluar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) {
  const location = useLocation();
  const [sensorOpen, setSensorOpen] = useState(() =>
    location.pathname.startsWith("/sensor")
  );
  const [configOpen, setConfigOpen] = useState(() =>
    location.pathname.startsWith("/settings")
  );
  const { isAdmin } = useAuth();

  // 60-30-10 Theme Colors:
  // 60% (Secondary/Background): slate-800/slate-900 (Dark sidebar)
  // 30% (Text/Elements): slate-300/slate-400 (Lighter text elements)
  // 10% (Accent): teal-500 (CTA, active states)

  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col h-full md:h-screen w-64 transition-all duration-200 ease-out ${isCollapsed ? "md:w-16" : "md:w-64"
        }`}
    >
      {/* Header: always visible on mobile, collapsible on desktop */}
      <div className="p-6">
        {/* Mobile header (always shown) */}
        <div className="md:hidden mt-3">
          <h1 className="text-2xl font-bold text-white">Control Panel</h1>
          <p className="text-sm text-slate-400">v1.0</p>
          <div className="border-b border-slate-800 mt-3"></div>
        </div>

        {/* Desktop header */}
        {isCollapsed ? (
          <div className="hidden md:flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Control Panel</h1>
                <p className="text-xs text-slate-400">v1.0</p>
              </div>
            </div>
            <div className="border-b border-slate-800 mt-4"></div>
          </div>
        )}
      </div>

      {/* Close button for mobile */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
        aria-label="Close Sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Navigation */}
      <nav
        className={`flex-1 overflow-y-auto ${isCollapsed ? "md:px-2 md:pb-3" : "px-4 pb-6"
          } space-y-2`}
      >
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          if (item.submenu) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.id === 'nav-sensor') {
                      setSensorOpen(!sensorOpen);
                    } else if (item.id === 'nav-config') {
                      setConfigOpen(!configOpen);
                    }
                  }}
                  className={`nav-link w-full text-left flex items-center px-4 py-3.5 ${isCollapsed
                    ? "md:justify-center md:px-3 md:py-3"
                    : "md:px-4 md:py-3"
                    } rounded-lg transition-colors hover:bg-slate-800 hover:text-white group relative`}
                  title={isCollapsed ? item.label : ""}
                >
                  <svg
                    className={`w-5 h-5 mr-3 ${isCollapsed ? "md:mr-0" : ""}`}
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    viewBox={item.viewBox || "0 0 16 16"}
                  >
                    {Array.isArray(item.icon) ? (
                      item.icon.map((d, i) => <path key={i} d={d} />)
                    ) : (
                      <path d={item.icon} />
                    )}
                  </svg>
                  <span
                    className={`font-medium flex-1 ${isCollapsed ? "md:hidden" : ""
                      }`}
                  >
                    {item.label}
                  </span>
                  <svg
                    className={`w-4 h-4 transform transition-transform duration-200 ${(item.id === 'nav-sensor' ? sensorOpen : configOpen) ? "rotate-180" : ""
                      } ${isCollapsed ? "md:hidden" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  {isCollapsed && (
                    <div className="hidden group-hover:block absolute left-20 top-0 bg-slate-800 text-white px-2 py-1 rounded whitespace-nowrap text-sm z-40">
                      {item.label}
                    </div>
                  )}
                </button>
                <div
                  className={`pl-8 mt-1 space-y-1 overflow-hidden transition-all duration-200 ease-out ${(item.id === 'nav-sensor' ? sensorOpen : configOpen) ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                    } ${isCollapsed ? "md:hidden" : ""}`}
                >
                  {item.items.map((subItem) => (
                    <NavLink
                      key={subItem.path}
                      to={subItem.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center px-4 py-2.5 rounded-lg text-sm ${isActive
                          ? "bg-teal-500/10 border-l-4 border-teal-500 text-teal-300 font-semibold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50"
                        }`
                      }
                    >
                      <div className="flex flex-col">
                        <span>{subItem.label}</span>
                        {subItem.subLabel && (
                          <span className="text-[10px] opacity-60 font-normal">{subItem.subLabel}</span>
                        )}
                      </div>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link flex items-center px-4 py-3.5 ${isCollapsed ? "md:justify-center md:px-3 md:py-3" : ""
                } rounded-lg transition-colors group relative ${isActive
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-500/20"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50"
                }`
              }
              title={isCollapsed ? item.label : ""}
            >
              <svg
                className={`w-5 h-5 mr-3 ${isCollapsed ? "md:mr-0" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox={item.viewBox || "0 0 16 16"}
              >
                {Array.isArray(item.icon) ? (
                  item.icon.map((d, i) => <path key={i} d={d} />)
                ) : (
                  <path d={item.icon} />
                )}
              </svg>
              <span className={`font-medium ${isCollapsed ? "md:hidden" : ""}`}>
                {item.label}
              </span>
              {isCollapsed && (
                <div className="hidden group-hover:block absolute left-20 top-0 bg-slate-800 text-white px-2 py-1 rounded whitespace-nowrap text-sm z-40">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div
        className={`mt-auto border-t border-slate-800 p-4 space-y-3 ${isCollapsed ? "md:p-2 md:space-y-2" : "md:p-4 md:space-y-3"
          }`}
      >
        {/* Profile Section */}
        <ProfileSection isCollapsed={isCollapsed} onClose={onClose} />

        <div
          className={`text-xs text-slate-500 text-center ${isCollapsed ? "md:hidden" : ""
            }`}
        >
          &copy; 2025 Dashboard by Anomali
        </div>
      </div>
    </aside>
  );
}
