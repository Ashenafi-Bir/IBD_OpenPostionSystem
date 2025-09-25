import React from 'react';

const DataTable = ({ 
  columns, 
  data, 
  loading, 
  emptyMessage = 'No data available',
  onRowClick 
}) => {
  if (loading) {
    return (
      <div className="card">
        <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={column.headerStyle}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr 
                  key={index}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{ 
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) e.currentTarget.style.backgroundColor = 'var(--surface-color)';
                  }}
                  onMouseLeave={(e) => {
                    if (onRowClick) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;