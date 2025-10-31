'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  // Fetch streams
  useEffect(() => {
    fetchStreams()
  }, [])

  // Initialize map after streams loaded
  useEffect(() => {
    if (!loading && !mapInstanceRef.current) {
      initMap()
    }
  }, [loading, streams])

  const fetchStreams = async () => {
    try {
      console.log('🔄 Fetching streams...')
      const res = await fetch('http://localhost:5000/api/streams')
      
      if (res.ok) {
        const response = await res.json()
        console.log('✅ API Response:', response)
        
        // Handle {success, data} format
        let data = []
        if (response.success && Array.isArray(response.data)) {
          data = response.data
        } else if (Array.isArray(response)) {
          data = response
        }
        
        console.log('📊 Parsed streams:', data)
        console.log('📍 Total streams:', data.length)
        
        setStreams(data)
      } else {
        console.error('❌ API Error:', res.status)
        setStreams([])
      }
    } catch (error) {
      console.error('❌ Fetch error:', error)
      setStreams([])
    } finally {
      setLoading(false)
    }
  }

  const initMap = async () => {
    // Prevent if already initialized
    if (mapInstanceRef.current) {
      console.log('⚠️ Map already initialized, skipping...')
      return
    }

    if (typeof window === 'undefined') {
      console.log('⚠️ Window undefined, skipping...')
      return
    }

    const container = document.getElementById('map')
    if (!container) {
      console.log('⚠️ Map container not found')
      return
    }

    // Check if Leaflet already attached
    if (container._leaflet_id) {
      console.log('⚠️ Leaflet already attached, removing...')
      container._leaflet_id = null
    }

    try {
      console.log('🗺️ Initializing map...')
      const L = (await import('leaflet')).default
      
      // Fix marker icons
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      // Create map
      const map = L.map('map', {
        center: [-8.670458, 115.212631],
        zoom: 11,
        zoomControl: true
      })

      // Dark theme tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map)

      console.log('✅ Map initialized')
      console.log('📍 Adding markers for', streams.length, 'streams')

      // Add markers
      if (streams.length > 0) {
        const bounds = []

        streams.forEach((stream, index) => {
          console.log(`➕ Adding marker ${index + 1}:`, stream.name, `[${stream.latitude}, ${stream.longitude}]`)
          
          // Uniform marker - blue for active, grey for inactive
          const markerColor = stream.status === 'active' ? 'blue' : 'grey'
          
          const markerIcon = L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })

          // Add marker
          const marker = L.marker([stream.latitude, stream.longitude], { 
            icon: markerIcon,
            title: stream.name
          }).addTo(map)
          
          bounds.push([stream.latitude, stream.longitude])

          // Permanent label - Site name always visible
          marker.bindTooltip(stream.name, {
            permanent: true,
            direction: 'top',
            offset: [0, -40],
            className: 'elegant-marker-label'
          })

          // Google Maps directions URL
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${stream.latitude},${stream.longitude}`

          // ✅ Status: "LIVE" atau "OFFLINE"
          const statusColor = stream.status === 'active' ? '#10b981' : '#6b7280'
          const statusText = stream.status === 'active' ? 'LIVE' : 'OFFLINE'
          const statusDot = stream.status === 'active' 
            ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite;"></div>'
            : '<div style="width: 8px; height: 8px; border-radius: 50%; background: #6b7280;"></div>'

          // Beautiful dark popup content
          const popupContent = `
            <div style="min-width: 320px; max-width: 450px;">
              <div style="margin-bottom: 12px;">
                <h3 style="margin: 0 0 6px 0; font-size: 20px; font-weight: bold; color: #ffffff; line-height: 1.3;">
                  ${stream.name}
                </h3>
                <p style="margin: 0; font-size: 14px; color: #9ca3af; line-height: 1.6;">
                  ${stream.description || 'Construction monitoring project in Bali'}
                </p>
              </div>

              ${stream.status === 'active' && stream.hlsPath ? `
                <div style="background: #000; border-radius: 10px; overflow: hidden; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                  <video 
                    id="video-${stream.id}" 
                    controls 
                    style="width: 100%; height: 240px; object-fit: cover; display: block;"
                    muted
                    playsinline
                  >
                    Your browser does not support video playback.
                  </video>
                  <div style="background: #1a1a1a; padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
                    ${statusDot}
                    <span style="color: ${statusColor}; font-size: 12px; font-weight: 600;">${statusText}</span>
                  </div>
                </div>
              ` : `
                <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 10px; padding: 40px 20px; text-align: center; margin-bottom: 16px; border: 1px solid #374151;">
                  <svg style="width: 48px; height: 48px; margin: 0 auto 12px; color: #4b5563;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
                    ${statusDot}
                    <span style="color: #9ca3af; font-size: 14px; font-weight: 500;">
                      ${stream.status === 'active' ? 'Stream starting...' : 'Stream offline'}
                    </span>
                  </div>
                </div>
              `}

              <div style="display: flex; gap: 10px;">
                <a 
                  href="${directionsUrl}" 
                  target="_blank"
                  rel="noopener noreferrer"
                  style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); transition: all 0.2s;"
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(59, 130, 246, 0.3)'"
                >
                  <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Get Directions
                </a>
              </div>

              <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #374151; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #6b7280; font-size: 12px;">
                  📍 ${stream.latitude.toFixed(5)}, ${stream.longitude.toFixed(5)}
                </span>
                <a href="https://remarc.group" target="_blank" style="color: #3b82f6; font-size: 11px; text-decoration: none; font-weight: 600; transition: color 0.2s;" onmouseover="this.style.color='#60a5fa'" onmouseout="this.style.color='#3b82f6'">
                  remarc.group
                </a>
              </div>
            </div>

            <style>
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            </style>
          `

          marker.bindPopup(popupContent, {
            maxWidth: 450,
            minWidth: 320,
            className: 'elegant-popup'
          })

          // HLS video player on popup open
          marker.on('popupopen', () => {
            if (stream.status === 'active' && stream.hlsPath) {
              const videoElement = document.getElementById(`video-${stream.id}`)
              
              if (videoElement && window.Hls && window.Hls.isSupported()) {
                const hls = new window.Hls()
                hls.loadSource(`http://localhost:5000${stream.hlsPath}`)
                hls.attachMedia(videoElement)
                
                hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                  videoElement.play().catch(e => console.log('Autoplay prevented:', e))
                })
              } else if (videoElement && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                videoElement.src = `http://localhost:5000${stream.hlsPath}`
                videoElement.addEventListener('loadedmetadata', () => {
                  videoElement.play().catch(e => console.log('Autoplay prevented:', e))
                })
              }
            }
          })
        })

        // Fit bounds to show all markers
        if (bounds.length > 0) {
          const leafletBounds = L.latLngBounds(bounds)
          map.fitBounds(leafletBounds, { padding: [80, 80], maxZoom: 13 })
          console.log('✅ Map fitted to bounds')
        }
      } else {
        console.log('⚠️ No streams to display markers')
      }

      // Store map instance
      mapInstanceRef.current = map

      // Force resize
      setTimeout(() => {
        map.invalidateSize()
        console.log('✅ Map resized')
      }, 100)

    } catch (error) {
      console.error('❌ Error initializing map:', error)
    }
  }

  return (
    <>
      {/* HLS.js library */}
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      
      {/* Elegant Custom Styles */}
      <style jsx global>{`
        /* Elegant Marker Label */
        .elegant-marker-label {
          background: rgba(31, 41, 55, 0.95) !important;
          border: 1px solid rgba(59, 130, 246, 0.5) !important;
          border-radius: 8px !important;
          padding: 6px 14px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
          backdrop-filter: blur(8px) !important;
          white-space: nowrap !important;
        }

        .elegant-marker-label::before {
          border-top-color: rgba(31, 41, 55, 0.95) !important;
        }

        /* Elegant Popup */
        .elegant-popup .leaflet-popup-content-wrapper {
          background: #1f2937 !important;
          color: #ffffff !important;
          border-radius: 14px !important;
          padding: 18px !important;
          border: 1px solid #374151 !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
        }

        .elegant-popup .leaflet-popup-content {
          margin: 0 !important;
        }

        .elegant-popup .leaflet-popup-tip {
          background: #1f2937 !important;
        }

        .elegant-popup .leaflet-popup-close-button {
          color: #9ca3af !important;
          font-size: 22px !important;
          transition: color 0.2s !important;
        }

        .elegant-popup .leaflet-popup-close-button:hover {
          color: #ffffff !important;
        }

        .leaflet-container {
          background: #0a0a0a !important;
        }

        /* Remove leaflet attribution on mobile for cleaner look */
        @media (max-width: 768px) {
          .leaflet-control-attribution {
            font-size: 10px !important;
            opacity: 0.6 !important;
          }
        }
      `}</style>

      <div className="relative w-full h-screen bg-gray-900">
        {/* Map Container */}
        <div 
          id="map" 
          ref={mapRef}
          className="w-full h-full"
          style={{ zIndex: 0 }}
        />

        {/* ❌ REMOVED: Header REMARC Property Group */}

        {/* Stats Badge - Top Right (ONLY THIS ONE) */}
        <div 
          className="absolute top-6 right-6 backdrop-blur-xl bg-black/80 border border-white/20 rounded-lg px-5 py-3 shadow-2xl"
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">
                {streams.filter(s => s.status === 'active').length} Live
              </span>
            </div>
            <div className="w-px h-4 bg-white/20"></div>
            <span className="text-gray-400 text-sm">
              {streams.length} Total Sites
            </span>
          </div>
        </div>

        {/* ❌ REMOVED: Hidden Admin Button */}

        {/* Empty State - When no streams */}
        {!loading && streams.length === 0 && (
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
        {loading && (
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
    </>
  )
}