import { useState } from 'react'
import Upload from './pages/Upload'
import Invoices from './pages/Invoices'
import Analytics from './pages/Analytics'

function App() {
  const [tab, setTab] = useState('Upload')

  return (
    <div>
      {/* Navbar */}
      <nav style={{
        background: '#0f0f1a',
        borderBottom: '1px solid #1e1e3a',
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        height: '60px'
      }}>
        <span style={{ color: '#6366f1', fontWeight: 800, fontSize: '1.2rem' }}>
          ⚡ InvoiceAI
        </span>
        {['Upload', 'Invoices', 'Analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: tab === t ? '#a78bfa' : '#6b7280',
            fontWeight: tab === t ? 700 : 400,
            fontSize: '0.95rem',
            borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
            padding: '0 0 4px 0'
          }}>{t}</button>
        ))}
      </nav>

      {/* Pages */}
      {tab === 'Upload' && <Upload />}
      {tab === 'Invoices' && <Invoices />}
      {tab === 'Analytics' && <Analytics />}
    </div>
  )
}

export default App
// ```

// ---

// Ab `src` folder ke andar `pages` naam ka folder banao:
// ```
// frontend/src/pages/