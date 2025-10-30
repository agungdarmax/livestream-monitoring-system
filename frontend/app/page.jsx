'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [streams, setStreams] = useState([])
  const [mapInitialized, setMapInitialized] = useState(false)

  useEffect(() => {
    fetchStreams()
  }, [])

  useEffect(() => {
    if (streams.length >= 0 && !mapInitialized) {
      initMap()
    }
  }, [streams, mapInitialized])

  const fetchStreams = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/streams')
      if (res.ok) {
        const response = await res.json()
        
        // ✅ Handle {success, data} format
        const data = response.success && Array.isArray(response.data) 
          ? response.data 
          : (Array.isArray(response) ? response : [])
        
        setStreams(data)
      }
    } catch (error) {
      console.error('Error fetching streams:', error)
      setStreams([])
    }
  }

  const initMap = async () => {
    if (typeof window === 'undefined' || mapInitialized) return

    try {
      const container = document.getElementById('map')
      if (!container) return
      if (container._leaflet_id) return

      const L = (await import('leaflet')).default
      
      // Fix marker icons
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      // Initialize map
      const map = L.map('map', {
        center: [-8.670458, 115.212631],
        zoom: 11,
        zoomControl: true
      })

      // ✅ DARK THEME TILE LAYER
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map)

      // Add markers for streams
      if (streams.length > 0) {
        streams.forEach(stream => {
          // Custom marker icon for live streams
          let markerIcon = L.icon({
            iconUrl: stream.status === 'live' 
              ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
              : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })

          const marker = L.marker([stream.latitude, stream.longitude], { icon: markerIcon }).addTo(map)
          
          const statusColor = stream.status === 'live' ? '#ef4444' : '#6b7280'
          const statusBg = stream.status === 'live' ? '#fee2e2' : '#f3f4f6'
          const statusText = stream.status === 'live' ? 'LIVE' : 'OFFLINE'
          
          marker.bindPopup(`
            <div style="min-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
              <h3 style="font-weight: 700; margin-bottom: 8px; color: #1f2937; font-size: 17px;">
                ${stream.name}
              </h3>
              <p style="color: #6b7280; margin-bottom: 12px; font-size: 14px; line-height: 1.5;">
                ${stream.description || 'Construction site monitoring'}
              </p>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="
                  padding: 5px 14px; 
                  background: ${statusBg}; 
                  border-radius: 14px; 
                  font-size: 11px; 
                  font-weight: 700;
                  color: ${statusColor};
                  letter-spacing: 0.5px;
                ">
                  ${statusText}
                </span>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">
                📍 ${stream.latitude.toFixed(6)}, ${stream.longitude.toFixed(6)}
              </p>
            </div>
          `, {
            maxWidth: 300
          })
        })

        // Fit map to show all markers
        const bounds = L.latLngBounds(streams.map(s => [s.latitude, s.longitude]))
        map.fitBounds(bounds, { padding: [50, 50] })
      }

      setTimeout(() => {
        map.invalidateSize()
      }, 100)

      setMapInitialized(true)

    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Map Container */}
      <div 
        id="map" 
        className="w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* Header - Top Left */}
      <div 
        className="absolute top-6 left-6 backdrop-blur-xl bg-black/80 border border-white/20 rounded-lg px-5 py-3 shadow-2xl"
        style={{ zIndex: 1000 }}
      >
        <h1 className="text-white text-xl font-bold">REMARC Property Group</h1>
        <p className="text-gray-400 text-sm mt-1">Construction Monitoring System</p>
      </div>

      {/* Stats Badge - Top Right */}
      <div 
        className="absolute top-6 right-20 backdrop-blur-xl bg-black/80 border border-white/20 rounded-lg px-5 py-3 shadow-2xl"
        style={{ zIndex: 1000 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">
              {streams.filter(s => s.status === 'live').length} Live
            </span>
          </div>
          <div className="w-px h-4 bg-white/20"></div>
          <span className="text-gray-400 text-sm">
            {streams.length} Total Sites
          </span>
        </div>
      </div>

      {/* Hidden Admin Button - Top Right Corner */}
      <button
        onClick={() => router.push('/login')}
        className="absolute top-6 right-6 p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200 opacity-10 hover:opacity-100"
        style={{ zIndex: 1001 }}
        title="Admin Access"
      >
        <svg 
          className="w-5 h-5 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
          />
        </svg>
      </button>

      {/* Empty State - When no streams */}
      {mapInitialized && streams.length === 0 && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-xl bg-black/80 border border-white/20 rounded-xl px-8 py-6 shadow-2xl text-center"
          style={{ zIndex: 1000 }}
        >
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-white text-lg font-bold mb-2">No Active Sites</h3>
          <p className="text-gray-400 text-sm">Construction sites will appear here once added</p>
        </div>
      )}

      {/* Loading Overlay */}
      {!mapInitialized && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-900"
          style={{ zIndex: 999 }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-xl font-medium">Loading map...</p>
            <p className="text-gray-400 text-sm mt-2">Initializing monitoring system</p>
          </div>
        </div>
      )}
    </div>
  )
}