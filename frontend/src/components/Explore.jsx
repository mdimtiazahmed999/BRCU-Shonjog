import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { API_URL } from '../lib/config';

export default function Explore() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const goToProfile = (userId) => {
    if (userId) navigate(`/profile/${userId}`);
  };

  useEffect(() => {
    fetchSuggested();
  }, []);

  const fetchSuggested = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/user/suggested`, { withCredentials: true });
      if (res.data.success) {
        const list = res.data.users || [];
        const enhanced = list.map((u) => ({
          ...u,
          isFollowing: (u.followers || []).some((f) => String(f) === String(user?._id)),
        }));
        setUsers(enhanced);
      }
    } catch (e) {
      console.log(e);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (userId) => {
    try {
      const res = await axios.post(`${API_URL}/user/followorunfollow/${userId}`, {}, { withCredentials: true });
      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, isFollowing: !u.isFollowing }
              : u
          )
        );
        toast.success(res.data.message || 'Updated');
      }
    } catch (e) {
      console.log(e);
      toast.error('Action failed');
    }
  };

  const filtered = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Explore people</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Discover new profiles to follow</p>
        </div>
        <button onClick={fetchSuggested} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-sky-600 to-cyan-500 text-white hover:opacity-90">Refresh</button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">No suggestions right now</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((u) => (
            <div key={u._id} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
              <img
                src={u.profilePicture || 'https://via.placeholder.com/60'}
                alt={u.username}
                className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                onClick={() => goToProfile(u._id)}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => goToProfile(u._id)}>
                <p className="font-semibold text-gray-900 dark:text-white truncate hover:text-sky-600 dark:hover:text-sky-400 transition">{u.username}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.bio || u.email}</p>
              </div>
              <button
                onClick={() => toggleFollow(u._id)}
                className={`px-3 py-2 text-sm rounded-lg font-semibold transition ${u.isFollowing ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'}`}
              >
                {u.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
