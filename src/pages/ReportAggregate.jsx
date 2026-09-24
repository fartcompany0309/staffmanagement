import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Toast from '../components/Toast';

const groupByLabel = { user: 'スタッフ別', store: '店舗別', company: '会社別' };

function ReportAggregate() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [groupBy, setGroupBy] = useState('user');
  const [records, setRecords] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAggregate();
  }, [year, month, groupBy]);

  const fetchAggregate = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/reportAggregate?year=${year}&month=${month}&groupBy=${groupBy}`,
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

  // groupId → groupName でグループ化
  const grouped = records.reduce((acc, r) => {
    if (!acc[r.groupId]) acc[r.groupId] = { name: r.groupName, items: [] };
    acc[r.groupId].items.push(r);
    return acc;
  }, {});

  const handleExport = () => {
    // Excel用のフラットなデータを作成
    const rows = records.map((r) => ({
      対象: r.groupName,
      グループ: r.groupItemName,
      項目: r.itemName,
      合計: r.total,
      単位: r.inputType === 'amount' ? '円' : '件',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '実績集計');
    XLSX.writeFile(workbook, `実績集計_${year}年${month}月_${groupByLabel[groupBy]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">実績集計</h1>
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

          <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-2">
            {Object.entries(groupByLabel).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGroupBy(key)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  groupBy === key
                    ? 'bg-teal-500 text-white'
                    : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="w-full bg-white border border-teal-200 hover:bg-teal-50 disabled:opacity-40 text-teal-600 font-medium py-2.5 rounded-2xl transition-colors text-sm"
          >
            📥 Excelでダウンロード
          </button>

          {isFetching ? (
            <p className="text-gray-400 text-sm text-center">読み込み中...</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p className="text-gray-400 text-sm text-center">
              この月の実績データがありません
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([groupId, g]) => (
                <div key={groupId} className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="font-bold text-gray-700 text-sm mb-2">{g.name}</p>
                  <div className="space-y-1">
                    {g.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {item.groupItemName} / {item.itemName}
                        </span>
                        <span className="font-medium text-teal-600">
                          {item.total}
                          {item.inputType === 'amount' ? '円' : '件'}
                        </span>
                      </div>
                    ))}
                  </div>
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

export default ReportAggregate;