import React from 'react';

/**
 * Reusable Minimalist Container Card
 * @param {Object} props
 * @param {string} [props.title]
 * @param {React.ReactNode} [props.action]
 * @param {React.ReactNode} [props.children]
 */
export default function Card({
  title,
  action,
  className = '',
  style = {},
  children,
  ...props
}) {
  return (
    <div className={`card ${className}`} style={style} {...props}>
      {title || action ? (
        <div className="card-header">
          {title ? <h2 className="card-title">{title}</h2> : <div />}
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
