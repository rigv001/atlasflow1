// AtlasFlow - Login page
// Simple email + password login with role check

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import ParticleBackground from '../components/ParticleBackground';
import { loadCurrentUserRole } from '../utils/profile'

interface LoginProps {
  onLogin: (role: 'client' | 'admin') => void
  onSwitchToSignup: () => void
}

export default function Login({ onLogin, onSwitchToSignup }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // --- Section: Handle login ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const userRole = await loadCurrentUserRole()
      if (!userRole) throw new Error('Unable to determine your role after sign-in.')

      onLogin(userRole)
      navigate(userRole === 'admin' ? '/admin' : '/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your details.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 relative overflow-hidden">
      <ParticleBackground />

      <div className="w-full max-w-[380px] relative z-10">
        {/* Logo + Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/logo11.png"
            alt="AtlasFlow Logo"
            className="h-10 w-auto"
          />
          <span className="text-3xl font-semibold text-white tracking-tight">AtlasFlow</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-white tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-400">
            Don't have an account yet?{' '}
            <button onClick={() => { onSwitchToSignup(); navigate('/signup') }} className="text-blue-400 hover:underline" type="button">
              Sign up
            </button>
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-950 text-red-400 rounded-xl text-sm border border-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#333333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="you@school.edu.au"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#333333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}