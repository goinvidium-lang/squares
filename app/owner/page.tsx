'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, Board } from '@/lib/supabase'

type BoardWithAdmin = Board & { admin?: { name: string } | null }
type SquareSummary = { board_id: string; payment_status: string; amount_cents: number }

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [boards, setBoards] = useState<BoardWithAdmin[]>([])
  const [squares, setSquares] = useState<SquareSummary[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setAuthorized(false)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_owner')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.is_owner) {
      setAuthorized(false)
      setLoading(false)
      return
    }
    setAuthorized(true)

    const [{ data: boardData, error: boardError }, { data: squareData, error: squareError }, { count }] = await Promise.all([
      supabase.from('boards').select('*, admin:users(name)').order('created_at', { ascending: false }),
      supabase.from('squares').select('board_id, payment_status, amount_cents'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
    ])

    if (boardError) setError(boardError.message)
    if (squareError) setError((prev) => prev || squareError.message)
    setBoards((boardData as BoardWithAdmin[]) || [])
    setSquares(squareData || [])
    setTotalUsers(count || 0)
    setLoading(false)
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: '#6c757d' }}>Loading owner dashboard…</div>
  }

  if (!authorized) {
    return (
      <div>
        <div className="error-box">This page is restricted to the platform owner.</div>
        <Link href="/dashboard" className="btn btn-out btn-blk">← Back to dashboard</Link>
      </div>
    )
  }

  const squaresByBoard = new Map<string, SquareSummary[]>()
  squares.forEach((s) => {
    const list = squaresByBoard.get(s.board_id) || []
    list.push(s)
    squaresByBoard.set(s.board_id, list)
  })

  const activeBoards = boards.filter((b) => b.status !== 'complete' && b.status !== 'cancelled')
  const completedBoards = boards.filter((b) => b.status === 'complete')
  const totalPoolCents = squares
    .filter((s) => s.payment_status === 'paid')
    .reduce((sum, s) => sum + s.amount_cents, 0)
  const platformRevenueCents = boards.reduce((sum, b) => sum + (b.platform_fee_cents || 0), 0)

  // status breakdown
  const statusCounts: Record<string, number> = {}
  boards.forEach((b) => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1 })

  // game type popularity
  const gameTypeCounts: Record<string, number> = {}
  boards.forEach((b) => { gameTypeCounts[b.game_type] = (gameTypeCounts[b.game_type] || 0) + 1 })

  // money breakdown — paid vs pending, platform-wide
  const pendingSquares = squares.filter((s) => s.payment_status === 'pending')
  const pendingCents = pendingSquares.reduce((sum, s) => sum + s.amount_cents, 0)

  // fill rate — how full are active boards on average
  const totalClaimedInActive = activeBoards.reduce((sum, b) => sum + (squaresByBoard.get(b.id)?.length || 0), 0)
  const fillRate = activeBoards.length > 0 ? Math.round((totalClaimedInActive / (activeBoards.length * 100)) * 100) : 0

  return (
    <div>
      <div className="h1" style={{ marginTop: 12 }}>Owner Dashboard</div>
      <div className="sub">Platform-wide view · read-only</div>

      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          ['Active Boards', activeBoards.length],
          ['Completed', completedBoards.length],
          ['Total Users', totalUsers],
          ['Total Volume', `$${(totalPoolCents / 100).toFixed(0)}`],
        ].map(([label, val]) => (
          <div key={label as string} className="card" style={{ textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: 28, color: '#1565c0' }}>{val}</div>
            <div style={{ fontSize: 10, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#1b5e20', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
          Platform Revenue ({boards.length} board{boards.length !== 1 ? 's' : ''} × $1)
        </div>
        <div style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: 32, color: '#1b5e20' }}>
          ${(platformRevenueCents / 100).toFixed(2)}
        </div>
      </div>

      {pendingCents > 0 && (
        <div className="card" style={{ background: '#fff3e0', border: '1px solid #ffcc80' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: '#e65100', textTransform: 'uppercase', fontWeight: 600 }}>
                Awaiting confirmation ({pendingSquares.length} square{pendingSquares.length !== 1 ? 's' : ''})
              </div>
              <div style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: 24, color: '#e65100' }}>
                ${(pendingCents / 100).toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#bf360c', maxWidth: 140, textAlign: 'right' }}>
              Sitting in Venmo/Zelle limbo across all boards — admins haven&apos;t confirmed yet.
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="sec">Board status breakdown</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <span key={status} className={`badge ${status === 'open' ? 'bg-grn' : status === 'complete' ? 'bg-blue' : status === 'cancelled' ? 'bg-red' : 'bg-org'}`}>
              {status}: {count}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#555f6e', marginTop: 10 }}>
          Average fill rate across active boards: <strong>{fillRate}%</strong>
        </div>
      </div>

      <div className="card">
        <div className="sec">Game type popularity</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(gameTypeCounts).map(([type, count]) => (
            <span key={type} className="badge bg-blue">{type}: {count}</span>
          ))}
        </div>
      </div>

      <div className="sec" style={{ marginTop: 8 }}>All boards</div>
      {boards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#6c757d', fontSize: 12 }}>No boards created yet.</div>
      ) : (
        boards.map((b) => {
          const boardSquares = squaresByBoard.get(b.id) || []
          const paid = boardSquares.filter((s) => s.payment_status === 'paid').length
          return (
            <Link
              key={b.id}
              href={`/owner/boards/${b.id}`}
              className="card"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.away_team} at {b.home_team}</div>
                  <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                    {b.code} · run by {b.admin?.name || 'Unknown'} · {boardSquares.length}/100 claimed · {paid} paid
                  </div>
                </div>
                <span className={`badge ${b.status === 'open' ? 'bg-grn' : b.status === 'complete' ? 'bg-blue' : 'bg-org'}`}>
                  {b.status}
                </span>
              </div>
            </Link>
          )
        })
      )}

      <Link href="/dashboard" className="btn btn-out btn-blk" style={{ marginTop: 8 }}>← Back to my dashboard</Link>
    </div>
  )
}
