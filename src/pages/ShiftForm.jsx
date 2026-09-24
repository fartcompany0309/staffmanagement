import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Toast from '../components/Toast';

const typeLabel = { work: '出勤', off: '公休', paid_leave: '有給' };

function ShiftForm() {
  const navigate = useNavigate();
  const { year: paramYear, month: paramMonth } = useParams();
  const today = new Date();
  const [year] = useState(paramYear ? parseInt(paramYear) : today.getFullYear());
  const [month] = useState(paramMonth ? parseInt(paramMonth) : today.getMonth() + 1);
  const [shifts, setShifts] = useState({});
  const [isFetching, setIsFetching] = useState(true);
  const [savingDate, setSavingDate] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/shifts?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        const map = {};
        data.shifts.forEach((s) => {
          const dateKey = new Date(s.date).toISOString().split('T')[0];
          map[dateKey] = s;
        });
        setShifts(map);
      } else {
        setError({ message: data.error, code: data.errorCode });
      }
    } catch (err) {
      setError({ message: '通信エラーが発生しました', code: 'SYS-002' });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSetShift = async (dateStr, type) => {
    setSavingDate(dateStr);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: dateStr, type }),
      });
      const data = await response.json();
      if (response.ok) {
        setShifts((prev) => ({ ...prev, [dateStr]: { date: dateStr, type } }));
        setToastMessage('シフトを保存しました');
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    } finally {
      setSavingDate(null);
    }
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayStr = today.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/shifts')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">
          {year}年{month}月のシフト
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
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {days.map((day) => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const shift = shifts[dateStr];
                const isPast = dateStr < todayStr;
                const isSaving = savingDate === dateStr;

                return (
                  <div key={day} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-600 w-16">{day}日</span>
                    <div className="flex gap-1">
                      {['work', 'off', 'paid_leave'].map((t) => (
                        <button
                          key={t}
                          onClick={() => handleSetShift(dateStr, t)}
                          disabled={isPast || isSaving}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            shift?.type === t
                              ? 'bg-teal-500 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          } disabled:opacity-40`}
                        >
                          {typeLabel[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
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

export default ShiftForm;