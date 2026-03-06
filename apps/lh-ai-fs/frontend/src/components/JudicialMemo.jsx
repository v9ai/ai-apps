export default function JudicialMemo({ memo }) {
  if (!memo) return null

  // Handle both string and object format
  const memoText = typeof memo === 'string' ? memo : memo.memo
  const keyIssues = typeof memo === 'object' ? memo.key_issues : null
  const actions = typeof memo === 'object' ? memo.recommended_actions : null
  const assessment = typeof memo === 'object' ? memo.overall_assessment : null

  if (!memoText) return null

  return (
    <div style={{
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#92400e' }}>
        Judicial Memo
      </h3>

      <p style={{
        margin: '0 0 16px',
        fontSize: '14px',
        lineHeight: 1.7,
        color: '#78350f',
        fontStyle: 'italic',
      }}>
        {memoText}
      </p>

      {keyIssues && keyIssues.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <strong style={{ fontSize: '13px', color: '#92400e' }}>Key Issues:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '13px', color: '#78350f' }}>
            {keyIssues.map((issue, i) => <li key={i} style={{ marginBottom: '4px' }}>{issue}</li>)}
          </ul>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <strong style={{ fontSize: '13px', color: '#92400e' }}>Recommended Actions:</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '20px', fontSize: '13px', color: '#78350f' }}>
            {actions.map((action, i) => <li key={i} style={{ marginBottom: '4px' }}>{action}</li>)}
          </ul>
        </div>
      )}

      {assessment && (
        <p style={{
          margin: '12px 0 0',
          padding: '8px 12px',
          background: '#fef3c7',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#92400e',
        }}>
          {assessment}
        </p>
      )}
    </div>
  )
}
