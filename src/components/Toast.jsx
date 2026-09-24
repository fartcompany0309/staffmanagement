function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;

  const bgColor = type === 'success' ? 'bg-teal-500' : 'bg-red-500';

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-8 z-50 pointer-events-none">
      <div
        className={`${bgColor} text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 pointer-events-auto`}
      >
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Toast;