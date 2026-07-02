'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, Board } from '@/lib/supabase'

type SquareRow = {
  id: string
  board_id: string
  player_id: string
  row: number
  col: number
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_method: 'card' | 'venmo' | 'zelle' | 'cash'
  amount_cents: number
  fee_cents: number
  player?: { name: string } | null
}

function generateShuffled(): number[] {
  const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[nums[i], nums[j]] = [nums[j], nums[i]]
  }
  return nums
}

export default function BoardPage() {
  const router = useRouter()
  const params = useParams()
  const boardId = params.id as string

  const [board, setBoard] = useState<Board | null>(null)
  const [squares, setSquares] = useState<SquareRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [payMethod, setPayMethod] = useState<'card' | 'venmo' | 'zelle'>('card')
  const [claiming, setClaiming] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null)
  const [inspected, setInspected] = useState<{ row: number; col: number; sq: SquareRow } | null>(null)
  const [scoreHome, setScoreHome] = useState('')
  const [scoreAway, setScoreAway] = useState('')

  const load = useCallback(async () => {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)

    const { data: boardData, error: boardError } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single()

    if (boardError || !boardData) {
      setError(boardError?.message || 'Board not found.')
      setLoading(false)
      return
    }
    setBoard(boardData)

    const { data: squareData, error: squareError } = await supabase
      .from('squares')
      .select('*, player:users(name)')
      .eq('board_id', boardId)

    if (squareError) setError(squareError.message)
    setSquares((squareData as SquareRow[]) || [])
    setLoading(false)
  }, [boardId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!board || board.numbers_drawn) return
    const paid = squares.filter((s) => s.payment_status === 'paid').length
    if (paid === 100) {
      handleDrawNumbers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.numbers_drawn, squares])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: '#6c757d' }}>Loading board…</div>
  }
  if (error && !board) {
    return (
      <div>
        <div className="error-box">{error}</div>
        <Link href="/dashboard" className="btn btn-out btn-blk">← Back to dashboard</Link>
      </div>
    )
  }
  if (!board) return null

  const isAdmin = userId === board.admin_id
  const squareMap = new Map<string, SquareRow>()
  squares.forEach((s) => squareMap.set(`${s.row}-${s.col}`, s))

  const claimedCount = squares.length
  const paidCount = squares.filter((s) => s.payment_status === 'paid').length
  const poolCents = paidCount * board.price_cents
  const openCount = 100 - claimedCount
  const canSelect = board.status === 'open'

  // live score checker — find who owns the square for the current score
  const homeNum = parseInt(scoreHome)
  const awayNum = parseInt(scoreAway)
  const scoresEntered = !isNaN(homeNum) && !isNaN(awayNum)
  let liveWinnerKey: string | null = null
  if (scoresEntered && board.numbers_drawn) {
    const homeDigit = homeNum % 10
    const awayDigit = awayNum % 10
    const col = board.home_numbers?.indexOf(homeDigit) ?? -1
    const row = board.away_numbers?.indexOf(awayDigit) ?? -1
    if (col >= 0 && row >= 0) liveWinnerKey = `${row}-${col}`
  }
  const liveWinnerSq = liveWinnerKey ? squareMap.get(liveWinnerKey) : undefined

  function toggleSquare(r: number, c: number) {
    if (squareMap.has(`${r}-${c}`) || !canSelect) return
    const key = `${r}-${c}`
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedCount = selected.size
  const subtotalCents = selectedCount * board.price_cents
  const feeCents = payMethod === 'card' ? Math.ceil(subtotalCents * 0.029) : 0
  const totalCents = subtotalCents + feeCents

  async function handleClaim() {
    if (!userId) {
      router.push('/auth/login')
      return
    }
    if (selectedCount === 0 || !board) return
    setClaiming(true)
    setError('')

    const rows = Array.from(selected).map((key) => {
      const [r, c] = key.split('-').map(Number)
      const perSquareFee = payMethod === 'card' ? Math.ceil(board.price_cents * 0.029) : 0
      return {
        board_id: board.id,
        player_id: userId,
        row: r,
        col: c,
        payment_status: payMethod === 'card' ? 'paid' : 'pending',
        payment_method: payMethod,
        amount_cents: board.price_cents,
        fee_cents: perSquareFee,
        paid_at: payMethod === 'card' ? new Date().toISOString() : null,
      }
    })

    const { error: insertError } = await supabase.from('squares').insert(rows)
    if (insertError) {
      setError(insertError.message)
      setClaiming(false)
      return
    }
    setSelected(new Set())
    setClaiming(false)
    await load()
  }

  async function confirmPlayerPayments(playerId: string) {
    setConfirming(playerId)
    const { error: updateError } = await supabase
      .from('squares')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('board_id', board.id)
      .eq('player_id', playerId)
      .eq('payment_status', 'pending')
    if (updateError) setError(updateError.message)
    setConfirming(null)
    await load()
  }

  async function handleDrawNumbers() {
    const { error: updateError } = await supabase
      .from('boards')
      .update({
        numbers_drawn: true,
        home_numbers: generateShuffled(),
        away_numbers: generateShuffled(),
      })
      .eq('id', board.id)
      .eq('numbers_drawn', false) // guards against two clients drawing at once
    if (updateError) setError(updateError.message)
    await load()
  }

  // full roster of who owns what, for the players list under the grid
  const playersRoster = new Map<string, { name: string; squares: { row: number; col: number; payment_status: string }[] }>()
  squares.forEach((s) => {
    const name = s.player?.name || 'Player'
    const existing = playersRoster.get(s.player_id)
    if (existing) {
      existing.squares.push({ row: s.row, col: s.col, payment_status: s.payment_status })
    } else {
      playersRoster.set(s.player_id, { name, squares: [{ row: s.row, col: s.col, payment_status: s.payment_status }] })
    }
  })

  // players with pending squares, for the admin confirm list
  const pendingByPlayer = new Map<string, { name: string; count: number }>()
  squares.forEach((s) => {
    if (s.payment_status === 'pending') {
      const existing = pendingByPlayer.get(s.player_id)
      const name = s.player?.name || 'Player'
      if (existing) existing.count += 1
      else pendingByPlayer.set(s.player_id, { name, count: 1 })
    }
  })

  return (
    <div style={{ paddingBottom: selectedCount > 0 ? 90 : 20 }}>
      <Link href="/dashboard" className="btn btn-out btn-sm" style={{ marginTop: 12, marginBottom: 10, display: 'inline-flex' }}>← Back to dashboard</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div className="h1">{board.away_team} at {board.home_team}</div>
          <div className="sub" style={{ marginBottom: 0 }}>${board.price_cents / 100}/square · tap open to select, tap taken to see who owns it</div>
        </div>
        <span className={`badge ${board.status === 'open' ? 'bg-grn' : 'bg-org'}`}>{board.status}</span>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div style={{
        fontFamily: 'var(--font-bebas), sans-serif', fontSize: 24, letterSpacing: 4,
        color: '#1565c0', textAlign: 'center', padding: 8, background: '#e3f2fd',
        borderRadius: 8, border: '1px solid #90caf9', fontWeight: 700, marginBottom: 10,
      }}>
        {board.code}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
        {[['Claimed', claimedCount], ['Paid', paidCount], ['Pool', `$${(poolCents / 100).toFixed(0)}`], ['Open', openCount]].map(([label, val]) => (
          <div key={label as string} className="card" style={{ textAlign: 'center', marginBottom: 0, padding: 8 }}>
            <div style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: 22, color: '#1565c0' }}>{val}</div>
            <div style={{ fontSize: 10, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {!board.numbers_drawn && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#e65100', textAlign: 'center', marginBottom: 10 }}>
          🎲 Numbers reveal automatically the instant all 100 squares are paid for — no one controls the draw, not even the admin. ({paidCount}/100 paid)
        </div>
      )}

      {/* GRID */}
      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: '#6c757d', textAlign: 'center', marginBottom: 2 }}>
          ← {board.away_team.toUpperCase()} (Visitors) →
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(10,1fr)', gap: 2, minWidth: 320 }}>
          <div style={{ background: '#dde1e7', borderRadius: 3, height: 28 }} />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`h${i}`} style={{ background: '#1a237e', color: '#fff', borderRadius: 3, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {board.numbers_drawn ? board.home_numbers?.[i] : '?'}
            </div>
          ))}
          {Array.from({ length: 10 }).map((_, r) => (
            <div key={`row${r}`} style={{ display: 'contents' }}>
              <div style={{ background: '#b71c1c', color: '#fff', borderRadius: 3, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {board.numbers_drawn ? board.away_numbers?.[r] : '?'}
              </div>
              {Array.from({ length: 10 }).map((_, c) => {
                const key = `${r}-${c}`
                const sq = squareMap.get(key)
                const isMine = sq?.player_id === userId
                const isSelected = selected.has(key)
                const isHighlighted = !!(sq && highlightedPlayer && sq.player_id === highlightedPlayer)
                const isLiveWinner = key === liveWinnerKey
                let bg = '#fff', border = '#c8cdd3', color = '#adb5bd', label = ''
                if (isSelected) { bg = '#e3f2fd'; border = '#1565c0'; color = '#1565c0'; label = '✓' }
                else if (sq && isMine) { bg = '#e8f5e9'; border = '#a5d6a7'; color = '#2e7d32'; label = sq.payment_status === 'pending' ? 'You*' : 'You' }
                else if (sq && sq.payment_status === 'pending') { bg = '#fffde7'; border = '#fff176'; color = '#f9a825'; label = (sq.player?.name || '?').slice(0, 4) }
                else if (sq) { bg = '#fff3e0'; border = '#ffcc80'; color = '#e65100'; label = (sq.player?.name || '?').slice(0, 4) }
                return (
                  <div
                    key={key}
                    onClick={() => (sq ? setInspected({ row: r, col: c, sq }) : toggleSquare(r, c))}
                    style={{
                      background: bg, border: `1px solid ${border}`, borderRadius: 2, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8,
                      textAlign: 'center', cursor: sq ? 'pointer' : canSelect ? 'pointer' : 'default', color,
                      fontWeight: sq || isSelected ? 600 : 400, overflow: 'hidden', padding: 1,
                      boxShadow: isLiveWinner ? '0 0 0 2px #f9a825 inset' : isHighlighted ? '0 0 0 2px #7b1fa2 inset' : 'none',
                      transform: isLiveWinner || isHighlighted ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.12s ease',
                      position: 'relative', zIndex: isHighlighted ? 5 : 1,
                    }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: '#6c757d', textAlign: 'center', marginTop: 2 }}>
          ↑ {board.home_team.toUpperCase()} (Home) ↑
        </div>
      </div>

      {inspected && (
        <div className="card" style={{
          border: '2px solid #7b1fa2', background: '#f3e5f5', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
              {board.numbers_drawn
                ? `${board.away_team} ${board.away_numbers?.[inspected.row]} · ${board.home_team} ${board.home_numbers?.[inspected.col]}`
                : `Row ${inspected.row}, Col ${inspected.col}`}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {inspected.sq.player_id === userId ? 'You' : (inspected.sq.player?.name || 'Player')}
            </div>
            <span className={`badge ${inspected.sq.payment_status === 'paid' ? 'bg-grn' : 'bg-org'}`} style={{ marginTop: 4 }}>
              {inspected.sq.payment_status === 'paid' ? 'Paid' : 'Pending'}
            </span>
          </div>
          <button onClick={() => setInspected(null)} className="btn btn-out btn-sm">✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, fontSize: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <span><span style={{ color: '#e65100' }}>■</span> Taken</span>
        <span><span style={{ color: '#f9a825' }}>■</span> Pending</span>
        <span><span style={{ color: '#2e7d32' }}>■</span> Yours</span>
        <span><span style={{ color: '#1565c0' }}>■</span> Selected</span>
      </div>

      {/* LIVE SCORE CHECKER */}
      {board.numbers_drawn && (
        <div className="card">
          <div className="sec">Check the score — who's winning right now?</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: liveWinnerKey ? 10 : 0 }}>
            <div style={{ flex: 1 }}>
              <label className="lbl">{board.home_team}</label>
              <input
                className="inp"
                type="number"
                min="0"
                value={scoreHome}
                onChange={(e) => setScoreHome(e.target.value)}
                placeholder="0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl">{board.away_team}</label>
              <input
                className="inp"
                type="number"
                min="0"
                value={scoreAway}
                onChange={(e) => setScoreAway(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          {scoresEntered && liveWinnerKey && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 12px',
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#7a5c00', textTransform: 'uppercase', fontWeight: 600 }}>
                  Digits {homeNum % 10}-{awayNum % 10} · currently winning
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#7a5c00' }}>
                  {liveWinnerSq ? (liveWinnerSq.player_id === userId ? 'You!' : liveWinnerSq.player?.name || 'Player') : 'Unclaimed square'}
                </div>
              </div>
              {liveWinnerSq && (
                <span className={`badge ${liveWinnerSq.payment_status === 'paid' ? 'bg-grn' : 'bg-org'}`}>
                  {liveWinnerSq.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* PLAYERS ROSTER — who owns what */}
      {claimedCount > 0 && (
        <div className="card">
          <div className="sec">Players on this board</div>
          {Array.from(playersRoster.entries()).map(([pid, info]) => (
            <div
              key={pid}
              onMouseEnter={() => setHighlightedPlayer(pid)}
              onMouseLeave={() => setHighlightedPlayer((prev) => (prev === pid ? null : prev))}
              onClick={() => setHighlightedPlayer((prev) => (prev === pid ? null : pid))}
              style={{
                padding: '10px 8px', borderBottom: '1px solid #e9ecef', cursor: 'pointer',
                borderRadius: 6,
                background: highlightedPlayer === pid ? '#f3e5f5' : 'transparent',
                transition: 'background 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: pid === userId ? '#e8f5e9' : '#e3f2fd',
                    color: pid === userId ? '#2e7d32' : '#1565c0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}>
                    {info.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {info.name}{pid === userId ? ' (You)' : ''}
                  </div>
                </div>
                <span className="badge bg-blue">{info.squares.length} square{info.squares.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {info.squares.map((sq) => {
                  const label = board.numbers_drawn
                    ? `${board.away_team.slice(0, 3)} ${board.away_numbers?.[sq.row]} · ${board.home_team.slice(0, 3)} ${board.home_numbers?.[sq.col]}`
                    : `Row ${sq.row}, Col ${sq.col}`
                  return (
                    <span
                      key={`${sq.row}-${sq.col}`}
                      className={`badge ${sq.payment_status === 'paid' ? 'bg-grn' : 'bg-org'}`}
                      style={{ fontSize: 10 }}
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="card">
          <div className="sec">Admin controls</div>
          <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 10 }}>
            {board.numbers_drawn
              ? '🎲 Numbers were drawn automatically once all squares were paid.'
              : "🎲 You don't control the number draw — it fires on its own the instant the 100th square is paid, same rules for everyone."}
          </div>

          {pendingByPlayer.size > 0 && (
            <>
              <div style={{ fontSize: 11, color: '#555f6e', marginBottom: 6, fontWeight: 600 }}>Pending Venmo/Zelle payments</div>
              {Array.from(pendingByPlayer.entries()).map(([pid, info]) => (
                <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e9ecef' }}>
                  <span style={{ fontSize: 12 }}>{info.name} · {info.count} square{info.count > 1 ? 's' : ''}</span>
                  <button onClick={() => confirmPlayerPayments(pid)} disabled={confirming === pid} className="btn btn-grn btn-sm" style={{ background: '#e8f5e9', border: '1.5px solid #a5d6a7', color: '#2e7d32' }}>
                    {confirming === pid ? '...' : 'Confirm payment'}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <Link href="/dashboard" className="btn btn-out btn-blk">← Back to dashboard</Link>

      {selectedCount > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '2px solid #1a1a1a', padding: 12, zIndex: 50 }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {(['card', 'venmo', 'zelle'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className="btn btn-sm"
                  style={{
                    flex: 1, border: `1.5px solid ${payMethod === m ? '#1565c0' : '#9aa3ad'}`,
                    background: payMethod === m ? '#e3f2fd' : '#fff', color: payMethod === m ? '#1565c0' : '#555f6e',
                    justifyContent: 'center',
                  }}
                >
                  {m === 'card' ? '💳 Card' : m === 'venmo' ? '📱 Venmo' : '💸 Zelle'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: '#6c757d', textTransform: 'uppercase', fontWeight: 600 }}>
                  {selectedCount} square{selectedCount > 1 ? 's' : ''}{payMethod === 'card' ? ' + 2.9% fee' : ' · no fee, pending confirm'}
                </div>
                <div style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: 26 }}>${(totalCents / 100).toFixed(2)}</div>
              </div>
              <button onClick={handleClaim} disabled={claiming} className="btn btn-dark">
                {claiming ? 'Claiming…' : 'Pay & Claim →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
