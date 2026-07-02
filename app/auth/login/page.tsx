'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '30px 0 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏈</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>
          Welcome Back
        </h1>
        <p style={{ fontSize: '13px', color: '#555f6e' }}>
          Sign in to your account
        </p>
      </div>

      <div className="card">
        {error && (
          <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px', fontSize: '13px', color: '#c62828' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '600' }}>
            Email
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #9aa3ad', borderRadius: '6px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '600' }}>
            Password
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #9aa3ad', borderRadius: '6px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', background: loading ? '#555' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: '13px', color: '#555f6e' }}>
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" style={{ color: '#1565c0', fontWeight: '600', textDecoration: 'none' }}>
          Create one free
        </Link>
      </div>

      {/* ── DEV PREVIEW SHORTCUTS — remove before launch ── */}
      <div style={{ borderTop: '1px dashed #b0b8c1', paddingTop: 16, marginTop: 20 }}>
        <div className="sec" style={{ textAlign: 'center' }}>Developer Preview</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href="/preview/admin"
            className="btn btn-out"
            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
          >
            👑 Admin View
          </Link>
          <Link
            href="/preview/player"
            className="btn btn-out"
            style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
          >
            🏈 Player View
          </Link>
        </div>
        <div style={{ fontSize: 10, color: '#9aa3ad', textAlign: 'center', marginTop: 6 }}>
          Sample data — no login required
        </div>
      </div>
    </div>
  )
}
