import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ShiftSubmit() {
  const navigate = useNavigate();
  const today = new Date();
  const [summaries, setSummaries] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/shifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSummaries(data.summaries);
      } else {
        setError({ message: data.error, code: data.errorCode });
      }
    } catch (err) {
      setError({ message: '通信エラーが発生しました', code: 'SYS-002' });
    } finally {
      setIsFetching(false);
    }
  };

  // 当月・翌月・翌々月を選択肢として用意
  const monthOptions = [0, 1, 2].map((offset) => {
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return {
      year: targetDate.getFullYear(),
      month: targetDate.getMonth() + 1,
    };
  });

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">シフト確認・報告</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* 新規シフト報告(月選択) */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm text-gray-500 mb-2">新規シフト報告</p>
            <div className="flex gap-2">
              {monthOptions.map(({ year, month }) => (
                <button
                  key={`${year}-${month}`}
                  onClick={() => navigate(`/shifts/${year}/${month}`)}
                  className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-600 font-medium py-2 rounded-xl transition-colors text-sm"
                >
                  {year}年{month}月
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error.message}
              <span className="block text-xs text-red-400">
                エラーコード: {error.code}
              </span>
            </div>
          )}

          {/* 提出済みシフトの一覧 */}
          {isFetching ? (
            <p className="text-gray-400 text-sm text-center">読み込み中...</p>
          ) : summaries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">
              まだシフトが報告されていません
            </p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {summaries.map((s) => (
                <button
                  key={`${s.year}-${s.month}`}
                  onClick={() => navigate(`/shifts/${s.year}/${s.month}`)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-teal-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-700">
                      {s.year}年{s.month}月分
                    </p>
                    <p className="text-xs text-gray-400">
                      {s.reportedDays}日分提出済み / 最終更新:{' '}
                      {new Date(s.lastUpdated).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <span className="text-teal-500">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ShiftSubmit;