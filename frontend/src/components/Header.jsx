import { useNavigate } from 'react-router-dom';

export default function Header({ title, subtitle = null, showBack = false, className = '' }) {
  const navigate = useNavigate();

  return (
    <div className={`bg-white border-b border-slate-200 p-4 ${className}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="text-slate-600 hover:text-slate-900"
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
