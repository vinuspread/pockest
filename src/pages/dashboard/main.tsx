import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Settings from './Settings';
import SharedPocketPage from '../share/SharedPocketPage'; // New
import Welcome from '../welcome/Welcome';
import AdminDashboard from '../admin/AdminDashboard';
import AdminGuard from '../../components/auth/AdminGuard';
import '../../styles/global.css';
import '../../i18n'; // 다국어 시스템 초기화

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="/share/:pocketId" element={<SharedPocketPage />} /> {/* New Public Route */}
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/dashboard/settings" element={<Settings />} />
      <Route path="/dashboard/:pocketId?" element={<Dashboard />} />

      {/* Admin Route */}
      <Route element={<AdminGuard />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </HashRouter>
  </React.StrictMode>
);

