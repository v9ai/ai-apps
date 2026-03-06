const severityStyles = {
  critical: { bg: '#fef2f2', border: '#fecaca', badge: '#dc2626', text: '#991b1b' },
  high: { bg: '#fff7ed', border: '#fed7aa', badge: '#ea580c', text: '#9a3412' },
  medium: { bg: '#fefce8', border: '#fde68a', badge: '#ca8a04', text: '#854d0e' },
  low: { bg: '#f0fdf4', border: '#bbf7d0', badge: '#16a34a', text: '#166534' },
}

export default function FindingCard({ finding }) {
  const sev = severityStyles[finding.severity] || severityStyles.medium

  return (
    <div style={{
      background: sev.bg,
      border: `1px solid ${sev.border}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{
          background: sev.badge,
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '10px',
          textTransform: 'uppercase',
        }}>
          {finding.severity}
        </span>
        <span style={{
          fontSize: '11px',
          color: '#6b7280',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}>
          {finding.type}
        </span>
        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
          {finding.id}
        </span>
      </div>

      <p style={{ margin: '0 0 8px', color: sev.text, fontSize: '14px', lineHeight: 1.5 }}>
        {finding.description}
      </p>

      {finding.evidence && finding.evidence.length > 0 && (
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
          <strong>Evidence:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
            {finding.evidence.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            background: 'rgba(0,0,0,0.08)',
            borderRadius: '3px',
            height: '6px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.round((finding.confidence || 0) * 100)}%`,
              height: '100%',
              background: sev.badge,
              borderRadius: '3px',
            }} />
          </div>
        </div>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, minWidth: '40px' }}>
          {Math.round((finding.confidence || 0) * 100)}%
        </span>
      </div>

      {finding.confidence_reasoning && (
        <p style={{
          margin: '6px 0 0',
          fontSize: '12px',
          color: '#6b7280',
          lineHeight: 1.4,
          fontStyle: 'italic',
          paddingLeft: '4px',
          borderLeft: '2px solid #e5e7eb',
        }}>
          {finding.confidence_reasoning}
        </p>
      )}

      {finding.recommendation && (
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
          {finding.recommendation}
        </p>
      )}
    </div>
  )
}
