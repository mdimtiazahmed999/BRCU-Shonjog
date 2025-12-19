import { useState, useCallback } from 'react';
import axios from 'axios';
import { Search as SearchIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../lib/config';

export default function SearchBar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      // Search users
      const userRes = await axios.get(
        `${API_URL}/user/search?q=${encodeURIComponent(query)}`,
        { withCredentials: true }
      ).catch(() => ({ data: { users: [] } }));

      // If endpoint doesn't exist, filter from suggested users
      if (!userRes.data.users || userRes.data.users.length === 0) {
        const suggestedRes = await axios.get(`${API_URL}/user/suggested`, {
          withCredentials: true,
        });
        const filteredUsers = suggestedRes.data.users?.filter((user) =>
          user.username?.toLowerCase().includes(query.toLowerCase())
        ) || [];
        setResults(filteredUsers.slice(0, 5));
      } else {
        setResults(userRes.data.users.slice(0, 5));
      }
      setIsOpen(true);
    } catch (error) {
      console.log('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectUser = (userId, username) => {
    navigate(`/profile/${userId}`);
    setSearchQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <SearchIcon
          size={20}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onFocus={() => searchQuery && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {loading && (
            <div className="p-4 text-center text-gray-400">
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && searchQuery && (
            <div className="p-4 text-center text-gray-400">
              No users found
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="divide-y divide-gray-700">
              {results.map((user) => (
                <li key={user._id}>
                  <button
                    onClick={() => handleSelectUser(user._id, user.username)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800 transition flex items-center gap-3"
                  >
                    <img
                      src={user.profilePicture || 'https://via.placeholder.com/40'}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-white font-semibold">{user.username}</p>
                      <p className="text-xs text-gray-400">
                        {user.followers?.length || 0} followers
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
