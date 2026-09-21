#!/usr/bin/env bash
# Script khởi động dự án Cổ Phục Stylist (Node.js Express + Gemini API)
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "========================================================="
echo "   🏮 CÔ TƯ CỔ PHỤC - CỐ VẤN Y PHỤC ĐẠI VIỆT AI        "
echo "========================================================="
echo "📂 Thư mục dự án: $PROJECT_DIR"
echo ""

# 1. Kiểm tra Node.js và npm
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Lỗi: Node.js chưa được cài đặt trên máy của bạn!"
    echo "Vui lòng cài đặt Node.js từ https://nodejs.org/ hoặc dùng 'brew install node'"
    exit 1
fi

echo "✅ Đã tìm thấy Node.js: $(node -v) | npm: $(npm -v)"

# 2. Kiểm tra và tạo file .env nếu chưa có
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "📝 Tạo file cấu hình $BACKEND_DIR/.env..."
    echo "GEMINI_API_KEY=YOUR_API_KEY" > "$BACKEND_DIR/.env"
    echo "PORT=3000" >> "$BACKEND_DIR/.env"
fi

# 3. Di chuyển vào thư mục backend và cài đặt dependencies
cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "📦 Đang cài đặt các thư viện Node.js (express, multer, @google/genai, dotenv, cors)..."
    npm install
else
    echo "✅ Dependencies đã sẵn sàng trong backend/node_modules."
fi

echo ""
echo "🚀 Đang khởi động Cô Tư Cổ Phục Server tại: http://localhost:3000 ..."
echo "👉 Mở trình duyệt tại: http://localhost:3000"
echo "========================================================="
echo ""

# Tự động mở trình duyệt sau 1.5 giây nếu trên macOS hoặc Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    (sleep 1.5 && open "http://localhost:3000") &
elif command -v xdg-open >/dev/null 2>&1; then
    (sleep 1.5 && xdg-open "http://localhost:3000") &
fi

# 4. Khởi chạy server
npm start
