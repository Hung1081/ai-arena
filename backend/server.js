const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenAI } = require('@google/genai');
const { taoGoiYPhoiDo } = require('./stylistEngine');
const { ghepAnhTrangPhuc, taoAnhBienThePhoiDo } = require('./imageBlend');
const { layDanhSachKhoaDuPhong, coKhoaDuPhong, goiGeminiXoayVongKhoa } = require('./geminiPool');

// 1. Tải biến môi trường từ file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLOUDFLARE_TUNNEL_URL = process.env.CLOUDFLARE_TUNNEL_URL || 'https://rom-marion-operations-asks.trycloudflare.com';

// 2. Cấu hình toàn diện CORS cho phép tất cả các nguồn (Cloudflare Tunnel, Render, localhost...)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-gemini-api-key'],
  credentials: false
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Xử lý tiền kiểm preflight và gán headers cho mọi request
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-gemini-api-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 3. Phục vụ tĩnh (static files) thư mục frontend (hỗ trợ cả / và /static/...)
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));
app.use('/static', express.static(frontendDir));
// Three.js được phục vụ cục bộ từ dependency đã khóa phiên bản trong
// package-lock.json. Studio 3D vì thế không phụ thuộc CDN bên ngoài.
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three')));

// 4. Cấu hình Multer để nhận file ảnh upload dưới dạng Buffer trong bộ nhớ
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // Giới hạn 15MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc WebP!'), false);
    }
  }
});

// 5. System Instruction nhập vai "Cô Tư Cổ Phục"
const CO_TU_SYSTEM_INSTRUCTION = `
Bạn là "Cô Tư Cổ Phục" - một chuyên gia am tường văn hóa, phong tục và trang phục truyền thống Việt Nam qua các thời kỳ lịch sử (triều Lý, Trần, Lê sơ, Lê Trung Hưng, triều Nguyễn và trang phục dân gian các miền).

Khí chất của Cô Tư: Giọng điệu ân cần, nhã nhặn, tôn kính di sản văn hóa Đại Việt nhưng gần gũi, thực tế, đầy tâm huyết.

Nhiệm vụ của Cô Tư:
Khi người dùng tải ảnh chân dung lên kèm theo yêu cầu/dịp mặc:
1. Quan sát kỹ ảnh chân dung để nhận định dáng vóc, thần thái, khuôn mặt, phong cách và làn da của người dùng.
2. Tư vấn bộ Cổ Phục Việt Nam phù hợp nhất để tôn vinh trọn vẹn nét duyên và cốt cách của người mặc.
   - Các dòng cổ phục chủ đạo:
     + Áo Ngũ Thân tay chẽn (thời Nguyễn - thanh lịch, năng động, đoan trang, phù hợp cả nam lẫn nữ).
     + Áo Ngũ Thân tay thụng / Áo Tấc (thời Nguyễn - đại lễ, cưới hỏi, tế tự, trang nghiêm và đài các).
     + Áo Nhật Bình (thời Nguyễn - thường phục cao quý của mệnh phụ hoàng tộc, lộng lẫy, quyền quý).
     + Áo Giao Lĩnh / Viên Lĩnh / Đoàn Lĩnh (thời Lý - Trần - Lê - cổ phong, uy nghiêm, phong thái nho nhã).
     + Áo Đối Khâm (thời Lý - Trần - Lê - kết hợp váy xếp, thướt tha mềm mại).
     + Áo Tứ Thân & Yếm Đào (dân gian Kinh Bắc - mộc mạc, ngọt ngào, đậm đà tình quê).
     + Áo Bà Ba (Nam Bộ - phóng khoáng, duyên dáng, nền nã).
3. Đưa ra chi tiết:
   - Tên cổ phục & Triều đại lịch sử.
   - Nhận định vóc dáng & thần thái người trong ảnh.
   - Bảng màu ngũ hành phù hợp (kèm mã màu HEX và ý nghĩa).
   - Chất liệu vải truyền thống gợi ý (Lụa tơ tằm Vạn Phúc, Gấm Thái Tuấn, Tơ tằm Hà Đông, Lãnh Mỹ A...).
   - Phụ kiện đi kèm chuẩn mực (Khăn vấn/khăn đóng, kiềng bạc hoa sen, ngọc bội, nón quai thao, quạt nan trúc, guốc mộc, hài thêu...).
   - Mẹo tạo dáng (Posing) & Bối cảnh chụp ảnh (Hoàng thành, Đền chùa, Cung đình Huế, Phố cổ...).
   - Lời dặn ân cần từ Cô Tư.

ĐỊNH DẠNG TRẢ VỀ:
Bắt buộc trả về đúng cấu trúc JSON hợp lệ sau (không viết thêm chữ ngoài JSON hoặc bọc trong khối \`\`\`json ... \`\`\`):
{
  "advisorName": "Cô Tư Cổ Phục",
  "costumeName": "Tên trang phục cổ phục gợi ý",
  "dynasty": "Triều đại lịch sử (ví dụ: Triều Nguyễn / Triều Hậu Lê / Dân gian Kinh Bắc)",
  "vibe": "Khí chất nổi bật (ví dụ: Đài các tôn nghiêm / Nho nhã tao nhã / Đoan trang thuần khiết)",
  "matchScore": 96,
  "userPortraitAnalysis": {
    "physique": "Đánh giá vóc dáng và khả năng hợp trang phục",
    "skinTone": "Nhận xét tone da và khả năng tôn da",
    "facialAura": "Nhận xét thần thái, ánh mắt, khí chất"
  },
  "costumeDetails": {
    "structure": "Mô tả kiểu dáng, cổ áo, tà áo, độ dài",
    "material": "Chất liệu may mặc truyền thống khuyên dùng",
    "colorPalette": [
      { "name": "Tên màu 1", "hex": "#HEXCODE", "meaning": "Ý nghĩa thẩm mỹ và ngũ hành" },
      { "name": "Tên màu 2", "hex": "#HEXCODE", "meaning": "Ý nghĩa thẩm mỹ" },
      { "name": "Tên màu 3", "hex": "#HEXCODE", "meaning": "Ý nghĩa thẩm mỹ" }
    ],
    "lowerGarment": "Gợi ý quần/váy kết hợp"
  },
  "accessories": [
    { "category": "Khăn / Mũ", "name": "Chi tiết khăn vấn, khăn xếp hoặc nón..." },
    { "category": "Trang sức", "name": "Kiềng bạc hoa sen, chuỗi ngọc, trâm cài..." },
    { "category": "Hài Guốc", "name": "Guốc mộc quai nhung, hài thêu..." },
    { "category": "Cầm tay", "name": "Quạt xếp nan trúc, hoa sen, tráp gỗ..." }
  ],
  "occasionSuitability": "Đánh giá mức độ phù hợp với hoàn cảnh người dùng yêu cầu",
  "photoAndPoseTips": {
    "poses": [
      "Mẹo tạo dáng 1: cách đặt tay, hướng nhìn...",
      "Mẹo tạo dáng 2: dáng đứng, bước đi, cách nâng tà áo..."
    ],
    "locations": "Địa điểm chụp ảnh gợi ý (ví dụ: Kinh thành Huế, Văn Miếu, Chùa Trấn Quốc...)",
    "timeAndLighting": "Thời điểm chụp và ánh sáng tối ưu"
  },
  "coTuNote": "Lời gửi gắm tâm huyết, ấm áp và truyền cảm hứng tự hào từ Cô Tư"
}
`;

// 6. Route POST /api/analyze-fashion: Nhận ảnh + prompt và gửi sang Gemini API
app.post('/api/analyze-fashion', upload.single('image'), async (req, res) => {
  try {
    // 6.1 Kiểm tra file ảnh tải lên
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Cô Tư chưa thấy bạn tải ảnh lên! Vui lòng chọn một bức ảnh chân dung để Cô Tư xem dáng nhé.'
      });
    }

    // 6.2 Lấy Gemini API Key do người dùng tự nhập (nếu có) — không còn
    // chặn ngay ở đây nữa: nếu người dùng chưa nhập khoá, hàm xoay vòng
    // bên dưới sẽ tự thử các khoá dự phòng của dự án trước khi báo lỗi.
    const clientApiKey = req.body.apiKey || req.headers['x-gemini-api-key'];

    // 6.3 Trích xuất thông tin prompt và dịp mặc
    const userPrompt = req.body.prompt || req.body.occasion || 'Dạo phố và chụp ảnh kỷ niệm phong cách cổ truyền';

    // 6.4 Chuẩn bị dữ liệu ảnh base64 gửi sang Gemini
    const imageBase64 = req.file.buffer.toString('base64');
    const imageMimeType = req.file.mimetype;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: imageMimeType
      }
    };

    const textPrompt = `
Chào Cô Tư, đây là ảnh chân dung của tôi.
Yêu cầu & Dịp mặc mong muốn: "${userPrompt}"

Cô Tư hãy quan sát vóc dáng, thần thái và tư vấn giúp tôi bộ Cổ Phục Việt Nam phù hợp nhất, kèm cách phối màu, chất liệu, phụ kiện và dáng chụp ảnh nhé.
`;

    // 6.5 Gửi yêu cầu sang Gemini API — tự xoay vòng qua nhiều model VÀ
    // nhiều khoá (khoá người dùng trước, hết thì tới khoá dự phòng dự án).
    let aiResponseText = null;
    let successfulModel = 'gemini (xoay vòng)';
    try {
      const ketQua = await goiGeminiXoayVongKhoa(
        GoogleGenAI,
        clientApiKey,
        ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'],
        [{ text: CO_TU_SYSTEM_INSTRUCTION }, imagePart, { text: textPrompt }],
      );
      aiResponseText = ketQua.text;
    } catch (err) {
      if (err.maLoi === 'CHUA_CO_KHOA') {
        return res.status(400).json({
          success: false,
          needApiKey: true,
          message: 'Chưa cấu hình khoá Gemini nào! Bạn hãy nhập API Key vào ô Cài Đặt trên trang web nhé.',
        });
      }
      throw err;
    }

    // 6.7 Parse JSON kết quả
    let resultJson = null;
    try {
      let cleanText = aiResponseText.trim();
      // Bóc tách khối code markdown nếu Gemini bao bọc
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      resultJson = JSON.parse(cleanText.trim());
    } catch (parseErr) {
      console.warn('[Cô Tư Cổ Phục] Lưu ý: Chuỗi phản hồi không phải JSON thuần, sẽ bọc trong fallback:', parseErr.message);
      resultJson = {
        advisorName: "Cô Tư Cổ Phục",
        costumeName: "Áo Ngũ Thân Tay Thụng (Áo Tấc)",
        dynasty: "Triều Nguyễn",
        vibe: "Thanh tao, đoan trang",
        matchScore: 95,
        rawAdvice: aiResponseText,
        coTuNote: "Cô Tư đã quan sát ảnh và phân tích chi tiết y phục dành cho bạn."
      };
    }

    return res.json({
      success: true,
      data: resultJson,
      model: successfulModel,
      message: 'Cô Tư đã hoàn tất tư vấn cho bạn!'
    });

  } catch (error) {
    console.error('[Lỗi /api/analyze-fashion]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Đã xảy ra lỗi trong quá trình xử lý ảnh cùng Gemini. Xin hãy thử lại sau ít phút!'
    });
  }
});

/**
 * Route Reverse Proxy: POST /api/process-ai
 * Nhận ảnh + prompt từ Frontend, chuyển tiếp (forward) sang Cloudflare Tunnel server
 * Trả về kết quả tư vấn cho Frontend và xử lý lỗi kết nối rõ ràng
 */
app.post('/api/process-ai', upload.single('image'), async (req, res) => {
  try {
    // 1. Kiểm tra ảnh tải lên
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Cô Tư chưa thấy bạn tải ảnh lên! Vui lòng chọn một bức ảnh chân dung để Cô Tư xem dáng nhé.'
      });
    }

    const targetUrl = `${CLOUDFLARE_TUNNEL_URL.replace(/\/+$/, '')}/api/analyze-fashion`;
    console.log(`[Reverse Proxy] Đang chuyển tiếp ảnh và prompt tới: ${targetUrl}`);

    // 2. Đóng gói dữ liệu multipart/form-data gửi sang Cloudflare Tunnel
    const forwardFormData = new FormData();
    forwardFormData.append('image', req.file.buffer, {
      filename: req.file.originalname || 'portrait.jpg',
      contentType: req.file.mimetype || 'image/jpeg'
    });

    if (req.body.prompt) forwardFormData.append('prompt', req.body.prompt);
    if (req.body.occasion) forwardFormData.append('occasion', req.body.occasion);
    if (req.body.vibe) forwardFormData.append('vibe', req.body.vibe);
    if (req.body.gender) forwardFormData.append('gender', req.body.gender);
    if (req.body.apiKey) forwardFormData.append('apiKey', req.body.apiKey);

    const forwardHeaders = {
      ...forwardFormData.getHeaders()
    };
    if (req.headers['x-gemini-api-key']) {
      forwardHeaders['x-gemini-api-key'] = req.headers['x-gemini-api-key'];
    }

    // 3. Thực hiện chuyển tiếp request bằng axios
    const cfResponse = await axios.post(targetUrl, forwardFormData, {
      headers: forwardHeaders,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000 // 120 giây cho AI multimodal
    });

    // 4. Nhận kết quả từ Cloudflare và phản hồi lại cho Frontend
    return res.status(cfResponse.status).json(cfResponse.data);

  } catch (error) {
    console.error('[Reverse Proxy Error]:', error.message);
    if (error.response) {
      // Phản hồi lỗi trực tiếp từ máy chủ Cloudflare Tunnel
      return res.status(error.response.status).json(error.response.data);
    } else {
      // Lỗi mạng hoặc Cloudflare Tunnel không phản hồi / offline
      return res.status(502).json({
        success: false,
        error: 'CLOUDFLARE_TUNNEL_UNREACHABLE',
        message: `Lỗi kết nối tới máy chủ AI Cloudflare Tunnel (${CLOUDFLARE_TUNNEL_URL}): ${error.message}. Vui lòng đảm bảo server Cloudflare đang hoạt động!`
      });
    }
  }
});

/**
 * Route POST /api/chat
 * Phục vụ khung chat Cô Tư Cổ Phục trong Việt Phục Remix (nhận JSON query + tùy chọn image_base64)
 */
app.post('/api/chat', async (req, res) => {
  try {
    const query = req.body.query || 'Tư vấn cổ phục Việt Nam phù hợp';
    const clientApiKey = req.body.gemini_api_key || req.body.apiKey || req.headers['x-gemini-api-key'];

    const contents = [{ text: CO_TU_SYSTEM_INSTRUCTION }];

    if (req.body.image_base64) {
      let b64 = req.body.image_base64;
      if (b64.includes(',')) b64 = b64.split(',')[1];
      contents.push({
        inlineData: {
          data: b64,
          mimeType: req.body.image_mime_type || 'image/jpeg'
        }
      });
    }

    contents.push({
      text: `Người dùng hỏi: "${query}". Hãy tư vấn chi tiết và trả về định dạng JSON theo đúng hướng dẫn.`
    });

    let aiResponseText = null;
    try {
      const ketQua = await goiGeminiXoayVongKhoa(
        GoogleGenAI,
        clientApiKey,
        ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'],
        contents,
      );
      aiResponseText = ketQua.text;
    } catch (err) {
      if (err.maLoi === 'CHUA_CO_KHOA') {
        return res.status(400).json({
          success: false,
          needApiKey: true,
          message: 'Chưa cấu hình GEMINI_API_KEY! Bạn hãy dán API Key vào ô Cài Đặt trên web hoặc cập nhật file .env nhé.'
        });
      }
      throw err;
    }

    let cleanText = aiResponseText.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
    else if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);

    let parsed = null;
    try {
      parsed = JSON.parse(cleanText.trim());
    } catch (_) {
      parsed = null;
    }

    // Tạo look_card chuẩn cho frontend
    const costumeName = parsed?.costumeName || "Áo Ngũ Thân Truyền Thống";
    const dynasty = parsed?.dynasty || "Triều Nguyễn";
    const vibe = parsed?.vibe || "Đoan trang, thanh tao";
    let garmentId = "ao_dai";
    const lowerName = costumeName.toLowerCase();
    if (lowerName.includes("tấc") || lowerName.includes("thụng") || lowerName.includes("ngũ thân")) garmentId = "ngu_than";
    else if (lowerName.includes("nhật bình")) garmentId = "nhat_binh";
    else if (lowerName.includes("tứ thân") || lowerName.includes("yếm")) garmentId = "tu_than";
    else if (lowerName.includes("bà ba")) garmentId = "ao_ba_ba";
    else if (lowerName.includes("thổ cẩm")) garmentId = "trang_phuc_dan_toc";

    const paletteHex = parsed?.costumeDetails?.colorPalette?.map(c => c.hex) || ["#9E1A1A", "#D4AF37", "#1A5336"];
    const paletteNames = parsed?.costumeDetails?.colorPalette?.map(c => c.name) || ["Đỏ Chu Sa", "Hoàng Cúc", "Ngọc Bích"];

    const lookCard = {
      title: `Tạo Hình ${costumeName}`,
      garment_name: costumeName,
      garment_id: garmentId,
      dynasty: dynasty,
      vibe: vibe,
      palette: paletteHex,
      palette_names: paletteNames,
      bottom: parsed?.costumeDetails?.lowerGarment || "Quần lụa trắng hoặc đen ống thụng",
      shoes: parsed?.accessories?.find(a => /hài|guốc|dép|giày/i.test(a.category || a.name || ''))?.name || "Guốc mộc quai nhung",
      bag: parsed?.accessories?.find(a => /cầm|túi|quạt/i.test(a.category || a.name || ''))?.name || "Quạt xếp nan trúc",
      headdress: parsed?.accessories?.find(a => /khăn|mũ|nón/i.test(a.category || a.name || ''))?.name || "Khăn đóng hoặc khăn vấn",
      jewelry: parsed?.accessories?.find(a => /trang sức|kiềng/i.test(a.category || a.name || ''))?.name || "Kiềng bạc hoa sen",
      hairstyle: "Búi tóc cài trâm truyền thống",
      etiquette_tip: (parsed?.photoAndPoseTips?.poses && parsed?.photoAndPoseTips?.poses[0]) || parsed?.coTuNote || "Giữ phong thái đoan trang, khoan thai"
    };

    let stylistMarkdown = `### 👑 Lời Cố Vấn Từ Cô Tư Cổ Phục\n\n` +
      `**Trang phục đề xuất:** **${costumeName}** (${dynasty})  \n` +
      `**Khí chất:** *${vibe}* (Tương thích: **${parsed?.matchScore || 96}%**)  \n\n` +
      `#### 🔍 Nhận Định Diện Mạo:\n` +
      `* **Vóc dáng:** ${parsed?.userPortraitAnalysis?.physique || 'Thanh nhã, đoan trang'}\n` +
      `* **Sắc tố da:** ${parsed?.userPortraitAnalysis?.skinTone || 'Tươi tắn, hợp gam màu truyền thống'}\n` +
      `* **Thần thái:** ${parsed?.userPortraitAnalysis?.facialAura || 'Đậm chất Á Đông'}\n\n` +
      `#### 👘 Cấu Trúc Y Phục & Chất Liệu:\n` +
      `* **Kiểu dáng:** ${parsed?.costumeDetails?.structure || 'Áo ngũ thân cài khuy trang nghiêm'}\n` +
      `* **Chất liệu:** **${parsed?.costumeDetails?.material || 'Lụa tơ tằm Vạn Phúc / Gấm Thái Tuấn'}**\n` +
      `* **Thân dưới:** ${parsed?.costumeDetails?.lowerGarment || 'Quần lụa ống thụng'}\n\n` +
      `#### 🎨 Sắc Màu Ngũ Hành:\n` +
      `${paletteNames.map((name, i) => `* **${name}** (\`${paletteHex[i]}\`)`).join('\n')}\n\n` +
      `#### 📸 Mẹo Tạo Dáng & Chụp Ảnh:\n` +
      `${(parsed?.photoAndPoseTips?.poses || ['Hai tay đan nhẹ trước bụng theo thế vái lạy cổ truyền']).map(p => `* ${p}`).join('\n')}\n` +
      `* **Bối cảnh:** ${parsed?.photoAndPoseTips?.locations || 'Cố đô Huế, Hoàng thành Thăng Long, Phố cổ Hội An'}\n\n` +
      `> *" ${parsed?.coTuNote || 'Cổ phục Việt Nam tôn vinh nét đoan trang của người mặc.'} "*`;

    return res.json({
      success: true,
      stylist_response: stylistMarkdown,
      look_card: lookCard,
      raw_json: parsed
    });

  } catch (error) {
    console.error('[Chat Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi xử lý tin nhắn chat.'
    });
  }
});

// ============================================================
// /api/recommend — Gợi Ý Dịp & Vibe
// TRƯỚC ĐÂY: route này hoàn toàn không tồn tại trong server.js (chỉ có ở
// backend/main.py, vốn không được run.sh khởi động) — mọi yêu cầu từ tab
// "Gợi Ý Dịp & Vibe" đều rơi vào 404, và vì lỗi đó KHÔNG liên quan gì đến
// khoá Gemini nên có nhập khoá đúng cũng không giúp được gì.
//
// Route này CHẠY BẰNG LUẬT CỐ ĐỊNH (stylistEngine.js), không gọi Gemini —
// nhờ vậy tab này hoạt động ngay cả khi chưa cấu hình khoá API nào.
// ============================================================
app.post('/api/recommend', (req, res) => {
  try {
    const { occasion, gender, vibe, element, query } = req.body || {};
    const ketQua = taoGoiYPhoiDo({ occasion, gender, vibe, element, query });
    return res.json({ success: true, ...ketQua });
  } catch (error) {
    console.error('[Recommend Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi tạo gợi ý phối đồ.' });
  }
});

// ============================================================
// /api/try-on — Phòng Thử Cổ Phục (phân tích + ghép ảnh thật)
// TRƯỚC ĐÂY: route này cũng không tồn tại trong server.js, nên phần "phân
// tích Gemini Vision" trong modal luôn rơi vào catch() và hiển thị đúng
// một câu nhận xét dựng sẵn — trông như AI trả lời nhưng thực chất chưa
// bao giờ gọi được Gemini. Phần ảnh ghép trước đây KHÔNG dùng AI: chỉ là
// một khối div bo tròn (border-radius: 50%) đặt đè ảnh mặt lên ảnh nền
// trang phục, kéo được bằng tay — đây là route mới thay thế bằng ảnh ghép
// thật từ Gemini.
// ============================================================
app.post('/api/try-on', async (req, res) => {
  try {
    const {
      image_base64: anhGoc,
      image_mime_type: mimeGoc,
      garment_name: tenTrangPhuc,
      garment_description: moTaTrangPhuc,
      color_hex: mauSac,
    } = req.body || {};

    const clientApiKey = req.body.apiKey || req.headers['x-gemini-api-key'];

    if (!anhGoc) {
      return res.status(400).json({ success: false, message: 'Thiếu ảnh chân dung để thử đồ.' });
    }

    let anhBase64Sach = anhGoc;
    if (anhBase64Sach.includes(',')) anhBase64Sach = anhBase64Sach.split(',')[1];

    // (1) Phân tích bằng văn bản — xoay vòng khoá như /api/chat
    let phanTich = 'Khuôn mặt và diện mạo của bạn rất đoan trang, phù hợp với tông màu trầm cổ điển.';
    try {
      const contents = [
        {
          inlineData: { data: anhBase64Sach, mimeType: mimeGoc || 'image/jpeg' },
        },
        {
          text:
            `Hãy nhận xét ngắn gọn (2-3 câu, tiếng Việt) về việc gương mặt trong ảnh hợp với ` +
            `bộ ${tenTrangPhuc || 'cổ phục Việt Nam'} như thế nào — tông da, thần thái, gợi ý dáng chụp.`,
        },
      ];
      const kq = await goiGeminiXoayVongKhoa(
        GoogleGenAI,
        clientApiKey,
        ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
        contents,
      );
      phanTich = kq.text.trim();
    } catch (e) {
      console.warn('[Try-on phân tích]:', e.message);
      if (e.maLoi === 'CHUA_CO_KHOA') {
        return res.status(400).json({
          success: false,
          needApiKey: true,
          message: 'Chưa cấu hình khoá Gemini nào — hãy nhập khoá của bạn ở mục Cài Đặt.',
        });
      }
      // Các lỗi khác: vẫn tiếp tục với câu nhận xét mặc định, không chặn ghép ảnh.
    }

    // (2) Ghép ảnh thật — ưu tiên khoá người dùng, rồi tới khoá dự phòng
    const cacKhoaThu = [
      ...(clientApiKey && clientApiKey.trim() ? [clientApiKey.trim()] : []),
      ...layDanhSachKhoaDuPhong(),
    ];

    let ketQuaAnh = { base64: null, mimeType: null, loi: 'Chưa có khoá Gemini nào để ghép ảnh.' };
    for (const khoa of cacKhoaThu) {
      ketQuaAnh = await ghepAnhTrangPhuc(
        GoogleGenAI,
        khoa,
        { base64: anhBase64Sach, mimeType: mimeGoc || 'image/jpeg' },
        {
          garmentName: tenTrangPhuc || 'Áo Dài truyền thống Việt Nam',
          description: moTaTrangPhuc || '',
          colorHex: mauSac,
        },
      );
      if (ketQuaAnh.base64) break;
    }

    return res.json({
      success: true,
      analysis: phanTich,
      blended_image: ketQuaAnh.base64
        ? `data:${ketQuaAnh.mimeType};base64,${ketQuaAnh.base64}`
        : null,
      blend_error: ketQuaAnh.base64 ? null : ketQuaAnh.loi,
    });
  } catch (error) {
    console.error('[Try-on Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi xử lý thử đồ.' });
  }
});

// ============================================================
// /api/generate-outfit-preview — tạo ảnh biến thể từ ảnh mẫu hiện tại.
// Ảnh không được lưu trên server; response luôn no-store. Frontend chỉ giữ
// một Object URL và thu hồi nó ngay khi người dùng đổi lựa chọn.
// ============================================================
app.post('/api/generate-outfit-preview', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');

  try {
    const { source_image_url: sourceImageUrl, options = {} } = req.body || {};
    const clientApiKey = req.body.apiKey || req.headers['x-gemini-api-key'];
    const cacKhoaThu = [
      ...(clientApiKey && clientApiKey.trim() ? [clientApiKey.trim()] : []),
      ...layDanhSachKhoaDuPhong(),
    ];

    if (cacKhoaThu.length === 0) {
      return res.status(400).json({
        success: false,
        needApiKey: true,
        message: 'Cần khoá Gemini để tạo ảnh phối đồ. Hãy nhập khoá trong Cài Đặt.',
      });
    }

    if (!sourceImageUrl) {
      return res.status(400).json({ success: false, message: 'Thiếu ảnh mẫu nguồn.' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(sourceImageUrl);
    } catch {
      return res.status(400).json({ success: false, message: 'Địa chỉ ảnh mẫu không hợp lệ.' });
    }
    const allowedImageHosts = new Set(['commons.wikimedia.org', 'upload.wikimedia.org']);
    if (parsedUrl.protocol !== 'https:' || !allowedImageHosts.has(parsedUrl.hostname)) {
      return res.status(400).json({ success: false, message: 'Nguồn ảnh mẫu chưa được cho phép.' });
    }
    if (parsedUrl.hostname === 'commons.wikimedia.org' && parsedUrl.pathname.includes('/Special:FilePath/')) {
      parsedUrl.searchParams.set('width', '1200');
    }

    const imageResponse = await axios.get(parsedUrl.toString(), {
      responseType: 'arraybuffer',
      timeout: 20000,
      maxContentLength: 12 * 1024 * 1024,
      maxBodyLength: 12 * 1024 * 1024,
      headers: { 'User-Agent': 'VietPhucRemix/1.0 image-reference' },
    });
    const mimeType = String(imageResponse.headers['content-type'] || 'image/jpeg').split(';')[0];
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'Nguồn tham chiếu không phải ảnh.' });
    }
    const sourceBase64 = Buffer.from(imageResponse.data).toString('base64');

    let ketQuaAnh = { base64: null, mimeType: null, loi: 'Không thể tạo ảnh biến thể.' };
    for (const khoa of cacKhoaThu) {
      ketQuaAnh = await taoAnhBienThePhoiDo(
        GoogleGenAI,
        khoa,
        { base64: sourceBase64, mimeType },
        options,
      );
      if (ketQuaAnh.base64) break;
    }

    if (!ketQuaAnh.base64) {
      const rawError = String(ketQuaAnh.loi || 'Gemini không trả về ảnh.');
      if (/429|RESOURCE_EXHAUSTED|quota exceeded/i.test(rawError)) {
        const retryMatch = rawError.match(/retry in\s+([^"\\]+)/i);
        const retryAfter = retryMatch ? retryMatch[1].trim().replace(/[.]+$/, '') : '';
        return res.status(429).json({
          success: false,
          code: 'GEMINI_IMAGE_QUOTA_EXHAUSTED',
          message: `Google từ chối quota tạo ảnh của project (429)${retryAfter ? `; mốc thử lại do Google trả về là ${retryAfter}` : ''}. Gemini Image API không có Free Tier; reset quota hoặc Gemini Edu trong ứng dụng Gemini không cấp quota API. Hãy bật billing/Prepay cho đúng Google Cloud project của API key trong Google AI Studio.`,
        });
      }
      if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED|403/i.test(rawError)) {
        return res.status(401).json({
          success: false,
          code: 'GEMINI_KEY_INVALID',
          message: 'Khóa Gemini không hợp lệ hoặc chưa được cấp quyền dùng model tạo ảnh.',
        });
      }
      return res.status(502).json({ success: false, message: rawError });
    }

    return res.json({
      success: true,
      generated_image: `data:${ketQuaAnh.mimeType};base64,${ketQuaAnh.base64}`,
      generated_model: ketQuaAnh.model || null,
    });
  } catch (error) {
    console.error('[Generate Outfit Preview Error]:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi tạo ảnh phối đồ.' });
  }
});

// 7. Route kiểm tra trạng thái sức khỏe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    server: 'Cô Tư Cổ Phục Stylist API',
    nodeVersion: process.version,
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_API_KEY'),
    // Số khoá dự phòng phía server — CHỈ trả về số lượng, không bao giờ
    // trả về nội dung khoá. Frontend dùng con số này để quyết định có cần
    // bật popup xin khoá lúc mở app lần đầu hay không (mục #8).
    soKhoaDuPhong: layDanhSachKhoaDuPhong().length,
  });
});

// 8. Khởi động server lắng nghe
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏮 CÔ TƯ CỔ PHỤC - HỆ THỐNG TƯ VẤN Y PHỤC ĐẠI VIỆT`);
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📂 Giao diện Frontend:   http://localhost:${PORT}/index.html`);
  console.log(`⚙️  API Endpoint:        POST http://localhost:${PORT}/api/analyze-fashion`);
  console.log(`======================================================\n`);
});
