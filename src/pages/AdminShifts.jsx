import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const typeLabel = { work: '出勤', off: '公休', paid_leave: '有給' };

function AdminShifts() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [shifts, setShifts] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editType, setEditType] = useState('work');
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchShifts();
  }, [year, month]);

  const fetchShifts = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/shiftsManage?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        setShifts(data.shifts);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    } finally {
      setIsFetching(false);
    }
  };

  const startEdit = (shift) => {
    setEditingId(shift.id);
    setEditType(shift.type);
  };

  const handleUpdate = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/shiftsManage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, type: editType }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('シフトを更新しました');
        setEditingId(null);
        fetchShifts();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/shiftsManage`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('シフトを削除しました');
        fetchShifts();
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
        <h1 className="font-bold text-teal-700">シフト管理</h1>
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
          ) : shifts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">
              この月のシフトはまだ提出されていません
            </p>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {shifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm">
                    <p className="text-gray-700 font-medium">
                      {s.last_name} {s.first_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.date).toLocaleDateString('ja-JP')}
                      {s.store_name && ` / ${s.store_name}`}
                    </p>
                  </div>

                  {editingId === s.id ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="text-xs border border-gray-300 rounded-lg px-1 py-1"
                      >
                        <option value="work">出勤</option>
                        <option value="off">公休</option>
                        <option value="paid_leave">有給</option>
                      </select>
                      <button
                        onClick={() => handleUpdate(s.id)}
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
                      <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-full">
                        {typeLabel[s.type] || s.type}
                      </span>
                      <button
                        onClick={() => startEdit(s)}
                        className="text-teal-500 text-xs"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
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

export default AdminShifts;