import React, { useState, useEffect } from 'react';
import { balanceItemService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { Edit, Trash2, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BalanceItems = () => {
  const { hasAnyRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Form state
  const [formValues, setFormValues] = useState({
    code: '',
    name: '',
    category: 'asset',
    description: '',
    displayOrder: 0
  });

  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation function
  const validateForm = () => {
    const errors = {};
    if (!formValues.code.trim()) errors.code = 'Code is required';
    if (!formValues.name.trim()) errors.name = 'Name is required';
    if (!formValues.category) errors.category = 'Category is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const resetForm = () => {
    setFormValues({
      code: '',
      name: '',
      category: 'asset',
      description: '',
      displayOrder: 0
    });
    setFormErrors({});
    setTouched({});
  };

  const loadItems = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const data = await balanceItemService.getItems();
      setItems(data);

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load balance items');
        console.error('BalanceItems load error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRefresh = () => {
    loadItems(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateForm()) return;

    try {
      if (editingItem) {
        await balanceItemService.update(editingItem.id, formValues);
      } else {
        await balanceItemService.create(formValues);
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      loadItems(true);
    } catch (error) {
      setSubmitError(error.response?.data?.error || error.message || 'Failed to save balance item');
      console.error('Submit error:', error);
    }
  };

  const handleEdit = (item) => {
    console.log('Editing item:', item);
    setEditingItem(item);
    
    // Set form values directly
    setFormValues({
      code: item.code || '',
      name: item.name || '',
      category: item.category || 'asset',
      description: item.description || '',
      displayOrder: item.displayOrder || 0
    });
    
    setFormErrors({});
    setTouched({});
    setSubmitError(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this balance item?')) {
      try {
        await balanceItemService.delete(id);
        loadItems(true);
      } catch (error) {
        setError(error.response?.data?.error || error.message || 'Failed to delete balance item');
      }
    }
  };

  const categoryColors = {
    asset: 'var(--success-color)',
    liability: 'var(--error-color)',
    memo_asset: 'var(--warning-color)',
    memo_liability: 'var(--secondary-color)'
  };

  const categoryLabels = {
    asset: 'Asset',
    liability: 'Liability',
    memo_asset: 'Memo Asset',
    memo_liability: 'Memo Liability'
  };

  const itemColumns = [
    { key: 'code', title: 'Code' },
    { key: 'name', title: 'Name' },
    {
      key: 'category',
      title: 'Category',
      render: (value) => (
        <span
          style={{
            color: categoryColors[value],
            fontWeight: '600'
          }}
        >
          {categoryLabels[value]}
        </span>
      )
    },
    { key: 'displayOrder', title: 'Order' },
    { key: 'description', title: 'Description' },
    ...(hasAnyRole(['admin'])
      ? [
          {
            key: 'actions',
            title: 'Actions',
            render: (value, row) => (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleEdit(row)}
                  className="btn"
                  style={{ padding: '0.25rem', background: 'none' }}
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="btn"
                  style={{ padding: '0.25rem', background: 'none' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          }
        ]
      : [])
  ];

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 mb-4">Error loading balance items: {error}</div>
        <button
          onClick={handleRefresh}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-2xl font-bold">Balance Items</h1>

        {hasAnyRole(['admin']) && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => {
                setEditingItem(null);
                resetForm();
                setSubmitError(null);
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={16} />
              New Item
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-secondary"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      <DataTable
        columns={itemColumns}
        data={items || []}
        loading={refreshing}
        emptyMessage="No balance items found"
      />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
          setSubmitError(null);
        }}
        title={editingItem ? `Edit Balance Item: ${editingItem.code}` : 'Create Balance Item'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {submitError}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Code</label>
              <input
                type="text"
                name="code"
                value={formValues.code}
                onChange={(e) => handleChange('code', e.target.value)}
                onBlur={() => handleBlur('code')}
                className="form-input"
                placeholder="ITEM_CODE"
                disabled={!!editingItem}
              />
              {touched.code && formErrors.code && (
                <div className="form-error">{formErrors.code}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                name="displayOrder"
                value={formValues.displayOrder}
                onChange={(e) => handleChange('displayOrder', parseInt(e.target.value) || 0)}
                className="form-input"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                value={formValues.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className="form-input"
                placeholder="Item Name"
              />
              {touched.name && formErrors.name && (
                <div className="form-error">{formErrors.name}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Category</label>
              <select
                name="category"
                value={formValues.category}
                onChange={(e) => handleChange('category', e.target.value)}
                onBlur={() => handleBlur('category')}
                className="form-input"
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="memo_asset">Memo Asset</option>
                <option value="memo_liability">Memo Liability</option>
              </select>
              {touched.category && formErrors.category && (
                <div className="form-error">{formErrors.category}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Description (Optional)</label>
              <textarea
                name="description"
                value={formValues.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="form-input"
                rows={3}
                placeholder="Item description..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingItem(null);
                resetForm();
                setSubmitError(null);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingItem ? 'Update' : 'Create'} Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BalanceItems;