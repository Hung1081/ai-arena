const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenAI } = require('@google/genai');

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

    // 6.2 Lấy Gemini API Key từ client gửi lên hoặc từ biến môi trường .env
    const clientApiKey = req.body.apiKey || req.headers['x-gemini-api-key'];
    let apiKey = (clientApiKey && clientApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey.trim() === '') {
      return res.status(400).json({
        success: false,
        needApiKey: true,
        message: 'Chưa cấu hình GEMINI_API_KEY hợp lệ! Bạn hãy nhập API Key vào ô trên trang web hoặc cập nhật vào file backend/.env để Cô Tư kết nối với trí tuệ nhân tạo Gemini nhé.'
      });
    }

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

    // 6.5 Khởi tạo GoogleGenAI client với @google/genai SDK
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    // 6.6 Gửi yêu cầu sang Gemini API
    // Ưu tiên gemini-1.5-flash theo yêu cầu, có hỗ trợ fallback dự phòng
    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    let aiResponseText = null;
    let successfulModel = '';
    let apiError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Cô Tư Cổ Phục] Đang kết nối mô hình: ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            { text: CO_TU_SYSTEM_INSTRUCTION },
            imagePart,
            { text: textPrompt }
          ]
        });

        if (response && response.text) {
          aiResponseText = response.text;
          successfulModel = modelName;
          break;
        }
      } catch (err) {
        console.warn(`[Cô Tư Cổ Phục] Mô hình ${modelName} gặp sự cố:`, err.message || err);
        apiError = err;
      }
    }

    if (!aiResponseText) {
      throw new Error(apiError ? (apiError.message || String(apiError)) : 'Không nhận được dữ liệu từ Gemini API.');
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
    const apiKey = (clientApiKey && clientApiKey.trim()) || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey.trim() === '') {
      return res.status(400).json({
        success: false,
        needApiKey: true,
        message: 'Chưa cấu hình GEMINI_API_KEY! Bạn hãy dán API Key vào ô Cài Đặt trên web hoặc cập nhật file .env nhé.'
      });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
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

    const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    let aiResponseText = null;

    for (const model of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model: model,
          contents: contents
        });
        if (result && result.text) {
          aiResponseText = result.text;
          break;
        }
      } catch (e) {
        console.warn(`[Chat Model ${model}]:`, e.message);
      }
    }

    if (!aiResponseText) {
      throw new Error('Không thể kết nối với Gemini API lúc này.');
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
    else if (lowerName.includes("bà ba")) garmentId = "ba_ba";
    else if (lowerName.includes("thổ cẩm")) garmentId = "tho_cam";

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

// 7. Route kiểm tra trạng thái sức khỏe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    server: 'Cô Tư Cổ Phục Stylist API',
    nodeVersion: process.version,
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_API_KEY')
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
