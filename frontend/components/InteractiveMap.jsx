'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Custom marker icon (blue pin seperti referensi)
const createCustomIcon = () => {
  if (typeof window === 'undefined') return null;
  
  return L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

export default function InteractiveMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch streams dari backend
  useEffect(() => {
    async function fetchStreams() {
      try {
        const response = await fetch('http://localhost:5000/api/streams');
        const data = await response.json();
        setStreams(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching streams:', error);
        setLoading(false);
        
        // Fallback data untuk testing
        setStreams([
          {
            id: 1,
            name: 'Zen Luxury Complex',
            description: 'Construction site monitoring - Kuta',
            latitude: -8.670458,
            longitude: 115.212631,
            status: 'active',
            hlsPath: '/streams/stream1/index.m3u8'
          },
          {
            id: 2,
            name: 'Beachfront Villa Project',
            description: 'Ongoing construction - Seminyak',
            latitude: -8.691111,
            longitude: 115.168105,
            status: 'inactive',
            hlsPath: null
          }
        ]);
      }
    }

    fetchStreams();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || typeof window === 'undefined') return;

    // Create map centered on Bali
    const map = L.map(mapRef.current, {
      center: [-8.4095, 115.1889], // Bali center
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Dark theme tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add markers when streams data is loaded
  useEffect(() => {
    if (!mapInstanceRef.current || streams.length === 0 || typeof window === 'undefined') return;

    const map = mapInstanceRef.current;
    const customIcon = createCustomIcon();

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

  // Add markers when streams data is loaded
  useEffect(() => {
  if (!mapInstanceRef.current || typeof window === 'undefined') return;
  
  // Validate streams is array
  if (!Array.isArray(streams)) {
    console.error('Streams is not an array:', typeof streams, streams);
    return;
  }
  
  if (streams.length === 0) {
    console.log('No streams available');
    return;
  }

  const map = mapInstanceRef.current;
  const customIcon = createCustomIcon();

  // Rest of code...

      // Create popup content
      const popupContent = `
        <div style="min-width: 300px; max-width: 400px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #ffffff;">
            ${stream.name}
          </h3>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #9ca3af;">
            ${stream.description || 'No description'}
          </p>
          
          ${stream.status === 'active' && stream.hlsPath ? `
            <div style="margin-bottom: 12px; background: #000; border-radius: 8px; overflow: hidden;">
              <video 
                id="video-${stream.id}" 
                controls 
                style="width: 100%; height: 200px; object-fit: cover;"
                muted
                playsinline
              >
                Your browser does not support video playback.
              </video>
            </div>
          ` : `
            <div style="margin-bottom: 12px; background: #1f2937; border-radius: 8px; padding: 40px; text-align: center;">
              <p style="color: #6b7280; margin: 0;">Stream Inactive</p>
            </div>
          `}
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="padding: 4px 8px; background: ${stream.status === 'active' ? '#10b981' : '#6b7280'}; color: white; border-radius: 4px; font-size: 12px;">
              ${stream.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
            </span>
            <a 
              href="/dashboard" 
              style="padding: 4px 12px; background: #3b82f6; color: white; border-radius: 4px; font-size: 12px; text-decoration: none; display: inline-block;"
            >
              View Details →
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 400,
        className: 'custom-popup'
      });

      // Load HLS stream when popup opens
      marker.on('popupopen', () => {
        if (stream.status === 'active' && stream.hlsPath) {
          const videoElement = document.getElementById(`video-${stream.id}`);
          
          if (videoElement && window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls({
              maxBufferLength: 10,
              maxMaxBufferLength: 20,
            });
            hls.loadSource(`http://localhost:5000${stream.hlsPath}`);
            hls.attachMedia(videoElement);
            
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
              videoElement.play().catch(e => console.log('Autoplay prevented:', e));
            });
          } else if (videoElement && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS support
            videoElement.src = `http://localhost:5000${stream.hlsPath}`;
            videoElement.addEventListener('loadedmetadata', () => {
              videoElement.play().catch(e => console.log('Autoplay prevented:', e));
            });
          }
        }
      });
    });

    // Fit map to show all markers
    if (streams.length > 0) {
      const bounds = L.latLngBounds(streams.map(s => [s.latitude, s.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [streams]);

  return (
    <>
      {/* Load HLS.js */}
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      
      {/* Custom popup styles */}
      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: #1f2937 !important;
          color: #ffffff !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        }
        .custom-popup .leaflet-popup-tip {
          background: #1f2937 !important;
        }
        .custom-popup .leaflet-popup-close-button {
          color: #ffffff !important;
          font-size: 20px !important;
        }
        .leaflet-container {
          background: #0a0a0a !important;
        }
      `}</style>

      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '600px'
        }}
      >
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1f2937',
            padding: '20px 40px',
            borderRadius: '8px',
            color: '#ffffff',
            zIndex: 1000
          }}>
            Loading map...
          </div>
        )}
      </div>
    </>
  );
}