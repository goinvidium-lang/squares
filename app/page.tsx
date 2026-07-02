import Link from 'next/link'

export default function HomePage() {
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏈</div>
        <div className="h1" style={{ fontSize: 32 }}>Gridiron Squares</div>
        <div className="sub">Any game · any teams · any level</div>
      </div>

      <div className="card">
        <div className="sec">How it works</div>
        <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>
          Create a board for any football game — NFL, college, or your kid&apos;s
          Friday night game. Invite players to claim squares, collect payment
          by card, Venmo, or Zelle, and payouts are calculated automatically
          from the score each quarter.
        </div>
      </div>

      <Link href="/auth/signup" className="btn btn-dark btn-blk" style={{ marginBottom: 8 }}>
        Get Started — It&apos;s Free
      </Link>
      <Link href="/auth/login" className="btn btn-out btn-blk">
        I already have an account
      </Link>
    </div>
  )
}
