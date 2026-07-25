import React from 'react';

/**
 * Reusable Minimalist Status Badge Component
 * @param {Object} props
 * @param {'success' | 'warning' | 'danger' | 'info'} [props.variant='info']
 * @param {React.ReactNode} [props.children]
 */
export default function Badge({
  variant = 'info',
  className = '',
  children,
  ...props
}) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}
