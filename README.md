# 👘 Cổ Phục Stylist - Nghệ Nhân Y Phục Truyền Thống Việt Nam

> **Trang Phục Truyền Thống + Hoàn Cảnh + Phong Cách Cá Nhân**  
> Ứng dụng web cố vấn trang phục cổ truyền Việt Nam, tích hợp phòng mix đồ 7 thành phần, bách khoa toàn thư triều đại, mô hình người mẫu chân thực và hiệu ứng chuyển cảnh sơn son thếp vàng đậm đà bản sắc Đại Việt.

---

## ✨ Điểm Nhấn & Tính Năng Nổi Bật

### 1. 👑 Màn Chào Hoàng Gia (Royal Intro Transition)
- Sử dụng bức phù điêu chạm khắc sơn son thếp vàng nguyên bản: **"VIỆT PHỤC CỔ TRUYỀN"** (chạm trổ Long - Phụng - Vân Mây - Hoa Sen).
- Luồng sáng hoàng kim (*Gold Shimmer Sweep*) lướt qua các nét chạm nổi tinh xảo.
- Chuyển cảnh hòa tan mượt mà (*cinematic dissolve*) đưa người dùng bước vào thế giới di sản.

### 2. 🏮 Chuyển Tab Hoàng Triều 0.7 Giây (0.7s Royal Tab Transitions)
Mỗi lần chuyển đổi giữa các chuyên mục trên thanh điều hướng, một tấm biển hiệu thu nhỏ bằng gỗ mun thếp vàng sẽ xuất hiện trong đúng **0.7 giây** với các mỹ từ tương ứng:
- **Tư Vấn**: `蓮` • `【 VẤN ĐẠO Y PHỤC 】` • *Đại Việt Tinh Hoa • Khai Mở Nét Duyên*
- **Mix Đồ**: `錦` • `【 TẠO TÁC Y PHỤC 】` • *7 Thành Phần Phối Ngẫu • Họa Sắc Giai Nhân*
- **Bách Khoa**: `典` • `【 DI SẢN MUÔN NĂM 】` • *6 Dòng Cổ Phục Ngàn Năm Văn Hiến*
- **Gợi Ý**: `靈` • `【 KHÍ CHẤT THANH CAO 】` • *Chuẩn Mực Y Phục Theo Hoàn Cảnh & Vibe*

### 3. 📸 Chế Độ Mẫu Người Thật (Realistic Human Photo Mode)
- Bộ sưu tập ảnh người mẫu thật chất lượng cao với thiết kế **bo góc mềm mại** (`rounded-3xl`) tạo cảm giác thanh nhã, tôn lên trọn vẹn nét đoan trang của cổ phục Việt.
- Tùy chọn chuyển đổi linh hoạt 1-chạm giữa **Ảnh Mẫu Người Thật** và **Mô Hình Tùy Chỉnh Đồ Họa**.

### 4. 🎨 Phòng Mix Đồ Ảo 7 Thành Phần (7-Component Studio)
Phối hợp đồng bộ 7 mảnh ghép tạo hình theo chuẩn mực văn hóa:
1. **Y Phục Chính**: Áo Dài, Áo Ngũ Thân, Áo Nhật Bình, Áo Tứ Thân & Yếm Đào, Áo Bà Ba Nam Bộ, Trang Phục Dân Tộc Thổ Cẩm.
2. **Sắc Màu Ngũ Hành**: Đỏ Son, Vàng Hoàng Kim, Xanh Ngọc Bích, Trắng Bạch Ngọc, Đen Huyền Bí, Hồng Đào, Tím Huế.
3. **Thân Dưới**: Quần lụa trắng, quần lụa đen, váy đụp truyền thống.
4. **Khăn / Nón**: Khăn vành dây dát vàng, khăn đóng / khăn xếp, nón quai thao, nón lá sen, khăn rằn Nam Bộ.
5. **Trang Sức**: Kiềng bạc chạm hoa sen, vòng ngọc cẩm thạch, chuỗi ngọc trai, kiềng vàng hoàng tộc.
6. **Giày / Hài Guốc**: Guốc mộc quai nhung, hài thêu phụng, guốc sơn son mây cổ, dép da thanh lịch.
7. **Túi & Kiểu Tóc**: Túi cói quai tròn, túi mây tre đan, túi thổ cẩm; Tóc búi thấp cài trâm, tóc xõa tự nhiên, tóc tết đuôi sam; Kèm quạt xếp cung đình.

### 5. 📜 Bách Khoa Y Phục & Tinh Hoa Tơ Lụa
- Khám phá cội nguồn lịch sử từ thời Lý, Trần, Lê sơ đến triều Nguyễn.
- Kho tri thức về 5 làng nghề dệt lụa truyền thống: *Lụa Vạn Phúc, Tơ Tằm Hà Đông, Lãnh Mỹ A, Gấm Cung Đình Huế, Thổ Cẩm Tây Bắc*.

---

## 🛠️ Cấu Trúc Dự Án (Repository Structure)

```
co-phuc-stylist/
├── backend/
│   ├── main.py                # FastAPI Server & định tuyến tĩnh
│   ├── stylist_engine.py      # Động cơ tư vấn phối đồ theo công thức Y Phục + Dịp + Vibe
│   ├── parse_pinterest.py     # Module cập nhật ý tưởng cổ phục
│   └── test_app.py            # Bộ kiểm thử tự động toàn diện
├── frontend/
│   ├── index.html             # Giao diện chính (Tailwind CSS + Lucide Icons)
│   ├── assets/
│   │   ├── intro_banner.jpg   # Ảnh phù điêu "VIỆT PHỤC CỔ TRUYỀN" thếp vàng
│   │   └── intro_banner_opt.jpg
│   ├── css/
│   │   └── style.css          # Phong cách sơn mài, bo góc mềm mại & hiệu ứng chuyển cảnh
│   └── js/
│       ├── app.js             # Bộ điều khiển chuyển cảnh, chuyển tab & tương tác
│       ├── visualizer.js      # Bộ vẽ đồ họa hình thể và trang phục
│       └── catalog-data.js    # Cơ sở dữ liệu y phục, phụ kiện & chất liệu lụa
├── requirements.txt           # Thư viện Python phụ thuộc
├── run.sh                     # Script khởi động nhanh 1-chạm
└── README.md                  # Hướng dẫn chi tiết
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### 1. Yêu cầu hệ thống
- Python 3.9 trở lên
- Trình duyệt web hiện đại (Chrome, Safari, Firefox, Edge)

### 2. Cài đặt các thư viện cần thiết
```bash
cd co-phuc-stylist
pip install -r requirements.txt
```

### 3. Khởi chạy ứng dụng
Cách 1: Sử dụng script khởi động nhanh:
```bash
chmod +x run.sh
./run.sh
```

Cách 2: Chạy trực tiếp qua Uvicorn:
```bash
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Truy cập trên trình duyệt tại: 👉 **`http://localhost:8000`**

---

## 📤 Hướng Dẫn Tải Lên GitHub

Thư mục đã được khởi tạo sẵn git. Bạn chỉ cần thực hiện 3 lệnh sau trong Terminal:

```bash
cd ~/Desktop/co-phuc-stylist

# 1. Liên kết với kho chứa trên GitHub của bạn
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# 2. Đặt nhánh chính là main
git branch -M main

# 3. Đẩy toàn bộ mã nguồn lên GitHub
git push -u origin main
```

---

## 📜 Giấy Phép & Bản Quyền
Dự án được xây dựng nhằm tôn vinh và lan tỏa nét đẹp di sản trang phục truyền thống Việt Nam.  
Bản quyền tư liệu lịch sử và hoa văn thuộc về kho tàng văn hóa dân tộc Đại Việt.
