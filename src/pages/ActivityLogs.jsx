import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const categoryLabel = {
  shift: 'シフト',
  attendance: '出勤報告',
  checkout: '退勤報告',
  announcement: 'お知らせ',
};

const actionLabel = {
  create: '作成',
  update: '更新',
  delete: '削除',
};

function ActivityLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [category, setCategory] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchLogs();
  }, [category]);

  const fetchLogs = async () => {
    setIsFetching(true);
    try {
      const url = category
        ? `${import.meta.env.VITE_API_URL}/activityLogs?category=${category}`
        : `${import.meta.env.VITE_API_URL}/activityLogs`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">操作ログ</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === ''
                  ? 'bg-teal-500 text-white'
                  : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
              }`}
            >
              すべて
            </button>
            {Object.entries(categoryLabel).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === key
                    ? 'bg-teal-500 text-white'
                    : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isFetching ? (
            <p className="text-gray-400 text-sm text-center">読み込み中...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">ログがありません</p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">
                      {log.last_name} {log.first_name}
                    </span>
                    <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">
                      {categoryLabel[log.category] || log.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {actionLabel[log.action] || log.action}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(log.created_at).toLocaleString('ja-JP')}
                    {log.target_id && ` / 対象ID: ${log.target_id}`}
                  </p>
                  {log.detail && (
                    <p className="text-xs text-gray-400 mt-1 break-all">
                      詳細: {log.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ActivityLogs;