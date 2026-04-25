export default function BottomActionBar({ children, className = '' }) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-area-inset-bottom ${className}`}>
      <div className="max-w-2xl mx-auto flex gap-3">
        {children}
      </div>
    </div>
  );
}
