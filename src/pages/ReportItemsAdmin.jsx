import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function ReportItemsAdmin() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('count');
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reportItemGroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setGroups(data.groups);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async (groupId) => {
    setSelectedGroupId(groupId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/reportItems?groupId=${groupId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) setItems(data.items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reportItemGroups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newGroupName }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('グループを追加しました');
        setNewGroupName('');
        fetchGroups();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const handleDeleteGroup = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reportItemGroups`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('グループを削除しました');
        if (selectedGroupId === id) {
          setSelectedGroupId(null);
          setItems([]);
        }
        fetchGroups();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !selectedGroupId) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reportItems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupId: selectedGroupId,
          name: newItemName,
          inputType: newItemType,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('項目を追加しました');
        setNewItemName('');
        fetchItems(selectedGroupId);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reportItems`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('項目を削除しました');
        fetchItems(selectedGroupId);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const moveGroup = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= groups.length) return;

    const a = groups[index];
    const b = groups[targetIndex];

    try {
      await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/reportItemGroups`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: a.id, displayOrder: b.display_order }),
        }),
        fetch(`${import.meta.env.VITE_API_URL}/reportItemGroups`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: b.id, displayOrder: a.display_order }),
        }),
      ]);
      fetchGroups();
    } catch (err) {
      setToastMessage('並び替えに失敗しました');
    }
  };

  const moveItem = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const a = items[index];
    const b = items[targetIndex];

    try {
      await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/reportItems`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: a.id, displayOrder: b.display_order }),
        }),
        fetch(`${import.meta.env.VITE_API_URL}/reportItems`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: b.id, displayOrder: a.display_order }),
        }),
      ]);
      fetchItems(selectedGroupId);
    } catch (err) {
      setToastMessage('並び替えに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">実績項目マスタ管理</h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-700 mb-2 text-sm">グループ一覧</h2>
            <div className="space-y-1 mb-3">
              {groups.map((g, index) => (
                <div
                  key={g.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer ${
                    selectedGroupId === g.id ? 'bg-teal-100' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => fetchItems(g.id)}
                >
                  <span className="text-sm text-gray-700">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveGroup(index, -1);
                      }}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-teal-600 disabled:opacity-30 text-xs"
                    >
                      ↑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveGroup(index, 1);
                      }}
                      disabled={index === groups.length - 1}
                      className="text-gray-400 hover:text-teal-600 disabled:opacity-30 text-xs"
                    >
                      ↓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(g.id);
                      }}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="新しいグループ名"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                onClick={handleAddGroup}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded-xl text-sm"
              >
                追加
              </button>
            </div>
          </div>

          {selectedGroupId && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="font-bold text-gray-700 mb-2 text-sm">
                項目一覧({groups.find((g) => g.id === selectedGroupId)?.name})
              </h2>
              <div className="space-y-1 mb-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">
                      {item.name}({item.input_type === 'count' ? '件数' : '金額'})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-teal-600 disabled:opacity-30 text-xs"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveItem(index, 1)}
                        disabled={index === items.length - 1}
                        className="text-gray-400 hover:text-teal-600 disabled:opacity-30 text-xs"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="新しい項目名"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-xl text-sm"
                >
                  <option value="count">件数</option>
                  <option value="amount">金額</option>
                </select>
                <button
                  onClick={handleAddItem}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-1.5 rounded-xl text-sm"
                >
                  追加
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

export default ReportItemsAdmin;