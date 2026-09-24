import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const statusLabel = { reported: '報告済み', absent: '欠勤' };

function AttendanceManage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('reported');
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
        `${import.meta.env.VITE_API_URL}/attendanceManage?year=${year}&month=${month}`,
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

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditStatus(record.status);
  };

  const handleUpdate = async (record) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/attendanceManage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: record.id,
          isLate: record.is_late,
          lateReason: record.late_reason,
          status: editStatus,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('更新しました');
        setEditingId(null);
        fetchRecords();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/attendanceManage`, {
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
        <h1 className="font-bold text-teal-700">出勤管理</h1>
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
              この月の出勤報告はまだありません
            </p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm">
                    <p className="text-gray-700 font-medium">
                      {r.last_name} {r.first_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.date).toLocaleDateString('ja-JP')}
                      {r.store_name && ` / ${r.store_name}`}
                      {r.is_late && (
                        <span className="text-orange-500"> / 遅刻</span>
                      )}
                    </p>
                  </div>

                  {editingId === r.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-1 py-1"
                      >
                        <option value="reported">報告済み</option>
                        <option value="absent">欠勤</option>
                      </select>
                      <button
                        onClick={() => handleUpdate(r)}
                        className="text-teal-600 text-xs font-medium"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 text-xs"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          r.status === 'absent'
                            ? 'bg-red-50 text-red-500'
                            : 'bg-teal-50 text-teal-600'
                        }`}
                      >
                        {statusLabel[r.status] || r.status}
                      </span>
                      <button
                        onClick={() => startEdit(r)}
                        className="text-teal-500 text-xs"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-400 text-xs"
                      >
                        削除
                      </button>
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

export default AttendanceManage;