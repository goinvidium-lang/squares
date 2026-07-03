'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Board } from '@/lib/supabase'

type SquareRow = {
  id: string
  board_id: string
  player_id: string
  row: number
  col: number
  payment_status: 'pending' | 'paid' | 'refunded'
  player?: { name: string } | null
}

export default function OwnerBoardView() {
  const params = useParams()
  const boardId = params.id as string

  const [board, setBoard] = useState<(Board & { admin?: { name: string } | null }) | null>(null)
  const [squares, setSquares] = useState<SquareRow[]>([])
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inspected, setInspected] = useState<{ row: number; col: number; sq: SquareRow } | null>(null)

  useEffect(() => { load() }, [boardId])

  async function load() {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAuthorized(false); setLoading(false); return }

    const { data: profile } = await supabase.from('users').select('is_owner').eq('id', user.id).maybeSingle()
    if (!profile?.is_owner) { setAuthorized(false); setLoading(false); return }
    setAuthorized(true)

    const { data: boardData, error: boardError } = await supabase
      .from('boards')
      .select('*, admin:users(name)')
      .eq('id', boardId)
      .single()
    if (boardError || !boardData) { setError(boardError?.message || 'Board not found'); setLoading(false); return }
    setBoard(boardData)

    const { data: squareData, error: squareError } = await supabase
      .from('squares')
      .select('*, player:users(name)')
      .eq('board_id', boardId)
    if (squareError) setError(squareError.message)
    setSquares((squareData as SquareRow[]) || [])
    setLoading(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 0', color: '#6c757d' }}>Loading…</div>
  if (!authorized) {
    return (
      <div>
        <div className="error-box">This page is restricted to the platform owner.</div>
        <Link href="/dashboard" className="btn btn-out btn-blk">← Back to dashboard</Link>
      </div>
    )
  }
  if (error && !board) {
    return (
      <div>
        <div className="error-box">{error}</div>
        <Link href="/owner" className="btn btn-out btn-blk">← Back to owner dashboard</Link>
      </div>
    )
  }
  if (!board) return null

  const squareMap = new Map<string, SquareRow>()
  squares.forEach((s) => squareMap.set(`${s.row}-${s.col}`, s))
  const paidCount = squares.filter((s) => s.payment_status === 'paid').length

  return (
    <div>
      <Link href="/owner" className="btn btn-out btn-sm" style={{ marginTop: 12, marginBottom: 10, display: 'inline-flex' }}>← Owner dashboard</Link>

      <div className="info-box">
        👁 Read-only view. You are not this board's admin — no actions here affect it.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="h1">{board.away_team} at {board.home_team}</div>
          <div className="sub" style={{ marginBottom: 0 }}>{board.code} · run by {board.admin?.name || 'Unknown'}</div>
        </div>
        <span className={`badge ${board.status === 'open' ? 'bg-grn' : 'bg-org'}`}>{board.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
        {[['Claimed', squares.length], ['Paid', paidCount], ['Pool', `$${(paidCount * board.price_cents / 100).toFixed(0)}`], ['Fee', `$${(board.platform_fee_cents / 100).toFixed(2)}`]].map(([label, val]) => (
          <div key={label as string} className="card" style={{ textAlign: 'center', marginBottom: 0, padding: 8 }}>
            <div style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: 20, color: '#1565c0' }}>{val}</div>
            <div style={{ fontSize: 9, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(10,1fr)', gap: 2, minWidth: 300 }}>
          <div style={{ background: '#dde1e7', borderRadius: 3, height: 24 }} />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`h${i}`} style={{ background: '#1a237e', color: '#fff', borderRadius: 3, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {board.numbers_drawn ? board.home_numbers?.[i] : '?'}
            </div>
          ))}
          {Array.from({ length: 10 }).map((_, r) => (
            <div key={`row${r}`} style={{ display: 'contents' }}>
              <div style={{ background: '#b71c1c', color: '#fff', borderRadius: 3, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                {board.numbers_drawn ? board.away_numbers?.[r] : '?'}
              </div>
              {Array.from({ length: 10 }).map((_, c) => {
                const key = `${r}-${c}`
                const sq = squareMap.get(key)
                let bg = '#fff', border = '#c8cdd3', color = '#adb5bd', label = ''
                if (sq && sq.payment_status === 'pending') { bg = '#fffde7'; border = '#fff176'; color = '#f9a825'; label = (sq.player?.name || '?').slice(0, 4) }
                else if (sq) { bg = '#fff3e0'; border = '#ffcc80'; color = '#e65100'; label = (sq.player?.name || '?').slice(0, 4) }
                return (
                  <div
                    key={key}
                    onClick={() => sq && setInspected({ row: r, col: c, sq })}
                    style={{
                      background: bg, border: `1px solid ${border}`, borderRadius: 2, height: 28,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7,
                      color, cursor: sq ? 'pointer' : 'default', overflow: 'hidden',
                    }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {inspected && (
        <div className="card" style={{ border: '2px solid #7b1fa2', background: '#f3e5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{inspected.sq.player?.name || 'Player'}</div>
            <span className={`badge ${inspected.sq.payment_status === 'paid' ? 'bg-grn' : 'bg-org'}`}>{inspected.sq.payment_status}</span>
          </div>
          <button onClick={() => setInspected(null)} className="btn btn-out btn-sm">✕</button>
        </div>
      )}
    </div>
  )
}
