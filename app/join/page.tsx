'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setError('')
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 6) {
      setError('Board codes are 6 characters.')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: board, error: lookupError } = await supabase
      .from('boards')
      .select('id')
      .eq('code', trimmed)
      .maybeSingle()

    setLoading(false)

    if (lookupError) {
      setError(lookupError.message)
      return
    }
    if (!board) {
      setError("Couldn't find a board with that code — double check it and try again.")
      return
    }

    router.push(`/boards/${board.id}`)
  }

  return (
    <div>
      <Link href="/dashboard" className="btn btn-out btn-sm" style={{ marginTop: 12 }}>← Back to dashboard</Link>
      <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
        <div className="h1">Join a Board</div>
        <div className="sub">Enter the code your organizer shared</div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        <label className="lbl">Board code</label>
        <input
          className="inp"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="3CYLZW"
          maxLength={6}
          style={{
            textTransform: 'uppercase', letterSpacing: 4, fontSize: 18,
            textAlign: 'center', fontFamily: 'var(--font-bebas), sans-serif',
          }}
        />
      </div>

      <button onClick={handleJoin} disabled={loading} className="btn btn-dark btn-blk" style={{ marginBottom: 8 }}>
        {loading ? 'Looking up…' : 'Find Board'}
      </button>
      <Link href="/dashboard" className="btn btn-out btn-blk">
        ← Back to dashboard
      </Link>
    </div>
  )
}
