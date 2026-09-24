import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function StoreGroupsAdmin() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchStores();
    fetchAllGroups();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setStores(data.stores);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reportItemGroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setAllGroups(data.groups);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssignedGroups = async (storeId) => {
    setSelectedStoreId(storeId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/storeReportItemGroups?storeId=${storeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) setAssignedGroups(data.groups);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async () => {
    if (!selectedGroupToAdd || !selectedStoreId) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/storeReportItemGroups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storeId: selectedStoreId, groupId: selectedGroupToAdd }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('グループを割り当てました');
        setSelectedGroupToAdd('');
        fetchAssignedGroups(selectedStoreId);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const handleUnassign = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/storeReportItemGroups`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('割り当てを解除しました');
        fetchAssignedGroups(selectedStoreId);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const unassignedGroups = allGroups.filter(
    (g) => !assignedGroups.some((ag) => ag.group_id === g.id)
  );

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">店舗別 実績項目グループ設定</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* 店舗選択 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-700 mb-2 text-sm">店舗を選択</h2>
            <div className="flex flex-wrap gap-2">
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => fetchAssignedGroups(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedStoreId === s.id
                      ? 'bg-teal-500 text-white'
                      : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 割り当て済みグループ */}
          {selectedStoreId && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="font-bold text-gray-700 mb-2 text-sm">
                {stores.find((s) => s.id === selectedStoreId)?.name} の割り当てグループ
              </h2>
              <div className="space-y-1 mb-3">
                {assignedGroups.length === 0 ? (
                  <p className="text-gray-400 text-sm">まだ割り当てられていません</p>
                ) : (
                  assignedGroups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">{g.group_name}</span>
                      <button
                        onClick={() => handleUnassign(g.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        解除
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedGroupToAdd}
                  onChange={(e) => setSelectedGroupToAdd(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-sm"
                >
                  <option value="">グループを選択</option>
                  {unassignedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!selectedGroupToAdd}
                  className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-200 text-white px-4 py-1.5 rounded-xl text-sm"
                >
                  割り当て
                </button>
              </div>
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

export default StoreGroupsAdmin;