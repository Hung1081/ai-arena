/**
 * Module quản lý danh sách khoá Gemini dự phòng và xoay vòng gọi API
 */

function layDanhSachKhoaDuPhong() {
  const keys = [];
  
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_API_KEY' && process.env.GEMINI_API_KEY.trim()) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }

  const multiKeys = process.env.GEMINI_BACKUP_KEYS || process.env.GEMINI_API_KEYS || '';
  if (multiKeys) {
    multiKeys.split(',').forEach(k => {
      const clean = k.trim();
      if (clean && clean !== 'YOUR_API_KEY' && !keys.includes(clean)) {
        keys.push(clean);
      }
    });
  }

  return keys;
}

function coKhoaDuPhong() {
  return layDanhSachKhoaDuPhong().length > 0;
}

/**
 * Gọi Gemini API với cơ chế xoay vòng khoá và thử nhiều model dự phòng
 * @param {typeof import('@google/genai').GoogleGenAI} GoogleGenAI
 * @param {string|null} clientApiKey
 * @param {string[]} models
 * @param {any[]} contents
 * @returns {Promise<{text: string, model: string, key: string}>}
 */
async function goiGeminiXoayVongKhoa(GoogleGenAI, clientApiKey, models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'], contents) {
  const cacKhoaThu = [];
  if (clientApiKey && clientApiKey.trim() && clientApiKey.trim() !== 'YOUR_API_KEY') {
    cacKhoaThu.push(clientApiKey.trim());
  }
  for (const k of layDanhSachKhoaDuPhong()) {
    if (!cacKhoaThu.includes(k)) {
      cacKhoaThu.push(k);
    }
  }

  if (cacKhoaThu.length === 0) {
    const err = new Error('Chưa cấu hình khoá Gemini nào!');
    err.maLoi = 'CHUA_CO_KHOA';
    throw err;
  }

  let loiCuoi = null;
  for (const apiKey of cacKhoaThu) {
    const ai = new GoogleGenAI({ apiKey });
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
        });

        let text = response?.text;
        if (!text && response?.candidates?.[0]?.content?.parts) {
          text = response.candidates[0].content.parts
            .map((p) => p.text || '')
            .join('');
        }

        if (text) {
          return { text: text.trim(), model, key: apiKey };
        }
      } catch (err) {
        loiCuoi = err;
        console.warn(`[Gemini Pool] Lỗi model ${model} với khoá ...${apiKey.slice(-4)}:`, err.message);
      }
    }
  }

  throw loiCuoi || new Error('Không thể kết nối đến Gemini qua tất cả các khoá/model dự phòng.');
}

module.exports = {
  layDanhSachKhoaDuPhong,
  coKhoaDuPhong,
  goiGeminiXoayVongKhoa,
};
