'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type GameType = 'classic' | 'reverse' | 'cardinal' | 'fullneighbor'
type Privacy = 'public' | 'private'

const GT: Record<GameType, { name: string; desc: string; winners: string }> = {
  classic: { name: 'Classic', desc: "Last digit of each team's score each quarter. 1 winner per quarter.", winners: '4 winners' },
  reverse: { name: 'Reverse', desc: 'Primary winner + swapped-digit square both pay out. 2 per quarter.', winners: '8 winners' },
  cardinal: { name: 'Cardinal (N·S·E·W)', desc: 'Winner + 4 adjacent squares each get a share.', winners: '5 winners' },
  fullneighbor: { name: 'Full Neighbor', desc: 'Winner + all 8 surrounding squares share the pot.', winners: '9 winners' },
}

const MG_PATTERNS: Record<GameType, number[]> = {
  classic:      [0,0,0,0,0, 0,0,0,0,0, 0,0,1,0,0, 0,0,0,0,0, 0,0,0,0,0],
  reverse:      [0,0,0,0,0, 0,0,0,2,0, 0,0,1,0,0, 0,0,0,0,0, 0,0,0,0,0],
  cardinal:     [0,0,0,0,0, 0,0,3,0,0, 0,3,1,3,0, 0,0,3,0,0, 0,0,0,0,0],
  fullneighbor: [0,0,0,0,0, 0,3,3,3,0, 0,3,1,3,0, 0,3,3,3,0, 0,0,0,0,0],
}

function MiniGrid({ pattern }: { pattern: number[] }) {
  const colorFor = (v: number) => (v === 1 ? '#1565c0' : v === 2 ? '#ec407a' : v === 3 ? '#42a5f5' : '#e9ecef')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 8px)', gridTemplateRows: 'repeat(5, 8px)', gap: 1, flexShrink: 0 }}>
      {pattern.map((v, i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: 1, background: colorFor(v) }} />
      ))}
    </div>
  )
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export default function NewBoardPage() {
  const [price, setPrice] = useState('10')
  const [away, setAway] = useState('')
  const [home, setHome] = useState('')
  const [gameType, setGameType] = useState<GameType>('classic')
  const [privacy, setPrivacy] = useState<Privacy>('public')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdBoard, setCreatedBoard] = useState<{ id: string; code: string } | null>(null)

  async function handleCreate() {
    setError('')
    if (!away.trim() || !home.trim()) {
      setError('Enter both team names to continue.')
      return
    }
    const priceNum = parseFloat(price)
    if (!priceNum || priceNum <= 0) {
      setError('Enter a valid price per square.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You need to be logged in to create a board.')
      setLoading(false)
      return
    }

    let attempts = 0
    let board: { id: string; code: string } | null = null

    while (attempts < 5 && !board) {
      const code = generateCode()
      const { data, error: insertError } = await supabase
        .from('boards')
        .insert({
          code,
          admin_id: user.id,
          home_team: home.trim(),
          away_team: away.trim(),
          price_cents: Math.round(priceNum * 100),
          game_type: gameType,
          privacy,
        })
        .select('id, code')
        .single()

      if (data) {
        board = data
        break
      }
      // 23505 = unique_violation — code collision, try again with a new one
      if (insertError && insertError.code !== '23505') {
        setError(insertError.message)
        setLoading(false)
        return
      }
      attempts++
    }

    setLoading(false)

    if (!board) {
      setError("Couldn't generate a unique board code — try again.")
      return
    }

    setCreatedBoard(board)
  }

  if (createdBoard) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <div className="h1">Board Created!</div>
          <div className="sub">{away} at {home}</div>
        </div>

        <div style={{
          fontFamily: 'var(--font-bebas), sans-serif', fontSize: 38, letterSpacing: 8,
          color: '#1565c0', textAlign: 'center', padding: 14, background: '#e3f2fd',
          borderRadius: 8, border: '1px solid #90caf9', fontWeight: 700, marginBottom: 8,
        }}>
          {createdBoard.code}
        </div>
        <div style={{ fontSize: 11, color: '#6c757d', textAlign: 'center', marginBottom: 16 }}>
          Text this code to friends so they can join — it also works as the watch-only link.
        </div>

        <Link href={`/boards/${createdBoard.id}`} className="btn btn-dark btn-blk" style={{ marginBottom: 8 }}>
          Go Claim Your Squares →
        </Link>
        <Link href="/dashboard" className="btn btn-out btn-blk">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/dashboard" className="btn btn-out btn-sm" style={{ marginTop: 12 }}>← Back to dashboard</Link>
      <div className="h1" style={{ marginTop: 12 }}>Create a Board</div>
      <div className="sub">Any game · any teams · any level</div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <div className="sec">Board settings</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ flex: '0 0 80px' }}>
            <label className="lbl">$/square</label>
            <input className="inp" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl">Visitors</label>
            <input className="inp" value={away} onChange={(e) => setAway(e.target.value)} placeholder="Away team" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl">Home team</label>
            <input className="inp" value={home} onChange={(e) => setHome(e.target.value)} placeholder="Home team" />
          </div>
        </div>
        {away && home && (
          <div className="preview-bar" style={{ background: '#f1f3f5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#555f6e', border: '1px solid #b0b8c1', textAlign: 'center' }}>
            <strong>{away}</strong> at <strong>{home}</strong> &nbsp;·&nbsp; <span style={{ color: '#1565c0' }}>${price || 0}/sq</span> &nbsp;·&nbsp; Pool: ${(parseFloat(price) || 0) * 100}
          </div>
        )}
      </div>

      <div className="card">
        <div className="sec">Game type</div>
        {(Object.keys(GT) as GameType[]).map((key) => (
          <div
            key={key}
            onClick={() => setGameType(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              border: `1.5px solid ${gameType === key ? '#1565c0' : '#b0b8c1'}`,
              background: gameType === key ? '#e3f2fd' : '#fff',
              borderRadius: 8, cursor: 'pointer', marginBottom: 6,
            }}
          >
            <MiniGrid pattern={MG_PATTERNS[key]} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{GT[key].name}</div>
              <div style={{ fontSize: 10, color: '#555f6e', marginTop: 2 }}>{GT[key].desc}</div>
            </div>
            <span className="badge bg-gold" style={{ whiteSpace: 'nowrap' }}>{GT[key].winners}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="sec">Who can join</div>
        <div
          onClick={() => setPrivacy('public')}
          style={{
            display: 'flex', gap: 12, padding: 12, borderRadius: 8, cursor: 'pointer', marginBottom: 8,
            border: `1.5px solid ${privacy === 'public' ? '#1565c0' : '#b0b8c1'}`,
            background: privacy === 'public' ? '#e3f2fd' : '#fff',
          }}
        >
          <div style={{ fontSize: 22 }}>🌐</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Public — open invitations</div>
            <div style={{ fontSize: 11, color: '#555f6e', lineHeight: 1.5 }}>
              Anyone with the code can join. Card payments held in escrow — winners paid automatically.
            </div>
          </div>
        </div>
        <div
          onClick={() => setPrivacy('private')}
          style={{
            display: 'flex', gap: 12, padding: 12, borderRadius: 8, cursor: 'pointer',
            border: `1.5px solid ${privacy === 'private' ? '#1565c0' : '#b0b8c1'}`,
            background: privacy === 'private' ? '#e3f2fd' : '#fff',
          }}
        >
          <div style={{ fontSize: 22 }}>🔒</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Private — admin invites only</div>
            <div style={{ fontSize: 11, color: '#555f6e', lineHeight: 1.5 }}>
              Only people you personally share with can join. You confirm Venmo/Zelle payments manually.
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleCreate} disabled={loading} className="btn btn-dark btn-blk" style={{ marginBottom: 20 }}>
        {loading ? 'Creating…' : 'Generate Board & Get Code'}
      </button>
    </div>
  )
}
