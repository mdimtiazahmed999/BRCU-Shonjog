import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '../redux/authSlice';
import axios from 'axios';
import { toast } from 'sonner';
import { API_URL } from '../lib/config';

export default function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    username: '',
    email: '',
    password: '',
  });

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const signupHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Field validation first
    if (!input.username || !input.email || !input.password) {
      toast.error('Please fill all fields');
      setLoading(false);
      return;
    }

    // Email domain + password length checks
    const lowerEmail = String(input.email).toLowerCase();
    const allowedDomains = ['@bracu.ac.bd', '@g.bracu.ac.bd'];
    const hasAllowedDomain = allowedDomains.some((d) => lowerEmail.endsWith(d));
    if (!hasAllowedDomain) {
      toast.error('Use a BRACU email (@bracu.ac.bd or @g.bracu.ac.bd)');
      setLoading(false);
      return;
    }
    if (String(input.password).length < 5) {
      toast.error('Password must be at least 5 characters long');
      setLoading(false);
      return;
    }

    const USER_API = `${API_URL}/user`;

    // Step 1: Register
    try {
      const registerRes = await axios.post(
        `${USER_API}/register`,
        { username: input.username, email: lowerEmail, password: input.password },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      if (!registerRes.data?.success) {
        throw new Error(registerRes.data?.message || 'Registration failed');
      }
      toast.success(registerRes.data.message || 'Account created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
      console.log(err);
      setLoading(false);
      return;
    }

    // Step 2: Auto-login (best effort). If this fails, show explicit message.
    try {
      const loginRes = await axios.post(
        `${USER_API}/login`,
        { email: lowerEmail, password: input.password },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      if (loginRes.data?.success) {
        dispatch(setAuthUser(loginRes.data.user));
        navigate('/');
        toast.success(loginRes.data.message || 'Logged in');
      } else {
        toast.error('Account created, but auto‑login failed. Please log in.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Account created, but auto‑login failed. Please log in.');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-gray-900">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold" style={{backgroundImage: 'linear-gradient(135deg, #65FDF0 10%, #1D6FA3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>Create your account</h1>
          <p className="text-sm text-gray-500">Join Sonjog — it's quick and easy.</p>
        </div>

        <form onSubmit={signupHandler} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              placeholder="Choose a username"
              value={input.username}
              onChange={changeEventHandler}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={loading}
            />
          </div>

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
              placeholder="Create a password"
              value={input.password}
              onChange={changeEventHandler}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-semibold shadow hover:opacity-95 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
