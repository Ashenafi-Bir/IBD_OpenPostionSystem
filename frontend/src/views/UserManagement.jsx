import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required, email, minLength, composeValidators } from '../utils/validators';
import { formatDate } from '../utils/formatters';
import { USER_ROLES } from '../utils/constants';
import { UserPlus, Edit, Trash2, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      username: '',
      email: '',
      fullName: '',
      role: 'maker',
      password: '',
      isActive: true
    },
    {
      username: composeValidators(
        required('Username is required'),
        minLength(3, 'Username must be at least 3 characters')
      ),
      email: composeValidators(
        required('Email is required'),
        email('Please provide a valid email')
      ),
      fullName: required('Full name is required'),
      password: (value, values, editing) => {
        if (!editing && !value) {
          return 'Password is required for new users';
        }
        if (value && value.length < 6) {
          return 'Password must be at least 6 characters';
        }
        return null;
      }
    }
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUsers();
      
      // Handle different possible response structures
      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      } else if (Array.isArray(response)) {
        usersData = response;
      }
      
      console.log('Users data:', usersData); // Debug log
      setUsers(usersData);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load users';
      setError(errorMessage);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchUsers();
  };

  const handleAddUser = () => {
    setEditingUser(null);
    reset({
      username: '',
      email: '',
      fullName: '',
      role: 'maker',
      password: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    reset({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      password: '',
      isActive: user.isActive
    });
    setShowModal(true);
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      setError('You cannot delete your own account');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    try {
      await userService.deleteUser(user.id);
      await fetchUsers();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to delete user';
      setError(errorMessage);
      console.error('Error deleting user:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Pass editing state to password validator
    const isEditing = !!editingUser;
    if (!validate(isEditing)) return;

    try {
      const userData = { 
        username: values.username,
        email: values.email,
        fullName: values.fullName,
        role: values.role,
        isActive: values.isActive
      };
      
      // Only include password if provided (for updates) or required (for new users)
      if (values.password) {
        userData.password = values.password;
      }

      if (editingUser) {
        await userService.updateUser(editingUser.id, userData);
      } else {
        await userService.createUser(userData);
      }

      setShowModal(false);
      setEditingUser(null);
      reset();
      await fetchUsers();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to save user';
      setError(errorMessage);
      console.error('Error submitting user:', error);
    }
  };

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
      render: (value) => value ? formatDate(value, true) : 'Never' 
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => handleEditUser(row)} 
            className="btn" 
            style={{ background: 'none' }}
            disabled={row.id === currentUser.id}
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => handleDeleteUser(row)} 
            className="btn" 
            style={{ background: 'none' }}
            disabled={row.id === currentUser.id}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  if (loading && !users.length) return <LoadingSpinner />;

  if (error && !users.length) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>
          Error loading users: {error}
        </div>
        <button onClick={handleRefresh} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>User Management</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleRefresh} disabled={loading} className="btn btn-secondary">
            <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={handleAddUser} className="btn btn-primary">
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </div>

      {error && users.length > 0 && (
        <div style={{ 
          color: 'var(--error-color)', 
          marginBottom: '1rem',
          padding: '0.5rem',
          background: 'var(--error-bg)',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      <DataTable 
        columns={userColumns} 
        data={users} 
        loading={loading}
        emptyMessage="No users found"
      />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
          reset();
        }}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                value={values.username}
                onChange={(e) => handleChange('username', e.target.value)}
                onBlur={() => handleBlur('username')}
                className="form-input"
                placeholder="Enter username"
              />
              {touched.username && errors.username && (
                <div className="form-error">{errors.username}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={values.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className="form-input"
                placeholder="Enter email"
              />
              {touched.email && errors.email && (
                <div className="form-error">{errors.email}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={values.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                onBlur={() => handleBlur('fullName')}
                className="form-input"
                placeholder="Enter full name"
              />
              {touched.fullName && errors.fullName && (
                <div className="form-error">{errors.fullName}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                name="role"
                value={values.role}
                onChange={(e) => handleChange('role', e.target.value)}
                onBlur={() => handleBlur('role')}
                className="form-input"
              >
                {Object.entries(USER_ROLES).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="isActive"
                value={values.isActive}
                onChange={(e) => handleChange('isActive', e.target.value === 'true')}
                onBlur={() => handleBlur('isActive')}
                className="form-input"
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
              </label>
              <input
                type="password"
                name="password"
                value={values.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                className="form-input"
                placeholder={editingUser ? "Enter new password" : "Enter password"}
              />
              {touched.password && errors.password && (
                <div className="form-error">{errors.password}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingUser(null);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingUser ? 'Update' : 'Create'} User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;