import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { setAuthUser } from '../redux/authSlice';
import { addNotification } from '../redux/notificationSlice';
import { Heart, MessageCircle, Home, User, LogOut, Menu, X, Bell, Send, Search, Plus, Sun, Moon } from 'lucide-react';
import { toggleTheme } from '../redux/themeSlice';
import SearchBar from './SearchBar';
import Notifications from './Notifications';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:8000/api/v1';
const SOCKET_URL = 'http://localhost:8000';

export default function MainLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const theme = useSelector((s) => s.theme?.mode || 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      icon: MessageCircle,
      label: 'Messages',
      href: '/chat',
    },
    {
      icon: User,
      label: 'Profile',
      href: `/profile/${user?._id}`,
    },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 border-r border-sky-700/30 flex-col bg-gradient-to-b from-gray-900/80 to-blue-950/50">
        {/* Logo */}
        <div className="p-6 border-b border-sky-700/30">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Sonjog
          </h1>
          <p className="text-xs text-purple-400 mt-1">Connect & Share</p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-sky-700/30">
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
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition duration-200 ${isActive ? 'bg-gradient-to-r from-sky-600/30 to-cyan-600/20 text-white border-l-4 border-sky-500' : 'text-gray-300 hover:bg-gradient-to-r hover:from-sky-600/20 hover:to-cyan-600/20 hover:text-sky-300'}`}
              >
                <item.icon size={24} />
                <span className="text-lg font-medium">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-sky-700/30 space-y-3">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-sky-900/30 to-cyan-900/30 border border-sky-700/30 hover:border-sky-600/50 transition">
              <img
                src={user.profilePicture || 'https://via.placeholder.com/40'}
                alt={user.username}
                className="w-10 h-10 rounded-full border border-sky-600"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-white">{user.username}</p>
                <p className="text-xs text-sky-300">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logoutHandler}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 rounded-xl font-semibold transition duration-200 shadow-lg"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-purple-600">Sonjog</h1>
          </div>

          <div className="flex items-center gap-4">
              <div>
                <Notifications />
              </div>
              <button
                onClick={() => dispatch(toggleTheme())}
                title="Toggle theme"
                className="p-2 rounded-full hover:bg-gray-100 text-gray-700"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => navigate('/chat')} className="text-gray-600 hover:text-gray-800">
                <Send size={20} />
              </button>
              {/* Mobile menu toggle */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-gray-600 hover:text-gray-800">
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            <div className="hidden md:block">
              <img src={user?.profilePicture || 'https://via.placeholder.com/40'} alt={user?.username} className="w-8 h-8 rounded-full" />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-b border-gray-800 p-4 space-y-2 bg-gradient-to-b from-gray-900/80 to-black/80">
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
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-purple-900/30 transition duration-200"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl font-semibold transition duration-200 text-sm mt-4"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-100">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

// Bottom navigation for mobile (fixed)
function BottomNav() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const nav = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: Plus, label: 'Create', href: '/create' },
    { icon: Bell, label: 'Notif', href: '/notifications' },
    { icon: User, label: 'Profile', href: user ? `/profile/${user._id}` : '/login' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 md:hidden">
      {nav.map((n) => {
        const isActive = n.href === '/' ? location.pathname === '/' : location.pathname.startsWith(n.href);
        return (
          <button
            key={n.label}
            onClick={() => navigate(n.href)}
            className={`flex flex-col items-center ${isActive ? 'text-sky-600' : 'text-gray-600'}`}
          >
            <n.icon size={22} />
          </button>
        );
      })}
    </nav>
  );
}

