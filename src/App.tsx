import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '@/pages/home/HomePage';
import SettingPage from '@/pages/setting/SettingPage';
import { hasSettings } from '@/utils/storage';
import './App.css';

/**
 * 路由守卫：首次进入若无设置则跳到设置页
 */
const HomeGuard: React.FC = () => {
  return hasSettings() ? <HomePage /> : <Navigate to="/setting" replace />;
};

const App: React.FC = () => {
  // H5/浏览器环境优先使用 HashRouter（避免部署后刷新404）
  const Router = (typeof window !== 'undefined' && window.__POWERED_BY_QIANKUN__)
    ? BrowserRouter
    : HashRouter;

  return (
    <div className="app-root">
      <Router>
        <Routes>
          <Route path="/" element={<HomeGuard />} />
          <Route path="/setting" element={<SettingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
