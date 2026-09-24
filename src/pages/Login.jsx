import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function Login() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [rememberCode, setRememberCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const savedCode = localStorage.getItem('savedCode');
    if (savedCode) {
      setCode(savedCode);
      setRememberCode(true);
    }
  }, []);

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

      if (rememberCode) {
        localStorage.setItem('savedCode', code);
      } else {
        localStorage.removeItem('savedCode');
      }

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
    <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-teal-700 mb-6 text-center">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="パスワードを入力"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberCode"
              checked={rememberCode}
              onChange={(e) => setRememberCode(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="rememberCode" className="text-sm text-gray-600">
              コードを保存する
            </label>
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
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl transition-colors"
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
      <footer
  onClick={() => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 5) {
      navigate('/test-login');
    }
  }}
  className="fixed bottom-4 text-center text-xs text-gray-400 w-full select-none"
    >
      © 2026 staffmanagement
    </footer>
    </div>
  );
}

export default Login;