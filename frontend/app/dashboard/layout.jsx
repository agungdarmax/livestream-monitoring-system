'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Get user info from localStorage or decode token
    const username = localStorage.getItem('username') || 'Admin';
    setUser(username);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-white">
                REMARC Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <a 
                  href="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Streams
                </a>
                <a 
                  href="/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Map View
                </a>
              </div>
            </div>

            {/* User & Logout */}
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">
                Welcome, <span className="font-semibold text-white">{user}</span>
              </span>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}