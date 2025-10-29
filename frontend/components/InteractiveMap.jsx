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

// Custom marker icon
const createCustomIcon = () => {
  if (typeof window === 'undefined') return null;
  
  return L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'custom-marker'
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
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        const streamsData = data.success && Array.isArray(data.data) ? data.data : data;
        
        if (Array.isArray(streamsData)) {
          setStreams(streamsData);
        } else {
          console.error('Invalid data format:', data);
          setStreams([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching streams:', error);
        setLoading(false);
        setStreams([]);
      }
    }

    fetchStreams();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || typeof window === 'undefined') {
      return;
    }

    const map = L.map(mapRef.current, {
      center: [-8.4095, 115.1889],
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://remarc.group" target="_blank">REMARC Property Group</a>',
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
    if (!mapInstanceRef.current || typeof window === 'undefined') {
      return;
    }

    if (!Array.isArray(streams) || streams.length === 0) {
      return;
    }

    const map = mapInstanceRef.current;
    const customIcon = createCustomIcon();

    if (!customIcon) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for each stream
    streams.forEach((stream) => {
      const marker = L.marker([stream.latitude, stream.longitude], {
        icon: customIcon,
        title: stream.name
      }).addTo(map);

      // Permanent label above marker
      marker.bindTooltip(stream.name, {
        permanent: true,
        direction: 'top',
        offset: [0, -40],
        className: 'marker-label'
      });

      // Google Maps directions
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${stream.latitude},${stream.longitude}`;

      // Popup content - GUEST VERSION
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
              <div style="background: #1a1a1a; padding: 8px 12px; display: flex; align-items: center; gap: 6px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite;"></div>
                <span style="color: #10b981; font-size: 12px; font-weight: 600;">LIVE</span>
              </div>
            </div>
          ` : `
            <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 10px; padding: 50px 20px; text-align: center; margin-bottom: 16px; border: 1px solid #374151;">
              <svg style="width: 56px; height: 56px; margin: 0 auto 14px; color: #4b5563;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p style="color: #9ca3af; margin: 0; font-size: 14px; font-weight: 500;">
                Live stream coming soon
              </p>
            </div>
          `}

          <div style="display: flex; gap: 10px;">
            <a 
              href="${directionsUrl}" 
              target="_blank"
              rel="noopener noreferrer"
              style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 16px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);"
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
            <a href="https://remarc.group" target="_blank" style="color: #3b82f6; font-size: 11px; text-decoration: none; font-weight: 600;">
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
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 450,
        minWidth: 320,
        className: 'custom-popup'
      });

      marker.on('popupopen', () => {
        if (stream.status === 'active' && stream.hlsPath) {
          const videoElement = document.getElementById(`video-${stream.id}`);
          
          if (videoElement && window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls();
            hls.loadSource(`http://localhost:5000${stream.hlsPath}`);
            hls.attachMedia(videoElement);
            
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
              videoElement.play().catch(e => console.log('Autoplay prevented:', e));
            });
          } else if (videoElement && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = `http://localhost:5000${stream.hlsPath}`;
            videoElement.addEventListener('loadedmetadata', () => {
              videoElement.play().catch(e => console.log('Autoplay prevented:', e));
            });
          }
        }
      });
    });

    if (streams.length > 0) {
      const bounds = L.latLngBounds(streams.map(s => [s.latitude, s.longitude]));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
    }

  }, [streams]);

  return (
    <>
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      
      <style jsx global>{`
        .marker-label {
          background: rgba(31, 41, 55, 0.95) !important;
          border: 1px solid #3b82f6 !important;
          border-radius: 6px !important;
          padding: 4px 10px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #ffffff !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }

        .custom-popup .leaflet-popup-content-wrapper {
          background: #1f2937 !important;
          color: #ffffff !important;
          border-radius: 14px !important;
          padding: 18px !important;
          border: 1px solid #374151 !important;
        }

        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
        }

        .custom-popup .leaflet-popup-tip {
          background: #1f2937 !important;
        }

        .custom-popup .leaflet-popup-close-button {
          color: #9ca3af !important;
          font-size: 22px !important;
        }

        .leaflet-container {
          background: #0a0a0a !important;
        }
      `}</style>

      <div ref={mapRef} style={{ width: '100%', height: '100vh' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(31, 41, 55, 0.95)',
            padding: '24px 40px',
            borderRadius: '12px',
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