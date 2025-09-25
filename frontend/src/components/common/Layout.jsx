import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="container" style={{ padding: '2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;