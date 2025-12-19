import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ChatPage from './components/ChatPage'
import EditProfile from './components/EditProfile'
import Home from './components/Home'
import Explore from './components/Explore'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import Profile from './components/Profile'
import Signup from './components/Signup'
import DiagnosticsPage from './components/DiagnosticsPage'
import Marketplace from './components/Marketplace'
import MarketplaceItemDetail from './components/MarketplaceItemDetail'
import Saved from './components/Saved'
import { io } from "socket.io-client";
import Notifications from './components/Notifications'
import { useDispatch, useSelector } from 'react-redux'
import { setSocket } from './redux/socketSlice'
import { setSocketInstance, clearSocketInstance } from './lib/socketManager'
import { setOnlineUsers } from './redux/chatSlice'
import { setLikeNotification } from './redux/rtnSlice'
import { setAuthUser } from './redux/authSlice'
import ProtectedRoutes from './components/ProtectedRoutes'
import RehydrationGate from './components/RehydrationGate'
import { API_URL, SOCKET_URL } from './lib/config'


const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoutes><MainLayout /></ProtectedRoutes>,
    children: [
      {
        path: '/',
        element: <ProtectedRoutes><Home /></ProtectedRoutes>
      },
      {
        path: '/explore',
        element: <ProtectedRoutes><Explore /></ProtectedRoutes>
      },
      {
        path: '/profile/:id',
        element: <ProtectedRoutes> <Profile /></ProtectedRoutes>
      },
      {
        path: '/account/edit',
        element: <ProtectedRoutes><EditProfile /></ProtectedRoutes>
      },
      {
        path: '/chat',
        element: <ProtectedRoutes><ChatPage /></ProtectedRoutes>
      },
      {
        path: '/notifications',
        element: <ProtectedRoutes><Notifications /></ProtectedRoutes>
      },
      {
        path: '/create',
        element: <ProtectedRoutes><Home /></ProtectedRoutes>
      },
      {
        path: '/marketplace',
        element: <ProtectedRoutes><Marketplace /></ProtectedRoutes>
      },
      {
        path: '/marketplace/:id',
        element: <ProtectedRoutes><MarketplaceItemDetail /></ProtectedRoutes>
      },
      {
        path: '/saved',
        element: <ProtectedRoutes><Saved /></ProtectedRoutes>
      },
    ]
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
  {
    path: '/diagnostics',
    element: <DiagnosticsPage />
  },
])

function App() {
  const { user } = useSelector(store => store.auth);
  const { connected, id } = useSelector(store => store.socketio);
  const dispatch = useDispatch();

  // Verify auth on app initialization
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/user/me`, {
          method: 'GET',
          credentials: 'include', // include cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Auth is valid, set the user in Redux
            dispatch(setAuthUser(data.user));
          }
        } else if (response.status === 401) {
          // Token expired or invalid, clear auth
          dispatch(setAuthUser(null));
        }
        // For other errors, don't clear auth - let persisted state remain
      } catch (error) {
        console.log('Auth verification failed:', error);
        // On network error, don't clear auth - keep persisted state
        // This allows the app to work offline and prevents clearing valid sessions on network issues
      }
    };

    // Only verify if we have a persisted user
    const persisted = localStorage.getItem('persist:root');
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted);
        if (parsed && parsed.auth) {
          const auth = JSON.parse(parsed.auth);
          if (auth && auth.user) {
            verifyAuth();
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      const socketio = io(SOCKET_URL, {
        query: { userId: user?._id },
        transports: ['websocket'],
      });

      // keep the raw socket instance outside Redux to avoid serialization
      setSocketInstance(socketio);
      dispatch(setSocket({ connected: true, id: socketio.id }));

      // listen all the events and dispatch serializable payloads
      socketio.on('getOnlineUsers', (onlineUsers) => {
        dispatch(setOnlineUsers(onlineUsers));
      });

      socketio.on('notification', (notification) => {
        dispatch(setLikeNotification(notification));
      });

      return () => {
        try { socketio.close(); } catch (e) {}
        clearSocketInstance();
        dispatch(setSocket(null));
      };
    } else if (connected) {
      // if store says we had a socket but user is gone, clear instance
      clearSocketInstance();
      dispatch(setSocket(null));
    }
  }, [user, dispatch]);

  return (
    <>
      <RehydrationGate>
        <RouterProvider router={browserRouter} />
      </RehydrationGate>
    </>
  )
}

export default App
