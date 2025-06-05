#!/bin/bash

echo "🔄 Restarting development server..."

# Kill any existing Next.js dev server processes
echo "🛑 Stopping existing server processes..."
pkill -f "next dev"
pkill -f "npm run dev"

# Wait a moment for processes to terminate
sleep 2

# Clean and compile the code
echo "🔨 Compiling code..."
echo "📦 Installing dependencies (if needed)..."
npm install --silent

echo "🧹 Cleaning Next.js cache..."
rm -rf .next

echo "⚡ Running build to check for compilation errors..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix compilation errors before starting the server."
    exit 1
fi

echo "✅ Build successful! Starting development server..."

# Start the server in the background
echo "🚀 Starting server in background on port 3002..."
nohup npm run dev -- --port 3002 > server.log 2>&1 &

# Get the process ID
SERVER_PID=$!
echo "✅ Server started with PID: $SERVER_PID"
echo "📋 Server output is being logged to server.log"
echo "🌐 Server should be available at: http://localhost:3002"

# Optional: tail the log for a few seconds to show it's working
echo "📊 Server startup logs:"
sleep 3
tail -n 10 server.log 