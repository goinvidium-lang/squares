'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NavBar() {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div id="nav">
      <Link href="/" className="logo">🏈 Gridiron Squares</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {loggedIn === null ? null : loggedIn ? (
          <>
            <Link href="/dashboard" className="btn btn-out" style={{ fontSize: 11, padding: '5px 12px' }}>
              Dashboard
            </Link>
            <button onClick={handleLogout} className="btn btn-out" style={{ fontSize: 11, padding: '5px 12px' }}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="btn btn-out" style={{ fontSize: 11, padding: '5px 12px' }}>
              Log in
            </Link>
            <Link href="/auth/signup" className="btn btn-dark" style={{ fontSize: 11, padding: '5px 12px' }}>
              Sign up
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
