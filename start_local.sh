#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================================="
echo "   Starting LocalStay (Malaybalay Lodging Marketplace)  "
echo "   Malaybalay City Digital Lodging Platform             "
echo "========================================================="

# 1. Activate backend virtualenv and run migrations + seeds
source backend/venv/bin/activate
echo "1. Migrating & ensuring Malaybalay seed data is loaded..."
cd backend
python manage.py migrate --noinput
python seed_data.py
cd ..

# 2. Launch Django Backend
BACKEND_PORT="${BACKEND_PORT:-8008}"
echo "2. Launching Django REST API on http://localhost:${BACKEND_PORT}..."
backend/venv/bin/python backend/manage.py runserver 0.0.0.0:${BACKEND_PORT} &
BACKEND_PID=$!

# 3. Launch Frontend Vite Server
echo "3. Launching React Vite Frontend on http://localhost:5173..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================================="
echo "   LocalStay is LIVE!                                   "
echo "   - Marketplace & Guest Portal: http://localhost:5173   "
echo "   - REST API & Django Admin:    http://localhost:${BACKEND_PORT} "
echo "========================================================="
echo "Press Ctrl+C to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit" INT TERM
wait
