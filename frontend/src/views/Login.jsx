import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks/useForm';
import { required, minLength, composeValidators } from '../utils/validators';
import { Landmark, LogIn } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Login = () => {
  const { login, loading } = useAuth();

  const { values, errors, touched, handleChange, handleBlur, validate } = useForm(
    {
      username: '',
      password: ''
    },
    {
      username: required(),
      password: composeValidators(required(), minLength(6))
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    const result = await login(values);
    if (!result.success) {
      // Error is handled by the auth service and toasted
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'var(--primary-color)',
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: 'white'
          }}>
            <Landmark size={32} />
          </div>
          <h1>Open Postion System</h1>
          <p style={{ color: 'var(--text-secondary)' }}>International Banking Department</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              name="username"
              value={values.username}
              onChange={(e) => handleChange('username', e.target.value)}
              onBlur={() => handleBlur('username')}
              className="form-input"
              placeholder="Enter your username"
            />
            {touched.username && errors.username && (
              <div className="form-error">{errors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              className="form-input"
              placeholder="Enter your password"
            />
            {touched.password && errors.password && (
              <div className="form-error">{errors.password}</div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;