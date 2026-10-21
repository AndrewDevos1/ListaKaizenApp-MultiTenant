#!/bin/bash

echo "🚀 Starting Kaizen Lists (Full Stack)..."
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "Docs:     http://localhost:3001/api/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start backend in background
cd apps/api
npm run dev &
BACKEND_PID=$!

# Start frontend in background
cd ../web
npm run dev &
FRONTEND_PID=$!

# Handle Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

# Wait for both to finish
wait
