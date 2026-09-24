import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function ReportDetail() {
  const navigate = useNavigate();
  const { year, month } = useParams();
  const [monthly, setMonthly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [showDaily, setShowDaily] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/reportSummary?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        setMonthly(data.monthly);
        setDaily(data.daily);
      } else {
        setError({ message: data.error, code: data.errorCode });
      }
    } catch (err) {
      setError({ message: '通信エラーが発生しました', code: 'SYS-002' });
    } finally {
      setIsFetching(false);
    }
  };

  const monthlyByGroup = monthly.reduce((acc, m) => {
    if (!acc[m.groupName]) acc[m.groupName] = [];
    acc[m.groupName].push(m);
    return acc;
  }, {});

  const dailyGrouped = daily.reduce((acc, d) => {
    const dateKey = new Date(d.date).toISOString().split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][d.groupName]) acc[dateKey][d.groupName] = [];
    acc[dateKey][d.groupName].push(d);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/reports')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">
          {year}年{month}月の実績
        </h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error.message}
              <span className="block text-xs text-red-400">
                エラーコード: {error.code}
              </span>
            </div>
          )}

          {isFetching ? (
            <p className="text-gray-400 text-sm text-center">読み込み中...</p>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="font-bold text-gray-700 text-sm px-1">月間合計</h2>
                {Object.keys(monthlyByGroup).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center bg-white rounded-2xl shadow-sm p-4">
                    実績データがありません
                  </p>
                ) : (
                  Object.entries(monthlyByGroup).map(([groupName, records]) => (
                    <div key={groupName} className="bg-white rounded-2xl shadow-sm p-4">
                      <p className="text-xs font-bold text-teal-600 mb-2">{groupName}</p>
                      <div className="space-y-1">
                        {records.map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{m.itemName}</span>
                            <span className="font-medium text-gray-700">
                              {m.total}
                              {m.inputType === 'amount' ? '円' : '件'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowDaily(!showDaily)}
                className="w-full bg-white rounded-2xl shadow-sm p-3 text-teal-600 text-sm font-medium hover:bg-teal-50 transition-colors"
              >
                {showDaily ? '日別を閉じる' : '日別を見る'}
              </button>

              {showDaily && (
                <div className="space-y-3">
                  {Object.keys(dailyGrouped).length === 0 ? (
                    <p className="text-gray-400 text-sm text-center bg-white rounded-2xl shadow-sm p-4">
                      データがありません
                    </p>
                  ) : (
                    Object.entries(dailyGrouped).map(([date, groupedByGroup]) => (
                      <div key={date} className="bg-white rounded-2xl shadow-sm p-4">
                        <p className="text-xs font-bold text-gray-500 mb-2">
                          {new Date(date).toLocaleDateString('ja-JP')}
                        </p>
                        <div className="space-y-3">
                          {Object.entries(groupedByGroup).map(([groupName, records]) => (
                            <div key={groupName}>
                              <p className="text-xs font-bold text-teal-600 mb-1">
                                {groupName}
                              </p>
                              <div className="space-y-1">
                                {records.map((r, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between text-sm pl-2"
                                  >
                                    <span className="text-gray-600">{r.itemName}</span>
                                    <span className="text-gray-700">{r.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default ReportDetail;