import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null;

  const sizeClass = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-full'
  }[size];

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${sizeClass}`}>
        <div className="modal-header">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;