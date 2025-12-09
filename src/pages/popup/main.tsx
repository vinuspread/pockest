import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import '../../styles/global.css';
import '../../i18n'; // 다국어 시스템 초기화

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);



