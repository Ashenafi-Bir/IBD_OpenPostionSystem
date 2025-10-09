import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  BarChart3, 
  Calculator, 
  Landmark,  
  CreditCard, 
  Users,
  LogOut,
  DollarSign,
  Database,
  Folder,
  Settings,
  Globe,
  ShieldCheck, 
  FileText 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/daily-balances', icon: Database, label: 'Daily Bal.', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/transactions', icon: CreditCard, label: 'Trans.', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/exchange-rates', icon: DollarSign, label: 'Exch. Rates', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/balance-reports', icon: BarChart3, label: 'Bal. Reports', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/position-report', icon: Calculator, label: 'Pos. Report', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/correspondent-reports', icon: Landmark, label: 'Cor. Reports', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/paid-up-capital', icon: ShieldCheck, label: 'Paid-up Cap.', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/DailyBalanceEntry', icon: FileText, label: 'Cor. Bal. Entry', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/balance-items', icon: Folder, label: 'Bal. Items', roles: ['admin'] },
    { path: '/CorrespondentBankManagement', icon: Home, label: 'Cor. Bank Mgmt.', roles: ['maker', 'authorizer', 'admin'] },
    { path: '/currency-management', icon: Globe, label: 'Curr. Mgmt.', roles: ['admin'] },
     { path: '/users', icon: Users, label: 'Users', roles: ['admin'] },
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
