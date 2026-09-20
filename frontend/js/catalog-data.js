/**
 * Vietnamese Traditional Fashion Catalog & Knowledge Data
 * Aligned with the "Khái quát ý tưởng Việt phục" specifications:
 * Formula = Trang Phục Truyền Thống + Hoàn Cảnh/Dịp + Vibe Cá Nhân
 * Enhanced with Realistic Human Model Photography for all attires.
 */

window.STYLIST_CATALOG = {
    garments: [
        {
            id: "ao_dai",
            name: "Áo Dài Việt Nam",
            dynasty: "Cổ điển & Tân thời (Thế kỷ 18 - Nay)",
            type: "Quốc phục biểu tượng",
            origin: "Toàn quốc",
            photo: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80",
            description: "Biểu tượng duyên dáng bất hủ của người Việt. Tà áo dài thướt tha chạm bắp chân, eo chít nhẹ nhàng tôn trọn vẻ đẹp kín đáo và mực thước.",
            details: "Phù hợp từ ngày lễ Tết, cưới hỏi, sân trường thanh xuân đến các sự kiện ngoại giao quốc tế.",
            defaultColor: "#9E1A1A",
            colors: [
                { name: "Đỏ Son May Mắn", hex: "#9E1A1A" },
                { name: "Vàng Hoàng Kim", hex: "#D4AF37" },
                { name: "Trắng Bạch Ngọc", hex: "#FAF6EE" },
                { name: "Xanh Ngọc Bích", hex: "#1A5336" },
                { name: "Hồng Phấn Cánh Đào", hex: "#D94B62" }
            ],
            bottoms: ["pants_white", "pants_colored"],
            headdresses: ["khan_vanh", "khan_dong", "natural"],
            recommendedOccasions: ["Tết", "Cưới hỏi", "Đi học/Sự kiện trường", "Chụp ảnh"]
        },
        {
            id: "ngu_than",
            name: "Áo Ngũ Thân (Tay Chẽn & Áo Tấc)",
            dynasty: "Triều Nguyễn (1802 - 1945)",
            type: "Đại lễ phục & Thường phục chuẩn mực",
            origin: "Định chế thời chúa Nguyễn & vua Minh Mạng",
            photo: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80",
            description: "Y phục chuẩn mực 5 thân 5 cúc tượng trưng cho Tứ thân phụ mẫu và đạo lý Ngũ Thường (Nhân, Lễ, Nghĩa, Trí, Tín). Dáng áo suông che khuyết điểm hoàn hảo.",
            details: "Gồm hai nhánh: Áo Tấc tay thụng dùng trong đại lễ, và Áo Ngũ Thân tay chẽn gọn gàng lịch lãm cho thường nhật.",
            defaultColor: "#1A365D",
            colors: [
                { name: "Xanh Chàm Điềm Tĩnh", hex: "#1A365D" },
                { name: "Vàng Hoàng Thổ", hex: "#B7791F" },
                { name: "Đen Lãnh Mỹ A", hex: "#171923" },
                { name: "Đỏ Đô Trang Nghiêm", hex: "#7B1113" },
                { name: "Xanh Rêu Cổ Mộc", hex: "#234E38" }
            ],
            bottoms: ["pants_white", "pants_colored"],
            headdresses: ["khan_dong", "khan_vanh", "natural"],
            recommendedOccasions: ["Cưới hỏi", "Lễ/Chùa", "Tết", "Hằng ngày"]
        },
        {
            id: "tu_than",
            name: "Áo Tứ Thân & Yếm Đào",
            dynasty: "Dân gian Bắc Bộ (Thời Lê - Nguyễn)",
            type: "Y phục Dân gian & Lễ hội",
            origin: "Đồng bằng sông Hồng (Kinh Bắc)",
            photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
            description: "Nét mộc mạc, tha thướt của người phụ nữ Bắc Bộ. Bốn vạt áo buông lơi, hai vạt trước thắt nút eo để lộ mép yếm đào thắm và dải thắt lưng xanh lụa đào.",
            details: "Gắn liền với hội Lim, câu quan họ và chiếc nón quai thao che nghiêng vành duyên.",
            defaultColor: "#7B341E",
            colors: [
                { name: "Nâu Củ Nâu Đồng Quê", hex: "#7B341E" },
                { name: "Đen The Mộc", hex: "#262626" },
                { name: "Xanh Rêu Rừng Trúc", hex: "#2C4A3E" },
                { name: "Tím Thược Dược", hex: "#6B21A8" }
            ],
            bottoms: ["skirt_black"],
            headdresses: ["non_quai_thao", "khan_mo_qua", "natural"],
            recommendedOccasions: ["Lễ hội truyền thống", "Chụp ảnh", "Tết"]
        },
        {
            id: "nhat_binh",
            name: "Áo Nhật Bình",
            dynasty: "Triều Nguyễn Cung Đình",
            type: "Lễ phục Hoàng tộc & Cô dâu",
            origin: "Kinh đô Huế",
            photo: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
            description: "Thường phục tôn quý của Hoàng hậu, Công chúa và mệnh phụ quý tộc. Cổ áo hình chữ nhật viền thêu rồng phượng và dải ngũ sắc ngũ hành rực rỡ ở tay áo.",
            details: "Trang phục hàng đầu cho cô dâu trong lễ vu quy và các bộ ảnh cổ phong hoàng cung.",
            defaultColor: "#9E1A1A",
            colors: [
                { name: "Đỏ Son Hoàng Cung", hex: "#9E1A1A" },
                { name: "Vàng Hoàng Kim", hex: "#DAA520" },
                { name: "Xanh Ngọc Bích", hex: "#1A5336" },
                { name: "Tím Tía Hoàng Tộc", hex: "#4A154B" }
            ],
            bottoms: ["pants_white", "pants_colored"],
            headdresses: ["khan_vanh", "khan_dong"],
            recommendedOccasions: ["Cưới hỏi", "Chụp ảnh", "Lễ hội truyền thống"]
        },
        {
            id: "ao_ba_ba",
            name: "Áo Bà Ba & Khăn Rằn",
            dynasty: "Nam Bộ (Thế kỷ 19 - Nay)",
            type: "Y phục Dân gian Nam Bộ",
            origin: "Miền Tây sông nước Nam Bộ",
            photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
            description: "Biểu tượng giản dị, phóng khoáng của người con phương Nam. Thân áo ngắn xẻ tà hai bên hông, hai túi vuông phía trước, phối quần lụa đen và khăn rằn vắt vai.",
            details: "Mang lại cảm giác dễ chịu, gần gũi và cực kỳ duyên dáng khi chèo đò hay dạo cảnh sông nước.",
            defaultColor: "#C59B27",
            colors: [
                { name: "Vàng Mỡ Gà", hex: "#C59B27" },
                { name: "Xanh Ngọc Thanh Mát", hex: "#1A5336" },
                { name: "Nâu Đất Phù Sa", hex: "#6B3A19" },
                { name: "Đen Bóng Lãnh Mỹ A", hex: "#171923" },
                { name: "Hồng Sen Dịu Nhẹ", hex: "#D94B62" }
            ],
            bottoms: ["pants_black", "pants_white"],
            headdresses: ["khan_ran", "non_la", "natural"],
            recommendedOccasions: ["Lễ hội truyền thống", "Chụp ảnh", "Hằng ngày"]
        },
        {
            id: "trang_phuc_dan_toc",
            name: "Trang Phục Dân Tộc Thổ Cẩm",
            dynasty: "Bản Sắc Vùng Cao (Tây Bắc & Tây Nguyên)",
            type: "Di sản Văn hóa Dân tộc",
            origin: "Vùng núi phía Bắc (H'Mông, Dao, Thái, Tày)",
            photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
            description: "Tuyệt tác dệt thổ cẩm bằng sợi lanh tự nhiên, nhuộm chàm và thêu tay hoa văn kỷ hà rực rỡ, kết hợp váy xếp ly xòe bồng bềnh và trang sức bạc thủ công.",
            details: "Mang lại vẻ đẹp cá tính, hoang sơ và tràn đầy sức sống của núi rừng đại ngàn.",
            defaultColor: "#9E1A1A",
            colors: [
                { name: "Đỏ Thổ Cẩm Kỷ Hà", hex: "#9E1A1A" },
                { name: "Xanh Chàm Đại Ngàn", hex: "#1A365D" },
                { name: "Xanh Rừng Trúc", hex: "#1A5336" },
                { name: "Đen Lanh Nhuộm Chàm", hex: "#171923" }
            ],
            bottoms: ["skirt_ethnic"],
            headdresses: ["khan_tho_cam", "natural"],
            recommendedOccasions: ["Chụp ảnh", "Lễ hội truyền thống", "Đi học/Sự kiện trường"]
        }
    ],

    occasions: [
        { id: "tet", name: "Tết", icon: "sparkles", desc: "Du xuân chúc Tết, sum vầy gia đình, lễ hội đầu năm" },
        { id: "le_chua", name: "Lễ / Chùa", icon: "heart-handshake", desc: "Viếng cảnh chùa thanh tịnh, thắp hương tổ tiên trang nghiêm" },
        { id: "cuoi_hoi", name: "Cưới hỏi", icon: "gem", desc: "Lễ vu quy, đính hôn, rước dâu, hôn lễ truyền thống" },
        { id: "le_hoi", name: "Lễ hội truyền thống", icon: "flame", desc: "Hội Lim, lễ hội Đền Hùng, chùa Hương, hội làng" },
        { id: "chup_anh", name: "Chụp ảnh", icon: "camera", desc: "Chụp ảnh nghệ thuật di sản tại Cố đô, Phố cổ, thắng cảnh" },
        { id: "truong_hoc", name: "Đi học / Sự kiện trường", icon: "graduation-cap", desc: "Lễ khai giảng, tốt nghiệp, ngày hội văn hóa sinh viên" },
        { id: "hang_ngay", name: "Hằng ngày", icon: "coffee", desc: "Cà phê, dạo phố, phong cách cổ phong ứng dụng đời sống" }
    ],

    vibes: [
        { id: "thanh_lich", name: "Thanh lịch", desc: "Trang nhã, kín đáo, màu sắc hài hòa nền nã" },
        { id: "co_dien", name: "Cổ điển", desc: "Đậm chất hoài niệm, chuẩn mực điển lễ xưa" },
        { id: "toi_gian", name: "Tối giản", desc: "Tinh gọn, phom suông nhẹ nhàng, không rườm rà" },
        { id: "ca_tinh", name: "Cá tính", desc: "Phá cách, layer ấn tượng, họa tiết độc đáo" },
        { id: "nu_tinh", name: "Nữ tính", desc: "Mềm mại, thướt tha, điệu đà duyên dáng" }
    ],

    components: {
        shoes: [
            { id: "guoc_moc", name: "Guốc Mộc Quai Nhung", desc: "Nét duyên mộc mạc của phụ nữ xưa" },
            { id: "hai_theu", name: "Hài Thêu Cung Đình", desc: "Thêu hoa sen, chim phụng tôn quý" },
            { id: "giay_da", name: "Giày Da Oxford / Loafers", desc: "Lịch lãm, hiện đại và chuẩn mực" },
            { id: "dep_coi", name: "Dép Cói Mộc Mạc", desc: "Thanh tịnh, êm nhẹ đôi chân" }
        ],
        bags: [
            { id: "tui_coi", name: "Túi Cói Quai Tròn", desc: "Dân dã, phóng khoáng" },
            { id: "tui_may", name: "Túi Mây Tre Đan", desc: "Vintage hoài niệm thanh nhã" },
            { id: "tui_cuom", name: "Túi Cườm Cung Đình", desc: "Đài các, lấp lánh sang trọng" },
            { id: "tui_tho_cam", name: "Túi Đeo Thổ Cẩm", desc: "Tua rua đa sắc bản địa" },
            { id: "tui_dui_theu", name: "Túi Vải Đũi Thêu Sen", desc: "Mộc mạc, đậm chất thiền" }
        ],
        headdresses: [
            { id: "khan_vanh", name: "Khăn Vành Dây", desc: "Quấn xếp hoàng gia trang trọng" },
            { id: "khan_dong", name: "Khăn Đóng 7 Nếp", desc: "Nếp chữ Nhất nam nữ trí thức" },
            { id: "khan_ran", name: "Khăn Rằn Nam Bộ", desc: "Caro đen trắng/đỏ bình dị" },
            { id: "non_la", name: "Nón Lá Sen Xứ Huế", desc: "Che nghiêng vành nón e lệ" },
            { id: "non_quai_thao", name: "Nón Ba Tầm (Quai Thao)", desc: "Dải tơ hồng buông rủ Kinh Bắc" },
            { id: "khan_mo_qua", name: "Khăn Mỏ Quạ", desc: "Đen tuyền nếp búp sen" },
            { id: "natural", name: "Trâm Cài Tóc / Tự Nhiên", desc: "Thanh thoát, buông lơi bờ vai" }
        ],
        jewelry: [
            { id: "kieng_bac", name: "Kiềng Bạc Chạm Sen", desc: "Biểu tượng thanh tao Kinh Kỳ" },
            { id: "vong_ngoc", name: "Vòng Ngọc Phỉ Thúy", desc: "Bình an, quý phái Á Đông" },
            { id: "chuoi_ngoc_trai", name: "Chuỗi Ngọc Trai", desc: "Đài các, thanh thuần" },
            { id: "xa_tich_bac", name: "Xà Tích Bạc", desc: "Đeo bên hông buông rủ" },
            { id: "kieng_tho_cam", name: "Kiềng Bạc Vùng Cao", desc: "Nhiều tầng chạm khắc thủ công" }
        ],
        hairstyles: [
            { id: "bui_tram", name: "Tóc Búi Cài Trâm", desc: "Đoan trang, mực thước" },
            { id: "xoa_tu_nhien", name: "Tóc Xõa Tự Nhiên", desc: "Thanh xuân, bay bổng" },
            { id: "tet_duoi_sam", name: "Tóc Tết Đuôi Sam", desc: "Ngọt ngào, duyên dáng" }
        ]
    },

    fabrics: [
        {
            name: "Lụa Vạn Phúc (Hà Đông)",
            region: "Hà Nội",
            badge: "Di sản Quốc gia",
            description: "Dệt từ 100% sợi tơ tằm thiên nhiên, hoa văn chìm như vân mây, tứ quý, mùa hè thoáng mát mùa đông giữ ấm.",
            pattern: "Vân mây, Hoa cúc, Song hỷ",
            icon: "sparkles"
        },
        {
            name: "Lãnh Mỹ A (Tân Châu)",
            region: "An Giang",
            badge: "Nữ Hoàng Tơ Lụa",
            description: "Dệt bằng tơ tằm hảo hạng và nhuộm quả Mặc Nưa hơn 100 lần công phu, càng giặt càng đen nhánh óng ả.",
            pattern: "Mặt lụa bóng như sơn mài thượng hạng",
            icon: "gem"
        },
        {
            name: "Gấm Cung Đình (Thái Tuấn & Huế)",
            region: "Huế & Sài Gòn",
            badge: "Vương Giả & Trang Trọng",
            description: "Dệt jacquard ánh kim lộng lẫy, giữ phom áo cực kỳ chuẩn mực uy nghiêm.",
            pattern: "Long Phụng, Hoa Cúc, Chữ Thọ",
            icon: "crown"
        },
        {
            name: "Vải Đũi Tự Nhiên & The",
            region: "Thái Bình & Hà Nội",
            badge: "Mộc Mạc & Thơ Mộng",
            description: "Dệt từ kén tằm thô kéo tay, thoáng mát, mộc mạc thấm đẫm hơi thở đồng quê.",
            pattern: "Nhuộm củ nâu, chàm tự nhiên",
            icon: "feather"
        },
        {
            name: "Vải Lanh Thổ Cẩm Dân Tộc",
            region: "Hà Giang & Sa Pa",
            badge: "Di Sản Sắc Màu Vùng Cao",
            description: "Sợi lanh tự nhiên se sợi dệt thủ công, nhuộm chàm và vẽ sáp ong, thêu hoa văn kỷ hà rực rỡ.",
            pattern: "Mặt trời, Kỷ hà, Đồi núi hoa cỏ",
            icon: "mountain"
        }
    ],

    nguHanhGuide: [
        {
            element: "Kim",
            title: "Mệnh Kim (Thanh Cao & Sáng Ngời)",
            colors: ["#FAF6EE", "#D4AF37", "#E2E8F0", "#C59B27"],
            desc: "Hợp với sắc Trắng ngọc trai, Ánh kim, Vàng đồng. Tương sinh với Thổ (Vàng nghệ, Nâu đất).",
            recommendedOutfit: "Áo Dài trắng ngọc dệt hoa cúc phối kiềng bạc."
        },
        {
            element: "Mộc",
            title: "Mệnh Mộc (Tươi Mát & Uyển Chuyển)",
            colors: ["#1A5336", "#234E38", "#2C7A7B", "#285E61"],
            desc: "Hợp với sắc Xanh ngọc bích, Xanh lục bảo. Tương sinh với Thủy (Xanh thẫm, Đen huyền).",
            recommendedOutfit: "Áo Bà Ba hoặc Áo Ngũ Thân xanh ngọc phối quần lụa đen."
        },
        {
            element: "Thủy",
            title: "Mệnh Thủy (Thâm Trầm & Uy Lực)",
            colors: ["#1A365D", "#171923", "#2A4365", "#0F172A"],
            desc: "Hợp với sắc Xanh chàm đậm, Đen Lãnh Mỹ A. Tương sinh với Kim (Trắng, Bạc).",
            recommendedOutfit: "Áo Ngũ Thân đen bóng phối quần lụa trắng thanh khiết."
        },
        {
            element: "Hỏa",
            title: "Mệnh Hỏa (Rực Rỡ & May Mắn)",
            colors: ["#9E1A1A", "#C53030", "#D94B62", "#E53E3E"],
            desc: "Hợp với sắc Đỏ son hoàng cung, Hồng sen, Cam đất. Tương sinh với Mộc (Xanh ngọc).",
            recommendedOutfit: "Áo Nhật Bình đỏ son đại hỷ hoặc Áo Dài nhung the thắm."
        },
        {
            element: "Thổ",
            title: "Mệnh Thổ (Vững Chãi & Ấm Áp)",
            colors: ["#B7791F", "#C59B27", "#7B341E", "#975A16"],
            desc: "Hợp với sắc Vàng hoàng thổ, Nâu củ nâu. Tương sinh với Hỏa (Đỏ, Cam).",
            recommendedOutfit: "Áo Tứ Thân nâu non yếm thắm hoặc Áo Bà Ba vàng hoa mai."
        }
    ],

    etiquetteRules: [
        {
            title: "Công Thức Tam Hợp Điển Lễ",
            desc: "Mỗi bộ y phục đẹp nhất khi thỏa mãn: Trang phục chuẩn mực + Hoàn cảnh xuất hiện + Phong thái cá nhân. Mặc đúng dịp thể hiện sự tôn trọng không gian văn hóa và người đối diện."
        },
        {
            title: "Đạo Lý 5 Cúc Áo (Ngũ Thường)",
            desc: "Năm cúc áo cài từ cổ xuống sườn phải tượng trưng cho 5 đức tính cốt lõi: Nhân - Lễ - Nghĩa - Trí - Tín. Cài cúc kín đáo, ngay ngắn toát lên khí chất tự tôn của người mặc."
        },
        {
            title: "Tư Thế Cung Thủ & Dáng Đi Khoan Thai",
            desc: "Khi mặc lễ phục tay thụng (Áo Tấc, Nhật Bình), hai tay chắp trước ngực hoặc bụng phủ kín trong tay áo. Bước đi thong thả, lưng thẳng mực thước."
        },
        {
            title: "Hài Hòa Giữa Cổ Truyền & Hiện Đại",
            desc: "Khi diện cổ phục cách tân hay áo bà ba dạo phố, có thể phối cùng túi cói, giày da oxford hoặc kính tròn vintage để vừa giữ hồn xưa vừa năng động hôm nay."
        }
    ]
};
