import Link from 'next/link'

const MOCK_BOARD = {
  code: 'GS4821',
  home: 'Chiefs',
  away: 'Eagles',
  price: 10,
  claimed: 63,
  paid: 58,
  pool: 580,
  open: 37,
  status: 'open',
}

const MOCK_PLAYERS = [
  { name: 'Jordan', squares: 6, status: 'paid' },
  { name: 'Taylor', squares: 4, status: 'paid' },
  { name: 'Morgan', squares: 3, status: 'pending' },
  { name: 'Casey', squares: 8, status: 'paid' },
]

export default function AdminPreviewPage() {
  return (
    <div>
      <div className="info-box" style={{ marginTop: 12 }}>
        👑 <strong>Preview mode</strong> — this is what a board admin sees. Sample data, nothing is saved.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="h1">{MOCK_BOARD.away} at {MOCK_BOARD.home}</div>
          <div className="sub" style={{ marginBottom: 0 }}>Classic · ${MOCK_BOARD.price}/square</div>
        </div>
        <span className="badge bg-grn">{MOCK_BOARD.status}</span>
      </div>

      <div style={{
        fontFamily: 'var(--font-bebas), sans-serif', fontSize: 38, letterSpacing: 8,
        color: '#1565c0', textAlign: 'center', padding: 14, background: '#e3f2fd',
        borderRadius: 8, border: '1px solid #90caf9', fontWeight: 700, marginBottom: 12,
      }}>
        {MOCK_BOARD.code}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 16 }}>
        {[
          ['Claimed', MOCK_BOARD.claimed],
          ['Paid', MOCK_BOARD.paid],
          ['Pool', `$${MOCK_BOARD.pool}`],
          ['Open', MOCK_BOARD.open],
        ].map(([label, val]) => (
          <div key={label as string} className="card" style={{ textAlign: 'center', marginBottom: 0, padding: 8 }}>
            <div style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: 24, color: '#1565c0' }}>{val}</div>
            <div style={{ fontSize: 10, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="sec">Players</div>
      {MOCK_PLAYERS.map((p) => (
        <div key={p.name} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#6c757d' }}>{p.squares} squares · ${p.squares * MOCK_BOARD.price}</div>
          </div>
          {p.status === 'paid' ? (
            <span className="badge bg-grn">Paid</span>
          ) : (
            <button className="btn btn-out btn-sm">Confirm payment</button>
          )}
        </div>
      ))}

      <Link href="/auth/login" className="btn btn-out btn-blk" style={{ marginTop: 16 }}>
        ← Back to login
      </Link>
    </div>
  )
}
