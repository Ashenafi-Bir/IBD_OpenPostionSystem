import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm1';
import { required, email, minLength, composeValidators } from '../utils/validators';
import { formatDate } from '../utils/formatters';
import { USER_ROLES } from '../utils/constants';
import { UserPlus, Edit, Trash2, RefreshCw, Search, User, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './UserManagement.css';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [ldapSearchResults, setLdapSearchResults] = useState([]);
  const [ldapSearchLoading, setLdapSearchLoading] = useState(false);
  const [ldapSearchTerm, setLdapSearchTerm] = useState('');
  const [selectedLdapUser, setSelectedLdapUser] = useState(null);
  const [authType, setAuthType] = useState('local');

  const { values, errors, touched, handleChange, handleBlur, validate, reset, setValue, setValues } = useForm(
    {
      username: '',
      email: '',
      fullName: '',
      role: 'maker',
      password: '',
      isActive: true,
      ldapUsername: ''
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
        if (authType === 'local') {
          if (!editing && !value) {
            return 'Password is required for local users';
          }
          if (value && value.length < 6) {
            return 'Password must be at least 6 characters';
          }
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
      
      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      }
      
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
    setAuthType('local');
    setSelectedLdapUser(null);
    setLdapSearchResults([]);
    setLdapSearchTerm('');
    reset({
      username: '',
      email: '',
      fullName: '',
      role: 'maker',
      password: '',
      isActive: true,
      ldapUsername: ''
    });
    setShowModal(true);
  };

  const handleEditUser = async (user) => {
    try {
      // Fetch the latest user data to ensure we have the most current information
      const response = await userService.getUser(user.id);
      const userData = response.data.data || response.data;
      
      setEditingUser(userData);
      setAuthType(userData.authType);
      
      if (userData.authType === 'ldap') {
        setSelectedLdapUser({
          username: userData.ldapUsername || userData.username,
          displayName: userData.fullName
        });
      } else {
        setSelectedLdapUser(null);
      }
      
      setLdapSearchResults([]);
      setLdapSearchTerm('');
      
      // Set form values with the fetched user data
      setValues({
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        password: '',
        isActive: userData.isActive,
        ldapUsername: userData.ldapUsername || ''
      });
      
      setShowModal(true);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to load user data';
      setError(errorMessage);
      console.error('Error loading user data:', error);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser.id) {
      setError('You cannot delete your own account');
      return;
    }

    // Allow admin to delete any user (both LDAP and local)
    const userType = user.authType === 'ldap' ? 'LDAP' : 'local';
    if (!window.confirm(`Are you sure you want to delete ${userType} user "${user.username}"? This will remove the user from the local database.`)) {
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

  const searchLdapUsers = async (searchTerm) => {
    if (searchTerm.length < 3) {
      setLdapSearchResults([]);
      return;
    }

    try {
      setLdapSearchLoading(true);
      const response = await userService.searchLdapUsers(searchTerm);
      setLdapSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching LDAP users:', error);
      setLdapSearchResults([]);
    } finally {
      setLdapSearchLoading(false);
    }
  };

  const handleLdapSearchChange = (e) => {
    const value = e.target.value;
    setLdapSearchTerm(value);
    
    // Debounce search
    clearTimeout(ldapSearchTimeout);
    ldapSearchTimeout = setTimeout(() => {
      searchLdapUsers(value);
    }, 500);
  };

  let ldapSearchTimeout;

  const handleLdapUserSelect = (ldapUser) => {
    setSelectedLdapUser(ldapUser);
    setLdapSearchTerm('');
    setLdapSearchResults([]);
    
    // Auto-fill form fields using setValue for each field
    setValue('username', ldapUser.username);
    setValue('fullName', ldapUser.displayName);
    setValue('email', `${ldapUser.username}@addisbanksc.com`);
    setValue('ldapUsername', ldapUser.username);
  };

  const handleAuthTypeChange = (type) => {
    setAuthType(type);
    setSelectedLdapUser(null);
    setLdapSearchResults([]);
    setLdapSearchTerm('');
    
    if (type === 'local') {
      // Reset to empty values for local user
      reset({
        username: '',
        email: '',
        fullName: '',
        role: 'maker',
        password: '',
        isActive: true,
        ldapUsername: ''
      });
    } else {
      // Reset for LDAP user but keep any existing values
      setValue('password', '');
      setValue('ldapUsername', '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isEditing = !!editingUser;
    if (!validate(isEditing)) return;

    try {
      const userData = { 
        username: values.username,
        email: values.email,
        fullName: values.fullName,
        role: values.role,
        isActive: values.isActive,
        authType: authType,
        ldapUsername: authType === 'ldap' ? values.ldapUsername : null
      };
      
      // Only include password for local users
      if (authType === 'local' && values.password) {
        userData.password = values.password;
      }

      if (editingUser) {
        await userService.updateUser(editingUser.id, userData);
      } else {
        await userService.createUser(userData);
      }

      setShowModal(false);
      setEditingUser(null);
      setSelectedLdapUser(null);
      reset();
      await fetchUsers();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to save user';
      setError(errorMessage);
      console.error('Error submitting user:', error);
    }
  };

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

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
      key: 'authType', 
      title: 'Auth Type', 
      render: (value) => (
        <span style={{ 
          color: value === 'ldap' ? 'var(--primary-color)' : 'var(--secondary-color)',
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: '0.8rem'
        }}>
          {value}
        </span>
      )
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
            disabled={row.id === currentUser.id || !isAdmin}
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => handleDeleteUser(row)} 
            className="btn" 
            style={{ background: 'none' }}
            disabled={row.id === currentUser.id || !isAdmin}
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
          {isAdmin && (
            <button onClick={handleAddUser} className="btn btn-primary">
              <UserPlus size={16} /> Add User
            </button>
          )}
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
          setSelectedLdapUser(null);
          reset();
        }}
        title={editingUser ? 'Edit User' : 'Create New User'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          {/* Authentication Type Selection */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Authentication Type</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label className="radio-label">
                <input
                  type="radio"
                  name="authType"
                  value="local"
                  checked={authType === 'local'}
                  onChange={() => handleAuthTypeChange('local')}
                  disabled={editingUser && editingUser.authType === 'ldap' && !isAdmin}
                />
                <span>Local User</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="authType"
                  value="ldap"
                  checked={authType === 'ldap'}
                  onChange={() => handleAuthTypeChange('ldap')}
                  disabled={editingUser && editingUser.authType === 'local' && !isAdmin}
                />
                <span>LDAP User</span>
              </label>
            </div>
            {editingUser && !isAdmin && (
              <div style={{ 
                marginTop: '0.5rem', 
                padding: '0.5rem',
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                fontSize: '0.875rem',
                color: '#856404',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                Only admin users can modify authentication type
              </div>
            )}
          </div>

          {authType === 'ldap' && !editingUser && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Search LDAP User</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={ldapSearchTerm}
                  onChange={handleLdapSearchChange}
                  className="form-input"
                  placeholder="Search by username or full name..."
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Search size={16} style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#666'
                }} />
              </div>
              
              {ldapSearchLoading && (
                <div style={{ padding: '0.5rem', textAlign: 'center' }}>
                  <LoadingSpinner size="small" />
                </div>
              )}
              
              {ldapSearchResults.length > 0 && (
                <div className="ldap-search-results">
                  {ldapSearchResults.map((user, index) => (
                    <div
                      key={index}
                      className="ldap-user-item"
                      onClick={() => handleLdapUserSelect(user)}
                    >
                      <User size={16} />
                      <div>
                        <div className="ldap-username">{user.username}</div>
                        <div className="ldap-displayname">{user.displayName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedLdapUser && (
                <div className="selected-ldap-user">
                  <div className="selected-user-header">Selected LDAP User:</div>
                  <div className="selected-user-details">
                    <strong>{selectedLdapUser.displayName}</strong>
                    <span>({selectedLdapUser.username})</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {authType === 'ldap' && editingUser && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div className="selected-ldap-user" style={{ 
                background: isAdmin ? '#e8f5e8' : '#f8f9fa', 
                borderColor: isAdmin ? '#4caf50' : '#e9ecef' 
              }}>
                <div className="selected-user-header">LDAP User {!isAdmin && '(View Only)'}:</div>
                <div className="selected-user-details">
                  <strong>{editingUser.fullName}</strong>
                  <span>({editingUser.ldapUsername || editingUser.username})</span>
                </div>
                {!isAdmin && (
                  <div style={{ 
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    Only admin users can modify LDAP user details
                  </div>
                )}
              </div>
            </div>
          )}

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
                disabled={
                  (authType === 'ldap' && selectedLdapUser) || 
                  (editingUser && authType === 'ldap' && !isAdmin)
                }
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
                disabled={authType === 'ldap' && selectedLdapUser}
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
                disabled={authType === 'ldap' && selectedLdapUser}
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
                disabled={editingUser && authType === 'ldap' && !isAdmin}
              >
                {Object.entries(USER_ROLES).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
              {editingUser && authType === 'ldap' && !isAdmin && (
                <div style={{ 
                  marginTop: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Only admin users can change role for LDAP users
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="isActive"
                value={values.isActive}
                onChange={(e) => handleChange('isActive', e.target.value === 'true')}
                onBlur={() => handleBlur('isActive')}
                className="form-input"
                disabled={editingUser && !isAdmin}
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
              {editingUser && !isAdmin && (
                <div style={{ 
                  marginTop: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Only admin users can change user status
                </div>
              )}
            </div>

            {authType === 'local' && (
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
            )}

            {authType === 'ldap' && (
              <input type="hidden" name="ldapUsername" value={values.ldapUsername} />
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingUser(null);
                setSelectedLdapUser(null);
                reset();
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isAdmin && editingUser}>
              {editingUser ? 'Update' : 'Create'} User
            </button>
          </div>

          {!isAdmin && editingUser && (
            <div style={{ 
              marginTop: '1rem',
              padding: '0.75rem',
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              fontSize: '0.875rem',
              color: '#856404',
              textAlign: 'center'
            }}>
              <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
              Only admin users can modify user accounts
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;