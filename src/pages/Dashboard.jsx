import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WelcomeModal from '../components/WelcomeModal';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [isLoadingShift, setIsLoadingShift] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(storedUser));

    if (sessionStorage.getItem('justLoggedIn') === 'true') {
      setShowWelcome(true);
      sessionStorage.removeItem('justLoggedIn');
    }

    fetchAttendanceInfo(token);
    fetchAnnouncements(token);
  }, [navigate]);

  const fetchAttendanceInfo = async (token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setShiftData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingShift(false);
    }
  };

  const fetchAnnouncements = async (token) => {
    try {
      const settingResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/systemSettings?key=dashboard_announcement_count`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const settingData = await settingResponse.json();
      const count = parseInt(settingData.value) || 3;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAnnouncements(data.announcements.slice(0, count));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  const shiftTypeLabel = {
    work: '出勤',
    off: '公休',
    paid_leave: '有給',
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between relative">
        <span className="font-bold text-teal-700">会社名(仮)</span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 text-gray-700"
          >
            {user.lastName} {user.firstName} 様
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg z-20">
                <button
                  onClick={() => navigate('/mypage')}
                  className="w-full text-left px-4 py-2 hover:bg-teal-50 rounded-t-xl"
                >
                  マイページ
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-teal-50 rounded-b-xl text-red-500"
                >
                  ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-2">今日のシフト</h2>
          {isLoadingShift ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : shiftData?.shift ? (
            <div className="space-y-1">
              <p className="text-teal-600 font-medium">
                {shiftTypeLabel[shiftData.shift.type] || shiftData.shift.type}
              </p>
              {shiftData.attendance ? (
                <p className="text-sm text-gray-500">✅ 出勤報告済み</p>
              ) : (
                <p className="text-sm text-orange-500">⚠️ 出勤報告未</p>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">本日のシフトは登録されていません</p>
          )}
        </div>

        {announcements.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-700 text-sm">お知らせ</h2>
              <button
                onClick={() => navigate('/announcements')}
                className="text-xs text-teal-500 hover:text-teal-600"
              >
                すべて見る →
              </button>
            </div>
            {announcements.map((a, index) => (
              <button
                key={a.id}
                onClick={() => navigate('/announcements')}
                className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                  !a.is_read
                    ? 'bg-orange-50 hover:bg-orange-100'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {index === 0 && (
                    <span className="text-[10px] bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold">
                      NEW
                    </span>
                  )}
                  <span
                    className={`text-sm flex-1 truncate ${
                      !a.is_read ? 'font-bold text-gray-700' : 'text-gray-500'
                    }`}
                  >
                    {a.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/attendance')}
            className="bg-white rounded-2xl shadow-sm p-4 text-teal-600 font-medium hover:bg-teal-50 transition-colors"
          >
            出勤報告
          </button>
          <button
            onClick={() => navigate('/checkout')}
            className="bg-white rounded-2xl shadow-sm p-4 text-teal-600 font-medium hover:bg-teal-50 transition-colors"
          >
            退勤報告
          </button>
          <button
            onClick={() => navigate('/shifts')}
            className="bg-white rounded-2xl shadow-sm p-4 text-teal-600 font-medium hover:bg-teal-50 transition-colors"
          >
            シフト提出
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="bg-white rounded-2xl shadow-sm p-4 text-teal-600 font-medium hover:bg-teal-50 transition-colors"
          >
            実績確認
          </button>
          <button
            onClick={() => navigate('/carrier-lookup')}
            className="bg-white rounded-2xl shadow-sm p-4 text-teal-600 font-medium hover:bg-teal-50 transition-colors w-full text-left"
          >
            📱 発番元検索
          </button>
        </div>

        {['admin', 'super_admin', 'system_admin'].includes(user.role) && (
          <div className="px-4 pb-2">
            <button
              onClick={() => navigate('/admin')}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              ⚙️ 管理者メニュー
            </button>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">
        © 2026 staffmanagement
      </footer>

      {showWelcome && (
        <WelcomeModal user={user} onClose={() => setShowWelcome(false)} />
      )}
    </div>
  );
}

export default Dashboard;