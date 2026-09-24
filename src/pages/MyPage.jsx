import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const roleLabel = {
  staff: '一般スタッフ',
  admin: '管理者',
  super_admin: '統括管理者',
  system_admin: 'システム管理者',
};

function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMyPage();
  }, []);

  const fetchMyPage = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/myPage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleChangePassword = async () => {
    setError(null);

    if (newPassword !== confirmPassword) {
      setError({ message: '新しいパスワードが一致しません', code: 'MYP-003' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/myPage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage('パスワードを変更しました');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError({ message: data.error, code: data.errorCode });
      }
    } catch (err) {
      setError({ message: '通信エラーが発生しました', code: 'SYS-002' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching || !user) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">マイページ</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-sm mx-auto space-y-4">
          {/* 基本情報 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-bold text-gray-700 text-sm">基本情報</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">氏名</span>
                <span className="text-gray-700">
                  {user.last_name} {user.first_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">フリガナ</span>
                <span className="text-gray-700">
                  {user.last_name_kana} {user.first_name_kana}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">コード1</span>
                <span className="text-gray-700">{user.code1 || '未登録'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">コード2</span>
                <span className="text-gray-700">{user.code2 || '未登録'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">所属会社</span>
                <span className="text-gray-700">{user.company_name || '未設定'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">配属店舗</span>
                <span className="text-gray-700">{user.store_name || '未設定'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">権限</span>
                <span className="text-gray-700">{roleLabel[user.role] || user.role}</span>
              </div>
            </div>
          </div>

          {/* パスワード変更 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h2 className="font-bold text-gray-700 text-sm">パスワード変更</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現在のパスワード
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新しいパスワード(確認)
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error.message}
                <span className="block text-xs text-red-400">
                  エラーコード: {error.code}
                </span>
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-medium py-2.5 rounded-xl transition-colors"
            >
              {isSaving ? '変更中...' : 'パスワードを変更する'}
            </button>
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

export default MyPage;