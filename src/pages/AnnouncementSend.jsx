import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function AnnouncementSend() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetId, setTargetId] = useState('');
  const [stores, setStores] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchStores();
    fetchAnnouncements();
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

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setAnnouncements(data.announcements);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setTargetType('all');
    setTargetId('');
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setTargetType(a.target_type);
    setTargetId(a.target_id ? String(a.target_id) : '');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/announcements`, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingId || undefined,
          title,
          body,
          targetType,
          targetId: targetType === 'all' ? null : parseInt(targetId),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage(editingId ? '更新しました' : '配信しました');
        resetForm();
        fetchAnnouncements();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/announcements`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('削除しました');
        if (editingId === id) resetForm();
        fetchAnnouncements();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">お知らせ配信</h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-700 text-sm">
              {editingId ? 'お知らせを編集' : '新規配信'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配信対象
              </label>
              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setTargetId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
              >
                <option value="all">全体</option>
                <option value="store">特定の店舗</option>
              </select>
            </div>

            {targetType === 'store' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  対象店舗
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                >
                  <option value="">選択してください</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="お知らせのタイトル"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                本文
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="お知らせの内容"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isSending || !title.trim() || !body.trim()}
                className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                {isSending ? '処理中...' : editingId ? '更新する' : '配信する'}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>

          {/* 配信履歴 */}
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {announcements.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                配信履歴はありません
              </p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium truncate">
                        {a.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {a.target_type === 'all' ? '全体' : '店舗'} /{' '}
                        {new Date(a.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => startEdit(a)}
                        className="text-teal-500 text-xs"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-red-400 text-xs"
                      >
                        削除
                      </button>
                    </div>
                  </div>
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

export default AnnouncementSend;