const CollapsibleSection = ({ title, isOpen, onToggle, color, children }) => (
    <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm transition-all md:mb-6">
        <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-4 transition-colors ${isOpen ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
        >
            <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                {color && <span className={`w-2 h-2 ${color} rounded-full mr-2`}></span>}
                {title}
            </h4>
            <svg
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <div
            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
        >
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                {children}
            </div>
        </div>
    </div>
);

export default CollapsibleSection;
