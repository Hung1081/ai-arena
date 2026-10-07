/**
 * Ghép ảnh chân dung thật của người dùng vào trang phục — dùng Gemini thật
 * để sinh ảnh, KHÔNG dùng thủ thuật CSS "cắt tròn khuôn mặt rồi đè lên ảnh
 * nền" như bản cũ (index.html cũ có #tryon-face-overlay-wrapper với
 * border-radius: 50%, kéo thả bằng tay — nhìn giả, không tự nhiên).
 *
 * Model sinh ảnh của Gemini đổi tên khá nhanh theo thời gian; đặt trong
 * biến môi trường để đổi không cần sửa mã, và nên kiểm tra lại tại
 * https://ai.google.dev/gemini-api/docs/models trước khi dùng lâu dài.
 */

const MODEL_ANH_MAC_DINH = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';

function layDanhSachModelAnh() {
  return [...new Set([
    MODEL_ANH_MAC_DINH,
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
  ].filter(Boolean))];
}

async function sinhAnhVoiModelDuPhong(ai, contents) {
  let loiCuoi = null;
  for (const model of layDanhSachModelAnh()) {
    try {
      const result = await ai.models.generateContent({ model, contents });
      const parts = result?.candidates?.[0]?.content?.parts || [];
      const anh = parts.find((part) => part.inlineData && part.inlineData.data);
      if (anh) return { anh, model };
      loiCuoi = new Error(`${model} không trả về ảnh.`);
    } catch (error) {
      loiCuoi = error;
      console.warn(`[Gemini image ${model}]:`, error.message);
    }
  }
  throw loiCuoi || new Error('Không có model Gemini ảnh khả dụng.');
}

/**
 * @param {import('@google/genai').GoogleGenAI} GoogleGenAI
 * @param {string} apiKey - khoá đã chọn sẵn (không xoay vòng ở đây, vì sinh
 *   ảnh tốn quota hơn hẳn — để route gọi hàm này tự quyết định dùng khoá nào)
 * @param {{base64: string, mimeType: string}} anhNguoiDung
 * @param {{garmentName: string, description: string, colorHex?: string}} trangPhuc
 * @returns {Promise<{base64: string|null, mimeType: string|null, loi?: string}>}
 */
async function ghepAnhTrangPhuc(GoogleGenAI, apiKey, anhNguoiDung, trangPhuc) {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const cauLenh = [
      'Bạn là một nhiếp ảnh gia thời trang. Nhiệm vụ: cho người trong ảnh được cấp mặc',
      `bộ ${trangPhuc.garmentName} (${trangPhuc.description}${trangPhuc.colorHex ? `, tông màu ${trangPhuc.colorHex}` : ''}).`,
      '',
      'YÊU CẦU BẮT BUỘC:',
      '- Giữ NGUYÊN khuôn mặt, làn da, kiểu tóc của người trong ảnh gốc — đây là ưu tiên tuyệt đối.',
      '- Trang phục phải ôm theo đúng dáng người, có nếp gấp vải tự nhiên, ánh sáng nhất quán với khuôn mặt gốc.',
      '- KHÔNG cắt ghép hình tròn, KHÔNG dán đè cứng nhắc — đây phải là một bức ảnh liền mạch, tự nhiên như chụp thật.',
      '- Giữ bối cảnh trung tính, làm mờ nhẹ phía sau.',
      '- KHÔNG thêm chữ viết, watermark, hoạ tiết không được nêu.',
    ].join('\n');

    const contents = [
      {
        inlineData: {
          data: anhNguoiDung.base64,
          mimeType: anhNguoiDung.mimeType || 'image/jpeg',
        },
      },
      { text: cauLenh },
    ];

    const { anh, model } = await sinhAnhVoiModelDuPhong(ai, contents);
    return { base64: anh.inlineData.data, mimeType: anh.inlineData.mimeType || 'image/png', model };
  } catch (e) {
    console.error('[Ghép ảnh trang phục]:', e.message);
    return { base64: null, mimeType: null, loi: e.message };
  }
}

/**
 * Tạo một biến thể từ ảnh mẫu hiện có. Khác với try-on, hàm này giữ nguyên
 * người mẫu, góc máy và bối cảnh; Gemini chỉ được phép thay các thành phần
 * mà người dùng chọn trong Phòng Mix Đồ.
 */
async function taoAnhBienThePhoiDo(GoogleGenAI, apiKey, anhMau, tuyChon) {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const moTa = [
      `Y phục chính: ${tuyChon.garmentName || 'Việt phục truyền thống'}`,
      `Màu áo: ${tuyChon.colorName || tuyChon.colorHex || 'giữ nguyên'}`,
      `Quần hoặc váy: ${tuyChon.bottom || 'giữ nguyên'}`,
      `Khăn hoặc nón: ${tuyChon.headdress || 'không có'}`,
      `Trang sức: ${tuyChon.jewelry || 'không có'}`,
      `Giày dép: ${tuyChon.shoes || 'giữ nguyên'}`,
      `Túi hoặc vật cầm tay: ${tuyChon.bag || 'không có'}`,
      `Kiểu tóc: ${tuyChon.hairstyle || 'giữ nguyên'}`,
    ].join('\n');

    const cauLenh = [
      'Hãy chỉnh sửa ảnh thời trang tham chiếu được gửi kèm.',
      'Giữ nguyên tuyệt đối người mẫu, khuôn mặt, vóc dáng, tư thế, góc máy, ánh sáng và bối cảnh của ảnh gốc.',
      'Chỉ thay đổi y phục, màu sắc và phụ kiện theo danh sách dưới đây:',
      moTa,
      '',
      'YÊU CẦU BẮT BUỘC:',
      '- Tạo một ảnh duy nhất, chân thực như ảnh chụp thời trang.',
      '- Màu áo phải đúng lựa chọn; phụ kiện cũ không còn được chọn phải bị xóa sạch.',
      '- Phụ kiện mới phải nằm đúng vị trí cơ thể, không lơ lửng và không xuyên qua tóc hoặc quần áo.',
      '- Giữ cấu trúc văn hóa cơ bản của loại Việt phục được nêu.',
      '- Không thêm chữ, watermark, khung ảnh hoặc người khác.',
    ].join('\n');

    const { anh, model } = await sinhAnhVoiModelDuPhong(ai, [
      { inlineData: { data: anhMau.base64, mimeType: anhMau.mimeType || 'image/jpeg' } },
      { text: cauLenh },
    ]);
    return { base64: anh.inlineData.data, mimeType: anh.inlineData.mimeType || 'image/png', model };
  } catch (error) {
    console.error('[Tạo ảnh phối đồ]:', error.message);
    return { base64: null, mimeType: null, loi: error.message };
  }
}

module.exports = { ghepAnhTrangPhuc, taoAnhBienThePhoiDo };
