#!/bin/bash

echo "🔥 ULTIMATE NUCLEAR FIX - FULL TAILWIND REINSTALL"
echo "=================================================="
echo ""

cd ~/livestream-project/frontend

echo "Step 1: Backup current files..."
cp -r app app.backup.nuclear
cp tailwind.config.js tailwind.config.js.backup.nuclear
cp package.json package.json.backup.nuclear

echo "Step 2: Remove Tailwind completely..."
npm uninstall tailwindcss postcss autoprefixer

echo "Step 3: Reinstall Tailwind (latest version)..."
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest

echo "Step 4: Create proper Tailwind config..."
cat > tailwind.config.js << 'EOFCONFIG'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOFCONFIG

echo "Step 5: Create PostCSS config..."
cat > postcss.config.js << 'EOFPOSTCSS'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOFPOSTCSS

echo "Step 6: Check global CSS..."
if [ -f "app/globals.css" ]; then
  echo "Found app/globals.css - checking content..."
  cat app/globals.css
else
  echo "Creating app/globals.css..."
  cat > app/globals.css << 'EOFCSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
EOFCSS
fi

echo "Step 7: Nuclear clean..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc
rm -rf out
rm -rf public/.next

echo "Step 8: Starting server..."
echo "⏳ This will take a moment..."
echo ""

npm run dev