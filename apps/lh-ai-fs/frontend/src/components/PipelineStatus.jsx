const statusIcons = {
  success: { symbol: '\u2713', color: '#16a34a', bg: '#dcfce7' },
  failed: { symbol: '\u2717', color: '#dc2626', bg: '#fef2f2' },
  skipped: { symbol: '\u2013', color: '#6b7280', bg: '#f3f4f6' },
  running: { symbol: '\u25cf', color: '#2563eb', bg: '#dbeafe' },
  pending: { symbol: '\u25cb', color: '#9ca3af', bg: '#f9fafb' },
}

const agentLabels = {
  document_parser: 'Parser',
  citation_verifier: 'Citation Verifier',
  fact_checker: 'Fact Checker',
  report_synthesizer: 'Synthesizer',
  judicial_memo: 'Judicial Memo',
}

export default function PipelineStatus({ statuses }) {
  if (!statuses || statuses.length === 0) return null

  return (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151' }}>
        Pipeline Status
      </h3>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
      }}>
        {statuses.map((s, i) => {
          const icon = statusIcons[s.status] || statusIcons.pending
          const label = agentLabels[s.agent_name] || s.agent_name
          const isParallelStart = s.agent_name === 'citation_verifier'
          const isParallelEnd = s.agent_name === 'fact_checker'

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {i > 0 && !isParallelEnd && (
                <span style={{ color: '#d1d5db', fontSize: '14px', margin: '0 2px' }}>
                  {isParallelStart ? '' : '\u2192'}
                </span>
              )}
              {isParallelStart && (
                <span style={{ color: '#d1d5db', fontSize: '14px', margin: '0 2px' }}>\u2192 [</span>
              )}
              {isParallelEnd && (
                <span style={{ color: '#d1d5db', fontSize: '14px', margin: '0 2px' }}>\u2225</span>
              )}
              <div
                title={s.error ? `Error: ${s.error}` : s.duration_ms ? `${s.duration_ms}ms` : ''}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: icon.bg,
                  border: `1px solid ${s.status === 'failed' ? '#fecaca' : 'transparent'}`,
                  fontSize: '12px',
                  fontWeight: 500,
                  color: icon.color,
                  cursor: s.error ? 'help' : 'default',
                }}
              >
                <span style={{ fontSize: '13px' }}>{icon.symbol}</span>
                {label}
                {s.duration_ms != null && (
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>
                    {s.duration_ms < 1000
                      ? `${s.duration_ms}ms`
                      : `${(s.duration_ms / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>
              {isParallelEnd && (
                <span style={{ color: '#d1d5db', fontSize: '14px', margin: '0 2px' }}>]</span>
              )}
            </div>
          )
        })}
      </div>
      {statuses.some(s => s.status === 'failed') && (
        <div style={{
          marginTop: '10px',
          fontSize: '12px',
          color: '#dc2626',
          background: '#fef2f2',
          padding: '8px 12px',
          borderRadius: '6px',
        }}>
          {statuses.filter(s => s.status === 'failed').map((s, i) => (
            <div key={i}>
              <strong>{agentLabels[s.agent_name] || s.agent_name}</strong>: {s.error}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
