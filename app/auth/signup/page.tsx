'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in every field to continue.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // If email confirmation is off, we get a session right away and can
    // create the profile row now. If confirmation is required, there's no
    // session yet — the profile gets created on first login instead.
    if (data.session && data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        name: name.trim(),
        email: email.trim(),
      })
      if (profileError) {
        setError('Account created, but profile setup failed: ' + profileError.message)
        setLoading(false)
        return
      }
      router.push('/dashboard')
      return
    }

    setLoading(false)
    setNeedsConfirm(true)
  }

  if (needsConfirm) {
    return (
      <div>
        <div className="h1" style={{ marginTop: 24 }}>Almost there!</div>
        <div className="info-box">
          Check <strong>{email}</strong> for a confirmation link, then come back and log in.
        </div>
        <Link href="/auth/login" className="btn btn-dark btn-blk">Go to login</Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <div className="h1" style={{ fontSize: 30 }}>Create Your Account</div>
        <div className="sub">Set up boards and claim squares in seconds</div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <label className="lbl" htmlFor="name">Your name</label>
        <input
          id="name"
          className="inp"
          style={{ marginBottom: 10 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kim Cox"
        />

        <label className="lbl" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="inp"
          style={{ marginBottom: 10 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label className="lbl" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className="inp"
          style={{ marginBottom: 10 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />

        <label className="lbl" htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          type="password"
          className="inp"
          style={{ marginBottom: 4 }}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
        />
      </form>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn btn-dark btn-blk"
        style={{ marginBottom: 10 }}
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      <div style={{ textAlign: 'center', fontSize: 12, color: '#555f6e' }}>
        Already have an account?{' '}
        <Link href="/auth/login" style={{ color: '#1565c0', fontWeight: 600 }}>
          Log in
        </Link>
      </div>
    </div>
  )
}
