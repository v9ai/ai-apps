const colors = {
  high: '#22c55e',
  medium: '#eab308',
  low: '#ef4444',
}

function getColor(value) {
  if (value >= 0.7) return colors.high
  if (value >= 0.4) return colors.medium
  return colors.low
}

function Bar({ label, value }) {
  const pct = Math.round(value * 100)
  const color = getColor(value)
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
        <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

export default function ConfidenceGauge({ scores }) {
  if (!scores) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Confidence Scores</h3>
      <Bar label="Overall" value={scores.overall || 0} />
      <Bar label="Citation Verification" value={scores.citation_verification || 0} />
      <Bar label="Fact Consistency" value={scores.fact_consistency || 0} />
    </div>
  )
}
