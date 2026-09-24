import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function DevReset() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/devReset`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setTables(data.items);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const fetchRecords = async (tableKey) => {
    setSelectedTable(tableKey);
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/devReset?target=${tableKey}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        setRecords(data.records);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/devReset`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target: selectedTable, id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage(data.message);
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">🛠 開発用データ管理</h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        <p className="text-xs text-gray-400 text-center">
          このページは開発用です。本番リリース前に削除してください。
        </p>

        {/* テーブル選択 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 max-w-lg mx-auto">
          <h2 className="font-bold text-gray-700 mb-2 text-sm">対象を選択</h2>
          <div className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <button
                key={t.key}
                onClick={() => fetchRecords(t.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTable === t.key
                    ? 'bg-teal-500 text-white'
                    : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* レコード一覧 */}
        {selectedTable && (
          <div className="bg-white rounded-2xl shadow-sm p-4 max-w-lg mx-auto">
            {isLoading ? (
              <p className="text-gray-400 text-sm text-center">読み込み中...</p>
            ) : records.length === 0 ? (
              <p className="text-gray-400 text-sm text-center">データがありません</p>
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2"
                  >
                    <div className="text-xs text-gray-600 overflow-x-auto whitespace-nowrap">
                      ID:{r.id} / {JSON.stringify(r)}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="ml-2 shrink-0 text-red-500 hover:text-red-600 text-xs font-medium disabled:text-red-300"
                    >
                      {deletingId === r.id ? '削除中...' : '削除'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default DevReset;