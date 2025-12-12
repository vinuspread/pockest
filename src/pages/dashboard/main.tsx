import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Settings from './Settings';
import Welcome from '../welcome/Welcome';
import '../../styles/global.css';
import '../../i18n'; // 다국어 시스템 초기화

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/dashboard/settings" element={<Settings />} />
        <Route path="/dashboard/:pocketId?" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);

