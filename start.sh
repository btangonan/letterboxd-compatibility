#!/bin/bash

# Letterboxd Compatibility App Startup Script

echo "🎬 Starting Letterboxd Compatibility App..."

# Kill any existing server processes
echo "🔄 Stopping existing server processes..."
pkill -f "node server.js" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Check if port 3000 is free
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port 3000 is still in use. Trying to force kill..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start the server
echo "🚀 Starting server on http://localhost:3000..."
node server.js &

# Store the PID
SERVER_PID=$!
echo "📋 Server started with PID: $SERVER_PID"

# Wait a moment for server to start
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server is running successfully!"
    echo "🌐 Open http://localhost:3000 in your browser"
    echo "📊 Server logs will appear below..."
    echo "🛑 Press Ctrl+C to stop the server"
    echo ""
    
    # Wait for the server process (this keeps the script running)
    wait $SERVER_PID
else
    echo "❌ Failed to start server"
    exit 1
fi