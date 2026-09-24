import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function AttendanceReport() {
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState(null);
  const [storeId, setStoreId] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchShiftInfo();
  }, []);

  const fetchShiftInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setShiftData(data);
        if (data.shift?.store_id) {
          setStoreId(String(data.shift.store_id));
        }
      } else {
        setError({ message: data.error || 'データ取得に失敗しました', code: data.errorCode || 'SYS-000' });
      }
    } catch (err) {
      console.error(err);
      setError({ message: '通信エラーが発生しました', code: 'SYS-002', detail: err.message });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId: storeId ? parseInt(storeId) : null,
          isLate,
          lateReason: isLate ? lateReason : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError({ message: data.error || '出勤報告に失敗しました', code: data.errorCode || 'SYS-000' });
        return;
      }

      setToastMessage('出勤報告を送信しました');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      console.error(err);
      setError({ message: '通信エラーが発生しました', code: 'SYS-002', detail: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  const isOffDay = shiftData?.shift && shiftData.shift.type !== 'work';
  const alreadyReported = !!shiftData?.attendance;

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">出勤報告</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto space-y-4">
          {alreadyReported ? (
            <p className="text-center text-teal-600 font-medium">
              本日はすでに出勤報告済みです
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isOffDay && (
                <div className="bg-orange-50 text-orange-600 text-sm rounded-xl p-3">
                  ⚠️ 本日のシフトは「
                  {shiftData.shift.type === 'off' ? '公休' : '有給'}
                  」です。出勤報告を続けますか?
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  勤務店舗ID
                </label>
                <input
                  type="number"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="店舗IDを入力"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isLate"
                  checked={isLate}
                  onChange={(e) => setIsLate(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isLate" className="text-sm text-gray-700">
                  遅刻する
                </label>
              </div>

              {isLate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    遅刻理由
                  </label>
                  <textarea
                    value={lateReason}
                    onChange={(e) => setLateReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
                    rows={3}
                  />
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm text-center">
                  {error.message}
                  {error.code && (
                    <span className="block text-xs text-red-400 mt-1">
                      エラーコード: {error.code}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                {isLoading ? '送信中...' : '出勤報告する'}
              </button>
            </form>
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

export default AttendanceReport;