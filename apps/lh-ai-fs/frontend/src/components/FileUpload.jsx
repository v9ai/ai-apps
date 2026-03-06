import { useState } from 'react'

const styles = {
  container: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    fontSize: '14px',
    marginBottom: '6px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
    minHeight: '80px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  btn: {
    padding: '10px 24px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  btnPrimary: {
    background: '#2563eb',
    color: '#fff',
  },
  btnSecondary: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
}

export default function FileUpload({ onAnalyze, onDemo, loading }) {
  const [caseId, setCaseId] = useState('')
  const [docs, setDocs] = useState({ msj: '', police_report: '', medical_records: '', witness_statement: '' })

  const handleDocChange = (key, value) => {
    setDocs(prev => ({ ...prev, [key]: value }))
  }

  const handleAnalyze = () => {
    const filledDocs = Object.fromEntries(
      Object.entries(docs).filter(([, v]) => v.trim())
    )
    onAnalyze({
      case_id: caseId || undefined,
      documents: Object.keys(filledDocs).length > 0 ? filledDocs : undefined,
    })
  }

  const docFields = [
    { key: 'msj', label: 'Motion for Summary Judgment' },
    { key: 'police_report', label: 'Police Report' },
    { key: 'medical_records', label: 'Medical Records' },
    { key: 'witness_statement', label: 'Witness Statement' },
  ]

  return (
    <div style={styles.container}>
      <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>Upload Documents</h2>

      <div style={styles.field}>
        <label style={styles.label}>Case ID (optional)</label>
        <input
          style={styles.input}
          value={caseId}
          onChange={e => setCaseId(e.target.value)}
          placeholder="e.g., Rivera_v_Harmon_MSJ"
        />
      </div>

      {docFields.map(({ key, label }) => (
        <div key={key} style={styles.field}>
          <label style={styles.label}>{label}</label>
          <textarea
            style={styles.textarea}
            value={docs[key]}
            onChange={e => handleDocChange(key, e.target.value)}
            placeholder={`Paste ${label.toLowerCase()} text here...`}
          />
        </div>
      ))}

      <div style={styles.buttons}>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
        <button
          onClick={onDemo}
          disabled={loading}
          style={{ ...styles.btn, ...styles.btnSecondary, opacity: loading ? 0.6 : 1 }}
        >
          Run Demo Case
        </button>
      </div>
    </div>
  )
}
