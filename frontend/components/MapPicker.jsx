'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

export default function MapPicker({ latitude, longitude, onLocationSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || typeof window === 'undefined') return;

    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Use OpenStreetMap tiles (better for location search)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add initial marker
    const marker = L.marker([latitude, longitude], {
      draggable: true
    }).addTo(map);

    marker.bindPopup('Drag me or click on map!').openPopup();
    markerRef.current = marker;

    // Handle marker drag
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onLocationSelect(pos.lat, pos.lng);
    });

    // Handle map click
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationSelect(lat, lng);
      marker.bindPopup(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker when coordinates change externally
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude], 13);
      markerRef.current.bindPopup(`📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`).openPopup();
    }
  }, [latitude, longitude]);

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="h-96 rounded-lg border border-gray-600 overflow-hidden"
        style={{ zIndex: 1 }}
      />
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm font-medium z-10">
        📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </div>
    </div>
  );
}