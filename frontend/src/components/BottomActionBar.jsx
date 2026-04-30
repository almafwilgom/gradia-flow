export default function BottomActionBar({ children, className = '' }) {
  return (
    <div className={`fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-slate-200 p-4 safe-area-inset-bottom z-30 ${className}`}>
      <div className="max-w-5xl mx-auto flex gap-3">
        {children}
      </div>
    </div>
  );
}
