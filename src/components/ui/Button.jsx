import React from 'react';

/**
 * Reusable Minimalist Enterprise Button
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.iconOnly=false]
 * @param {React.ReactNode} [props.children]
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconOnly = false,
  className = '',
  disabled,
  children,
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  const iconClass = iconOnly ? 'btn-icon' : '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${iconClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spin" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
      ) : null}
      {children}
    </button>
  );
}
