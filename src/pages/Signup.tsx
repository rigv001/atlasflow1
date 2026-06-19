import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import ParticleBackground from '../components/ParticleBackground';

interface SignupProps {
  onSignup: (role: 'client' | 'admin') => void
  onSwitchToLogin: () => void
}

export default function Signup({ onSignup, onSwitchToLogin }: SignupProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    const normalizedFullName = fullName.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedFullName) {
      setError('Full name is required.')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedFullName,
          },
        },
      })

      if (error) throw error

      if (data.user && !data.session) {
        setSuccessMessage('Account created! Please check your email to confirm your account before logging in.')
        setTimeout(() => {
          onSwitchToLogin()
          navigate('/login', { replace: true })
        }, 2500)
        return
      }

      onSignup('client')
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed. Try a different email.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 relative overflow-hidden">
      <ParticleBackground />

      <div className="w-full max-w-[380px] relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/logo11.png"
            alt="AtlasFlow Logo"
            className="h-10 w-auto"
          />
          <span className="text-3xl font-semibold text-white tracking-tight">AtlasFlow</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-white tracking-tight">Create Account</h1>
          <p className="mt-2 text-sm text-gray-400">
            Already have an account?{' '}
            <button onClick={() => { onSwitchToLogin(); navigate('/login') }} className="text-blue-400 hover:underline" type="button">
              Log in
            </button>
          </p>
        </div>

        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-950 text-red-400 rounded-xl text-sm border border-red-900">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-5 p-3 bg-green-950 text-green-400 rounded-xl text-sm border border-green-900">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#333333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                placeholder="e.g. John Citizen"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#333333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                placeholder="example@gmail.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password (min 6 characters)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#333333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#333333] text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Normal users sign up as Client. Admin access is limited to specific email.
        </p>
      </div>
    </div>
  )
}