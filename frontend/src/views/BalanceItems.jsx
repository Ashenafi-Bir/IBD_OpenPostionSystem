import React, { useState, useEffect } from 'react';
import { balanceItemService } from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { useForm } from '../hooks/useForm';
import { required } from '../utils/validators';
import { Edit, Trash2, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BalanceItems = () => {
  const { hasRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { values, errors, touched, handleChange, handleBlur, validate, reset } = useForm(
    {
      code: '',
      name: '',
      category: 'asset',
      description: '',
      displayOrder: 0
    },
    {
      code: required('Code is required'),
      name: required('Name is required'),
      category: required('Category is required')
    }
  );

  const loadItems = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const abortController = new AbortController();
      const options = { signal: abortController.signal };

      const data = await balanceItemService.getItems(options);
      setItems(data);

      return () => abortController.abort();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
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
    if (!validate()) return;

    try {
      if (editingItem) {
        await balanceItemService.update(editingItem.id, values);
      } else {
        await balanceItemService.create(values);
      }
      setShowModal(false);
      setEditingItem(null);
      reset();
      loadItems(true);
    } catch (error) {
      // handled by interceptor
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    reset({
      code: item.code,
      name: item.name,
      category: item.category,
      description: item.description,
      displayOrder: item.displayOrder
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this balance item?')) {
      try {
        await balanceItemService.delete(id);
        loadItems(true);
      } catch (error) {
        // handled by interceptor
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
    ...(hasRole(['admin'])
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Balance Items</h1>

        {hasRole(['admin']) && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingItem(null);
                reset();
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              <Plus size={16} />
              New Item
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
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
          reset();
        }}
        title={editingItem ? 'Edit Balance Item' : 'Create Balance Item'}
        size="medium"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Code</label>
              <input
                type="text"
                name="code"
                value={values.code}
                onChange={(e) => handleChange('code', e.target.value)}
                onBlur={() => handleBlur('code')}
                className="form-input"
                placeholder="ITEM_CODE"
                disabled={!!editingItem}
              />
              {touched.code && errors.code && (
                <div className="form-error">{errors.code}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                name="displayOrder"
                value={values.displayOrder}
                onChange={(e) => handleChange('displayOrder', e.target.value)}
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
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className="form-input"
                placeholder="Item Name"
              />
              {touched.name && errors.name && (
                <div className="form-error">{errors.name}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Category</label>
              <select
                name="category"
                value={values.category}
                onChange={(e) => handleChange('category', e.target.value)}
                onBlur={() => handleBlur('category')}
                className="form-input"
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="memo_asset">Memo Asset</option>
                <option value="memo_liability">Memo Liability</option>
              </select>
              {touched.category && errors.category && (
                <div className="form-error">{errors.category}</div>
              )}
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Description (Optional)</label>
              <textarea
                name="description"
                value={values.description}
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
                reset();
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
