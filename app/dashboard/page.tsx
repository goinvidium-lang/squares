'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, Board } from '@/lib/supabase'

type PlayerBoardRow = {
  board_id: string
  board_code: string
  home_team: string
  away_team: string
  board_status: string
  price_cents: number
  payment_status: 'pending' | 'paid' | 'refunded'
}

type PlayerBoardSummary = {
  board_id: string
  board_code: string
  home_team: string
  away_team: string
  board_status: string
  price_cents: number
  squareCount: number
  pendingCount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [adminBoards, setAdminBoards] = useState<Board[]>([])
  const [playerBoards, setPlayerBoards] = useState<PlayerBoardSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Profile — backfill if signup happened before email confirmation
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      setName(profile.name)
    } else {
      const fallbackName = (user.user_metadata?.name as string) || user.email || 'Player'
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        name: fallbackName,
        email: user.email,
      })
      if (!insertError) setName(fallbackName)
    }

    // Boards this user administers
    const { data: admin, error: adminError } = await supabase
      .from('boards')
      .select('*')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false })

    if (adminError) setError(adminError.message)
    setAdminBoards(admin || [])

    // Boards this user has claimed squares on
    const { data: rows, error: playerError } = await supabase
      .from('player_squares_view')
      .select('board_id, board_code, home_team, away_team, board_status, price_cents, payment_status')
      .eq('player_id', user.id)

    if (playerError) setError((prev) => prev || playerError.message)

    const grouped = new Map<string, PlayerBoardSummary>()
    ;(rows as PlayerBoardRow[] | null || []).forEach((row) => {
      const existing = grouped.get(row.board_id)
      if (existing) {
        existing.squareCount += 1
        if (row.payment_status === 'pending') existing.pendingCount += 1
      } else {
        grouped.set(row.board_id, {
          board_id: row.board_id,
          board_code: row.board_code,
          home_team: row.home_team,
          away_team: row.away_team,
          board_status: row.board_status,
          price_cents: row.price_cents,
          squareCount: 1,
          pendingCount: row.payment_status === 'pending' ? 1 : 0,
        })
      }
    })
    setPlayerBoards(Array.from(grouped.values()))

    setLoading(false)
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: '#6c757d' }}>Loading your boards…</div>
  }

  return (
    <div>
      <div className="h1" style={{ marginTop: 20 }}>{name ? `${name}'s Boards` : 'My Boards'}</div>
      <div className="sub">Everything you're running or playing in</div>

      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Link href="/boards/new" className="btn btn-dark" style={{ flex: 1, justifyContent: 'center' }}>
          + Create a Board
        </Link>
        <Link href="/join" className="btn btn-out" style={{ flex: 1, justifyContent: 'center' }}>
          🔑 Join with a Code
        </Link>
      </div>

      <div className="sec" style={{ marginTop: 4 }}>Boards you run</div>
      {adminBoards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#6c757d', fontSize: 12 }}>
          You're not running any boards yet.
        </div>
      ) : (
        adminBoards.map((b) => (
          <Link
            href={`/boards/${b.id}`}
            key={b.id}
            className="card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '2px solid #ef9a9a' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{b.away_team} at {b.home_team}</div>
                <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                  {b.code} · ${b.price_cents / 100}/sq · {b.status}
                </div>
              </div>
              <span className="badge bg-red" style={{ flexShrink: 0 }}>👑 Admin</span>
            </div>
          </Link>
        ))
      )}

      <div className="sec" style={{ marginTop: 16 }}>Boards you're playing in</div>
      {playerBoards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#6c757d', fontSize: 12 }}>
          You haven't claimed any squares yet — got a code? Tap "Join with a Code" above.
        </div>
      ) : (
        playerBoards.map((b) => (
          <Link
            href={`/boards/${b.board_id}`}
            key={b.board_id}
            className="card"
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '2px solid #a5d6a7' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{b.away_team} at {b.home_team}</div>
                <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                  {b.board_code} · {b.squareCount} square{b.squareCount > 1 ? 's' : ''}
                </div>
              </div>
              {b.pendingCount > 0 ? (
                <span className="badge bg-org">{b.pendingCount} pending</span>
              ) : (
                <span className="badge bg-grn">Paid</span>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
