'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

/**
 * 🔒 CUSTOM AUTHENTICATION HOOK
 * Usage: const { isAuthenticated, isLoading, logout } = useAuth()
 */
export function useAuth(requireAuth = true) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.log('❌ useAuth: No token found')
        
        if (requireAuth) {
          toast.error('Please login first!')
          router.replace('/login')
        }
        
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      // Decode JWT to get user info (basic decode, not verification)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({
          id: payload.id,
          username: payload.username
        })
        console.log('✅ useAuth: User authenticated', payload.username)
      } catch (decodeError) {
        console.error('❌ useAuth: Failed to decode token', decodeError)
      }

      setIsAuthenticated(true)
      setIsLoading(false)
    } catch (error) {
      console.error('❌ useAuth: Error checking auth', error)
      setIsAuthenticated(false)
      setIsLoading(false)
      
      if (requireAuth) {
        router.replace('/login')
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setUser(null)
    toast.success('Logged out successfully!')
    router.replace('/login')
  }

  const refreshAuth = () => {
    checkAuth()
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    logout,
    refreshAuth
  }
}