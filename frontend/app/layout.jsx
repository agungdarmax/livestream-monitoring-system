import './globals.css'
import 'leaflet/dist/leaflet.css'

export const metadata = {
  title: 'REMARC - Live Stream Monitoring',
  description: 'Construction site livestream monitoring system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}