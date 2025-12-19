import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '../redux/authSlice';
import axios from 'axios';
import { toast } from 'sonner';
import { API_URL } from '../lib/config';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    email: '',
    password: '',
  });

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const loginHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const USER_API = `${API_URL}/user`;
      const res = await axios.post(`${USER_API}/login`, input, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });

      if (res.data.success) {
        dispatch(setAuthUser(res.data.user));
        navigate('/');
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background image */}
      <img 
        src="/login-bg.jpg?v=2" 
        alt="building background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-35 z-10"></div>
      
      {/* Content */}
      <div 
        className="relative z-20 w-full max-w-md rounded-2xl shadow-2xl p-8 text-gray-900 border border-white/20"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold" style={{backgroundImage: 'linear-gradient(135deg, #65FDF0 10%, #1D6FA3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>Sonjog</h1>
          <p className="text-sm text-gray-500">Sign in to continue to your account</p>
        </div>

        <form onSubmit={loginHandler} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={input.email}
              onChange={changeEventHandler}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Your password"
              value={input.password}
              onChange={changeEventHandler}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg font-semibold shadow hover:opacity-95 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
