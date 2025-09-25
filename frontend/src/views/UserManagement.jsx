import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/common/DataTable';
import { USER_ROLES } from '../utils/constants';
import { formatDate } from '../utils/formatters';
import { UserPlus, Edit, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const { user } = useAuth();

  // Mock data - in real app, this would come from an API
  const users = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@bank.com',
      fullName: 'System Administrator',
      role: 'admin',
      isActive: true,
      lastLogin: new Date().toISOString()
    },
    {
      id: 2,
      username: 'authorizer1',
      email: 'authorizer1@bank.com',
      fullName: 'Authorizer One',
      role: 'authorizer',
      isActive: true,
      lastLogin: new Date().toISOString()
    }
  ];

  const userColumns = [
    { key: 'username', title: 'Username' },
    { key: 'email', title: 'Email' },
    { key: 'fullName', title: 'Full Name' },
    { 
      key: 'role', 
      title: 'Role', 
      render: (value) => USER_ROLES[value]?.label || value 
    },
    { 
      key: 'isActive', 
      title: 'Status', 
      render: (value) => (
        <span style={{ 
          color: value ? 'var(--success-color)' : 'var(--error-color)',
          fontWeight: '600'
        }}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      key: 'lastLogin', 
      title: 'Last Login', 
      render: (value) => formatDate(value, true) 
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" style={{ padding: '0.25rem', background: 'none' }}>
            <Edit size={16} />
          </button>
          <button 
            className="btn" 
            style={{ padding: '0.25rem', background: 'none' }}
            disabled={row.id === user.id}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>User Management</h1>
        
        <button className="btn btn-primary">
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      <DataTable
        columns={userColumns}
        data={users}
        loading={false}
      />
    </div>
  );
};

export default UserManagement;