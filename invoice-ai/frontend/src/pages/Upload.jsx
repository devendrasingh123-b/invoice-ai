import { useState, useCallback } from 'react'
import axios from 'axios'

const API = 'https://invoice-ai-backend-f8lx.onrender.com'

function ConfidenceBadge({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'
  return (
    <span style={{
      background: color + '22', color,
      border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: '0.75rem', fontWeight: 700
    }}>{pct}% confidence</span>
  )
}

function ResultCard({ result }) {
  const ok = result.status === 'success'
  const d = result.data || {}
  return (
    <div style={{
      background: '#0f0f1a',
      border: `1px solid ${ok ? '#1e3a2e' : '#3a1e1e'}`,
      borderRadius: 12, padding: '1.25rem', marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
          {ok ? '✅' : '❌'} {result.filename}
        </span>
        {ok && <ConfidenceBadge score={result.confidence_score} />}
      </div>
      {ok ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[
            ['Vendor', d.vendor],
            ['Invoice #', d.invoice_number],
            ['Date', d.invoice_date],
            ['Total', d.total_amount ? `${d.currency} ${d.total_amount}` : null],
            ['Tax', d.tax_amount],
            ['Terms', d.payment_terms]
          ].map(([label, val]) => val && (
            <div key={label} style={{
              background: '#13132a', borderRadius: 6, padding: '0.5rem 0.75rem'
            }}>
              <div style={{ color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>{val}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{result.error}</div>
      )}
      {result.reused_template && (
        <div style={{ color: '#34d399', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          ⚡ Similar format detect hua — template reuse kiya!
        </div>
      )}
      {result.is_duplicate && (
        <div style={{ color: '#fbbf24', fontSize: '0.75rem', marginTop: '0.4rem' }}>
          ⚠️ Duplicate invoice detected!
        </div>
      )}
    </div>
  )
}

export default function Upload() {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer?.files || e.target.files || [])
    const valid = dropped.filter(f => /\.(jpg|jpeg|png|pdf)$/i.test(f.name))
    setFiles(prev => [...prev, ...valid])
  }, [])

  const removeFile = (i) => setFiles(f => f.filter((_, idx) => idx !== i))

  const upload = async () => {
    if (!files.length) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      const res = await axios.post(`${API}/upload`, form)
      setResults(res.data.results || [])
      setFiles([])
    } catch (e) {
      setError('Upload failed. Backend chal raha hai? localhost:5000 check karo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1.5rem' }}>
      <h2 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>Invoice Upload</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        JPG, PNG ya PDF invoice upload karo — batch bhi support hai
      </p>

      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => document.getElementById('fileInput').click()}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#2d2d4e'}`,
          borderRadius: 12, padding: '3rem 2rem',
          textAlign: 'center',
          background: dragging ? '#13132a' : '#0f0f1a',
          cursor: 'pointer', transition: 'all 0.2s', marginBottom: '1rem'
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
        <div style={{ color: '#a78bfa', fontWeight: 600 }}>Click karo ya file yahan drop karo</div>
        <div style={{ color: '#4b5563', fontSize: '0.8rem', marginTop: '0.25rem' }}>
          JPG, PNG, PDF supported
        </div>
        <input id="fileInput" type="file" multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={onDrop} style={{ display: 'none' }} />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#13132a', border: '1px solid #1e1e3a',
              borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '0.4rem'
            }}>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>📎 {f.name}</span>
              <button onClick={() => removeFile(i)} style={{
                background: 'none', border: 'none',
                color: '#ef4444', cursor: 'pointer', fontSize: '1rem'
              }}>✕</button>
            </div>
          ))}
          <button onClick={upload} disabled={loading} style={{
            background: loading ? '#374151' : '#6366f1',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '0.75rem 2rem', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700, marginTop: '0.5rem', width: '100%', fontSize: '0.95rem'
          }}>
            {loading ? '⏳ Processing...' : `🚀 ${files.length} Invoice Extract Karo`}
          </button>
        </div>
      )}

      {error && (
        <div style={{
          color: '#ef4444', background: '#1f1214',
          border: '1px solid #7f1d1d', borderRadius: 8,
          padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem'
        }}>{error}</div>
      )}

      {results.map((r, i) => <ResultCard key={i} result={r} />)}
    </div>
  )
}