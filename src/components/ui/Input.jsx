import React from 'react';

/**
 * Reusable Minimalist Input Field Component
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 */
export default function Input({
  label,
  error,
  hint,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`form-control ${error ? 'border-danger' : ''} ${className}`}
        onFocus={(e) => {
          try { e.target.select(); } catch (err) {}
          if (props.onFocus) props.onFocus(e);
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
          {error}
        </span>
      )}
      {hint && !error && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {hint}
        </span>
      )}
    </div>
  );
}
