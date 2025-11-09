#!/bin/bash

echo "🧹 Cleaning old processes..."
pkill -9 node
sleep 3

echo "🚀 Starting Backend..."
cd ~/livestream-project/backend
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

sleep 10

echo "🚀 Starting Frontend..."
cd ~/livestream-project/frontend
npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Services started!"
echo "   Backend:  http://localhost:5000 (PID: $BACKEND_PID)"
echo "   Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "Stop: pkill -9 node"
