import React from 'react';

export default function SkeletonLoader({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
      {/* Top metrics skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card skeleton-box" style={{ height: '90px' }}></div>
        ))}
      </div>

      {/* Table rows skeleton */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div className="skeleton-box" style={{ height: '40px', width: '100%', marginBottom: '16px' }}></div>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="skeleton-box"
            style={{
              height: '48px',
              width: '100%',
              marginBottom: '12px',
              opacity: 1 - idx * 0.15
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}
