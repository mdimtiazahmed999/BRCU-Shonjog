import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Bell, X } from 'lucide-react';
import axios from 'axios';
import {
  markAsRead,
  removeNotification,
  clearNotifications,
  addNotification,
} from '../redux/notificationSlice';
import { API_URL } from '../lib/config';

export default function Notifications() {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector(
    (state) => state.notification
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = () => {
    dispatch(markAsRead());
  };

  // fetch persisted notifications when opening
  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_URL}/notification/`, { withCredentials: true });
        if (res.data.success && mounted) {
          // replace local notifications with persisted ones
          res.data.notifications.forEach((n) => {
            dispatch(addNotification(n));
          });
        }
      } catch (e) {
        // ignore fetch errors (likely unauthenticated during dev)
        // console.log('fetch notifications error', e);
      }
    };

    if (isOpen) fetchNotifications();
    return () => { mounted = false; };
  }, [isOpen, dispatch]);

  const handleRemoveNotification = (id) => {
    // call backend to delete? currently slice handles UI removal
    dispatch(removeNotification(id));
  };

  const handleClearAll = () => {
    // call backend to clear persisted notifications
    axios.delete(`${API_URL}/notification/clear`, { withCredentials: true }).catch(() => {});
    dispatch(clearNotifications());
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👤';
      case 'dislike':
        return '💔';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'like':
        return 'text-red-500';
      case 'follow':
        return 'text-blue-500';
      case 'comment':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          handleMarkAsRead();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-96 overflow-y-auto z-50">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <h3 className="text-gray-900 font-semibold">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-gray-500 hover:text-gray-700 transition"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Content */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No notifications yet</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notif) => (
                <li
                  key={notif._id || Math.random()}
                  className="px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3"
                >
                  <span className={`text-xl flex-shrink-0 ${getNotificationColor(notif.type)}`}>
                    {getNotificationIcon(notif.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-semibold">
                      {notif.fromUser?.username || notif.userDetails?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt || Date.now()).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveNotification(notif._id || Math.random())}
                    className="text-gray-400 hover:text-gray-700 transition flex-shrink-0"
                  >
                    <X size={16} />
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
