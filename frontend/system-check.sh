#!/bin/bash

echo "=== REMARC System Check ==="
echo ""

echo "1. Checking Backend (Port 5000)..."
if curl -s http://localhost:5000 > /dev/null; then
    echo "   ✅ Backend is running"
    curl -s http://localhost:5000 | head -n 1
else
    echo "   ❌ Backend is NOT running"
fi
echo ""

echo "2. Checking Frontend (Port 3000)..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Frontend is running"
else
    echo "   ❌ Frontend is NOT running"
fi
echo ""

echo "3. Checking Ports..."
echo "   Port 5000: $(lsof -ti :5000 | wc -l) process(es)"
echo "   Port 3000: $(lsof -ti :3000 | wc -l) process(es)"
echo ""

echo "4. Checking Node Processes..."
ps aux | grep node | grep -v grep | wc -l
echo "   Active Node processes"
echo ""

echo "5. System Resources..."
echo "   Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "   CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""