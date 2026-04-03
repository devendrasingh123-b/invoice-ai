import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const API = 'http://localhost:5000'
const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe']

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/analytics`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '3rem' }}>
      Loading analytics...
    </div>
  )

  if (!data) return (
    <div style={{ color: '#4b5563', textAlign: 'center', marginTop: '3rem' }}>
      Analytics load nahi hua.
    </div>
  )

  const stats = [
    { label: 'Total Invoices', value: data.total_invoices, icon: '📄' },
    { label: 'Duplicates', value: data.duplicate_invoices, icon: '⚠️' },
    { label: 'Avg Confidence', value: `${Math.round((data.avg_confidence || 0) * 100)}%`, icon: '🎯' },
    { label: 'Vendors', value: data.vendor_spend?.length || 0, icon: '🏢' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>
      <h2 style={{ color: '#e2e8f0', marginBottom: '1.5rem' }}>Analytics Dashboard</h2>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: '#0f0f1a', border: '1px solid #1e1e3a',
            borderRadius: 12, padding: '1.25rem'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
            <div style={{ color: '#a78bfa', fontSize: '1.6rem', fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Vendor Spend */}
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e3a', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '1rem' }}>Vendor Spend</div>
          {data.vendor_spend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.vendor_spend.slice(0, 8)}>
                <XAxis dataKey="vendor" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#13132a', border: '1px solid #2d2d4e', color: '#e2e8f0' }} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#4b5563', textAlign: 'center', padding: '2rem' }}>Abhi koi data nahi</div>}
        </div>

        {/* Monthly Trend */}
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e3a', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '1rem' }}>Monthly Trend</div>
          {data.monthly_spend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.monthly_spend}>
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#13132a', border: '1px solid #2d2d4e', color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="total" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#4b5563', textAlign: 'center', padding: '2rem' }}>Abhi koi data nahi</div>}
        </div>

        {/* Currency Pie */}
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e3a', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '1rem' }}>Currency Breakdown</div>
          {data.currency_totals?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.currency_totals} dataKey="total" nameKey="currency"
                  cx="50%" cy="50%" outerRadius={80}
                  label={({ currency, percent }) => `${currency} ${(percent * 100).toFixed(0)}%`}>
                  {data.currency_totals.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#13132a', border: '1px solid #2d2d4e', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#4b5563', textAlign: 'center', padding: '2rem' }}>Abhi koi data nahi</div>}
        </div>

        {/* Top Vendors Table */}
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e3a', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: '1rem' }}>Top Vendors</div>
          {data.vendor_spend?.length ? data.vendor_spend.slice(0, 6).map((v, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.5rem 0', borderBottom: '1px solid #1e1e3a'
            }}>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{i + 1}. {v.vendor}</span>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{v.total.toLocaleString()}</span>
            </div>
          )) : <div style={{ color: '#4b5563', textAlign: 'center', padding: '2rem' }}>Abhi koi data nahi</div>}
        </div>

      </div>
    </div>
  )
}