'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import InteractiveMap dengan dynamic (disable SSR karena Leaflet butuh window)
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black">
      <div className="text-white text-xl">Loading map...</div>
    </div>
  )
});

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                REMARC Property Group
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Construction Monitoring System
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              <div className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-600/30 text-sm font-medium">
                Active Projects: <span className="font-bold">2</span>
              </div>
              <Link 
                href="/dashboard"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-600/20"
              >
                View Dashboard →
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <main className="pt-20 h-screen">
        <InteractiveMap />
      </main>

      {/* Info Panel */}
      <div className="fixed bottom-6 left-6 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 shadow-2xl max-w-xs z-40">
        <h3 className="font-semibold text-sm mb-2 text-gray-300">
          📍 Interactive Map
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Click on any marker to view live construction monitoring stream from REMARC projects across Bali.
        </p>
      </div>

      {/* Footer Attribution */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-600 z-40">
        Powered by REMARC Technology
      </div>
    </div>
  );
}