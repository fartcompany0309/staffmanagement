import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [navigate]);

  if (!user) return null;

  const menuItems = [
    { path: '/admin/stores', label: '配属店舗マスタ管理', icon: '🏬' },
    { path: '/admin/report-items', label: '実績項目マスタ管理', icon: '📊' },
    { path: '/admin/store-groups', label: '店舗別 実績項目グループ設定', icon: '🔗' },
    { path: '/admin/shifts', label: 'シフト管理', icon: '📅' },
    { path: '/admin/attendance', label: '出勤管理', icon: '⏰' },
    { path: '/admin/checkout', label: '退勤管理', icon: '🌙' },
    { path: '/admin/announcements', label: 'お知らせ配信', icon: '📢' },
    { path: '/admin/report-aggregate', label: '実績集計', icon: '📈' },
  ];

  const superAdminMenuItems = [
    { path: '/admin/scopes', label: '管理者の担当範囲設定', icon: '🗂' },
  ];

  const systemMenuItems = [
    { path: '/admin/settings', label: 'システム設定', icon: '⚙️' },
    { path: '/dev-reset', label: '開発用データ管理', icon: '🛠' },
    { path: '/admin/carrier-data', label: '発番元データ管理', icon: '📱' },
    { path: '/admin/logs', label: '操作ログ確認', icon: '📋' },
    { path: '/admin/test-accounts', label: '検証用アカウント管理', icon: '🧪' },
  ];

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">管理者メニュー</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-gray-700 font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          {['super_admin', 'system_admin'].includes(user.role) && (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {superAdminMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {user.role === 'system_admin' && (
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {systemMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-teal-50 transition-colors"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminMenu;