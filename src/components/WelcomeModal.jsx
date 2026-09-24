function WelcomeModal({ user, onClose }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center animate-fade-in">
        <div className="text-4xl mb-4">👋</div>
        <h2 className="text-xl font-bold text-teal-700 mb-1">
          ようこそ、{user.lastName} {user.firstName} さん
        </h2>
        <p className="text-gray-500 text-sm mb-6">本日もよろしくお願いします</p>
        <button
          onClick={onClose}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 rounded-xl transition-colors"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}

export default WelcomeModal;