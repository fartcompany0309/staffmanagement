import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Toast from '../components/Toast';

const PREFIXES = ['090', '080', '070', '060'];
const BATCH_SIZE = 50;

function CarrierDataAdmin() {
  const navigate = useNavigate();
  const [prefix, setPrefix] = useState('090');
  const [dataDate, setDataDate] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !dataDate) {
      setError({ message: 'ファイルと基準日を選択してください', code: 'CARR-004' });
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const records = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        const baseNumber = String(row[0]).trim();
        if (baseNumber.length !== 5) continue;

        for (let e = 0; e <= 9; e++) {
          const carrierName = row[e + 1];
          if (!carrierName) continue;
          records.push({
            prefix: baseNumber + String(e),
            carrierName: String(carrierName).trim(),
          });
        }
      }

      if (records.length === 0) {
        setError({ message: 'ファイルから有効なデータを読み取れませんでした', code: 'CARR-005' });
        setIsUploading(false);
        return;
      }

      setTotalCount(records.length);

      // バッチに分割して順番に送信
      const batches = [];
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        batches.push(records.slice(i, i + BATCH_SIZE));
      }

      let doneCount = 0;

      for (let i = 0; i < batches.length; i++) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/carrierLookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourceFile: prefix,
            dataDate,
            records: batches[i],
            isFirstBatch: i === 0,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError({ message: data.error, code: data.errorCode });
          setIsUploading(false);
          return;
        }

        doneCount += batches[i].length;
        setProgress(Math.round((doneCount / records.length) * 100));
      }

      setToastMessage(`${records.length}件のデータを取り込みました`);
      setFile(null);
    } catch (err) {
      console.error(err);
      setError({ message: 'ファイルの処理中にエラーが発生しました', code: 'CARR-006' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">発番元データ管理</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm mx-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              番号帯
            </label>
            <select
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            >
              {PREFIXES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              データ基準日
            </label>
            <input
              type="date"
              value={dataDate}
              onChange={(e) => setDataDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              総務省Excelファイル
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="w-full text-sm"
            />
          </div>

          <a
            href="https://www.soumu.go.jp/main_sosiki/joho_tsusin/top/tel_number/number_shitei.html"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-teal-500 hover:text-teal-600 underline"
          >
            総務省の該当ページを開く(最新データのダウンロード)
          </a>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error.message}
              <span className="block text-xs text-red-400">
                エラーコード: {error.code}
              </span>
            </div>
          )}

          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {progress}% 完了({totalCount}件中)
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {isUploading ? `取込中... (${progress}%)` : '取り込む'}
          </button>

          <p className="text-xs text-gray-400">
            ※既存の同じ番号帯のデータは全て削除され、新しいデータに置き換わります。
          </p>
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

export default CarrierDataAdmin;