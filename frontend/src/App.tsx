import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewRun from './pages/NewRun';
import RunDetail from './pages/RunDetail';

function DevLogin() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const token = params.get('token');
  const username = params.get('username');
  if (token && username) { login(token, username); }
  return <Navigate to="/dashboard" replace />;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/dev-login" element={<DevLogin />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/runs/new" element={<ProtectedRoute><NewRun /></ProtectedRoute>} />
      <Route path="/runs/:id" element={<ProtectedRoute><RunDetail /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
