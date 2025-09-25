

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  BarChart3, 
  Calculator, 
    Landmark,   // ✅ instead of Bank
  CreditCard, 
  Users,
  LogOut,
  DollarSign,
  Database,
  Folder,
  Settings,
  Globe 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/daily-balances', icon: Database, label: 'Daily Balances', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/transactions', icon: CreditCard, label: 'Transactions', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/exchange-rates', icon: DollarSign, label: 'Exchange Rates', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/balance-reports', icon: BarChart3, label: 'Balance Reports', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/position-report', icon: Calculator, label: 'Position Report', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/correspondent-reports', icon:   Landmark,  label: 'Correspondent Reports', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/paid-up-capital', icon: Settings, label: 'Paid-up Capital', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/balance-items', icon: Folder, label: 'Balance Items', roles: ['admin'] },
    { path: '/users', icon: Users, label: 'User Management', roles: ['admin'] },
    { path: '/currency-management', icon: Globe, label: 'Currency Management', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>OP System</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {user?.fullName} ({user?.role})
        </p>
      </div>
      
      <nav className="sidebar-nav">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        <button 
          onClick={logout}
          className="nav-item"
          style={{ 
            background: 'none', 
            border: 'none', 
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;