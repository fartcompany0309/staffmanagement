import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function SystemSettingsAdmin() {
  const navigate = useNavigate();
  const [count, setCount] = useState('3');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchSetting();
  }, []);

  const fetchSetting = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/systemSettings?key=dashboard_announcement_count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok && data.value) {
        setCount(data.value);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/systemSettings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: 'dashboard_announcement_count', value: count }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('設定を保存しました');
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">システム設定</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ダッシュボードに表示するお知らせ件数
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </div>
      </main>

      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default SystemSettingsAdmin;