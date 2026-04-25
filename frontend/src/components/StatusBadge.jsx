export default function StatusBadge({ status, className = '' }) {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    disabled: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-slate-100 text-slate-800',
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-yellow-100 text-yellow-800',
    excused: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
  };

  const style = statusStyles[status] || statusStyles.pending;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style} ${className}`}>
      {status?.toUpperCase() || 'UNKNOWN'}
    </span>
  );
}
