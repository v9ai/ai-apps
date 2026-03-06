import { useState } from 'react'
import FileUpload from './components/FileUpload'
import ReportView from './components/ReportView'

const API_URL = 'http://localhost:8002'

function App() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runAnalysis = async (body) => {
    setLoading(true)
    setError(null)
    setReport(null)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 600_000) // 10 min

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()
      setReport(data.report)
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Analysis timed out after 10 minutes. Please try with a smaller document.')
      } else {
        setError(err.message)
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  const runDemo = () => runAnalysis({})

  return (
    <div style={{
      maxWidth: '960px',
      margin: '0 auto',
      padding: '32px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#111827',
    }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '28px' }}>BS Detector</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '15px' }}>
          AI-powered legal brief verification pipeline
        </p>
      </header>

      <FileUpload onAnalyze={runAnalysis} onDemo={runDemo} loading={loading} />

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#991b1b',
          fontSize: '14px',
          marginBottom: '24px',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '48px 0',
          color: '#6b7280',
          fontSize: '15px',
        }}>
          Analyzing documents... This may take a few minutes.
        </div>
      )}

      <ReportView report={report} />

      {!report && !loading && !error && (
        <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '48px' }}>
          Upload documents or click "Run Demo Case" to analyze the Rivera v. Harmon test case.
        </p>
      )}
    </div>
  )
}

export default App
