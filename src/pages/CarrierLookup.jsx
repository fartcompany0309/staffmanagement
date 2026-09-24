import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CarrierLookup() {
  const navigate = useNavigate();
  const [number, setNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const token = localStorage.getItem('token');

  const handleSearch = async () => {
    setError(null);
    setResult(null);

    const digitsOnly = number.replace(/[^0-9]/g, '');
    if (digitsOnly.length !== 6) {
      setError({ message: '先頭3桁+中間3桁の、合計6桁で入力してください', code: 'CARR-000' });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/carrierLookup?prefix=${digitsOnly}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        setResult(data.result);
      } else {
        setError({ message: data.error, code: data.errorCode });
      }
    } catch (err) {
      setError({ message: '通信エラーが発生しました', code: 'SYS-002' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">発番元検索</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号(先頭6桁)
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              maxLength={8}
              placeholder="例: 090123"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-center tracking-widest"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {isSearching ? '検索中...' : '検索する'}
          </button>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error.message}
              <span className="block text-xs text-red-400">
                エラーコード: {error.code}
              </span>
            </div>
          )}

          {result && (
            <div className="bg-teal-50 rounded-xl p-4 text-center space-y-1">
              <p className="text-xs text-gray-500">発番元事業者</p>
              <p className="text-lg font-bold text-teal-700">{result.carrier_name}</p>
              <p className="text-xs text-gray-400">
                データ取得日: {new Date(result.data_date).toLocaleDateString('ja-JP')}
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 leading-relaxed">
            本結果は電気通信番号の管理元(発番元)を示すものであり、必ずしも現在の契約キャリアと一致しない場合があります(番号ポータビリティ制度により、契約先が変更されている可能性があります)。また、管理元がMVNO事業者への提供元である場合、実際の発番・提供はMVNO事業者による場合も含みます。本ツールの結果はあくまで参考情報としてご利用ください。
          </div>
        </div>
      </main>
    </div>
  );
}

export default CarrierLookup;