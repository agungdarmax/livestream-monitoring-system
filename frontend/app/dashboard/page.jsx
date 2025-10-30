'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import StreamSkeleton from '@/components/StreamSkeleton'
import ConfirmModal from '@/components/ConfirmModal'

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-white/5 rounded-lg animate-pulse flex items-center justify-center">
    <p className="text-gray-400">Loading map...</p>
  </div>
})

export default function Dashboard() {
  const router = useRouter()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStream, setEditingStream] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    fetchStreams()
  }, [])

  const fetchStreams = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5000/api/streams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (res.ok) {
        const response = await res.json()
        console.log('API Response:', response)
        
        // Handle both response formats
        let data = []
        if (response.success && Array.isArray(response.data)) {
          data = response.data
        } else if (Array.isArray(response)) {
          data = response
        } else {
          console.error('Unexpected response format:', response)
        }
        
        console.log('Parsed streams:', data)
        setStreams(data)
      } else if (res.status === 401) {
        toast.error('Sesi expired! Silakan login lagi')
        localStorage.removeItem('token')
        router.push('/login')
      } else {
        toast.error('Gagal mengambil data stream!')
      }
    } catch (error) {
      console.error('Error fetching streams:', error)
      toast.error('Gagal mengambil data stream!')
      setStreams([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    toast.success('Berhasil logout!')
    router.push('/login')
  }

  const openModal = (stream = null) => {
    if (stream) {
      setEditingStream(stream)
      setFormData({
        name: stream.name,
        description: stream.description || '',
        rtspUrl: stream.rtspUrl,
        latitude: stream.latitude.toString(),
        longitude: stream.longitude.toString()
      })
    } else {
      setEditingStream(null)
      setFormData({
        name: '',
        description: '',
        rtspUrl: '',
        latitude: '',
        longitude: ''
      })
    }
    setCoordMode('manual')
    setSearchQuery('')
    setSearchResults([])
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingStream(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.rtspUrl || !formData.latitude || !formData.longitude) {
      toast.error('Semua field wajib diisi!')
      return
    }

    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Koordinat harus berupa angka!')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading(editingStream ? 'Mengupdate stream...' : 'Menambahkan stream...')

    try {
      const url = editingStream 
        ? `http://localhost:5000/api/streams/${editingStream.id}`
        : 'http://localhost:5000/api/streams'
      
      const method = editingStream ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
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
        toast.success(editingStream ? 'Stream berhasil diupdate!' : 'Stream berhasil ditambahkan!')
        fetchStreams()
        closeModal()
      } else {
        const error = await res.json()
        toast.dismiss(loadingToast)
        toast.error(error.error || 'Gagal menyimpan stream!')
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Error saat menyimpan stream!')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stopStream = async (id) => {
    const loadingToast = toast.loading('Menghentikan stream...')
    try {
      const res = await fetch(`http://localhost:5000/api/streams/${id}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (res.ok) {
        toast.dismiss(loadingToast)
        toast.success('Stream berhasil dihentikan!')
        fetchStreams()
      } else {
        toast.dismiss(loadingToast)
        toast.error('Gagal menghentikan stream!')
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Error menghentikan stream!')
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
        toast.success(`Stream "${deleteModal.streamName}" berhasil dihapus!`)
        fetchStreams()
        setDeleteModal({ isOpen: false, streamId: null, streamName: '' })
      } else {
        toast.error('Gagal menghapus stream!')
      }
    } catch (error) {
      toast.error('Error menghapus stream!')
    } finally {
      setIsDeleting(false)
    }
  }

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast.error('Masukkan nama lokasi!')
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
        toast.success(`Ditemukan ${data.length} lokasi!`)
      } else {
        setSearchResults([])
        toast.error('Lokasi tidak ditemukan!')
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
    toast.success('Koordinat dipilih!')
    setSearchResults([])
  }

  const handleMapClick = (lat, lng) => {
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString()
    })
    toast.success('Koordinat dipilih dari map!')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <nav className="backdrop-blur-xl bg-white/5 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">REMARC Admin</h1>
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

      <nav className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">REMARC Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Manage Streams ({streams.length})</h2>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-medium"
          >
            + Add Stream
          </button>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {streams.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                    Belum ada stream. Klik "Add Stream" untuk menambahkan!
                  </td>
                </tr>
              ) : (
                streams.map((stream) => (
                  <tr key={stream.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 text-white font-medium">{stream.name}</td>
                    <td className="px-6 py-4 text-gray-300">{stream.description || '-'}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {stream.latitude.toFixed(6)}, {stream.longitude.toFixed(6)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        stream.status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                      }`}>
                        {stream.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(stream)}
                          className="px-3 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, streamId: stream.id, streamName: stream.name })}
                          className="px-3 py-1.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition text-sm"
                        >
                          Delete
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

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingStream ? 'Edit Stream' : 'Add New Stream'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
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

                {coordMode === 'map' && (
                  <MapPicker
                    latitude={formData.latitude ? parseFloat(formData.latitude) : -8.670458}
                    longitude={formData.longitude ? parseFloat(formData.longitude) : 115.212631}
                    onLocationSelect={handleMapClick}
                  />
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-medium disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : (editingStream ? 'Update' : 'Add Stream')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, streamId: null, streamName: '' })}
        onConfirm={handleDeleteConfirm}
        title="Hapus Stream?"
        message={`Yakin mau hapus stream "${deleteModal.streamName}"?`}
        isLoading={isDeleting}
      />
    </div>
  )
}