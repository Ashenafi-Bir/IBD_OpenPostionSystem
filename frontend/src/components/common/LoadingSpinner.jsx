import React from 'react';

const LoadingSpinner = ({ size = 'large', text = 'Loading...' }) => {
  const sizeClass = {
    small: '1rem',
    medium: '2rem',
    large: '3rem'
  }[size];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem'
    }}>
      <div 
        className="loading-spinner" 
        style={{ width: sizeClass, height: sizeClass }}
      />
      <p style={{ color: 'var(--text-secondary)' }}>{text}</p>
    </div>
  );
};

export default LoadingSpinner;