import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function CheckoutReport() {
  const navigate = useNavigate();
  const [checkoutData, setCheckoutData] = useState(null);
  const [values, setValues] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCheckoutInfo();
  }, []);

  const fetchCheckoutInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/checkout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setCheckoutData(data);
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

  const handleValueChange = (itemId, value) => {
    setValues((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const valuesArray = Object.entries(values)
        .filter(([, v]) => v !== '')
        .map(([reportItemId, value]) => ({
          reportItemId: parseInt(reportItemId),
          value: parseFloat(value),
        }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ values: valuesArray }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError({ message: data.error || '退勤報告に失敗しました', code: data.errorCode || 'SYS-000' });
        return;
      }

      setToastMessage('退勤報告を送信しました');
      setIsCompleted(true);
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

  const notAttended = !checkoutData?.attendance;
  const alreadyReported = !!checkoutData?.checkout;
  const reportItems = checkoutData?.reportItems || [];

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">退勤報告</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto space-y-4">
          {alreadyReported || isCompleted ? (
            <div className="text-center space-y-4">
              <p className="text-teal-600 font-medium">
                {isCompleted
                  ? '退勤報告が完了しました。お疲れ様でした!'
                  : '本日はすでに退勤報告済みです'}
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                閉じる
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-gray-600 text-sm">
                お疲れ様でした。退勤報告を行ってください。
              </p>

              {notAttended && (
                <div className="bg-orange-50 text-orange-600 text-sm rounded-xl p-3 text-center">
                  ⚠️ 出勤報告がまだ行われていません
                </div>
              )}

              {reportItems.length > 0 && (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700">実績入力</p>
                  {Object.values(
                    reportItems.reduce((acc, item) => {
                      if (!acc[item.group_id]) {
                        acc[item.group_id] = { groupName: item.group_name, items: [] };
                      }
                      acc[item.group_id].items.push(item);
                        return acc;
                      }, {})
                    ).map((group) => (
                    <div key={group.groupName} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-teal-600">{group.groupName}</p>
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2">
                          <label className="text-sm text-gray-600 flex-1">
                            {item.name}
                            {item.input_type === 'amount' && (
                              <span className="text-xs text-gray-400">(円)</span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={values[item.id] || ''}
                            onChange={(e) => handleValueChange(item.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
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
                onClick={handleSubmit}
                disabled={isLoading || notAttended}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                {isLoading ? '送信中...' : '退勤報告する'}
              </button>
            </>
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

export default CheckoutReport;