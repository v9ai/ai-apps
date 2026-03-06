import ConfidenceGauge from './ConfidenceGauge'
import FindingCard from './FindingCard'
import JudicialMemo from './JudicialMemo'
import PipelineStatus from './PipelineStatus'

export default function ReportView({ report }) {
  if (!report) return null

  const citations = report.verified_citations || []
  const facts = report.verified_facts || []
  const findings = report.top_findings || []

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Verification Report</h2>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>
          {report.motion_id} &middot; {report.timestamp}
        </span>
      </div>

      <PipelineStatus statuses={report.pipeline_status} />

      <ConfidenceGauge scores={report.confidence_scores} />

      <JudicialMemo memo={report.judicial_memo} />

      {findings.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            Top Findings ({findings.length})
          </h3>
          {findings.map((f, i) => <FindingCard key={f.id || i} finding={f} />)}
        </div>
      )}

      {citations.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            Verified Citations ({citations.length})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>Citation</th>
                  <th style={th}>Status</th>
                  <th style={th}>Confidence</th>
                  <th style={th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {citations.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{c.citation?.citation_text || 'N/A'}</td>
                    <td style={td}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={td}>{Math.round((c.confidence || 0) * 100)}%</td>
                    <td style={td}>
                      {c.notes || c.discrepancies?.join('; ') || ''}
                      {c.confidence_reasoning && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', marginTop: '4px' }}>
                          {c.confidence_reasoning}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {facts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>
            Verified Facts ({facts.length})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
            }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={th}>Fact</th>
                  <th style={th}>Status</th>
                  <th style={th}>Confidence</th>
                  <th style={th}>Summary</th>
                </tr>
              </thead>
              <tbody>
                {facts.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{f.fact?.fact_text || 'N/A'}</td>
                    <td style={td}>
                      <StatusBadge status={f.status} />
                    </td>
                    <td style={td}>{Math.round((f.confidence || 0) * 100)}%</td>
                    <td style={td}>
                      {f.summary || ''}
                      {f.confidence_reasoning && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', marginTop: '4px' }}>
                          {f.confidence_reasoning}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.unknown_issues && report.unknown_issues.length > 0 && (
        <div style={{
          background: '#f3f4f6',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>Unknown Issues</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#6b7280' }}>
            {report.unknown_issues.map((issue, i) => <li key={i}>{issue}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

const th = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
}

const td = {
  padding: '10px 12px',
  color: '#374151',
  verticalAlign: 'top',
}

const statusColors = {
  supported: { bg: '#dcfce7', color: '#166534' },
  not_supported: { bg: '#fef2f2', color: '#991b1b' },
  misleading: { bg: '#fff7ed', color: '#9a3412' },
  could_not_verify: { bg: '#f3f4f6', color: '#6b7280' },
  consistent: { bg: '#dcfce7', color: '#166534' },
  contradictory: { bg: '#fef2f2', color: '#991b1b' },
  partial: { bg: '#fefce8', color: '#854d0e' },
}

function StatusBadge({ status }) {
  const s = statusColors[status] || statusColors.could_not_verify
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 600,
      background: s.bg,
      color: s.color,
    }}>
      {(status || 'unknown').replace(/_/g, ' ')}
    </span>
  )
}
