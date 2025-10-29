'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import MapPicker (disable SSR)
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center">Loading map...</div>
});

export default function DashboardPage() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStream, setCurrentStream] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rtspUrl: '',
    latitude: -8.6845,
    longitude: 115.2621
  });

  // Coordinate input mode: 'manual', 'search', 'map'
  const [coordinateMode, setCoordinateMode] = useState('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch streams
  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/streams', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();
      const streamsData = data.success && Array.isArray(data.data) ? data.data : data;
      setStreams(Array.isArray(streamsData) ? streamsData : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching streams:', error);
      setLoading(false);
    }
  };

  // Search location using Nominatim (OpenStreetMap)
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}, Bali, Indonesia&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setSearchLoading(false);
    } catch (error) {
      console.error('Search error:', error);
      setSearchLoading(false);
    }
  };

  const selectSearchResult = (result) => {
    setFormData({
      ...formData,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon)
    });
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  // Handle map click
  const handleMapClick = (lat, lng) => {
    setFormData({
      ...formData,
      latitude: lat,
      longitude: lng
    });
  };

  // Open modal
  const openAddModal = () => {
    setEditMode(false);
    setCurrentStream(null);
    setFormData({
      name: '',
      description: '',
      rtspUrl: '',
      latitude: -8.6845,
      longitude: 115.2621
    });
    setCoordinateMode('manual');
    setShowModal(true);
  };

  const openEditModal = (stream) => {
    setEditMode(true);
    setCurrentStream(stream);
    setFormData({
      name: stream.name,
      description: stream.description || '',
      rtspUrl: stream.rtspUrl,
      latitude: stream.latitude,
      longitude: stream.longitude
    });
    setCoordinateMode('manual');
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      return;
    }

    try {
      const url = editMode 
        ? `http://localhost:5000/api/streams/${currentStream.id}`
        : 'http://localhost:5000/api/streams';
      
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(editMode ? 'Stream updated!' : 'Stream created!');
        setShowModal(false);
        fetchStreams();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to save stream');
    }
  };

  // Delete stream
  const handleDelete = async (id) => {
    if (!confirm('Delete this stream?')) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/streams/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Stream deleted!');
        fetchStreams();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete stream');
    }
  };

  // Start/Stop stream
  const toggleStream = async (id, action) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/streams/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert(`Stream ${action}ed!`);
        fetchStreams();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Toggle error:', error);
      alert(`Failed to ${action} stream`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Stream Management</h1>
          <p className="text-gray-400">Manage CCTV livestreams for construction sites</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New Stream
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading streams...</div>
      ) : streams.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-xl mb-2">No streams yet</p>
          <p className="text-sm">Click "Add New Stream" to get started</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Stream</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {streams.map((stream) => (
                <tr key={stream.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{stream.name}</div>
                    <div className="text-sm text-gray-400">{stream.description}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {stream.latitude.toFixed(4)}, {stream.longitude.toFixed(4)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      stream.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {stream.status === 'active' ? '🟢 Active' : '⚫ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {stream.status === 'active' ? (
                      <button
                        onClick={() => toggleStream(stream.id, 'stop')}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm font-medium transition-colors"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleStream(stream.id, 'start')}
                        className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-sm font-medium transition-colors"
                      >
                        Start
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(stream)}
                        className="p-2 hover:bg-gray-700 rounded text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(stream.id)}
                        className="p-2 hover:bg-gray-700 rounded text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {editMode ? 'Edit Stream' : 'Add New Stream'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Stream Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stream Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Zen Luxury Complex"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Brief description of the construction site..."
                />
              </div>

              {/* RTSP URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  RTSP URL *
                </label>
                <input
                  type="text"
                  value={formData.rtspUrl}
                  onChange={(e) => setFormData({...formData, rtspUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
                  required
                />
              </div>

              {/* Coordinate Input Mode Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Location Coordinates *
                </label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setCoordinateMode('manual')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      coordinateMode === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    📝 Manual Input
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoordinateMode('search')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      coordinateMode === 'search'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🔍 Search Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoordinateMode('map')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      coordinateMode === 'map'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🗺️ Pick on Map
                  </button>
                </div>

                {/* Manual Input */}
                {coordinateMode === 'manual' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="-8.6845"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="115.2621"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Search Location */}
                {coordinateMode === 'search' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchLocation())}
                        className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        placeholder="Search location in Bali (e.g., Sanur Beach)"
                      />
                      <button
                        type="button"
                        onClick={searchLocation}
                        disabled={searchLoading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        {searchLoading ? 'Searching...' : 'Search'}
                      </button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="bg-gray-700 rounded-lg border border-gray-600 max-h-60 overflow-y-auto">
                        {searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectSearchResult(result)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-0"
                          >
                            <div className="text-white text-sm">{result.display_name}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              📍 {parseFloat(result.lat).toFixed(5)}, {parseFloat(result.lon).toFixed(5)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Selected Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Selected Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.longitude}
                          onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Map Picker */}
                {coordinateMode === 'map' && (
                  <div className="space-y-3">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
                      💡 Click anywhere on the map to set coordinates
                    </div>
                    <MapPicker 
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onLocationSelect={handleMapClick}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Selected Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.latitude}
                          readOnly
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Selected Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={formData.longitude}
                          readOnly
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {editMode ? 'Update Stream' : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}