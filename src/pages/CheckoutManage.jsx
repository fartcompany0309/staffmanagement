import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function CheckoutManage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchRecords();
  }, [year, month]);

  const fetchRecords = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/checkoutManage?year=${year}&month=${month}`,
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
      setIsFetching(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/checkoutManage`, {
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
        fetchRecords();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const changeMonth = (diff) => {
    let newMonth = month + diff;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">退勤管理</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between">
            <button onClick={() => changeMonth(-1)} className="text-teal-600 px-2">
              ←
            </button>
            <span className="font-bold text-gray-700">
              {year}年{month}月
            </span>
            <button onClick={() => changeMonth(1)} className="text-teal-600 px-2">
              →
            </button>
          </div>

          {isFetching ? (
            <p className="text-gray-400 text-sm text-center">読み込み中...</p>
          ) : records.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">
              この月の退勤報告はまだありません
            </p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {records.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      className="text-left flex-1"
                    >
                      <p className="text-sm text-gray-700 font-medium">
                        {r.last_name} {r.first_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(r.date).toLocaleDateString('ja-JP')}
                        {r.values.length > 0 && (
                          <span className="text-teal-500">
                            {' '}
                            (実績あり、タップで表示)
                          </span>
                        )}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-400 text-xs ml-2"
                    >
                      削除
                    </button>
                  </div>

                  {expandedId === r.id && r.values.length > 0 && (
                    <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-2">
                      {Object.entries(
                        r.values.reduce((acc, v) => {
                          if (!acc[v.groupName]) acc[v.groupName] = [];
                          acc[v.groupName].push(v);
                          return acc;
                        }, {})
                      ).map(([groupName, items]) => (
                        <div key={groupName}>
                          <p className="text-xs font-bold text-teal-600 mb-1">
                            {groupName}
                          </p>
                          {items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs pl-2"
                            >
                              <span className="text-gray-600">{item.itemName}</span>
                              <span className="text-gray-700">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

export default CheckoutManage;