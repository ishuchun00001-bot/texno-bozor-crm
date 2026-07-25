import React from 'react';
import { Package } from 'lucide-react';

/**
 * Reusable Minimalist Enterprise Data Table
 * @param {Object} props
 * @param {Array<{key: string, label: string, align?: 'left'|'center'|'right', width?: string}>} props.columns
 * @param {Array<Object>} props.data
 * @param {boolean} [props.loading=false]
 * @param {string} [props.emptyMessage="Ma'lumotlar topilmadi"]
 * @param {Function} props.renderRow
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "Ma'lumotlar topilmadi",
  renderRow
}) {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: col.align || 'left',
                  width: col.width || 'auto'
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td colSpan={columns.length}>
                  <div className="skeleton" style={{ height: '36px' }} />
                </td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}
              >
                <Package size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <div>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            data.map((item, index) => renderRow(item, index))
          )}
        </tbody>
      </table>
    </div>
  );
}
