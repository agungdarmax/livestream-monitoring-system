'use client';

import { useEffect, useState } from 'react';
import { streamAPI } from '@/lib/api';

export default function Dashboard() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rtspUrl: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await streamAPI.getAll();
      setStreams(response.data.data);
    } catch (error) {
      console.error('Error fetching streams:', error);
      alert('Failed to fetch streams');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStream) {
        await streamAPI.update(editingStream.id, formData);
        alert('Stream updated successfully!');
      } else {
        await streamAPI.create(formData);
        alert('Stream created successfully!');
      }
      setShowModal(false);
      setEditingStream(null);
      setFormData({ name: '', description: '', rtspUrl: '', latitude: '', longitude: '' });
      fetchStreams();
    } catch (error) {
      console.error('Error saving stream:', error);
      alert('Failed to save stream');
    }
  };

  const handleEdit = (stream) => {
    setEditingStream(stream);
    setFormData({
      name: stream.name,
      description: stream.description || '',
      rtspUrl: stream.rtspUrl,
      latitude: stream.latitude.toString(),
      longitude: stream.longitude.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this stream?')) return;
    
    try {
      await streamAPI.delete(id);
      alert('Stream deleted successfully!');
      fetchStreams();
    } catch (error) {
      console.error('Error deleting stream:', error);
      alert('Failed to delete stream');
    }
  };

  const handleStart = async (id) => {
    try {
      await streamAPI.start(id);
      alert('Stream started successfully!');
      fetchStreams();
    } catch (error) {
      console.error('Error starting stream:', error);
      alert('Failed to start stream');
    }
  };

  const handleStop = async (id) => {
    try {
      await streamAPI.stop(id);
      alert('Stream stopped successfully!');
      fetchStreams();
    } catch (error) {
      console.error('Error stopping stream:', error);
      alert('Failed to stop stream');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-remarc-accent"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Stream Management</h1>
          <p className="text-gray-400">Manage your CCTV livestreams</p>
        </div>
        <button
          onClick={() => {
            setEditingStream(null);
            setFormData({ name: '', description: '', rtspUrl: '', latitude: '', longitude: '' });
            setShowModal(true);
          }}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Stream
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Total Streams</p>
          <p className="text-3xl font-bold text-white">{streams.length}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Active</p>
          <p className="text-3xl font-bold text-green-400">
            {streams.filter(s => s.status === 'active').length}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Inactive</p>
          <p className="text-3xl font-bold text-gray-400">
            {streams.filter(s => s.status === 'inactive').length}
          </p>
        </div>
      </div>

      {/* Streams Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Name</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Location</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-remarc-border">
            {streams.map((stream) => (
              <tr key={stream.id} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white font-medium">{stream.name}</p>
                    <p className="text-sm text-gray-400">{stream.description}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-white text-sm">
                    {stream.latitude.toFixed(4)}, {stream.longitude.toFixed(4)}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    stream.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    stream.status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {stream.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {stream.status === 'active' ? (
                      <button
                        onClick={() => handleStop(stream.id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(stream.id)}
                        className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm transition-colors"
                      >
                        Start
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(stream)}
                      className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(stream.id)}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">
                {editingStream ? 'Edit Stream' : 'Add New Stream'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-remarc-accent"
                    placeholder="e.g., Remarc Project Sanur"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-remarc-accent"
                    placeholder="Project description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    RTSP URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rtspUrl}
                    onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-remarc-accent"
                    placeholder="rtsp://username:password@ip:port/stream"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-remarc-accent"
                      placeholder="-8.6845"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-remarc-accent"
                      placeholder="115.2621"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  {editingStream ? 'Update' : 'Create'} Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}