import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

function TestAccountsAdmin() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [code1, setCode1] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/testAccounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setAccounts(data.accounts);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!lastName || !firstName || !code1 || !password) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/testAccounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lastName, firstName, code1, password, role }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('検証用アカウントを作成しました');
        setLastName('');
        setFirstName('');
        setCode1('');
        setPassword('');
        setRole('staff');
        fetchAccounts();
      } else {
        setToastMessage(`エラー: ${data.error} [${data.errorCode}]`);
      }
    } catch (err) {
      setToastMessage('通信エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/testAccounts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('削除しました');
        fetchAccounts();
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
        <h1 className="font-bold text-teal-700">検証用アカウント管理</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-bold text-gray-700 text-sm">新規作成</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="姓"
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-xl text-sm"
              />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="名"
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-xl text-sm"
              />
            </div>
            <input
              type="text"
              value={code1}
              onChange={(e) => setCode1(e.target.value)}
              placeholder="ログインコード(10桁)"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            />
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            >
              <option value="staff">一般スタッフ</option>
              <option value="admin">管理者</option>
              <option value="super_admin">統括管理者</option>
              <option value="system_admin">システム管理者</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={isSaving}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
            >
              {isSaving ? '作成中...' : '作成する'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {accounts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                検証用アカウントはまだありません
              </p>
            ) : (
              accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm">
                    <p className="text-gray-700 font-medium">
                      {a.last_name} {a.first_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      コード: {a.code1} / {a.role}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>
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

export default TestAccountsAdmin;