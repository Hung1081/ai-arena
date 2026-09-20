/**
 * High-Fidelity Realistic Human Visualizer for Vietnamese Traditional Costumes & Folk Attires
 * Renders an anatomically accurate, graceful human model with lifelike facial features,
 * realistic skin shading, silk drape physics, and authentic accessories.
 */

class TraditionalVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.viewMode = "interactive"; // "interactive" or "photo"
        this.currentOutfit = {
            garmentId: "ao_dai",
            color: "#9E1A1A",
            secondaryColor: "#D4AF37",
            bottomType: "pants_white",
            headdress: "khan_vanh",
            jewelry: "kieng_bac",
            shoes: "guoc_moc",
            bag: "none",
            hairstyle: "bui_tram",
            hasFan: true
        };

        // Realistic Human Model Photography Gallery (Curated from Cổ Phục Việt Nam Pinterest Collection)
        this.photoModels = {
            ao_dai: {
                title: "Áo Dài Di Sản - Nét Đẹp Hà Thành",
                url: "https://i.pinimg.com/736x/8f/d0/bf/8fd0bfc34076fbe4f07aaed3852e5878.jpg",
                fallbackUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=900&q=85",
                caption: "Nét đoan trang, đài các của thiếu nữ Việt trong tà áo dài tơ tằm cổ điển bên không gian hoài niệm xưa.",
                photographer: "Bộ Sưu Tập Cổ Phục Việt Nam (Pinterest)"
            },
            nhat_binh: {
                title: "Áo Nhật Bình - Cung Đình & Cô Dâu",
                url: "https://i.pinimg.com/736x/92/69/04/92690435400e4c62913af0763f92d07c.jpg",
                fallbackUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=85",
                caption: "Vẻ đẹp vương giả, uy nghi của nàng dâu diện Áo Nhật Bình ngũ sắc và khăn vành dây quấn nếp hoàng gia.",
                photographer: "Bộ Sưu Tập Cổ Phục Việt Nam (Pinterest)"
            },
            ngu_than: {
                title: "Áo Ngũ Thân & Áo Tấc - Khí Chất Mực Thước",
                url: "https://i.pinimg.com/736x/1b/f2/46/1bf246f616e586bc3a91bd12d43dc850.jpg",
                fallbackUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=85",
                caption: "Phong thái điềm đạm, tao nhã của người mặc Áo Ngũ Thân 5 thân 5 cúc cài bên hữu chuẩn điển lễ.",
                photographer: "Bộ Sưu Tập Cổ Phục Việt Nam (Pinterest)"
            },
            tu_than: {
                title: "Áo Tứ Thân & Yếm Đào - Nét Duyên Kinh Bắc",
                url: "https://i.pinimg.com/736x/9d/53/2f/9d532f5ebe6f7bf1b84b7f69553790ba.jpg",
                fallbackUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
                caption: "Nét duyên mộc mạc e ấp của liền chị quan họ bên nón quai thao buông dải thao tơ hồng.",
                photographer: "Bộ Sưu Tập Cổ Phục Việt Nam (Pinterest)"
            },
            ao_ba_ba: {
                title: "Áo Bà Ba - Hồn Quê Sông Nước Phương Nam",
                url: "https://i.pinimg.com/736x/54/5c/ff/545cff5155315a02af0be9c22c112aeb.jpg",
                fallbackUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85",
                caption: "Vẻ đẹp thuần hậu, tươi tắn của tà áo bà ba lụa mềm xẻ tà phối khăn rằn mộc mạc và nón lá nghiêng che.",
                photographer: "Bộ Sưu Tập Cổ Phục Việt Nam (Pinterest)"
            },
            trang_phuc_dan_toc: {
                title: "Thổ Cẩm Vùng Cao - Bản Sắc Đại Ngàn",
                url: "https://i.pinimg.com/736x/94/74/de/9474de5ce232e5fa1b6793493ea365b7.jpg",
                fallbackUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85",
                caption: "Bản hòa ca đa sắc của thổ cẩm dệt lanh thủ công, đính chuông bạc và hoa văn kỷ hà vùng núi phía Bắc.",
                photographer: "Bộ Sưu Tập Cổ Phục Việt Nam (Pinterest)"
            }
        };
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.render();
    }

    updateOutfit(options) {
        this.currentOutfit = { ...this.currentOutfit, ...options };
        this.render();
    }

    render() {
        if (!this.container) return;

        if (this.viewMode === "photo") {
            this.container.innerHTML = this.generatePhotoModelView();
        } else {
            this.container.innerHTML = this.generateRealisticHumanSVG();
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    generatePhotoModelView() {
        const { garmentId } = this.currentOutfit;
        const model = this.photoModels[garmentId] || this.photoModels.ao_dai;

        return `
        <div class="relative w-full h-full flex flex-col items-center justify-between p-2 animate-fadeIn">
            <!-- Mode switch pill in top bar -->
            <div class="absolute top-3 left-3 z-20 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/40 text-xs text-amber-100 shadow-md">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-amber-300"></i>
                <span class="font-medium">Ảnh Mẫu Người Thật (Bo Góc Mềm)</span>
            </div>

            <button onclick="visualizer.setViewMode('interactive')" class="absolute top-3 right-3 z-20 bg-amber-500/90 hover:bg-amber-600 text-stone-900 font-bold px-3 py-1.5 rounded-full text-xs shadow-md transition flex items-center space-x-1">
                <i data-lucide="palette" class="w-3.5 h-3.5"></i>
                <span>Chế Độ Tùy Chỉnh Ảo</span>
            </button>

            <!-- Photo Model with soft rounded corners ("bo góc mềm mại") -->
            <div class="w-full h-full rounded-3xl overflow-hidden shadow-2xl relative border-2 border-amber-300/60 group">
                <img src="${model.url}" data-fallback="${model.fallbackUrl}" onerror="if(this.src!==this.dataset.fallback)this.src=this.dataset.fallback;" alt="${model.title}" class="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105">
                
                <!-- Gentle Gradient Vignette -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-6 text-white space-y-2">
                    <div class="flex items-center space-x-2">
                        <span class="px-2.5 py-0.5 rounded-full bg-red-800/90 text-amber-200 text-[11px] font-semibold uppercase tracking-wider border border-amber-400/40">Người Mẫu Chân Thực</span>
                        <span class="text-xs text-amber-200/90">· ${model.photographer}</span>
                    </div>
                    <h3 class="text-xl font-bold font-imperial text-amber-100">${model.title}</h3>
                    <p class="text-xs text-stone-200 font-serif-vi leading-relaxed line-clamp-2">${model.caption}</p>
                    
                    <div class="pt-1 flex items-center justify-between text-[11px] text-amber-200/80">
                        <span>Chất liệu: Tơ tằm thiên nhiên & Gấm dệt</span>
                        <span class="underline cursor-pointer text-amber-300 hover:text-white" onclick="visualizer.setViewMode('interactive')">Nhấn để đổi màu & phụ kiện ➔</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    generateRealisticHumanSVG() {
        const { garmentId, color, secondaryColor, bottomType, headdress, jewelry, shoes, bag, hairstyle, hasFan } = this.currentOutfit;

        return `
        <div class="relative w-full h-full flex items-center justify-center">
            <!-- Mode Switch Header Button inside stage -->
            <div class="absolute top-2 left-3 z-20 flex items-center space-x-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-400/30 text-xs text-amber-100 shadow-sm">
                <i data-lucide="palette" class="w-3.5 h-3.5 text-amber-300"></i>
                <span class="font-medium">Người Mẫu Đồ Họa Chân Thực</span>
            </div>

            <button onclick="visualizer.setViewMode('photo')" class="absolute top-2 right-3 z-20 bg-red-800/90 hover:bg-red-900 text-amber-100 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition flex items-center space-x-1.5 border border-amber-400/50">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>Xem Ảnh Mẫu Người Thật</span>
            </button>

            <svg viewBox="0 0 400 560" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="heritage-svg-stage select-none">
                <defs>
                    <!-- Realistic Asian Skin Complexion Gradients -->
                    <linearGradient id="skinShading" x1="30%" y1="0%" x2="70%" y2="100%">
                        <stop offset="0%" stop-color="#FFE7D3"/>
                        <stop offset="50%" stop-color="#F7D3B8"/>
                        <stop offset="85%" stop-color="#EEBA96"/>
                        <stop offset="100%" stop-color="#DE9F75"/>
                    </linearGradient>

                    <radialGradient id="cheekBlush" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#E87687" stop-opacity="0.35"/>
                        <stop offset="100%" stop-color="#F7D3B8" stop-opacity="0"/>
                    </radialGradient>

                    <linearGradient id="lipGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#C53030"/>
                        <stop offset="50%" stop-color="#E53E3E"/>
                        <stop offset="100%" stop-color="#9B2C2C"/>
                    </linearGradient>

                    <!-- Glossy Hair Gradient with Highlights -->
                    <linearGradient id="hairSheen" x1="20%" y1="0%" x2="80%" y2="100%">
                        <stop offset="0%" stop-color="#1F1815"/>
                        <stop offset="35%" stop-color="#3D2E28"/>
                        <stop offset="50%" stop-color="#241B18"/>
                        <stop offset="100%" stop-color="#140E0C"/>
                    </linearGradient>

                    <!-- Silk Fabric Physics Sheen -->
                    <linearGradient id="silkSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
                        <stop offset="28%" stop-color="${this.lightenColor(color, 28)}" stop-opacity="1"/>
                        <stop offset="65%" stop-color="${color}" stop-opacity="1"/>
                        <stop offset="100%" stop-color="${this.darkenColor(color, 22)}" stop-opacity="1"/>
                    </linearGradient>

                    <linearGradient id="goldBrocade" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#C59B27"/>
                        <stop offset="50%" stop-color="#F6E05E"/>
                        <stop offset="100%" stop-color="#D4AF37"/>
                    </linearGradient>

                    <linearGradient id="silverSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#D0D7DE"/>
                        <stop offset="50%" stop-color="#FFFFFF"/>
                        <stop offset="100%" stop-color="#9DA7B3"/>
                    </linearGradient>

                    <pattern id="khanRanPattern" width="12" height="12" patternUnits="userSpaceOnUse">
                        <rect width="6" height="6" fill="#171923"/>
                        <rect x="6" width="6" height="6" fill="#FAF6EE"/>
                        <rect y="6" width="6" height="6" fill="#FAF6EE"/>
                        <rect x="6" y="6" width="6" height="6" fill="#171923"/>
                    </pattern>

                    <pattern id="thoCamPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                        <rect width="20" height="20" fill="#1A365D"/>
                        <polygon points="10,2 18,10 10,18 2,10" fill="#9E1A1A"/>
                        <polygon points="10,5 15,10 10,15 5,10" fill="#D4AF37"/>
                        <circle cx="10" cy="10" r="2" fill="#FAF6EE"/>
                    </pattern>

                    <filter id="realisticShadow" x="-10%" y="-10%" width="130%" height="130%">
                        <feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#401E0A" flood-opacity="0.22"/>
                    </filter>
                </defs>

                <!-- Trống Đồng Background Halo -->
                <circle cx="200" cy="235" r="172" fill="#FFF8E7" opacity="0.9"/>
                <circle cx="200" cy="235" r="165" fill="none" stroke="#D4AF37" stroke-width="1.2" stroke-dasharray="8,5" opacity="0.45"/>
                <g transform="translate(200, 235)" opacity="0.2" stroke="#B7791F" stroke-width="1" fill="#D4AF37">
                    ${Array.from({length: 14}).map((_, i) => `
                        <polygon points="0,-40 3,-10 0,0 -3,-10" transform="rotate(${i * (360/14)})"/>
                    `).join("")}
                    <circle cx="0" cy="0" r="12" fill="#B7791F" opacity="0.4"/>
                </g>

                <!-- Floor Shadow -->
                <ellipse cx="200" cy="528" rx="88" ry="11" fill="#4A3423" opacity="0.18"/>

                <!-- 1. Bottoms (Pants / Skirt) -->
                ${this.renderBottoms(garmentId, bottomType)}

                <!-- 2. Footwear (Giày / Guốc) -->
                ${this.renderShoes(shoes)}

                <!-- 3. Inner White / Yếm Layer -->
                ${this.renderInnerLayer(garmentId)}

                <!-- 4. Main Garment Layer with Natural Folds -->
                ${this.renderMainGarment(garmentId, color)}

                <!-- 5. Collar & Button Details -->
                ${this.renderCollarAndDetails(garmentId)}

                <!-- 6. Realistic Human Anatomy (Face, Neck, Collarbones, Features) -->
                ${this.renderRealisticHumanFace(hairstyle)}

                <!-- 7. Headdress / Hat -->
                ${this.renderHeaddress(headdress, color)}

                <!-- 8. Accessories & Graceful Hands -->
                ${this.renderAccessories(jewelry, bag, hasFan, garmentId)}

                <!-- Red Traditional Seal -->
                <g transform="translate(322, 475) scale(0.75)" opacity="0.88">
                    <rect x="0" y="0" width="60" height="60" rx="10" fill="#9E1A1A" stroke="#D4AF37" stroke-width="2"/>
                    <text x="30" y="24" text-anchor="middle" font-size="12" fill="#FAF6EE" font-family="'Noto Serif', serif" font-weight="bold">VIỆT</text>
                    <text x="30" y="44" text-anchor="middle" font-size="12" fill="#FAF6EE" font-family="'Noto Serif', serif" font-weight="bold">PHỤC</text>
                </g>
            </svg>
        </div>
        `;
    }

    renderRealisticHumanFace(hairstyle) {
        return `
        <!-- Natural Human Neck & Clavicle Shading -->
        <path d="M188 118 C188 135 186 150 178 160 L222 160 C214 150 212 135 212 118 Z" fill="url(#skinShading)"/>
        
        <!-- Soft shadow beneath chin -->
        <ellipse cx="200" cy="132" rx="16" ry="6" fill="#C98F6B" opacity="0.3"/>
        
        <!-- Clavicle / Collarbone subtle indentations -->
        <path d="M184 156 Q195 159 200 156 Q205 159 216 156" stroke="#C98F6B" stroke-width="1.2" fill="none" opacity="0.4"/>

        <!-- Hair Behind Shoulders if Loose -->
        ${hairstyle === "xoa_tu_nhien" ? `
            <path d="M174 110 C162 150 156 210 160 260 L174 260 C170 200 176 150 182 120 Z" fill="url(#hairSheen)"/>
            <path d="M226 110 C238 150 244 210 240 260 L226 260 C230 200 224 150 218 120 Z" fill="url(#hairSheen)"/>
        ` : ''}

        ${hairstyle === "tet_duoi_sam" ? `
            <path d="M214 125 Q232 180 226 240 Q220 260 225 285" stroke="url(#hairSheen)" stroke-width="9" fill="none" stroke-linecap="round"/>
            <circle cx="225" cy="280" r="4.5" fill="#9E1A1A"/>
        ` : ''}

        <!-- Lifelike Asian Facial Contour (Trái xoan thanh tú) -->
        <path d="M175 105 C174 125 186 138 200 138 C214 138 226 125 225 105 C224 88 214 85 200 85 C186 85 176 88 175 105 Z" 
              fill="url(#skinShading)" filter="url(#realisticShadow)"/>

        <!-- Natural Rosy Cheek Blush -->
        <ellipse cx="184" cy="116" rx="8" ry="5" fill="url(#cheekBlush)"/>
        <ellipse cx="216" cy="116" rx="8" ry="5" fill="url(#cheekBlush)"/>

        <!-- Realistic Almond Eyes (Mắt phượng e lệ, con ngươi lấp lánh) -->
        <g id="realistic-eyes">
            <!-- Left Eye -->
            <path d="M182 108 C186 104 193 105 197 109 C193 113 186 112 182 108 Z" fill="#FCFCFC"/>
            <ellipse cx="190" cy="108.5" rx="3.5" ry="3.5" fill="#2E1C12"/>
            <circle cx="190" cy="108.5" r="1.8" fill="#0D0907"/>
            <circle cx="191" cy="107.5" r="0.9" fill="#FFFFFF"/><!-- Glint -->
            <path d="M181 107.5 Q189 104 197.5 108.5" stroke="#1F1612" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <path d="M182 105 Q189 102 196 105" stroke="#D19C7A" stroke-width="0.7" fill="none" opacity="0.6"/> <!-- Eyelid crease -->

            <!-- Right Eye -->
            <path d="M203 109 C207 105 214 104 218 108 C214 112 207 113 203 109 Z" fill="#FCFCFC"/>
            <ellipse cx="210" cy="108.5" rx="3.5" ry="3.5" fill="#2E1C12"/>
            <circle cx="210" cy="108.5" r="1.8" fill="#0D0907"/>
            <circle cx="211" cy="107.5" r="0.9" fill="#FFFFFF"/><!-- Glint -->
            <path d="M202.5 108.5 Q211 104 219 107.5" stroke="#1F1612" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <path d="M204 105 Q211 102 218 105" stroke="#D19C7A" stroke-width="0.7" fill="none" opacity="0.6"/> <!-- Eyelid crease -->

            <!-- Eyebrows (Lông mày lá liễu mềm mại) -->
            <path d="M181 102 Q188 98 197 101" stroke="#3A2A22" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            <path d="M203 101 Q212 98 219 102" stroke="#3A2A22" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        </g>

        <!-- Shaded Realistic Nose (Sống mũi thanh, cánh mũi thon nhỏ) -->
        <g id="realistic-nose">
            <path d="M198 106 L197 116 Q197 121 200 121 Q203 121 203 116" stroke="#DCA27C" stroke-width="0.9" fill="none"/>
            <ellipse cx="197" cy="120" rx="1.2" ry="0.8" fill="#8F5938" opacity="0.5"/>
            <ellipse cx="203" cy="120" rx="1.2" ry="0.8" fill="#8F5938" opacity="0.5"/>
            <circle cx="200" cy="119.5" r="1" fill="#FFF2E8" opacity="0.4"/>
        </g>

        <!-- Plump Gradient Lips with Cupid's Bow (Son môi hồng chúm chím) -->
        <g id="realistic-lips">
            <!-- Upper Lip -->
            <path d="M193 127 Q197 125 200 126.5 Q203 125 207 127 Q200 128 193 127 Z" fill="url(#lipGradient)"/>
            <!-- Lower Lip with soft shine -->
            <path d="M194 127.5 Q200 133 206 127.5 Q200 129.5 194 127.5 Z" fill="#D94B62"/>
            <ellipse cx="200" cy="129.2" rx="2" ry="0.7" fill="#FFEAEF" opacity="0.7"/> <!-- Lip shine -->
        </g>
        `;
    }

    renderHeaddress(type, baseColor) {
        if (type === "khan_vanh") {
            return `
            <g id="headdress-khan-vanh" filter="url(#realisticShadow)">
                <ellipse cx="200" cy="94" rx="37" ry="14" fill="#D4AF37" stroke="#975A16" stroke-width="1.5"/>
                <ellipse cx="200" cy="97" rx="34" ry="12" fill="#B7791F"/>
                <ellipse cx="200" cy="100" rx="31" ry="10" fill="#D4AF37"/>
                <ellipse cx="200" cy="103" rx="28" ry="8" fill="#9E1A1A" stroke="#D4AF37" stroke-width="0.8"/>
                <circle cx="200" cy="97" r="4.5" fill="#FFEAA7" stroke="#975A16" stroke-width="1"/>
            </g>
            `;
        } else if (type === "khan_dong") {
            return `
            <g id="headdress-khan-dong" filter="url(#realisticShadow)">
                <path d="M168 108 Q200 88 232 108 L228 93 Q200 78 172 93 Z" fill="#171923" stroke="#2D3748" stroke-width="1"/>
                <path d="M171 102 Q200 84 229 102" stroke="#4A5568" stroke-width="1.5" fill="none"/>
                <path d="M173 96 Q200 80 227 96" stroke="#4A5568" stroke-width="1.5" fill="none"/>
                <ellipse cx="200" cy="86" rx="26" ry="8" fill="#171923" stroke="#2D3748" stroke-width="1"/>
            </g>
            `;
        } else if (type === "khan_ran") {
            return `
            <g id="headdress-khan-ran" filter="url(#realisticShadow)">
                <path d="M172 106 Q200 88 228 106 L224 98 Q200 80 176 98 Z" fill="url(#khanRanPattern)" stroke="#171923" stroke-width="1"/>
                <path d="M176 104 Q168 150 170 200 L180 200 Q178 150 184 104 Z" fill="url(#khanRanPattern)" stroke="#171923" stroke-width="0.8"/>
            </g>
            `;
        } else if (type === "non_la") {
            return `
            <g id="headdress-non-la" filter="url(#realisticShadow)" transform="translate(195, 58) rotate(-6)">
                <polygon points="5,-10 66,36 -56,36" fill="#F3E5AB" stroke="#C5A059" stroke-width="1.5"/>
                <ellipse cx="5" cy="34" rx="57" ry="7" fill="#F3E5AB" stroke="#C5A059" stroke-width="1"/>
                <ellipse cx="5" cy="22" rx="39" ry="5" fill="none" stroke="#DDA87F" stroke-width="0.8"/>
                <ellipse cx="5" cy="10" rx="21" ry="3" fill="none" stroke="#DDA87F" stroke-width="0.8"/>
                <path d="M-40 35 Q5 70 50 35" stroke="#D94B62" stroke-width="2" fill="none"/>
            </g>
            `;
        } else if (type === "non_quai_thao") {
            return `
            <g id="headdress-non-quai-thao" filter="url(#realisticShadow)">
                <ellipse cx="200" cy="70" rx="82" ry="18" fill="#E2C9A1" stroke="#8C6D46" stroke-width="2"/>
                <ellipse cx="200" cy="68" rx="74" ry="14" fill="#EDD7B2"/>
                <circle cx="200" cy="66" r="16" fill="#D4B07B" stroke="#8C6D46" stroke-width="1.5"/>
                <path d="M140 74 Q130 140 135 220" stroke="#9E1A1A" stroke-width="3" fill="none" opacity="0.85"/>
                <path d="M260 74 Q270 140 265 220" stroke="#9E1A1A" stroke-width="3" fill="none" opacity="0.85"/>
            </g>
            `;
        } else if (type === "khan_mo_qua") {
            return `
            <g id="headdress-khan-mo-qua" filter="url(#realisticShadow)">
                <path d="M174 98 Q200 78 226 98 L200 122 Z" fill="#171923" stroke="#2D3748" stroke-width="1"/>
            </g>
            `;
        } else {
            return `
            <g id="headdress-natural">
                <ellipse cx="200" cy="92" rx="27" ry="14" fill="url(#hairSheen)"/>
                <line x1="172" y1="86" x2="228" y2="86" stroke="#D4AF37" stroke-width="3" stroke-linecap="round"/>
                <circle cx="228" cy="86" r="4.5" fill="#9E1A1A"/>
            </g>
            `;
        }
    }

    renderBottoms(garmentId, type) {
        if (garmentId === "trang_phuc_dan_toc" || type === "skirt_ethnic") {
            return `
            <g id="bottom-skirt-ethnic">
                <path d="M165 285 Q200 295 235 285 L268 505 Q200 522 132 505 Z" fill="url(#thoCamPattern)" stroke="#1A365D" stroke-width="1.5"/>
                <path d="M135 480 Q200 495 265 480 L268 505 Q200 522 132 505 Z" fill="#9E1A1A" stroke="#D4AF37" stroke-width="1"/>
            </g>
            `;
        } else if (type === "skirt_black") {
            return `
            <g id="bottom-skirt-black">
                <path d="M160 270 Q200 280 240 270 L265 510 Q200 525 135 510 Z" fill="#171923" stroke="#2D3748" stroke-width="1"/>
                <path d="M180 280 L168 512" stroke="#2D3748" stroke-width="1.5" opacity="0.6"/>
                <path d="M200 280 L200 515" stroke="#2D3748" stroke-width="1.5" opacity="0.6"/>
                <path d="M220 280 L232 512" stroke="#2D3748" stroke-width="1.5" opacity="0.6"/>
            </g>
            `;
        } else if (type === "pants_black") {
            return `
            <g id="bottom-pants-black">
                <path d="M165 310 L140 505 Q170 515 200 505 L185 340 Z" fill="#171923" stroke="#2D3748" stroke-width="1"/>
                <path d="M200 505 Q230 515 260 505 L235 310 L215 340 Z" fill="#20242D" stroke="#2D3748" stroke-width="1"/>
            </g>
            `;
        } else {
            return `
            <g id="bottom-pants-white">
                <path d="M165 310 L140 505 Q170 515 200 505 L185 340 Z" fill="#FAF6EE" stroke="#E2E8F0" stroke-width="1"/>
                <path d="M200 505 Q230 515 260 505 L235 310 L215 340 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
                <path d="M165 370 Q160 440 152 505" stroke="#E2E8F0" stroke-width="1.5" fill="none"/>
                <path d="M235 370 Q240 440 248 505" stroke="#E2E8F0" stroke-width="1.5" fill="none"/>
            </g>
            `;
        }
    }

    renderShoes(shoes) {
        if (shoes === "guoc_moc") {
            return `
            <g id="shoes-guoc-moc">
                <ellipse cx="152" cy="510" rx="14" ry="5" fill="#8C5331"/>
                <path d="M145 508 Q152 503 159 508" stroke="#9E1A1A" stroke-width="3" fill="none"/>
                <ellipse cx="248" cy="510" rx="14" ry="5" fill="#8C5331"/>
                <path d="M241 508 Q248 503 255 508" stroke="#9E1A1A" stroke-width="3" fill="none"/>
            </g>
            `;
        } else if (shoes === "hai_theu") {
            return `
            <g id="shoes-hai-theu">
                <ellipse cx="152" cy="510" rx="14" ry="5" fill="#9E1A1A"/>
                <circle cx="147" cy="509" r="2" fill="#D4AF37"/>
                <ellipse cx="248" cy="510" rx="14" ry="5" fill="#9E1A1A"/>
                <circle cx="253" cy="509" r="2" fill="#D4AF37"/>
            </g>
            `;
        } else if (shoes === "giay_da") {
            return `
            <g id="shoes-giay-da">
                <ellipse cx="152" cy="510" rx="15" ry="6" fill="#171923"/>
                <ellipse cx="248" cy="510" rx="15" ry="6" fill="#171923"/>
            </g>
            `;
        } else {
            return `
            <g id="shoes-dep-coi">
                <ellipse cx="152" cy="510" rx="13" ry="5" fill="#C5A059"/>
                <ellipse cx="248" cy="510" rx="13" ry="5" fill="#C5A059"/>
            </g>
            `;
        }
    }

    renderInnerLayer(garmentId) {
        if (garmentId === "tu_than") {
            return `
            <g id="inner-yem-dao">
                <path d="M185 145 Q200 152 215 145 L224 250 Q200 260 176 250 Z" fill="#9E1A1A" stroke="#C53030" stroke-width="1.5"/>
                <path d="M186 145 Q193 135 196 128" stroke="#9E1A1A" stroke-width="2.5" fill="none"/>
                <path d="M214 145 Q207 135 204 128" stroke="#9E1A1A" stroke-width="2.5" fill="none"/>
            </g>
            `;
        } else {
            return `
            <g id="inner-white-collar">
                <path d="M190 138 Q200 142 210 138 L214 165 L186 165 Z" fill="#FFFFFF" stroke="#CBD5E0" stroke-width="1"/>
            </g>
            `;
        }
    }

    renderMainGarment(garmentId, color) {
        if (garmentId === "ao_ba_ba") {
            return `
            <g id="garment-ao-ba-ba" filter="url(#realisticShadow)">
                <path d="M165 160 L135 285 L152 290 L176 200 Z" fill="url(#silkSheen)"/>
                <path d="M235 160 L265 285 L248 290 L224 200 Z" fill="url(#silkSheen)"/>
                <path d="M174 152 Q185 220 178 260 L160 325 Q200 332 240 325 L222 260 Q215 220 226 152 Z" 
                      fill="url(#silkSheen)" stroke="${this.darkenColor(color, 25)}" stroke-width="1.5"/>
                <path d="M200 152 L200 328" stroke="${this.darkenColor(color, 25)}" stroke-width="1.5"/>
                ${Array.from({length: 5}).map((_, i) => `
                    <circle cx="200" cy="${165 + i * 35}" r="3" fill="#D4AF37" stroke="#744210" stroke-width="0.8"/>
                `).join("")}
                <rect x="172" y="275" width="22" height="24" rx="3" fill="${this.lightenColor(color, 10)}" stroke="${this.darkenColor(color, 20)}" stroke-width="1"/>
                <rect x="206" y="275" width="22" height="24" rx="3" fill="${this.lightenColor(color, 10)}" stroke="${this.darkenColor(color, 20)}" stroke-width="1"/>
                <path d="M178 152 Q190 200 186 280 L196 280 Q200 200 188 152 Z" fill="url(#khanRanPattern)" opacity="0.95"/>
            </g>
            `;
        } else if (garmentId === "trang_phuc_dan_toc") {
            return `
            <g id="garment-dan-toc" filter="url(#realisticShadow)">
                <path d="M165 160 L130 285 L150 292 L176 200 Z" fill="#1A365D"/>
                <path d="M235 160 L270 285 L250 292 L224 200 Z" fill="#1A365D"/>
                <rect x="130" y="270" width="20" height="15" fill="#9E1A1A"/>
                <rect x="250" y="270" width="20" height="15" fill="#9E1A1A"/>
                <path d="M172 152 L160 285 Q200 295 240 285 L228 152 Z" fill="#1A365D" stroke="#171923" stroke-width="1.5"/>
                <path d="M175 152 L225 285 L210 285 L170 165 Z" fill="url(#thoCamPattern)"/>
                <path d="M225 152 L175 285 L190 285 L230 165 Z" fill="#9E1A1A"/>
            </g>
            `;
        } else if (garmentId === "nhat_binh") {
            return `
            <g id="garment-nhat-binh" filter="url(#realisticShadow)">
                <path d="M150 160 L90 270 L125 295 L155 230 L145 460 Q200 472 255 460 L245 230 L275 295 L310 270 L250 160 Q200 150 150 160 Z" 
                      fill="url(#silkSheen)" stroke="${this.darkenColor(color, 25)}" stroke-width="1.5"/>
                <path d="M150 160 L80 265 L120 295 L160 210 Z" fill="url(#silkSheen)"/>
                <path d="M250 160 L320 265 L280 295 L240 210 Z" fill="url(#silkSheen)"/>
                <g>
                    <path d="M80 265 L90 273 L110 248 L100 240 Z" fill="#1A365D"/>
                    <path d="M90 273 L100 281 L120 256 L110 248 Z" fill="#D4AF37"/>
                    <path d="M100 281 L110 289 L130 264 L120 256 Z" fill="#9E1A1A"/>
                    <path d="M110 289 L120 297 L140 272 L130 264 Z" fill="#FFFFFF"/>
                    <path d="M120 297 L130 305 L150 280 L140 272 Z" fill="#1A5336"/>
                </g>
                <g>
                    <path d="M320 265 L310 273 L290 248 L300 240 Z" fill="#1A365D"/>
                    <path d="M310 273 L300 281 L280 256 L290 248 Z" fill="#D4AF37"/>
                    <path d="M300 281 L290 289 L270 264 L280 256 Z" fill="#9E1A1A"/>
                    <path d="M290 289 L280 297 L260 272 L270 264 Z" fill="#FFFFFF"/>
                    <path d="M280 297 L270 305 L250 280 L260 272 Z" fill="#1A5336"/>
                </g>
                <path d="M198 152 L198 465" stroke="#742A2A" stroke-width="1.5"/>
            </g>
            `;
        } else if (garmentId === "tu_than") {
            return `
            <g id="garment-tu-than" filter="url(#realisticShadow)">
                <path d="M160 160 L120 280 L140 286 L170 205 Z" fill="url(#silkSheen)"/>
                <path d="M240 160 L280 280 L260 286 L230 205 Z" fill="url(#silkSheen)"/>
                <path d="M170 160 L140 490 L260 490 L230 160 Z" fill="url(#silkSheen)" opacity="0.95"/>
                <path d="M170 160 L188 260 L175 390 L160 380 L178 260 Z" fill="${this.darkenColor(color, 10)}"/>
                <path d="M230 160 L212 260 L225 390 L240 380 L222 260 Z" fill="${this.darkenColor(color, 10)}"/>
                <ellipse cx="200" cy="265" rx="14" ry="10" fill="${this.darkenColor(color, 25)}"/>
                <path d="M174 260 Q200 270 226 260 L224 274 Q200 284 176 274 Z" fill="#1A5336"/>
                <path d="M194 274 L190 370 L198 370 L204 274 Z" fill="#1A5336" opacity="0.9"/>
                <path d="M202 274 L208 360 L216 360 L210 274 Z" fill="#9E1A1A" opacity="0.85"/>
            </g>
            `;
        } else if (garmentId === "ngu_than") {
            return `
            <g id="garment-ngu-than" filter="url(#realisticShadow)">
                <path d="M160 160 L125 285 L145 292 L172 205 Z" fill="url(#silkSheen)"/>
                <path d="M240 160 L275 285 L255 292 L228 205 Z" fill="url(#silkSheen)"/>
                <path d="M170 155 L148 465 Q200 474 252 465 L230 155 Z" fill="url(#silkSheen)" stroke="${this.darkenColor(color, 25)}" stroke-width="1.5"/>
                <path d="M198 152 Q215 180 220 220 L222 466" stroke="${this.darkenColor(color, 30)}" stroke-width="1.8" fill="none"/>
            </g>
            `;
        } else {
            return `
            <g id="garment-ao-dai" filter="url(#realisticShadow)">
                <path d="M165 160 L132 290 L148 295 L175 200 Z" fill="url(#silkSheen)"/>
                <path d="M235 160 L268 290 L252 295 L225 200 Z" fill="url(#silkSheen)"/>
                <path d="M175 155 Q185 220 180 250 Q150 350 148 480 Q200 488 252 480 Q250 350 220 250 Q215 220 225 155 Z" 
                      fill="url(#silkSheen)" stroke="${this.darkenColor(color, 20)}" stroke-width="1.2"/>
                <line x1="180" y1="248" x2="177" y2="265" stroke="#D4AF37" stroke-width="2"/>
                <line x1="220" y1="248" x2="223" y2="265" stroke="#D4AF37" stroke-width="2"/>
            </g>
            `;
        }
    }

    renderCollarAndDetails(garmentId) {
        if (garmentId === "nhat_binh") {
            return `
            <g id="details-nhat-binh">
                <path d="M178 140 L222 140 L226 230 L210 230 L208 162 L192 162 L190 230 L174 230 Z" 
                      fill="url(#goldBrocade)" stroke="#975A16" stroke-width="1.2"/>
                <circle cx="182" cy="180" r="3" fill="#9E1A1A"/>
                <circle cx="218" cy="180" r="3" fill="#9E1A1A"/>
                <circle cx="182" cy="210" r="3" fill="#1A5336"/>
                <circle cx="218" cy="210" r="3" fill="#1A5336"/>
                <circle cx="200" cy="170" r="4.5" fill="#FFEAA7" stroke="#D4AF37" stroke-width="1.5"/>
                <circle cx="200" cy="195" r="4.5" fill="#FFEAA7" stroke="#D4AF37" stroke-width="1.5"/>
                <circle cx="200" cy="220" r="4.5" fill="#FFEAA7" stroke="#D4AF37" stroke-width="1.5"/>
            </g>
            `;
        } else if (garmentId === "ao_ba_ba") {
            return `
            <g id="details-ba-ba">
                <path d="M188 142 Q200 152 212 142" stroke="#B7791F" stroke-width="1.5" fill="none"/>
            </g>
            `;
        } else if (garmentId === "trang_phuc_dan_toc") {
            return `
            <g id="details-dan-toc">
                <path d="M176 148 Q200 170 224 148" stroke="url(#silverSheen)" stroke-width="4.5" fill="none"/>
                <path d="M172 155 Q200 180 228 155" stroke="url(#silverSheen)" stroke-width="4" fill="none"/>
            </g>
            `;
        } else {
            return `
            <g id="details-lap-linh">
                <path d="M188 140 Q200 144 212 140 L212 154 Q200 158 188 154 Z" fill="url(#goldBrocade)" stroke="#B7791F" stroke-width="1"/>
                <circle cx="200" cy="148" r="3.5" fill="#D4AF37" stroke="#744210" stroke-width="1"/>
                <circle cx="208" cy="162" r="3.5" fill="#D4AF37" stroke="#744210" stroke-width="1"/>
                <circle cx="216" cy="178" r="3.5" fill="#D4AF37" stroke="#744210" stroke-width="1"/>
                <circle cx="220" cy="196" r="3.5" fill="#D4AF37" stroke="#744210" stroke-width="1"/>
                <circle cx="221" cy="216" r="3.5" fill="#D4AF37" stroke="#744210" stroke-width="1"/>
            </g>
            `;
        }
    }

    renderAccessories(jewelry, bag, hasFan, garmentId) {
        let content = "";

        // Graceful Slender Hands (Tay búp măng)
        content += `
        <g id="realistic-hands">
            <ellipse cx="140" cy="292" rx="6" ry="8" fill="url(#skinShading)" transform="rotate(-15 140 292)"/>
            <ellipse cx="260" cy="292" rx="6" ry="8" fill="url(#skinShading)" transform="rotate(15 260 292)"/>
        </g>
        `;

        if (jewelry === "kieng_bac") {
            content += `
            <g id="acc-kieng-bac" filter="url(#realisticShadow)">
                <path d="M180 156 Q200 178 220 156" stroke="url(#silverSheen)" stroke-width="5" fill="none" stroke-linecap="round"/>
                <circle cx="200" cy="172" r="4" fill="#E2E8F0" stroke="#A0AEC0" stroke-width="1"/>
            </g>
            `;
        } else if (jewelry === "chuoi_ngoc_trai") {
            content += `
            <g id="acc-chuoi-ngoc" filter="url(#realisticShadow)">
                <path d="M178 154 Q200 188 222 154" stroke="#FFF" stroke-width="4" stroke-dasharray="6,2" fill="none"/>
            </g>
            `;
        } else if (jewelry === "vong_ngoc") {
            content += `
            <g id="acc-vong-ngoc">
                <circle cx="140" cy="292" r="8" fill="none" stroke="#1A5336" stroke-width="3"/>
            </g>
            `;
        }

        if (bag === "tui_coi") {
            content += `
            <g id="acc-tui-coi" transform="translate(115, 275)" filter="url(#realisticShadow)">
                <circle cx="15" cy="25" r="16" fill="#F3E5AB" stroke="#C5A059" stroke-width="1.5"/>
                <path d="M8 15 Q15 2 22 15" stroke="#8C5331" stroke-width="2" fill="none"/>
            </g>
            `;
        } else if (bag === "tui_tho_cam") {
            content += `
            <g id="acc-tui-tho-cam" transform="translate(112, 275)" filter="url(#realisticShadow)">
                <rect x="0" y="10" width="28" height="26" rx="4" fill="url(#thoCamPattern)" stroke="#1A365D" stroke-width="1"/>
                <path d="M0 10 L28 10" stroke="#9E1A1A" stroke-width="2"/>
                <line x1="6" y1="36" x2="6" y2="44" stroke="#9E1A1A" stroke-width="2"/>
                <line x1="14" y1="36" x2="14" y2="46" stroke="#D4AF37" stroke-width="2"/>
                <line x1="22" y1="36" x2="22" y2="44" stroke="#1A5336" stroke-width="2"/>
            </g>
            `;
        } else if (bag === "tui_may") {
            content += `
            <g id="acc-tui-may" transform="translate(115, 278)" filter="url(#realisticShadow)">
                <rect x="0" y="10" width="26" height="22" rx="4" fill="#EDD7B2" stroke="#8C6D46" stroke-width="1.5"/>
                <path d="M5 10 Q13 0 21 10" stroke="#8C6D46" stroke-width="2" fill="none"/>
            </g>
            `;
        }

        if (hasFan) {
            content += `
            <g id="acc-folding-fan" transform="translate(240, 260) rotate(-20)" filter="url(#realisticShadow)">
                <path d="M0 0 L-25 -50 A55 55 0 0 1 25 -50 Z" fill="#FFFDF9" stroke="#D4AF37" stroke-width="1.5"/>
                <line x1="0" y1="0" x2="-20" y2="-48" stroke="#8C6D46" stroke-width="1"/>
                <line x1="0" y1="0" x2="-7" y2="-54" stroke="#8C6D46" stroke-width="1"/>
                <line x1="0" y1="0" x2="7" y2="-54" stroke="#8C6D46" stroke-width="1"/>
                <line x1="0" y1="0" x2="20" y2="-48" stroke="#8C6D46" stroke-width="1"/>
                <circle cx="0" cy="-35" r="7" fill="#FEB2B2" opacity="0.8"/>
                <path d="M0 0 Q-5 15 0 25" stroke="#9E1A1A" stroke-width="2" fill="none"/>
                <circle cx="0" cy="25" r="3" fill="#9E1A1A"/>
            </g>
            `;
        }

        return content;
    }

    lightenColor(hex, percent) {
        return this.shadeColor(hex, percent);
    }

    darkenColor(hex, percent) {
        return this.shadeColor(hex, -percent);
    }

    shadeColor(color, percent) {
        let num = parseInt(color.replace("#", ""), 16);
        let amt = Math.round(2.55 * percent);
        let R = (num >> 16) + amt;
        let B = ((num >> 8) & 0x00FF) + amt;
        let G = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
            (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + 
            (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
    }
}

window.TraditionalVisualizer = TraditionalVisualizer;
