"""
Vietnamese Traditional Fashion Stylist Engine (Cổ Phục Stylist)
Knowledge base & styling consultation logic for Vietnamese Dynastic & Folk Attires.
Aligned with the "Khái quát ý tưởng Việt phục" specifications:
Formula: Trang Phục Truyền Thống + Hoàn Cảnh/Dịp + Vibe Cá Nhân
"""

import re
from typing import Dict, List, Any, Optional

CATALOG_DATA = {
    "garments": [
        {
            "id": "ao_dai",
            "name": "Áo Dài Việt Nam",
            "dynasty": "Cổ điển & Tân thời (Thế kỷ 18 - Nay)",
            "category": "Quốc phục biểu tượng",
            "description": "Biểu tượng duyên dáng, thanh nhã vượt thời gian của phụ nữ và nam giới Việt Nam. Tà áo thướt tha, tôn trọn cốt cách trang nhã.",
            "features": [
                "Cổ cao thanh thoát (cổ 3 phân hoặc 4 phân)",
                "Tà áo buông rủ ngang bắp chân hoặc chạm gót",
                "Xẻ tà ngang hông bay bổng",
                "Quần lụa ống rộng mềm mại"
            ],
            "recommended_occasions": ["Tết", "Cưới hỏi", "Đi học/Sự kiện trường", "Chụp ảnh", "Lễ/Chùa"],
            "suitable_fabrics": ["Lụa Vạn Phúc (Hà Đông)", "Lụa tơ tằm", "Gấm Thái Tuấn dệt hoa", "Nhung the tuyết"],
            "best_accessories": ["Kiềng bạc chạm sen", "Khăn vấn nhung", "Bó hoa loa kèn / sen", "Guốc mộc / Giày cao gót thanh mảnh"],
            "gender": "Unisex (Nữ chủ đạo & Nam giới)"
        },
        {
            "id": "ngu_than",
            "name": "Áo Ngũ Thân (Tay Chẽn & Áo Tấc)",
            "dynasty": "Triều Nguyễn (1802 - 1945)",
            "category": "Đại lễ phục & Thường phục chuẩn mực",
            "description": "Y phục định chế chuẩn mực của người Việt xưa. 5 thân tượng trưng cho Tứ thân phụ mẫu và bản thân; 5 cúc cài tượng trưng cho Ngũ Thường (Nhân, Lễ, Nghĩa, Trí, Tín).",
            "features": [
                "Phom dáng suông thẳng mực thước, che khuyết điểm cơ thể tuyệt vời",
                "Cổ lập lĩnh đứng đắn đoan trang",
                "Biến thể tay thụng (Áo Tấc) uy nghi và tay chẽn năng động"
            ],
            "recommended_occasions": ["Cưới hỏi", "Lễ/Chùa", "Tết", "Sự kiện trường", "Hằng ngày"],
            "suitable_fabrics": ["Lụa Hà Đông", "Gấm hoa chữ Thọ/Vân Mây", "Lãnh Mỹ A", "Đũi tơ tằm"],
            "best_accessories": ["Khăn đóng đen 7 nếp", "Quạt nan tiêu trúc", "Đồng hồ bỏ túi quả quýt", "Giày da Loafers / Guốc mộc"],
            "gender": "Unisex"
        },
        {
            "id": "tu_than",
            "name": "Áo Tứ Thân & Yếm Đào",
            "dynasty": "Dân gian Bắc Bộ (Thời Lê - Nguyễn)",
            "category": "Y phục Dân gian & Lễ hội",
            "description": "Nét đẹp mộc mạc, tha thướt của người phụ nữ Kinh Bắc. Bốn vạt áo buông rủ, vạt trước thắt nút eo để lộ mép yếm đào thắm và dải thắt lưng xanh duyên dáng.",
            "features": [
                "Áo 4 vạt, hai vạt trước buộc nút mềm mại ngang eo",
                "Yếm đào cổ thắm hoặc yếm cánh sen lụa tơ",
                "Váy đụp lụa đen bồng bềnh e ấp",
                "Dải thắt lưng bao lụa xanh thiên thanh"
            ],
            "recommended_occasions": ["Lễ hội truyền thống", "Chụp ảnh", "Tết", "Sự kiện văn hóa"],
            "suitable_fabrics": ["Vải đũi mộc nhuộm củ nâu", "Lụa sồi", "The tơ mỏng"],
            "best_accessories": ["Nón ba tầm (Nón quai thao)", "Khăn mỏ quạ đen", "Xà tích bạc đeo hông", "Guốc mộc cong"],
            "gender": "Nữ"
        },
        {
            "id": "nhat_binh",
            "name": "Áo Nhật Bình",
            "dynasty": "Triều Nguyễn (1802 - 1945)",
            "category": "Lễ phục Hoàng tộc & Cô dâu",
            "description": "Thường phục tôn quý của Hoàng hậu, Công chúa và mệnh phụ thời Nguyễn. Cổ áo hình chữ nhật viền thêu hoa văn tinh xảo và dải ngũ sắc ngũ hành ở cổ tay áo.",
            "features": [
                "Cổ áo hình chữ nhật đặc trưng thêu họa tiết rồng phượng, hoa cúc",
                "Dải ngũ sắc tượng trưng Ngũ Hành (Kim, Mộc, Thủy, Hỏa, Thổ)",
                "Cài khuy ngọc hoặc cúc vàng ở chính giữa ngực",
                "Mặc khoác ngoài áo lót hoặc áo năm thân"
            ],
            "recommended_occasions": ["Cưới hỏi", "Chụp ảnh", "Lễ hội truyền thống"],
            "suitable_fabrics": ["Gấm tơ tằm dệt nổi", "Sa thêu kim tuyến", "Lụa Vạn Phúc"],
            "best_accessories": ["Khăn vành dây quấn đầu", "Kiềng vàng/bạc chạm sen", "Quạt trầm hương thêu hoa", "Hài thêu phụng"],
            "gender": "Nữ"
        },
        {
            "id": "ao_ba_ba",
            "name": "Áo Bà Ba & Khăn Rằn",
            "dynasty": "Nam Bộ (Thế kỷ 19 - Nay)",
            "category": "Y phục Dân gian Nam Bộ",
            "description": "Trang phục biểu tượng của người con miền Tây sông nước Nam Bộ. Giản dị, phóng khoáng, duyên dáng và tràn đầy sức sống hiền hòa.",
            "features": [
                "Thân áo ngắn ôm nhẹ eo, xẻ tà hai bên hông thuận tiện hoạt động",
                "Cổ áo tròn hoặc cổ tim thanh thoát",
                "Hai túi vuông đặc trưng phía trước vạt áo",
                "Mặc cùng quần lụa đen hoặc trắng ống suông bay bổng"
            ],
            "recommended_occasions": ["Lễ hội truyền thống", "Chụp ảnh", "Hằng ngày", "Du xuân"],
            "suitable_fabrics": ["Lụa tơ tằm Nam Bộ", "Vải gấm mỏng", "Vải ú hoa nhí", "Vải đũi mềm"],
            "best_accessories": ["Khăn rằn Nam Bộ caro đen trắng/đỏ", "Nón lá sen che nghiêng", "Guốc mộc mộc mạc", "Túi cói / mây đan"],
            "gender": "Unisex (Nữ & Nam)"
        },
        {
            "id": "trang_phuc_dan_toc",
            "name": "Trang Phục Dân Tộc Thổ Cẩm",
            "dynasty": "Vùng Cao Tây Bắc & Tây Nguyên",
            "category": "Di sản Văn hóa Đa Sắc Tộc",
            "description": "Bản hòa ca sắc màu của các dân tộc anh em (H'Mông, Dao, Tày, Thái, Chăm). Hoa văn thổ cẩm dệt tay thủ công tinh xảo, phản ánh tình yêu thiên nhiên đất trời.",
            "features": [
                "Họa tiết kỷ hà, mặt trời, chim muông dệt và thêu tay tỉ mỉ",
                "Cổ áo vắt chéo thêu thổ cẩm đa sắc rực rỡ",
                "Váy xếp ly xòe hoa bồng bềnh dập dềnh theo bước chân",
                "Khăn quấn đầu hoặc mũ đính chuông bạc lấp lánh"
            ],
            "recommended_occasions": ["Chụp ảnh", "Lễ hội truyền thống", "Đi học/Sự kiện trường"],
            "suitable_fabrics": ["Vải lanh dệt tay (Lanh H'Mông)", "Thổ cẩm nhuộm chàm tự nhiên", "Lụa Chăm dệt hoa"],
            "best_accessories": ["Vòng kiềng bạc nhiều tầng", "Mũ thổ cẩm đính hạt", "Túi đeo thổ cẩm tua rua", "Xà cạp thêu hoa"],
            "gender": "Unisex"
        }
    ],

    "occasions": [
        {"id": "tet", "name": "Tết", "desc": "Du xuân chúc Tết, sum vầy gia đình, lễ hội đầu năm."},
        {"id": "le_chua", "name": "Lễ / Chùa", "desc": "Viếng cảnh chùa thanh tịnh, thắp hương đền miếu, lễ cúng tổ tiên."},
        {"id": "cuoi_hoi", "name": "Cưới hỏi", "desc": "Lễ đính hôn, vu quy, rước dâu, hôn lễ truyền thống."},
        {"id": "le_hoi", "name": "Lễ hội truyền thống", "desc": "Hội Lim, lễ hội Đền Hùng, chùa Hương, hội đua ghe sông nước."},
        {"id": "chup_anh", "name": "Chụp ảnh", "desc": "Chụp ảnh concept di sản tại Huế, Hội An, Hà Nội 36 phố phường."},
        {"id": "truong_hoc", "name": "Đi học / Sự kiện trường", "desc": "Ngày hội văn hóa truyền thống, lễ tốt nghiệp, kỷ yếu."},
        {"id": "hang_ngay", "name": "Hằng ngày", "desc": "Trang phục cách tân dạo phố, đi làm, cà phê phong cách cổ phong."}
    ],

    "vibes": [
        {"id": "thanh_lich", "name": "Thanh lịch", "desc": "Trang nhã, tôn dáng kín đáo, màu sắc hài hòa nền nã."},
        {"id": "co_dien", "name": "Cổ điển", "desc": "Đậm chất hoài niệm, chuẩn mực điển lễ triều đại xưa."},
        {"id": "toi_gian", "name": "Tối giản", "desc": "Tinh gọn, phom suông thanh thoát, ít chi tiết rườm rà."},
        {"id": "ca_tinh", "name": "Cá tính", "desc": "Phối hợp độc đáo, layer ấn tượng, tạo dấu ấn cá nhân mạnh mẽ."},
        {"id": "nu_tinh", "name": "Nữ tính", "desc": "Mềm mại, thướt tha, hoa văn điệu đà, e ấp duyên dáng."}
    ],

    "components": {
        "shoes": [
            {"id": "guoc_moc", "name": "Guốc mộc truyền thống (quai nhung / da)", "vibe": ["co_dien", "nu_tinh"]},
            {"id": "hai_theu", "name": "Hài thêu cung đình (hoa sen / phụng)", "vibe": ["thanh_lich", "nu_tinh"]},
            {"id": "giay_da", "name": "Giày da Oxford / Loafers vintage", "vibe": ["thanh_lich", "toi_gian", "ca_tinh"]},
            {"id": "dep_coi", "name": "Dép cói mộc mạc", "vibe": ["toi_gian", "co_dien"]}
        ],
        "bags": [
            {"id": "tui_coi", "name": "Túi cói quai tròn mộc mạc"},
            {"id": "tui_may", "name": "Túi mây tre đan vintage"},
            {"id": "tui_cuom", "name": "Túi cườm đính hạt cung đình"},
            {"id": "tui_tho_cam", "name": "Túi đeo thổ cẩm tua rua"},
            {"id": "tui_dui_theu", "name": "Túi vải đũi thêu hoa sen"}
        ],
        "headdresses": [
            {"id": "khan_ran", "name": "Khăn rằn Nam Bộ (vắt vai hoặc quấn đầu)"},
            {"id": "non_la", "name": "Nón lá sen / Nón bài thơ xứ Huế"},
            {"id": "non_quai_thao", "name": "Nón quai thao (Nón ba tầm)"},
            {"id": "khan_mo_qua", "name": "Khăn mỏ quạ đen Kinh Bắc"},
            {"id": "khan_vanh", "name": "Khăn vành dây hoàng gia quấn xếp"},
            {"id": "khan_dong", "name": "Khăn đóng (khăn xếp) đen 7 nếp"}
        ],
        "jewelry": [
            {"id": "kieng_bac", "name": "Kiềng bạc chạm sen Kinh Kỳ"},
            {"id": "vong_ngoc", "name": "Vòng ngọc phỉ thúy / Cẩm thạch"},
            {"id": "chuoi_ngoc_trai", "name": "Chuỗi ngọc trai đài các"},
            {"id": "xa_tich_bac", "name": "Xà tích bạc đeo hông"},
            {"id": "kieng_tho_cam", "name": "Vòng cổ bạc nhiều tầng vùng cao"}
        ],
        "hairstyles": [
            {"id": "bui_tram", "name": "Tóc búi thấp cài trâm ngọc/gỗ"},
            {"id": "xoa_tu_nhien", "name": "Tóc xõa thẳng tự nhiên dịu dàng"},
            {"id": "tet_duoi_sam", "name": "Tóc tết đuôi sam thắt nơ lụa"},
            {"id": "van_khan", "name": "Tóc vấn lụa gọn gàng nếp xưa"}
        ]
    },

    "fabrics": [
        {
            "name": "Lụa Vạn Phúc (Hà Đông)",
            "region": "Hà Nội",
            "characteristic": "Mềm mại óng ả, hoa văn chìm tinh xảo như vân mây, tứ quý.",
            "best_for": "Áo Dài, Áo Ngũ Thân, Yếm lụa"
        },
        {
            "name": "Lãnh Mỹ A (Tân Châu)",
            "region": "An Giang",
            "characteristic": "Huyền thoại lụa đen bóng dệt tơ tằm nhuộm quả Mặc Nưa hơn 100 lần.",
            "best_for": "Áo Ngũ Thân quý phái, Áo Bà Ba cao cấp, Áo Dài dạ tiệc"
        },
        {
            "name": "Gấm Cung Đình (Huế & Thái Tuấn)",
            "region": "Huế & Sài Gòn",
            "characteristic": "Dày dặn, giữ phom cực tốt, ánh kim dệt rồng phượng hoa cúc lộng lẫy.",
            "best_for": "Áo Nhật Bình, Áo Tấc cưới hỏi"
        },
        {
            "name": "Vải Đũi Tự Nhiên & The",
            "region": "Thái Bình & Hà Nội",
            "characteristic": "Kén tằm thô kéo sợi, thoáng khí, mộc mạc thơm mùi đồng quê.",
            "best_for": "Áo Tứ Thân, Áo Bà Ba dân gian"
        },
        {
            "name": "Vải Lanh Thổ Cẩm Vùng Cao",
            "region": "Hà Giang & Sa Pa",
            "characteristic": "Sợi lanh tự nhiên se tay, nhuộm chàm và thêu họa tiết kỷ hà rực rỡ.",
            "best_for": "Trang Phục Dân Tộc Tây Bắc"
        }
    ]
}


class TraditionalStylistEngine:
    """Expert styling consultation engine applying: Formula = Garment + Occasion + Vibe."""

    def __init__(self):
        self.catalog = CATALOG_DATA

    def get_catalog(self) -> Dict[str, Any]:
        return self.catalog

    def generate_styling_consultation(
        self,
        query: str,
        user_gender: Optional[str] = None,
        occasion: Optional[str] = None,
        preferred_vibe: Optional[str] = None,
        preferred_dynasty: Optional[str] = None
    ) -> Dict[str, Any]:
        q_lower = query.lower()

        # Detect Occasion
        occ = occasion or "tet"
        if any(w in q_lower for w in ["cưới", "hôn lễ", "vu quy", "đính hôn", "wedding"]):
            occ = "cuoi_hoi"
        elif any(w in q_lower for w in ["chùa", "đền", "miếu", "lễ chùa", "cúng"]):
            occ = "le_chua"
        elif any(w in q_lower for w in ["hội", "hội lim", "đền hùng", "lễ hội"]):
            occ = "le_hoi"
        elif any(w in q_lower for w in ["chụp ảnh", "photo", "huế", "hội an", "check in"]):
            occ = "chup_anh"
        elif any(w in q_lower for w in ["đi học", "trường", "tốt nghiệp", "kỷ yếu"]):
            occ = "truong_hoc"
        elif any(w in q_lower for w in ["hàng ngày", "đi làm", "cà phê", "dạo phố", "cách tân"]):
            occ = "hang_ngay"

        # Detect Vibe
        vibe = preferred_vibe or "thanh_lich"
        if any(w in q_lower for w in ["cổ điển", "vintage", "hoài niệm", "truyền thống"]):
            vibe = "co_dien"
        elif any(w in q_lower for w in ["tối giản", "minimal", "gọn", "đơn giản"]):
            vibe = "toi_gian"
        elif any(w in q_lower for w in ["cá tính", "phá cách", "ấn tượng", "độc lạ"]):
            vibe = "ca_tinh"
        elif any(w in q_lower for w in ["nữ tính", "dịu dàng", "ngọt ngào", "mềm mại"]):
            vibe = "nu_tinh"

        is_men = user_gender == "nam" or any(w in q_lower for w in ["nam", "đàn ông", "chàng trai", "men", "male", "chú rể"])
        is_ba_ba = any(w in q_lower for w in ["bà ba", "nam bộ", "miền tây", "sông nước"])
        is_ethnic = any(w in q_lower for w in ["dân tộc", "thổ cẩm", "h'mông", "hmong", "tây bắc", "thái", "dao", "chăm"])

        # Determine best look using the spreadsheet formula
        look = self._build_outfit(occ, vibe, is_men, is_ba_ba, is_ethnic, q_lower)

        advice_text = self._compose_consultation(query, look, occ, vibe)

        return {
            "stylist_response": advice_text,
            "look_card": look,
            "formula": {
                "garment": look["garment_name"],
                "occasion": occ,
                "vibe": vibe
            },
            "quick_suggestions": [
                "Phối Áo Bà Ba đi chụp ảnh miền Tây sông nước",
                "Áo Dài trắng thanh lịch cho ngày lễ sự kiện trường",
                "Tạo hình Áo Nhật Bình cổ điển cho nàng dâu ngày cưới",
                "Nam giới mặc Áo Ngũ Thân tối giản đi lễ chùa đầu năm",
                "Trang phục thổ cẩm vùng cao cá tính cho chuyến du lịch Tây Bắc"
            ]
        }

    def _build_outfit(self, occ: str, vibe: str, is_men: bool, is_ba_ba: bool, is_ethnic: bool, q: str) -> Dict[str, Any]:
        # Case 1: Áo Bà Ba
        if is_ba_ba or (occ == "hang_ngay" and vibe in ["toi_gian", "ca_tinh"]):
            return {
                "title": "Duyên Dáng Phương Nam - Áo Bà Ba & Khăn Rằn",
                "dynasty": "Nam Bộ Truyền Thống",
                "garment_name": "Áo Bà Ba Tơ Tằm / Đũi Mềm",
                "garment_id": "ao_ba_ba",
                "vibe": "Thanh lịch & Mộc mạc",
                "palette": ["#C59B27", "#1A5336", "#FAF6EE", "#171923"],
                "palette_names": ["Vàng Hoa Mai", "Xanh Ngọc Bích", "Bạch Lụa", "Đen Huyền Lãnh Mỹ A"],
                "shirt_color": "Vàng mỡ gà hoặc Xanh ngọc thanh mát",
                "bottom": "Quần lụa đen tuyền Lãnh Mỹ A ống suông",
                "shoes": "Guốc mộc quai nhung đen hoặc dép cói mộc",
                "bag": "Túi cói quai tròn hoặc giỏ mây đan",
                "headdress": "Khăn rằn Nam Bộ (vắt vai hờ hững) & Nón lá",
                "jewelry": "Kiềng bạc thanh mảnh hoặc chuỗi hạt ngọc nhỏ",
                "hairstyle": "Tóc búi thấp hoặc tết đuôi sam lệch vai",
                "fabric": "Lụa satin mềm rủ hoặc vải đũi mát mịn",
                "etiquette_tip": "Áo bà ba xẻ tà hai bên hông tạo dáng đi khoan thai. Chiếc khăn rằn vắt chéo qua vai thể hiện sự bình dị, hiếu khách đặc trưng của người Nam Bộ."
            }

        # Case 2: Trang Phục Dân Tộc Thổ Cẩm
        if is_ethnic or (occ in ["chup_anh", "le_hoi"] and vibe == "ca_tinh"):
            return {
                "title": "Sắc Màu Vùng Cao - Y Phục Thổ Cẩm Kỷ Hà",
                "dynasty": "Bản Sắc Dân Tộc Tây Bắc",
                "garment_name": "Áo Thổ Cẩm Thêu Tay & Váy Xếp Ly",
                "garment_id": "trang_phuc_dan_toc",
                "vibe": "Cá tính & Độc bản",
                "palette": ["#9E1A1A", "#1A5336", "#C59B27", "#171923"],
                "palette_names": ["Đỏ Son Thổ Cẩm", "Chàm Thẫm Rừng Xanh", "Vàng Kỷ Hà", "Đen Sợi Lanh"],
                "shirt_color": "Áo chàm phối hoa văn thổ cẩm đỏ son & vàng kim",
                "bottom": "Váy xếp ly thổ cẩm xòe hoa bồng bềnh",
                "shoes": "Hài vải thêu hoa văn thổ cẩm hoặc boots da cá tính",
                "bag": "Túi đeo thổ cẩm đính tua rua sặc sỡ",
                "headdress": "Khăn quấn thổ cẩm hoặc mũ đính hạt chuông bạc",
                "jewelry": "Vòng kiềng bạc nhiều tầng chạm khắc thủ công",
                "hairstyle": "Tóc tết đuôi sam đôi hoặc quấn khăn thổ cẩm",
                "fabric": "Vải lanh H'Mông dệt tay nhuộm chàm tự nhiên",
                "etiquette_tip": "Khi diện trang phục thổ cẩm, các họa tiết hình thoi và mặt trời mang ý nghĩa cầu chúc mùa màng tốt tươi và sự gắn kết con người với đất trời."
            }

        # Case 3: Cưới hỏi
        if occ == "cuoi_hoi":
            if is_men:
                return {
                    "title": "Tân Lang Phong Nhã - Áo Tấc Gấm Xanh Hoàng Triều",
                    "dynasty": "Triều Nguyễn Cung Đình",
                    "garment_name": "Áo Tấc (Ngũ Thân Tay Thụng) Sắc Xanh Chàm / Đỏ Đô",
                    "garment_id": "ngu_than",
                    "vibe": "Cổ điển & Trang nghiêm",
                    "palette": ["#1A365D", "#9E1A1A", "#FAF6EE", "#D4AF37"],
                    "palette_names": ["Xanh Chàm Điềm Đạm", "Đỏ Son Hỷ Sự", "Trắng Tơ Tằm", "Vàng Ánh Kim"],
                    "shirt_color": "Xanh chàm dệt hoa văn chữ Thọ hoặc Đỏ đô đại hỷ",
                    "bottom": "Quần lụa trắng tơ tằm ống rộng chuẩn mực",
                    "shoes": "Giày tây da đen bóng Oxford hoặc hài lụa thêu",
                    "bag": "Không mang túi, cầm quạt xếp trầm hương",
                    "headdress": "Khăn đóng (khăn xếp) đen tuyền 7 nếp",
                    "jewelry": "Đồng hồ bỏ túi cổ điển dây vàng hoặc vòng gỗ trầm",
                    "hairstyle": "Tóc chải vuốt pomade gọn gàng cổ điển",
                    "fabric": "Gấm cung đình dệt jacquard vân mây",
                    "etiquette_tip": "Năm cúc áo cài kín từ cổ qua nách phải tượng trưng cho 5 đức hạnh. Khi bái tạ gia tiên, hai tay chắp trước ngực phủ kín trong ống tay thụng."
                }
            else:
                return {
                    "title": "Tân Nương Vương Giả - Áo Nhật Bình Phụng Bào",
                    "dynasty": "Triều Nguyễn Cung Đình",
                    "garment_name": "Áo Nhật Bình Sắc Đỏ Son / Hoàng Kim",
                    "garment_id": "nhat_binh",
                    "vibe": "Cổ điển & Nữ tính",
                    "palette": ["#9E1A1A", "#D4AF37", "#1A5336", "#FAF6EE"],
                    "palette_names": ["Đỏ Son Đại Hỷ", "Vàng Hoàng Kim", "Xanh Ngọc Bích", "Trắng Bạch Ngọc"],
                    "shirt_color": "Đỏ son thêu hoa cúc và chim loan viền ngũ sắc",
                    "bottom": "Quần lụa trắng tơ tằm thêu viền hoa mai",
                    "shoes": "Hài thêu chim phụng kết ngọc hoặc guốc gỗ sơn son",
                    "bag": "Túi cườm vintage đính hạt cung đình",
                    "headdress": "Khăn vành dây quấn nhung vàng hoàng kim",
                    "jewelry": "Kiềng bạc chạm hoa sen hoặc kiềng vàng chạm rồng phượng",
                    "hairstyle": "Tóc búi cao quấn khăn vành dây trang trọng",
                    "fabric": "Gấm tơ tằm dệt nổi và sa thêu chỉ tơ vàng",
                    "etiquette_tip": "Vạt áo Nhật Bình cài ngay ngắn ở giữa ngực. Nàng dâu bước đi nhẹ nhàng, hai tay khép hờ cầm quạt nghiêng 45 độ đoan trang."
                }

        # Case 4: Lễ / Chùa (Trang nghiêm, tối giản)
        if occ == "le_chua":
            return {
                "title": "Thanh Tịnh Cửa Thiền - Áo Ngũ Thân Mộc Mạc",
                "dynasty": "Triều Nguyễn Tinh Giản",
                "garment_name": "Áo Ngũ Thân Tay Chẽn Sắc Lam Trầm / Nâu Mộc",
                "garment_id": "ngu_than",
                "vibe": "Tối giản & Trang nghiêm",
                "palette": ["#1A5336", "#FAF6EE", "#2D3748", "#C59B27"],
                "palette_names": ["Xanh Lam Cẩm Thạch", "Bạch Lụa Tinh Khôi", "Xám Khói Điềm Tĩnh", "Vàng Đất Ấm"],
                "shirt_color": "Xanh lam chàm hoặc nâu đất mộc mạc",
                "bottom": "Quần lụa trắng hoặc quần âu suông tối màu",
                "shoes": "Dép cói mộc hoặc guốc mộc phẳng êm chân",
                "bag": "Túi vải đũi mộc thêu đóa hoa sen",
                "headdress": "Tóc vấn gọn gàng hoặc khăn đóng đen tinh gọn",
                "jewelry": "Chuỗi tràng hạt gỗ bồ đề 108 hạt hoặc kiềng bạc trơn",
                "hairstyle": "Tóc búi thấp cài trâm gỗ thanh tịnh",
                "fabric": "Vải đũi tự nhiên dệt tay hoặc lụa chũi mềm mại",
                "etiquette_tip": "Nơi tôn nghiêm kỵ màu sắc sặc sỡ và trang sức chói mắt. Áo cài đủ 5 khuy kín cổ, tà áo buông rủ phẳng phiu, bước chân không phát ra tiếng động."
            }

        # Case 5: Đi học / Sự kiện trường
        if occ == "truong_hoc":
            return {
                "title": "Thanh Xuân Giảng Đường - Áo Dài Lụa Trắng Thanh Lịch",
                "dynasty": "Tân Thời & Di Sản Đương Đại",
                "garment_name": "Áo Dài Nữ Sinh / Áo Ngũ Thân Trẻ Trung",
                "garment_id": "ao_dai",
                "vibe": "Thanh lịch & Nữ tính",
                "palette": ["#FAF6EE", "#C59B27", "#1A5336", "#9E1A1A"],
                "palette_names": ["Trắng Ngọc Trai", "Vàng Ánh Nắng", "Xanh Ngọc Bích", "Đỏ Son Điểm Xuyết"],
                "shirt_color": "Trắng tơ tằm dệt vân hoa mai tinh khôi",
                "bottom": "Quần lụa satin trắng ngọc bay bổng",
                "shoes": "Guốc mộc quai da hoặc giày búp bê gót thấp",
                "bag": "Túi mây đan quai da hoặc cặp da vintage",
                "headdress": "Không đội khăn (để tóc tự nhiên cài kẹp ngọc trai)",
                "jewelry": "Vòng tay bạc thanh mảnh hoặc hoa tai nụ ngọc",
                "hairstyle": "Tóc xõa dài tự nhiên buông lơi bờ vai",
                "fabric": "Lụa Vạn Phúc (Hà Đông) dệt hoa cúc chìm",
                "etiquette_tip": "Khi ngồi ghế giảng đường, tay khẽ vuốt hai vạt áo sang một bên đùi để nếp áo không bị nhăn gập. Lưng giữ thẳng mực thước."
            }

        # Case 6: Lễ hội truyền thống (Áo Tứ Thân Kinh Bắc)
        if occ == "le_hoi":
            return {
                "title": "Hội Xuân Liền Chị - Áo Tứ Thân & Yếm Đào Cổ Thắm",
                "dynasty": "Kinh Bắc Cổ Truyền",
                "garment_name": "Áo Tứ Thân Nâu Non Phối Yếm Đào & Nón Ba Tầm",
                "garment_id": "tu_than",
                "vibe": "Cổ điển & Nữ tính",
                "palette": ["#7B341E", "#9E1A1A", "#1A5336", "#171923"],
                "palette_names": ["Nâu Củ Nâu Đồng Quê", "Đỏ Yếm Đào", "Xanh Thắt Lưng Bao", "Đen Váy Đụp"],
                "shirt_color": "Áo khoác tứ thân màu nâu non hoặc the đen",
                "bottom": "Váy đụp lụa đen bồng bềnh e ấp",
                "shoes": "Guốc mộc cong vểnh mũi theo nếp xưa",
                "bag": "Túi cói hoặc khăn tay lụa gấp mép",
                "headdress": "Nón ba tầm (quai thao) dải tơ hồng buông rủ & Khăn mỏ quạ",
                "jewelry": "Xà tích bạc đeo hông và kiềng bạc ôm cổ",
                "hairstyle": "Tóc đuôi gà vấn khăn mỏ quạ e ấp",
                "fabric": "Vải đũi tơ mộc nhuộm thảo mộc tự nhiên",
                "etiquette_tip": "Hai vạt áo trước buộc nút nhẹ ngang eo để lộ mép yếm thắm và dải thắt lưng xanh 'mười phân vẹn mười', gợi nét duyên quan họ ngọt ngào."
            }

        # Case 7: Default Tết / Chụp ảnh di sản
        return {
            "title": "Du Xuân Khởi Sắc - Áo Dài Gấm Hoa & Khăn Vấn",
            "dynasty": "Hà Nội - Huế Giao Hòa",
            "garment_name": "Áo Dài Gấm Thêu Hoa Mai / Áo Ngũ Thân",
            "garment_id": "ao_dai",
            "vibe": vibe.capitalize(),
            "palette": ["#9E1A1A", "#D4AF37", "#1A5336", "#FAF6EE"],
            "palette_names": ["Đỏ Son May Mắn", "Vàng Hoàng Kim", "Xanh Ngọc Bích", "Trắng Tơ Tằm"],
            "shirt_color": "Đỏ son gấm hoa mai hoặc Vàng hoàng yến",
            "bottom": "Quần lụa trắng hoặc quần xanh ngọc tương phản",
            "shoes": "Guốc mộc quai nhung đỏ son hoặc giày mules da",
            "bag": "Túi mây đan tròn hoặc túi cườm cổ điển",
            "headdress": "Khăn vấn nhung đỏ hoặc trâm cài ngọc",
            "jewelry": "Kiềng bạc sáng bóng và vòng ngọc phỉ thúy",
            "hairstyle": "Tóc búi thấp hoặc uốn sóng lọn nhẹ nhàng",
            "fabric": "Gấm tơ tằm dệt nổi hoa cúc hoặc lụa Hà Đông",
            "etiquette_tip": "Mùa Tết sum vầy, sự kết hợp giữa sắc Đỏ Son và Vàng Hoàng Kim mang lại vượng khí cát tường, chụp ảnh bên cành đào mai càng thêm rạng rỡ."
        }

    def _compose_consultation(self, query: str, look: Dict[str, Any], occ: str, vibe: str) -> str:
        occ_names = {"tet": "Du xuân Tết", "le_chua": "Đi Lễ / Viếng Chùa", "cuoi_hoi": "Cưới hỏi hôn lễ", "le_hoi": "Lễ hội truyền thống", "chup_anh": "Chụp ảnh di sản", "truong_hoc": "Sự kiện trường / Giảng đường", "hang_ngay": "Hằng ngày & Dạo phố"}
        vibe_names = {"thanh_lich": "Thanh lịch", "co_dien": "Cổ điển", "toi_gian": "Tối giản", "ca_tinh": "Cá tính", "nu_tinh": "Nữ tính"}

        intro = (
            f"Kính chào quý bạn hữu! Với mong muốn diện y phục cho dịp **{occ_names.get(occ, occ)}** "
            f"theo phong cách **{vibe_names.get(vibe, vibe)}**, tôi xin gợi ý tạo hình chuẩn mực:\n\n"
            f"### 🪷 **{look['title']}**\n"
            f"*Công thức hòa phối: {look['garment_name']} + {occ_names.get(occ, occ)} + Vibe {vibe_names.get(vibe, vibe)}*"
        )

        details = (
            f"\n\n**1. Y Phục & Chất Liệu:**\n"
            f"- **Áo chính:** {look['garment_name']} ({look.get('shirt_color', '')})\n"
            f"- **Quần / Váy:** {look['bottom']}\n"
            f"- **Chất vải khuyên dùng:** {look['fabric']}\n\n"
            f"**2. Phụ Kiện & Giày Túi (Trọn Bộ Phối Đồ):**\n"
            f"- **Giày dép:** {look['shoes']}\n"
            f"- **Túi xách:** {look['bag']}\n"
            f"- **Khăn / Nón:** {look['headdress']}\n"
            f"- **Trang sức:** {look['jewelry']}\n"
            f"- **Kiểu tóc:** {look['hairstyle']}\n\n"
            f"**3. Bảng Màu Ngũ Hành Tranh Dân Gian:**\n"
            f"Hòa sắc giữa " + ", ".join([f"**{c}**" for c in look['palette_names']]) + " tạo cảm giác vừa ấm cúng, sang trọng vừa chuẩn màu tranh cổ truyền Việt Nam.\n\n"
            f"**4. Lời Khuyên Văn Hóa & Điển Lễ:**\n"
            f"> *\"{look['etiquette_tip']}\"*"
        )

        outro = "\n\nBạn hãy sang tab **Phòng Thử Cổ Phục** để tự tay tùy chỉnh 7 nhóm phụ kiện hoặc xuất **Thẻ Phối Đồ** nhé!"
        return intro + details + outro
