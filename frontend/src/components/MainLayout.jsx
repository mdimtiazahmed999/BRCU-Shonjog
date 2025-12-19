import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { setAuthUser } from '../redux/authSlice';
import { addNotification } from '../redux/notificationSlice';
import { Home, Heart, MessageCircle, User, LogOut, Menu, X, Bell, Send, Search, Plus, Sun, Moon, ShoppingBag, Settings, Mail, Lock, Trash2, Bookmark } from 'lucide-react';
import { toggleTheme } from '../redux/themeSlice';
import SearchBar from './SearchBar';
import Notifications from './Notifications';
import ChangeEmailModal from './ChangeEmailModal';
import ChangePasswordModal from './ChangePasswordModal';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../lib/config';

export default function MainLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const theme = useSelector((s) => s.theme?.mode || 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const location = useLocation();

  // apply theme class on mount / theme change
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    // Connect to socket.io for real-time notifications
    if (user?._id) {
      const socket = io(SOCKET_URL);
      socket.on('connect', () => {
        // register this user's socket id on the server
        socket.emit('register', user._id);
      });

      socket.on('notification', (notification) => {
        dispatch(addNotification({
          _id: `${Date.now()}`,
          ...notification,
          createdAt: new Date(),
        }));
        toast.info(`${notification.userDetails?.username || 'Someone'} ${notification.message}`);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user?._id, dispatch]);

  const logoutHandler = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/logout`, {
        withCredentials: true,
      });

      if (res.data.success) {
        dispatch(setAuthUser(null));
        navigate('/login');
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error('Logout failed');
      console.log(error);
    }
  };

  const sidebarItems = [
    {
      icon: Home,
      label: 'Home',
      href: '/',
    },
    {
      icon: Heart,
      label: 'Explore',
      href: '/explore',
    },
    {
      icon: ShoppingBag,
      label: 'Marketplace',
      href: '/marketplace',
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      href: '/chat',
    },
    {
      icon: Bookmark,
      label: 'Saved',
      href: '/saved',
    },
    {
      icon: User,
      label: 'Profile',
      href: `/profile/${user?._id}`,
    },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 text-gray-900 dark:text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 border-r border-gray-200 dark:border-sky-700/30 flex-col bg-white dark:bg-gradient-to-b dark:from-gray-900/80 dark:to-blue-950/50">
        {/* Logo */}
        <button
          className="p-6 border-b border-gray-200 dark:border-sky-700/30 text-left w-full"
          onClick={() => navigate('/')}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Sonjog
          </h1>
          <p className="text-xs text-purple-400 mt-1">Connect & Share</p>
        </button>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-sky-700/30">
          <SearchBar />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((item) => {
            const isActive = item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href);
            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                }}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition duration-200 ${isActive ? 'bg-gradient-to-r from-sky-600/30 to-cyan-600/20 text-gray-900 dark:text-white border-l-4 border-sky-500' : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-sky-600/20 hover:to-cyan-600/20 hover:text-sky-600 dark:hover:text-sky-300'}`}
              >
                <item.icon size={24} />
                <span className="text-lg font-medium">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-sky-700/30 space-y-3">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gradient-to-r dark:from-sky-900/30 dark:to-cyan-900/30 border border-gray-200 dark:border-sky-700/30 hover:border-sky-600/50 transition">
              <img
                src={user.profilePicture || 'https://via.placeholder.com/40'}
                alt={user.username}
                className="w-10 h-10 rounded-full border border-sky-600"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{user.username}</p>
                <p className="text-xs text-sky-600 dark:text-sky-300">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logoutHandler}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-xl font-semibold transition duration-200 shadow-lg text-white"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-blue-200 p-4 flex items-center justify-between" style={{backgroundImage: 'linear-gradient(to right, #dbeafe 0%, #ffffff 100%)'}}>
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-blue-900">Sonjog</h1>
          </button>

          <div className="flex items-center gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100">
                <Notifications />
              </div>
              <button
                onClick={() => dispatch(toggleTheme())}
                title="Toggle theme"
                className="h-10 w-10 flex items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => navigate('/chat')} className="h-10 w-10 flex items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100">
                <Send size={20} />
              </button>
              {/* Mobile menu toggle */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden h-10 w-10 flex items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100">
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            <div className="hidden md:block relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="relative"
              >
                <img src={user?.profilePicture || 'https://via.placeholder.com/40'} alt={user?.username} className="w-8 h-8 rounded-full border-2 border-blue-400 cursor-pointer hover:border-blue-500" />
              </button>
              
              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate(`/account/edit`);
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                  >
                    <Settings size={16} />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setChangeEmailOpen(true);
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                  >
                    <Mail size={16} />
                    Change Email
                  </button>
                  <button
                    onClick={() => {
                      setChangePasswordOpen(true);
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                  >
                    <Lock size={16} />
                    Change Password
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                        try {
                          const response = await fetch('http://localhost:8000/api/v1/user/delete-account', {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                              'Content-Type': 'application/json'
                            }
                          });
                          const data = await response.json();
                          if (data.success) {
                            toast.success('Account deleted successfully');
                            // Redirect to login after a short delay
                            setTimeout(() => {
                              window.location.href = '/login';
                            }, 1000);
                          } else {
                            toast.error(data.message || 'Failed to delete account');
                          }
                        } catch (error) {
                          console.error('Delete account error:', error);
                          toast.error('Failed to delete account');
                        }
                      }
                      setProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                  >
                    <Trash2 size={16} />
                    Delete Account
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={logoutHandler}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-b border-gray-200 dark:border-gray-800 p-4 space-y-2 bg-gray-50 dark:bg-gradient-to-b dark:from-gray-900/80 dark:to-black/80">
            <div className="mb-4">
              <SearchBar />
            </div>
            {sidebarItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-purple-900/30 transition duration-200 text-gray-900 dark:text-white"
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
            <button
              onClick={() => {
                logoutHandler();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl font-semibold transition duration-200 text-sm mt-4 text-white"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-background text-foreground">
          <Outlet />
        </main>
      </div>
      <BottomNav />

      {/* Modals */}
      <ChangeEmailModal isOpen={changeEmailOpen} onClose={() => setChangeEmailOpen(false)} />
      <ChangePasswordModal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
}

// Bottom navigation for mobile (fixed)
function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const nav = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: Plus, label: 'Create', href: '/create' },
    { icon: Bell, label: 'Notif', href: '/notifications' },
    { icon: User, label: 'Profile', href: user ? `/profile/${user._id}` : '/login' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card text-foreground border-t border-border flex justify-around py-2 md:hidden">
      {nav.map((n) => {
        const isActive = n.href === '/' ? location.pathname === '/' : location.pathname.startsWith(n.href);
        return (
          <button
            key={n.label}
            onClick={() => navigate(n.href)}
            className={`flex flex-col items-center ${isActive ? 'text-sky-600' : 'text-gray-600 dark:text-gray-300'}`}
          >
            <n.icon size={22} />
          </button>
        );
      })}
    </nav>
  );
}

