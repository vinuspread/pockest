import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import '../../styles/global.css';
import '../../i18n'; // 다국어 시스템 초기화

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Welcome from '../welcome/Welcome';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/" element={<Popup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);



