import { ArrowUpRightIcon, ArrowDownRightIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

export function StatsGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
          <div className="text-sm text-slate-500">{item.label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-2xl font-semibold text-slate-900">{item.value}</div>
            {item.delta !== undefined && (
              <span
                className={clsx(
                  'inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full',
                  item.delta >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                )}
              >
                {item.delta >= 0 ? <ArrowUpRightIcon className="w-3 h-3 mr-1" /> : <ArrowDownRightIcon className="w-3 h-3 mr-1" />}
                {item.delta}%
              </span>
            )}
          </div>
          {item.sub && <div className="text-xs text-slate-500 mt-2">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}
