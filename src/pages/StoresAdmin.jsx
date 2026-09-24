import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

// カタカナのみ許可する簡易変換(ひらがな入力をカタカナに自動変換)
function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function StoresAdmin() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [newName, setNewName] = useState('');
  const [newNameKana, setNewNameKana] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setStores(data.stores);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newNameKana.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName, nameKana: newNameKana }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('店舗を追加しました');
        setNewName('');
        setNewNameKana('');
        fetchStores();
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
        <h1 className="font-bold text-teal-700">配属店舗マスタ管理</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* 新規追加 */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <h2 className="font-bold text-gray-700 mb-1 text-sm">新規店舗を追加</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="店舗名(例: 渋谷店)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <input
              type="text"
              value={newNameKana}
              onChange={(e) => setNewNameKana(toKatakana(e.target.value))}
              placeholder="フリガナ(例: シブヤテン)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              onClick={handleAdd}
              disabled={isSaving}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2 rounded-xl text-sm transition-colors"
            >
              {isSaving ? '追加中...' : '追加する'}
            </button>
          </div>

          {/* 一覧 */}
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {stores.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                まだ店舗が登録されていません
              </p>
            ) : (
              stores.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <p className="text-sm text-gray-700">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.name_kana}</p>
                </div>
              ))
            )}
          </div>
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

export default StoresAdmin;