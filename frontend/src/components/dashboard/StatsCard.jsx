import React from 'react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const StatsCard = ({ title, value, currency, percentage, trend, icon: Icon }) => {
  const isPositive = trend === 'up';
  const trendColor = isPositive ? 'var(--success-color)' : 'var(--error-color)';

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="stat-label">{title}</p>
          <p className="stat-value">
            {currency ? formatCurrency(value, currency) : formatNumber(value)}
          </p>
          {percentage && (
            <p style={{ 
              color: trendColor, 
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              {isPositive ? '↗' : '↘'} {percentage}%
            </p>
          )}
        </div>
        {Icon && (
          <div style={{
            background: 'var(--primary-color)',
            borderRadius: '8px',
            padding: '0.5rem',
            color: 'white'
          }}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;