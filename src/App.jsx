import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Meeting from './pages/Meeting';
import Recordings from './pages/Recordings';
import { useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" />;

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(19, 19, 28, 0.8)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            borderLeft: '4px solid #6b4cff',
          },
          success: { borderLeftColor: '#10b981' },
          error: { borderLeftColor: '#ef4444' }
        }}
      />

      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route path="/" element={<Home />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/meeting/:roomId" element={
          <PrivateRoute>
            <Meeting />
          </PrivateRoute>
        } />

        <Route path="/recordings" element={
          <PrivateRoute>
            <Recordings />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
