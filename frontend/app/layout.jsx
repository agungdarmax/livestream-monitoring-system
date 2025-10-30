import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from 'react-hot-toast'

export const metadata = {
  title: 'REMARC - Live Stream Monitoring',
  description: 'Construction site livestream monitoring system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            // Default options
            duration: 3000,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '0.5rem',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              backdropFilter: 'blur(12px)',
            },
            // Success
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            // Error
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
            // Loading
            loading: {
              duration: Infinity,
            },
          }}
        />
      </body>
    </html>
  )
}