import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import HomePage from '@/pages/home/HomePage';
import SettingPage from '@/pages/setting/SettingPage';
import SalaryPage from '@/pages/salary/SalaryPage';
import { hasSettings } from '@/utils/storage';
import './App.css';

/** 底部三栏导航 */
const TabBar: React.FC = () => (
  <nav className="tab-bar">
    <NavLink to="/board" className="tab-item">
      {({ isActive }) => (
        <>
          <span className="tab-icon">⚡</span>
          <span className="tab-label">秒薪看板</span>
          {isActive && <span className="tab-dot" />}
        </>
      )}
    </NavLink>
    <NavLink to="/salary" className="tab-item">
      {({ isActive }) => (
        <>
          <span className="tab-icon">💰</span>
          <span className="tab-label">薪金</span>
          {isActive && <span className="tab-dot" />}
        </>
      )}
    </NavLink>
    <NavLink to="/setting" className="tab-item">
      {({ isActive }) => (
        <>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">设置</span>
          {isActive && <span className="tab-dot" />}
        </>
      )}
    </NavLink>
  </nav>
);

/** 页面外壳：内容区 + 底部 TabBar */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-shell">
    <div className="app-content">{children}</div>
    <TabBar />
  </div>
);

/** 守卫：无设置时跳到设置页 */
const RequireSettings: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!hasSettings()) return <Navigate to="/setting" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const Router = (typeof window !== 'undefined' && window.__POWERED_BY_QIANKUN__)
    ? BrowserRouter
    : HashRouter;

  return (
    <div className="app-root">
      <Router>
        <Routes>
          <Route path="/board" element={<RequireSettings><Shell><HomePage /></Shell></RequireSettings>} />
          <Route path="/salary" element={<RequireSettings><Shell><SalaryPage /></Shell></RequireSettings>} />
          <Route path="/setting" element={<Shell><SettingPage /></Shell>} />
          <Route path="/" element={<Navigate to={hasSettings() ? '/board' : '/setting'} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
