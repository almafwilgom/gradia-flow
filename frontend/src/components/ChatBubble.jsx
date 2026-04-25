export default function ChatBubble({ message, isOwn = false, timestamp = null }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-slate-200 text-slate-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm break-words">{message}</p>
        {timestamp && (
          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-600'}`}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
