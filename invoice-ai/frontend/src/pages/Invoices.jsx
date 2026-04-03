import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:5000'

function ConfidenceBadge({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171'
  return (
    <span style={{
      background: color + '22', color,
      border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 10px',
      fontSize: '0.75rem', fontWeight: 700
    }}>{pct}%</span>
  )
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    axios.get(`${API}/invoices`)
      .then(r => { setInvoices(r.data.invoices || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = invoices.filter(inv =>
    (inv.vendor || '').toLowerCase().includes(search.toLowerCase()) ||
    (inv.invoice_number || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#e2e8f0' }}>All Invoices</h2>
        <input
          placeholder="🔍 Vendor ya invoice # search karo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: '#13132a', border: '1px solid #2d2d4e',
            borderRadius: 8, padding: '0.5rem 1rem',
            color: '#e2e8f0', fontSize: '0.85rem', width: 280
          }}
        />
      </div>

      {loading ? (
        <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '3rem' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#4b5563', textAlign: 'center', marginTop: '3rem' }}>
          Koi invoice nahi mila. Pehle upload karo!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e3a' }}>
                {['Vendor', 'Invoice #', 'Date', 'Total', 'Currency', 'Confidence', 'Duplicate'].map(h => (
                  <th key={h} style={{
                    color: '#6b7280', fontSize: '0.75rem',
                    textTransform: 'uppercase', padding: '0.6rem 0.75rem', textAlign: 'left'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid #13132a',
                  background: i % 2 === 0 ? '#0a0a14' : 'transparent'
                }}>
                  <td style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.7rem 0.75rem' }}>{inv.vendor || '—'}</td>
                  <td style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.7rem 0.75rem' }}>{inv.invoice_number || '—'}</td>
                  <td style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.7rem 0.75rem' }}>{inv.invoice_date || '—'}</td>
                  <td style={{ color: '#a78bfa', fontSize: '0.85rem', padding: '0.7rem 0.75rem', fontWeight: 600 }}>{inv.total_amount ?? '—'}</td>
                  <td style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.7rem 0.75rem' }}>{inv.currency || '—'}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}><ConfidenceBadge score={inv.confidence_score} /></td>
                  <td style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: '0.7rem 0.75rem' }}>
                    {inv.is_duplicate ? '⚠️ Yes' : '✅ No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}