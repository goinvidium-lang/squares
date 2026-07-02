import Link from 'next/link'

const MOCK_BOARDS = [
  {
    code: 'GS4821', home: 'Chiefs', away: 'Eagles', price: 10,
    mySquares: 2, pending: 0, lastResult: 'Q2: You won! +$250',
  },
  {
    code: 'GS9134', home: '49ers', away: 'Cowboys', price: 5,
    mySquares: 3, pending: 1, lastResult: null,
  },
]

export default function PlayerPreviewPage() {
  return (
    <div>
      <div className="info-box" style={{ marginTop: 12 }}>
        🏈 <strong>Preview mode</strong> — this is what a player sees. Sample data, nothing is saved.
      </div>

      <div className="h1" style={{ marginTop: 4 }}>Demo Player&apos;s Boards</div>
      <div className="sub">Everything you&apos;re playing in</div>

      <div className="sec">Boards you&apos;re playing in</div>
      {MOCK_BOARDS.map((b) => (
        <div key={b.code} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{b.away} at {b.home}</div>
              <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                {b.code} · {b.mySquares} square{b.mySquares > 1 ? 's' : ''} · ${b.mySquares * b.price} in
              </div>
            </div>
            {b.pending > 0 ? (
              <span className="badge bg-org">{b.pending} pending</span>
            ) : (
              <span className="badge bg-grn">Paid</span>
            )}
          </div>
          {b.lastResult && (
            <div style={{ fontSize: 11, color: '#2e7d32', marginTop: 8, fontWeight: 600 }}>
              🏆 {b.lastResult}
            </div>
          )}
        </div>
      ))}

      <Link href="/auth/login" className="btn btn-out btn-blk" style={{ marginTop: 16 }}>
        ← Back to login
      </Link>
    </div>
  )
}
