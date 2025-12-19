import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoutes({ children }) {
  const { user } = useSelector(store => store.auth);

  // Trust Redux state only; PersistGate/RehydrationGate ensure it is loaded.
  // This prevents granting access solely based on stale localStorage data.
  const isAuthenticated = !!user;

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
