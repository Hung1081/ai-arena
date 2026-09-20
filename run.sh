#!/usr/bin/env bash
# Launcher for Vietnamese Traditional Fashion Stylist Web App
cd "$(dirname "$0")"

echo "========================================================="
echo "   CỔ PHỤC STYLIST - NGHỆ NHÂN Y PHỤC TRUYỀN THỐNG      "
echo "   Vietnamese Heritage Fashion Stylist & Studio         "
echo "========================================================="
echo ""
echo "Starting server at http://127.0.0.1:8000 ..."

# Open browser after a brief delay
(sleep 1.5 && open "http://127.0.0.1:8000") &

# Start Uvicorn
PYTHONPATH=. python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
