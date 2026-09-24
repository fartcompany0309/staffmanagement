import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function TestLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError({ message: data.error || 'ログインに失敗しました', code: data.errorCode || 'AUTH-000' });
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('justLoggedIn', 'true');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError({ message: '通信エラーが発生しました', code: 'SYS-002', detail: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-4">
          <span className="inline-block bg-gray-700 text-white text-xs px-3 py-1 rounded-full">
            🧪 検証用ログイン
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-700 mb-6 text-center">
          ログイン
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              コード
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="コードを入力"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error.message}
              {error.code && (
                <span className="block text-xs text-red-400 mt-1">
                  エラーコード: {error.code}
                </span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>

      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default TestLogin;