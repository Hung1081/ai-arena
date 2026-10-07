/**
 * Stylist Engine (Cố Định Bằng Quy Tắc Di Sản)
 * Chạy cục bộ không cần gọi Gemini, đảm bảo tab "Gợi Ý Dịp & Vibe" luôn hoạt động mượt mà.
 */

function taoGoiYPhoiDo({ occasion = 'tet', gender = 'nu', vibe = 'thanh_lich', element = null, query = '' }) {
  const occ = (occasion || 'tet').toLowerCase();
  const vib = (vibe || 'thanh_lich').toLowerCase();
  const gen = (gender || 'nu').toLowerCase();
  const elm = (element || '').toLowerCase();
  const qLower = (query || '').toLowerCase();

  const isMen = gen === 'nam' || /nam|đàn ông|chú rể|male|men/.test(qLower);
  const isBaBa = elm === 'ao_ba_ba' || /bà ba|nam bộ|miền tây/.test(qLower);
  const isEthnic = elm === 'trang_phuc_dan_toc' || /dân tộc|thổ cẩm|h'mông|tây bắc/.test(qLower);

  let look = null;

  // 1. Áo Bà Ba
  if (isBaBa || elm === 'ao_ba_ba' || (occ === 'hang_ngay' && ['toi_gian', 'ca_tinh'].includes(vib))) {
    look = {
      title: 'Duyên Dáng Phương Nam - Áo Bà Ba & Khăn Rằn',
      dynasty: 'Nam Bộ Truyền Thống',
      garment_name: 'Áo Bà Ba Tơ Tằm / Đũi Mềm',
      garment_id: 'ao_ba_ba',
      vibe: 'Thanh lịch & Mộc mạc',
      palette: ['#C59B27', '#1A5336', '#FAF6EE', '#171923'],
      palette_names: ['Vàng Hoa Mai', 'Xanh Ngọc Bích', 'Bạch Lụa', 'Đen Huyền Lãnh Mỹ A'],
      shirt_color: 'Vàng mỡ gà hoặc Xanh ngọc thanh mát',
      bottom: 'Quần lụa đen tuyền Lãnh Mỹ A ống suông',
      shoes: 'Guốc mộc quai nhung đen hoặc dép cói mộc',
      bag: 'Túi cói quai tròn hoặc giỏ mây đan',
      headdress: 'Khăn rằn Nam Bộ (vắt vai hờ hững) & Nón lá',
      jewelry: 'Kiềng bạc thanh mảnh hoặc chuỗi hạt ngọc nhỏ',
      hairstyle: 'Tóc búi thấp hoặc tết đuôi sam lệch vai',
      fabric: 'Lụa satin mềm rủ hoặc vải đũi mát mịn',
      etiquette_tip: 'Áo bà ba xẻ tà hai bên hông tạo dáng đi khoan thai. Chiếc khăn rằn vắt chéo qua vai thể hiện sự bình dị, hiếu khách đặc trưng của người Nam Bộ.'
    };
  }
  // 2. Thổ Cẩm Dân Tộc
  else if (isEthnic || elm === 'trang_phuc_dan_toc' || (['chup_anh', 'le_hoi'].includes(occ) && vib === 'ca_tinh')) {
    look = {
      title: 'Sắc Màu Vùng Cao - Y Phục Thổ Cẩm Kỷ Hà',
      dynasty: 'Bản Sắc Dân Tộc Tây Bắc',
      garment_name: 'Áo Thổ Cẩm Thêu Tay & Váy Xếp Ly',
      garment_id: 'trang_phuc_dan_toc',
      vibe: 'Cá tính & Độc bản',
      palette: ['#9E1A1A', '#1A5336', '#C59B27', '#171923'],
      palette_names: ['Đỏ Son Thổ Cẩm', 'Chàm Thẫm Rừng Xanh', 'Vàng Kỷ Hà', 'Đen Sợi Lanh'],
      shirt_color: 'Áo chàm phối hoa văn thổ cẩm đỏ son & vàng kim',
      bottom: 'Váy xếp ly thổ cẩm xòe hoa bồng bềnh',
      shoes: 'Hài vải thêu hoa văn thổ cẩm hoặc boots da cá tính',
      bag: 'Túi đeo thổ cẩm đính tua rua sặc sỡ',
      headdress: 'Khăn quấn thổ cẩm hoặc mũ đính hạt chuông bạc',
      jewelry: 'Vòng kiềng bạc nhiều tầng chạm khắc thủ công',
      hairstyle: 'Tóc tết đuôi sam đôi hoặc quấn khăn thổ cẩm',
      fabric: 'Vải lanh dệt tay nhuộm chàm tự nhiên',
      etiquette_tip: 'Khi diện trang phục thổ cẩm, các họa tiết hình thoi và mặt trời mang ý nghĩa cầu chúc mùa màng tốt tươi và sự gắn kết con người với đất trời.'
    };
  }
  // 3. Cưới hỏi
  else if (occ === 'cuoi_hoi') {
    if (isMen) {
      look = {
        title: 'Tân Lang Phong Nhã - Áo Tấc Gấm Xanh Hoàng Triều',
        dynasty: 'Triều Nguyễn Cung Đình',
        garment_name: 'Áo Tấc (Ngũ Thân Tay Thụng) Sắc Xanh Chàm / Đỏ Đô',
        garment_id: 'ngu_than',
        vibe: 'Cổ điển & Trang nghiêm',
        palette: ['#1A365D', '#9E1A1A', '#FAF6EE', '#D4AF37'],
        palette_names: ['Xanh Chàm Điềm Đạm', 'Đỏ Son Hỷ Sự', 'Trắng Tơ Tằm', 'Vàng Ánh Kim'],
        shirt_color: 'Xanh chàm dệt hoa văn chữ Thọ hoặc Đỏ đô đại hỷ',
        bottom: 'Quần lụa trắng tơ tằm ống rộng chuẩn mực',
        shoes: 'Giày tây da đen bóng Oxford hoặc hài lụa thêu',
        bag: 'Không mang túi, cầm quạt xếp trầm hương',
        headdress: 'Khăn đóng (khăn xếp) đen tuyền 7 nếp',
        jewelry: 'Đồng hồ bỏ túi cổ điển dây vàng hoặc vòng gỗ trầm',
        hairstyle: 'Tóc chải vuốt pomade gọn gàng cổ điển',
        fabric: 'Gấm cung đình dệt jacquard vân mây',
        etiquette_tip: 'Năm cúc áo cài kín từ cổ qua nách phải tượng trưng cho 5 đức hạnh. Khi bái tạ gia tiên, hai tay chắp trước ngực phủ kín trong ống tay thụng.'
      };
    } else {
      look = {
        title: 'Tân Nương Vương Giả - Áo Nhật Bình Phụng Bào',
        dynasty: 'Triều Nguyễn Cung Đình',
        garment_name: 'Áo Nhật Bình Sắc Đỏ Son / Hoàng Kim',
        garment_id: 'nhat_binh',
        vibe: 'Cổ điển & Nữ tính',
        palette: ['#9E1A1A', '#D4AF37', '#1A5336', '#FAF6EE'],
        palette_names: ['Đỏ Son Đại Hỷ', 'Vàng Hoàng Kim', 'Xanh Ngọc Bích', 'Trắng Bạch Ngọc'],
        shirt_color: 'Đỏ son thêu hoa cúc và chim loan viền ngũ sắc',
        bottom: 'Quần lụa trắng tơ tằm thêu viền hoa mai',
        shoes: 'Hài thêu chim phụng kết ngọc hoặc guốc gỗ sơn son',
        bag: 'Túi cườm vintage đính hạt cung đình',
        headdress: 'Khăn vành dây quấn nhung vàng hoàng kim',
        jewelry: 'Kiềng bạc chạm hoa sen hoặc kiềng vàng chạm rồng phượng',
        hairstyle: 'Tóc búi cao quấn khăn vành dây trang trọng',
        fabric: 'Gấm tơ tằm dệt nổi và sa thêu chỉ tơ vàng',
        etiquette_tip: 'Vạt áo Nhật Bình cài ngay ngắn ở giữa ngực. Nàng dâu bước đi nhẹ nhàng, hai tay khép hờ cầm quạt nghiêng 45 độ đoan trang.'
      };
    }
  }
  // 4. Lễ / Chùa
  else if (occ === 'le_chua') {
    look = {
      title: 'Thanh Tịnh Cửa Thiền - Áo Ngũ Thân Mộc Mạc',
      dynasty: 'Triều Nguyễn Tinh Giản',
      garment_name: 'Áo Ngũ Thân Tay Chẽn Sắc Lam Trầm / Nâu Mộc',
      garment_id: 'ngu_than',
      vibe: 'Tối giản & Trang nghiêm',
      palette: ['#1A5336', '#FAF6EE', '#2D3748', '#C59B27'],
      palette_names: ['Xanh Lam Cẩm Thạch', 'Bạch Lụa Tinh Khôi', 'Xám Khói Điềm Tĩnh', 'Vàng Đất Ấm'],
      shirt_color: 'Xanh lam chàm hoặc nâu đất mộc mạc',
      bottom: 'Quần lụa trắng hoặc quần âu suông tối màu',
      shoes: 'Dép cói mộc hoặc guốc mộc phẳng êm chân',
      bag: 'Túi vải đũi mộc thêu đóa hoa sen',
      headdress: 'Tóc vấn gọn gàng hoặc khăn đóng đen tinh gọn',
      jewelry: 'Chuỗi tràng hạt gỗ bồ đề 108 hạt hoặc kiềng bạc trơn',
      hairstyle: 'Tóc búi thấp cài trâm gỗ thanh tịnh',
      fabric: 'Vải đũi tự nhiên dệt tay hoặc lụa chũi mềm mại',
      etiquette_tip: 'Nơi tôn nghiêm kỵ màu sắc sặc sỡ và trang sức chói mắt. Áo cài đủ 5 khuy kín cổ, tà áo buông rủ phẳng phiu, bước chân nhẹ nhàng.'
    };
  }
  // 5. Đi học / Sự kiện trường
  else if (occ === 'truong_hoc') {
    look = {
      title: 'Thanh Xuân Giảng Đường - Áo Dài Lụa Trắng Thanh Lịch',
      dynasty: 'Tân Thời & Di Sản Đương Đại',
      garment_name: 'Áo Dài Nữ Sinh / Áo Ngũ Thân Trẻ Trung',
      garment_id: 'ao_dai',
      vibe: 'Thanh lịch & Nữ tính',
      palette: ['#FAF6EE', '#C59B27', '#1A5336', '#9E1A1A'],
      palette_names: ['Trắng Ngọc Trai', 'Vàng Ánh Nắng', 'Xanh Ngọc Bích', 'Đỏ Son Điểm Xuyết'],
      shirt_color: 'Trắng tơ tằm dệt vân hoa mai tinh khôi',
      bottom: 'Quần lụa satin trắng ngọc bay bổng',
      shoes: 'Guốc mộc quai da hoặc giày búp bê gót thấp',
      bag: 'Túi mây đan quai da hoặc cặp da vintage',
      headdress: 'Không đội khăn (để tóc tự nhiên cài kẹp ngọc trai)',
      jewelry: 'Vòng tay bạc thanh mảnh hoặc hoa tai nụ ngọc',
      hairstyle: 'Tóc xõa dài tự nhiên buông lơi bờ vai',
      fabric: 'Lụa Vạn Phúc (Hà Đông) dệt hoa cúc chìm',
      etiquette_tip: 'Khi ngồi ghế giảng đường, tay khẽ vuốt hai vạt áo sang một bên đùi để nếp áo không bị nhăn gập. Lưng giữ thẳng mực thước.'
    };
  }
  // 6. Lễ hội truyền thống (Áo Tứ Thân)
  else if (occ === 'le_hoi' || elm === 'tu_than') {
    look = {
      title: 'Hội Xuân Liền Chị - Áo Tứ Thân & Yếm Đào Cổ Thắm',
      dynasty: 'Kinh Bắc Cổ Truyền',
      garment_name: 'Áo Tứ Thân Nâu Non Phối Yếm Đào & Nón Ba Tầm',
      garment_id: 'tu_than',
      vibe: 'Cổ điển & Nữ tính',
      palette: ['#7B341E', '#9E1A1A', '#1A5336', '#171923'],
      palette_names: ['Nâu Củ Nâu Đồng Quê', 'Đỏ Yếm Đào', 'Xanh Thắt Lưng Bao', 'Đen Váy Đụp'],
      shirt_color: 'Áo khoác tứ thân màu nâu non hoặc the đen',
      bottom: 'Váy đụp lụa đen bồng bềnh e ấp',
      shoes: 'Guốc mộc cong vểnh mũi theo nếp xưa',
      bag: 'Túi cói hoặc khăn tay lụa gấp mép',
      headdress: 'Nón ba tầm (quai thao) dải tơ hồng buông rủ & Khăn mỏ quạ',
      jewelry: 'Xà tích bạc đeo hông và kiềng bạc ôm cổ',
      hairstyle: 'Tóc đuôi gà vấn khăn mỏ quạ e ấp',
      fabric: 'Vải đũi tơ mộc nhuộm thảo mộc tự nhiên',
      etiquette_tip: 'Hai vạt áo trước buộc nút nhẹ ngang eo để lộ mép yếm thắm và dải thắt lưng xanh "mười phân vẹn mười", gợi nét duyên quan họ ngọt ngào.'
    };
  }
  // 7. Mặc định: Du Xuân Tết / Chụp ảnh di sản
  else {
    const isNguThan = elm === 'ngu_than';
    look = {
      title: 'Du Xuân Khởi Sắc - Áo Dài Gấm Hoa & Khăn Vấn',
      dynasty: isNguThan ? 'Triều Nguyễn Cung Đình' : 'Hà Nội - Huế Giao Hòa',
      garment_name: isNguThan ? 'Áo Ngũ Thân Tay Chẽn Quý Phái' : 'Áo Dài Gấm Thêu Hoa Mai',
      garment_id: isNguThan ? 'ngu_than' : 'ao_dai',
      vibe: vib.charAt(0).toUpperCase() + vib.slice(1),
      palette: ['#9E1A1A', '#D4AF37', '#1A5336', '#FAF6EE'],
      palette_names: ['Đỏ Son May Mắn', 'Vàng Hoàng Kim', 'Xanh Ngọc Bích', 'Trắng Tơ Tằm'],
      shirt_color: 'Đỏ son gấm hoa mai hoặc Vàng hoàng yến',
      bottom: 'Quần lụa trắng hoặc quần xanh ngọc tương phản',
      shoes: 'Guốc mộc quai nhung đỏ son hoặc giày mules da',
      bag: 'Túi mây đan tròn hoặc túi cườm cổ điển',
      headdress: 'Khăn vấn nhung đỏ hoặc trâm cài ngọc',
      jewelry: 'Kiềng bạc sáng bóng và vòng ngọc phỉ thúy',
      hairstyle: 'Tóc búi thấp hoặc uốn sóng lọn nhẹ nhàng',
      fabric: 'Gấm tơ tằm dệt nổi hoa cúc hoặc lụa Hà Đông',
      etiquette_tip: 'Mùa Tết sum vầy, sự kết hợp giữa sắc Đỏ Son và Vàng Hoàng Kim mang lại vượng khí cát tường, chụp ảnh bên cành đào mai càng thêm rạng rỡ.'
    };
  }

  // Override garment nếu người dùng chỉ định cụ thể element
  if (elm && elm !== 'auto') {
    look.garment_id = elm;
  }

  return {
    look_card: look,
    formula: {
      garment: look.garment_name,
      occasion: occ,
      vibe: vib
    },
    quick_suggestions: [
      'Phối Áo Bà Ba đi chụp ảnh miền Tây sông nước',
      'Áo Dài trắng thanh lịch cho ngày lễ sự kiện trường',
      'Tạo hình Áo Nhật Bình cổ điển cho nàng dâu ngày cưới',
      'Nam giới mặc Áo Ngũ Thân tối giản đi lễ chùa đầu năm',
      'Trang phục thổ cẩm vùng cao cá tính cho chuyến du lịch Tây Bắc'
    ]
  };
}

module.exports = {
  taoGoiYPhoiDo,
};
