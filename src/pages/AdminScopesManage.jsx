import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const permissionLabel = { view: '閲覧のみ', edit: '編集可' };

function AdminScopesManage() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [scopes, setScopes] = useState([]);
  const [newScopeType, setNewScopeType] = useState('store');
  const [newScopeId, setNewScopeId] = useState('');
  const [newPermission, setNewPermission] = useState('view');
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAdmins();
    fetchStores();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAdmins(data.users.filter((u) => u.role === 'admin'));
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const fetchScopes = async (userId) => {
    setSelectedUserId(userId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/adminScopes?userId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) setScopes(data.scopes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddScope = async () => {
    if (!newScopeId || !selectedUserId) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/adminScopes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          scopeType: newScopeType,
          scopeId: parseInt(newScopeId),
          permissionLevel: newPermission,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('担当範囲を追加しました');
        setNewScopeId('');
        fetchScopes(selectedUserId);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  const handleRemoveScope = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/adminScopes`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('担当範囲を削除しました');
        fetchScopes(selectedUserId);
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">管理者の担当範囲設定</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* 管理者選択 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-700 mb-2 text-sm">管理者を選択</h2>
            {admins.length === 0 ? (
              <p className="text-gray-400 text-sm">
                admin権限のスタッフがまだいません
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {admins.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => fetchScopes(a.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedUserId === a.id
                        ? 'bg-teal-500 text-white'
                        : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                    }`}
                  >
                    {a.last_name} {a.first_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 担当範囲一覧・追加 */}
          {selectedUserId && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="font-bold text-gray-700 mb-2 text-sm">担当範囲</h2>
              <div className="space-y-1 mb-3">
                {scopes.length === 0 ? (
                  <p className="text-gray-400 text-sm">まだ設定されていません</p>
                ) : (
                  scopes.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">
                        {s.scope_type === 'company' ? '会社' : '店舗'}: {s.scope_name} (
                        {permissionLabel[s.permission_level]})
                      </span>
                      <button
                        onClick={() => handleRemoveScope(s.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        削除
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex gap-2">
                  <select
                    value={newScopeType}
                    onChange={(e) => {
                      setNewScopeType(e.target.value);
                      setNewScopeId('');
                    }}
                    className="px-2 py-1.5 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="store">店舗</option>
                  </select>
                  <select
                    value={newScopeId}
                    onChange={(e) => setNewScopeId(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="">店舗を選択</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <select
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="view">閲覧のみ</option>
                    <option value="edit">編集可</option>
                  </select>
                  <button
                    onClick={handleAddScope}
                    disabled={!newScopeId}
                    className="bg-teal-500 hover:bg-teal-600 disabled:bg-teal-200 text-white px-4 py-1.5 rounded-xl text-sm"
                  >
                    追加
                  </button>
                </div>
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

export default AdminScopesManage;