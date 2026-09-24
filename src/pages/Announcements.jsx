import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Announcements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleOpen = async (a) => {
    setExpandedId(expandedId === a.id ? null : a.id);

    if (!a.is_read) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/announcementRead`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ announcementId: a.id }),
        });
        setAnnouncements((prev) =>
          prev.map((item) => (item.id === a.id ? { ...item, is_read: 1 } : item))
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-teal-600">
          ← 戻る
        </button>
        <h1 className="font-bold text-teal-700">お知らせ</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-3">
          {isFetching ? (
            <p className="text-gray-400 text-sm text-center">読み込み中...</p>
          ) : announcements.length === 0 ? (
            <p className="text-gray-400 text-sm text-center">お知らせはありません</p>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer"
                onClick={() => handleOpen(a)}
              >
                <div className="flex items-center gap-2">
                  {!a.is_read && (
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  )}
                  <p
                    className={`text-sm flex-1 ${
                      a.is_read ? 'text-gray-500' : 'font-bold text-gray-700'
                    }`}
                  >
                    {a.title}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(a.created_at).toLocaleDateString('ja-JP')}
                </p>
                {expandedId === a.id && (
                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap border-t border-gray-100 pt-3">
                    {a.body}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default Announcements;