import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Bell } from 'lucide-react';

const Header = () => {
  const { isDark, toggleTheme } = useTheme();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="header">
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
          IBD FCY Open Postion System
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {currentDate}
        </p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn" style={{ background: 'none' }}>
          <Bell size={20} />
        </button>
        
        <button 
          onClick={toggleTheme}
          className="btn"
          style={{ background: 'none' }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Header;