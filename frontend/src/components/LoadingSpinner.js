import React from 'react';

const LoadingSpinner = ({ size = 'medium', color = 'var(--primary-color)' }) => {
  const sizes = {
    small: '16px',
    medium: '24px',
    large: '32px'
  };

  const spinnerStyle = {
    width: sizes[size],
    height: sizes[size],
    border: `2px solid var(--gray-200)`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  return <div style={spinnerStyle} className="spinner" />;
};

export default LoadingSpinner;