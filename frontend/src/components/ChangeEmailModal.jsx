import { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '../redux/authSlice';
import { API_URL } from '../lib/config';

export default function ChangeEmailModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    newEmail: '',
    password: '',
  });

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.newEmail || !input.password) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_URL}/user/change-email`,
        {
          newEmail: input.newEmail,
          password: input.password,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        if (res.data.user) {
          dispatch(setAuthUser(res.data.user));
        }
        toast.success(res.data.message || 'Email changed successfully');
        setInput({ newEmail: '', password: '' });
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change email');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change Email</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Email Address
            </label>
            <input
              type="email"
              name="newEmail"
              value={input.newEmail}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your.new.email@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password (to confirm)
            </label>
            <input
              type="password"
              name="password"
              value={input.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
