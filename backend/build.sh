#!/usr/bin/env bash
# exit on error
set -o errexit

echo "📦 Installing backend dependencies..."
pip install -r requirements.txt

echo "🎨 Collecting static assets..."
python manage.py collectstatic --no-input

echo "🗄️ Running database migrations..."
python manage.py migrate --no-input

echo "🌱 Seeding initial lodging properties..."
python seed_data.py

echo "✅ Build completed successfully!"
