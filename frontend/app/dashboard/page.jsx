'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import StreamSkeleton from '@/components/StreamSkeleton'
import ConfirmModal from '@/components/ConfirmModal'

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-white/5 rounded-lg animate-pulse flex items-center justify-center">
    <p className="text-gray-400">Loading map...</p>
  </div>
})

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth(true)

  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [lastRefresh, setLastRefresh] = useState(new Date())
  
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailStream, setDetailStream] = useState(null)
  const [detailTab, setDetailTab] = useState('info')
  const [healthData, setHealthData] = useState(null)
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [isEditingDetail, setIsEditingDetail] = useState(false)
  
  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    streamId: null, 
    streamName: '' 
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rtspUrl: '',
    latitude: '',
    longitude: ''
  })

  const [coordMode, setCoordMode] = useState('manual')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const interval = setInterval(() => {
        fetchStreams(true)
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchStreams()
    }
  }, [isAuthenticated, authLoading])

  const fetchStreams = async (silent = false) => {
    if (!silent) setLoading(true)
    
    try {
      const res = await fetch('http://localhost:5000/api/streams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (res.ok) {
        const response = await res.json()
        let data = []
        if (response.success && Array.isArray(response.data)) {
          data = response.data
        } else if (Array.isArray(response)) {
          data = response
        }
        setStreams(data)
        setLastRefresh(new Date())
      } else if (res.status === 401) {
        toast.error('Session expired! Please login again')
        logout()
      } else {
        if (!silent) toast.error('Failed to fetch streams!')
      }
    } catch (error) {
      console.error('Error fetching streams:', error)
      if (!silent) toast.error('Failed to fetch streams!')
      setStreams([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const openDetailModal = async (stream, tab = 'info') => {
    setDetailStream(stream)
    setDetailTab(tab)
    setShowDetailModal(true)
    setIsEditingDetail(false)
    
    setFormData({
      name: stream.name,
      description: stream.description || '',
      rtspUrl: stream.rtspUrl,
      latitude: stream.latitude.toString(),
      longitude: stream.longitude.toString()
    })
    
    if (tab === 'health') {
      await fetchHealthData(stream.id)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setDetailStream(null)
    setDetailTab('info')
    setHealthData(null)
    setIsEditingDetail(false)
  }

  const fetchHealthData = async (streamId) => {
    setLoadingHealth(true)
    try {
      const res = await fetch(`http://localhost:5000/api/streams/${streamId}/health`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (res.ok) {
        const response = await res.json()
        setHealthData(response.data)
      } else {
        toast.error('Failed to fetch health data')
      }
    } catch (error) {
      console.error('Error fetching health:', error)
      toast.error('Error loading health data')
    } finally {
      setLoadingHealth(false)
    }
  }

  const switchDetailTab = async (tab) => {
    setDetailTab(tab)
    if (tab === 'health' && !healthData) {
      await fetchHealthData(detailStream.id)
    }
  }

  const formatUptime = (seconds) => {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getStatusBadge = (status) => {
    const configs = {
      active: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/50',
        icon: '🟢',
        label: 'Live',
        pulse: true
      },
      inactive: {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        border: 'border-gray-500/50',
        icon: '⚫',
        label: 'Offline',
        pulse: false
      },
      error: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/50',
        icon: '🔴',
        label: 'Error',
        pulse: true
      },
      starting: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/50',
        icon: '🟡',
        label: 'Starting',
        pulse: true
      }
    }
    
    const config = configs[status] || configs.inactive
    
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        <span className={config.pulse ? 'animate-pulse' : ''}>{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      rtspUrl: '',
      latitude: '',
      longitude: ''
    })
    setCoordMode('manual')
    setSearchQuery('')
    setSearchResults([])
    setShowAddModal(true)
  }

  const closeAddModal = () => {
    setShowAddModal(false)
  }

  const handleSubmitAdd = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.rtspUrl || !formData.latitude || !formData.longitude) {
      toast.error('All fields are required!')
      return
    }

    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Coordinates must be numbers!')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Adding stream...')

    try {
      const res = await fetch('http://localhost:5000/api/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          rtspUrl: formData.rtspUrl,
          latitude: lat,
          longitude: lng
        })
      })

      if (res.ok) {
        toast.dismiss(loadingToast)
        toast.success('Stream added!')
        fetchStreams()
        closeAddModal()
      } else {
        const error = await res.json()
        toast.dismiss(loadingToast)
        toast.error(error.error || 'Failed to add stream!')
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Error adding stream!')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.rtspUrl || !formData.latitude || !formData.longitude) {
      toast.error('All fields are required!')
      return
    }

    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Coordinates must be numbers!')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Updating stream...')

    try {
      const res = await fetch(`http://localhost:5000/api/streams/${detailStream.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          rtspUrl: formData.rtspUrl,
          latitude: lat,
          longitude: lng
        })
      })

      if (res.ok) {
        toast.dismiss(loadingToast)
        toast.success('Stream updated!')
        setIsEditingDetail(false)
        fetchStreams()
        
        const updatedStream = { ...detailStream, ...formData, latitude: lat, longitude: lng }
        setDetailStream(updatedStream)
      } else {
        const error = await res.json()
        toast.dismiss(loadingToast)
        toast.error(error.error || 'Failed to update stream!')
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Error updating stream!')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStream = async (stream) => {
    const isActive = stream.status === 'active' || stream.status === 'starting'
    
    if (isActive) {
      const loadingToast = toast.loading('Stopping stream...')
      try {
        const res = await fetch(`http://localhost:5000/api/streams/${stream.id}/stop`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (res.ok) {
          toast.dismiss(loadingToast)
          toast.success('Stream stopped!')
          setTimeout(() => fetchStreams(true), 2000)
        } else {
          toast.dismiss(loadingToast)
          toast.error('Failed to stop stream!')
        }
      } catch (error) {
        toast.dismiss(loadingToast)
        toast.error('Error stopping stream!')
      }
    } else {
      const loadingToast = toast.loading('Starting stream...')
      try {
        const res = await fetch(`http://localhost:5000/api/streams/${stream.id}/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (res.ok) {
          toast.dismiss(loadingToast)
          toast.success('Stream starting...')
          setTimeout(() => fetchStreams(true), 3000)
        } else {
          const error = await res.json()
          toast.dismiss(loadingToast)
          toast.error(error.error || 'Failed to start stream!')
        }
      } catch (error) {
        toast.dismiss(loadingToast)
        toast.error('Error starting stream!')
      }
    }
  }

  const restartStream = async (streamId) => {
    const loadingToast = toast.loading('Restarting stream...')
    try {
      const res = await fetch(`http://localhost:5000/api/streams/${streamId}/restart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (res.ok) {
        toast.dismiss(loadingToast)
        toast.success('Stream restarting...')
        setTimeout(() => fetchStreams(true), 3000)
      } else {
        toast.dismiss(loadingToast)
        toast.error('Failed to restart stream')
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Error restarting stream')
    }
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`http://localhost:5000/api/streams/${deleteModal.streamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (res.ok) {
        toast.success(`Stream deleted!`)
        fetchStreams()
        setDeleteModal({ isOpen: false, streamId: null, streamName: '' })
      } else {
        toast.error('Failed to delete stream!')
      }
    } catch (error) {
      toast.error('Error deleting stream!')
    } finally {
      setIsDeleting(false)
    }
  }

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a location name!')
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      )
      const data = await res.json()
      
      if (data.length > 0) {
        setSearchResults(data)
        toast.success(`Found ${data.length} locations!`)
      } else {
        setSearchResults([])
        toast.error('Location not found!')
      }
    } catch (error) {
      toast.error('Error searching location!')
    } finally {
      setIsSearching(false)
    }
  }

  const selectSearchResult = (result) => {
    setFormData({
      ...formData,
      latitude: result.lat,
      longitude: result.lon
    })
    toast.success('Coordinates selected!')
    setSearchResults([])
  }

  const handleMapClick = (lat, lng) => {
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString()
    })
    toast.success('Coordinates selected from map!')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl font-medium">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <nav className="backdrop-blur-xl bg-white/5 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <h1 className="text-2xl font-bold text-white">REMARC Admin</h1>
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StreamSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="fixed top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

      {/* NAVBAR */}
      <nav className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">REMARC Admin Dashboard</h1>
                <p className="text-xs text-gray-400">Stream Monitoring System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-gray-400">Auto-refresh</span>
              </div>
              
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition font-medium text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Manage Streams</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Total: {streams.length}</span>
              <span>•</span>
              <span className="text-green-400">
                {streams.filter(s => s.status === 'active').length} Live
              </span>
              <span>•</span>
              <span className="text-gray-400">
                Last update: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition font-semibold shadow-lg shadow-blue-500/30"
          >
            + Add Stream
          </button>
        </div>

        {/* TABLE */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-1/4">Stream Info</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-1/6">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-1/8">Uptime</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-1/8">Errors</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-1/3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {streams.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-400 text-lg">No streams yet</p>
                      <p className="text-gray-500 text-sm">Click "Add Stream" to get started!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                streams.map((stream) => (
                  <tr key={stream.id} className="hover:bg-white/5 transition group">
                    {/* STREAM INFO */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-semibold mb-1">{stream.name}</p>
                          <p className="text-gray-400 text-sm mb-1 line-clamp-1">
                            {stream.description || 'No description'}
                          </p>
                          <p className="text-gray-500 text-xs">
                            📍 {stream.latitude.toFixed(4)}, {stream.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {getStatusBadge(stream.status)}
                        {stream.status === 'error' && stream.errorMessage && (
                          <p className="text-red-400 text-xs mt-1 line-clamp-1">
                            {stream.errorMessage}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* UPTIME */}
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {stream.status === 'active' ? (
                          <p className="text-white font-medium">{formatUptime(stream.uptimeSeconds)}</p>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>

                    {/* ERRORS */}
                    <td className="px-6 py-4">
                      {stream.recentErrorCount > 0 ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/50">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {stream.recentErrorCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Clean
                        </span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* TOGGLE START/STOP */}
                        {(stream.status === 'active' || stream.status === 'starting') ? (
                          <button
                            onClick={() => toggleStream(stream)}
                            className="px-3 py-1.5 rounded-lg border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 transition text-xs font-medium"
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStream(stream)}
                            className="px-3 py-1.5 rounded-lg border border-green-500/50 text-green-400 hover:bg-green-500/10 transition text-xs font-medium"
                          >
                            Start
                          </button>
                        )}
                        
                        {/* RESTART */}
                        {(stream.status === 'active' || stream.status === 'error') && (
                          <button
                            onClick={() => restartStream(stream.id)}
                            className="px-3 py-1.5 rounded-lg border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 transition text-xs font-medium"
                          >
                            Restart
                          </button>
                        )}

                        {/* DETAIL */}
                        <button
                          onClick={() => openDetailModal(stream, 'info')}
                          className="px-3 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition text-xs font-medium"
                        >
                          Detail
                        </button>

                        {/* DELETE - ICON ONLY */}
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, streamId: stream.id, streamName: stream.name })}
                          className="p-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition"
                          title="Delete stream"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Add New Stream</h3>

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stream Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">RTSP URL *</label>
                <input
                  type="text"
                  value={formData.rtspUrl}
                  onChange={(e) => setFormData({...formData, rtspUrl: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Coordinate Input</label>
                <div className="flex gap-2 mb-4">
                  <button type="button" onClick={() => setCoordMode('manual')} className={`px-4 py-2 rounded-lg ${coordMode === 'manual' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-300'}`}>Manual</button>
                  <button type="button" onClick={() => setCoordMode('search')} className={`px-4 py-2 rounded-lg ${coordMode === 'search' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-300'}`}>Search</button>
                  <button type="button" onClick={() => setCoordMode('map')} className={`px-4 py-2 rounded-lg ${coordMode === 'map' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-300'}`}>Map</button>
                </div>

                {coordMode === 'manual' && (
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Latitude"
                      value={formData.latitude}
                      onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Longitude"
                      value={formData.longitude}
                      onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {coordMode === 'search' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
                        className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={searchLocation}
                        disabled={isSearching}
                        className="px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="max-h-60 overflow-y-auto space-y-2 backdrop-blur-xl bg-white/5 border border-white/20 rounded-lg p-3">
                        {searchResults.map((result, index) => (
                          <div
                            key={index}
                            onClick={() => selectSearchResult(result)}
                            className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition border border-white/10"
                          >
                            <p className="text-white font-medium text-sm">{result.display_name}</p>
                            <p className="text-gray-400 text-xs mt-1">
                              📍 {parseFloat(result.lat).toFixed(5)}, {parseFloat(result.lon).toFixed(5)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {coordMode === 'map' && (
                  <MapPicker
                    latitude={formData.latitude ? parseFloat(formData.latitude) : -8.670458}
                    longitude={formData.longitude ? parseFloat(formData.longitude) : 115.212631}
                    onLocationSelect={handleMapClick}
                  />
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeAddModal} className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-medium disabled:opacity-50">
                  {isSubmitting ? 'Adding...' : 'Add Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL WITH 3 TABS */}
      {showDetailModal && detailStream && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <div>
                <h3 className="text-2xl font-bold text-white">{detailStream.name}</h3>
                <p className="text-gray-400 text-sm mt-1">Stream Details</p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* TABS */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => switchDetailTab('info')}
                className={`flex-1 px-6 py-3 font-medium transition ${detailTab === 'info' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
              >
                📝 Info
              </button>
              <button
                onClick={() => switchDetailTab('preview')}
                className={`flex-1 px-6 py-3 font-medium transition ${detailTab === 'preview' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
              >
                📹 Preview
              </button>
              <button
                onClick={() => switchDetailTab('health')}
                className={`flex-1 px-6 py-3 font-medium transition ${detailTab === 'health' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-400 hover:text-white'}`}
              >
                🏥 Health
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* INFO TAB */}
              {detailTab === 'info' && (
                <div>
                  {!isEditingDetail ? (
                    <div className="space-y-4">
                      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
                        <p className="text-gray-400 text-xs uppercase mb-1">Name</p>
                        <p className="text-white font-medium">{detailStream.name}</p>
                      </div>
                      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
                        <p className="text-gray-400 text-xs uppercase mb-1">Description</p>
                        <p className="text-white">{detailStream.description || 'No description'}</p>
                      </div>
                      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
                        <p className="text-gray-400 text-xs uppercase mb-1">RTSP URL</p>
                        <p className="text-white font-mono text-sm break-all">{detailStream.rtspUrl}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
                          <p className="text-gray-400 text-xs uppercase mb-1">Latitude</p>
                          <p className="text-white font-mono">{detailStream.latitude}</p>
                        </div>
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
                          <p className="text-gray-400 text-xs uppercase mb-1">Longitude</p>
                          <p className="text-white font-mono">{detailStream.longitude}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsEditingDetail(true)}
                        className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-medium"
                      >
                        ✏️ Edit Stream
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitEdit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Stream Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">RTSP URL *</label>
                        <input
                          type="text"
                          value={formData.rtspUrl}
                          onChange={(e) => setFormData({...formData, rtspUrl: e.target.value})}
                          className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Latitude *</label>
                          <input
                            type="text"
                            value={formData.latitude}
                            onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Longitude *</label>
                          <input
                            type="text"
                            value={formData.longitude}
                            onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingDetail(false)}
                          className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-medium disabled:opacity-50"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* PREVIEW TAB - SELALU TAMPIL */}
              {detailTab === 'preview' && (
                <div>
                  <div className="bg-black rounded-lg overflow-hidden">
                    <video 
                      id={`detail-video-${detailStream.id}`}
                      controls
                      autoPlay
                      muted
                      className="w-full h-auto"
                      style={{ maxHeight: '500px' }}
                    >
                      Your browser does not support video playback.
                    </video>
                    <div className="bg-gray-900/50 backdrop-blur-sm p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${detailStream.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className={`text-sm font-semibold ${detailStream.status === 'active' ? 'text-green-400' : 'text-gray-400'}`}>
                          {detailStream.status === 'active' ? 'LIVE' : 'OFFLINE'}
                        </span>
                      </div>
                      <span className="text-gray-400 text-xs">HLS Stream</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-gray-400 text-xs uppercase mb-1">RTSP URL</p>
                    <p className="text-white font-mono text-sm break-all">{detailStream.rtspUrl}</p>
                  </div>
                  
                  {detailStream.status !== 'active' && (
                    <div className="mt-4 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ Stream is offline. Preview will show last frame or black screen.
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Start the stream to see live video
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* HEALTH TAB */}
              {detailTab === 'health' && (
                <div>
                  {loadingHealth ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">Loading health data...</p>
                    </div>
                  ) : healthData ? (
                    <div className="space-y-6">
                      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-6">
                        <h4 className="text-white font-bold mb-4">📊 Uptime Statistics (24h)</h4>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-gray-300 text-sm">Uptime Percentage</span>
                              <span className="text-white font-bold">{healthData.uptimePercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full ${healthData.uptimePercentage >= 95 ? 'bg-green-500' : healthData.uptimePercentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${healthData.uptimePercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-gray-400 text-xs uppercase mb-1">Current Uptime</p>
                              <p className="text-white font-bold">{formatUptime(healthData.stream?.uptimeSeconds)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase mb-1">Restart Count</p>
                              <p className="text-white font-bold">{healthData.stream?.restartCount || 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase mb-1">Errors (24h)</p>
                              <p className="text-white font-bold">{healthData.totalErrors24h}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg p-6">
                        <h4 className="text-white font-bold mb-4">⚡ Performance Metrics</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Average Bitrate</p>
                            <p className="text-white font-bold">{healthData.averageBitrate ? `${healthData.averageBitrate} kbps` : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Average FPS</p>
                            <p className="text-white font-bold">{healthData.averageFps || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Resolution</p>
                            <p className="text-white font-bold">{healthData.stream?.resolution || '1280x720'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <p>No health data available</p>
                      <p className="text-sm mt-2">Stream must be started to collect health metrics</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={closeDetailModal}
                className="px-6 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, streamId: null, streamName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Stream?"
        message={`Are you sure you want to delete "${deleteModal.streamName}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
      
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    </div>
  )
}