/**
 * Vietnamese Traditional Fashion Stylist - Main Application Logic
 * Upgraded to match "Khái quát ý tưởng Việt phục" specifications.
 * Features realistic human models, photography lookbooks, and dual visualizer modes.
 */

let visualizer = null;
let currentLookRecommendation = null;

// Complete 7-Component Active State for Virtual Studio
const studioState = {
    garmentId: "ao_dai",
    color: "#9E1A1A",
    colorName: "Đỏ Son May Mắn",
    bottomType: "pants_white",
    headdress: "khan_vanh",
    jewelry: "kieng_bac",
    shoes: "guoc_moc",
    bag: "none",
    hairstyle: "bui_tram",
    hasFan: true
};

// ============================================================================
// Royal Intro Splash Transition ("VIỆT PHỤC CỔ TRUYỀN")
// ============================================================================
let introTimeout = null;
let introActive = true;

function initIntroSplash() {
    const splash = document.getElementById("intro-splash");
    if (!splash) return;

    introActive = true;
    const bannerImg = document.getElementById("intro-banner-img") || splash.querySelector(".intro-plaque-img");
    const pbar = splash.querySelector(".intro-progress-bar");

    const startSplashCountdown = () => {
        if (!introActive) return;
        if (pbar) {
            pbar.style.animation = "none";
            void pbar.offsetWidth;
            pbar.style.animation = "introProgressFill 3.6s linear forwards";
        }
        if (introTimeout) clearTimeout(introTimeout);
        introTimeout = setTimeout(() => {
            dismissIntroSplash();
        }, 3600);
    };

    if (bannerImg) {
        if (bannerImg.complete && bannerImg.naturalWidth > 0) {
            startSplashCountdown();
        } else {
            bannerImg.addEventListener("load", startSplashCountdown, { once: true });
            // Fallback timeout in case image takes longer than 3.5s
            setTimeout(() => {
                if (introActive && !introTimeout) {
                    startSplashCountdown();
                }
            }, 3500);
        }
    } else {
        startSplashCountdown();
    }

    // Allow background click to dismiss ONLY after 1.2s to prevent accidental touch dismiss
    setTimeout(() => {
        if (introActive) {
            splash.addEventListener("click", (e) => {
                // If not clicking the plaque or inner content
                if (!e.target.closest(".intro-plaque-wrapper") && !e.target.closest(".intro-caption")) {
                    dismissIntroSplash();
                }
            });
        }
    }, 1200);

    window.addEventListener("keydown", handleIntroKeydown);
}

function handleIntroKeydown(e) {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        dismissIntroSplash();
    }
}

function dismissIntroSplash() {
    introActive = false;
    if (introTimeout) {
        clearTimeout(introTimeout);
        introTimeout = null;
    }
    window.removeEventListener("keydown", handleIntroKeydown);

    const splash = document.getElementById("intro-splash");
    if (splash && !splash.classList.contains("intro-hidden")) {
        splash.classList.add("intro-hidden");
        setTimeout(() => {
            splash.style.display = "none";
        }, 800);
    }
}

function playIntroSplash() {
    const splash = document.getElementById("intro-splash");
    if (!splash) return;

    introActive = true;
    if (introTimeout) {
        clearTimeout(introTimeout);
        introTimeout = null;
    }

    splash.style.display = "flex";
    void splash.offsetWidth;
    splash.classList.remove("intro-hidden");

    // Restart progress bar
    const pbar = splash.querySelector(".intro-progress-bar");
    if (pbar) {
        pbar.style.animation = "none";
        void pbar.offsetWidth;
        pbar.style.animation = "introProgressFill 3.6s linear forwards";
    }

    introTimeout = setTimeout(() => {
        dismissIntroSplash();
    }, 3600);

    window.addEventListener("keydown", handleIntroKeydown);
}

// Expose globally for onclick handlers
window.dismissIntroSplash = dismissIntroSplash;
window.playIntroSplash = playIntroSplash;

document.addEventListener("DOMContentLoaded", () => {
    // 0. Trigger Royal Intro Transition Plaque
    initIntroSplash();

    // 1. Initialize Dynamic Vector Visualizer with Realistic Human Features
    visualizer = new TraditionalVisualizer("avatar-stage");
    visualizer.updateOutfit(studioState);

    // 2. Initialize UI Components
    initStudioControls();
    initEncyclopedia();
    initFabricsAndNguhanh();

    // 3. Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // 4. Auto focus chat input
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit(e);
            }
        });
    }
});

/**
 * Tab Switching Logic
 */
/**
 * Tab Configuration with Corresponding Dynastic Words, Character Medallion & Vermilion Seal
 */
const TAB_TRANSITIONS = {
    chat: {
        character: "蓮",
        title: "NGHỆ NHÂN TƯ VẤN",
        seal: "VẤN ĐẠO Y PHỤC",
        subtitle: "Đại Việt Tinh Hoa • Khai Mở Nét Duyên"
    },
    studio: {
        character: "錦",
        title: "PHÒNG MIX ĐỒ CỔ TRUYỀN",
        seal: "TẠO TÁC Y PHỤC",
        subtitle: "7 Thành Phần Phối Ngẫu • Họa Sắc Giai Nhân"
    },
    catalog: {
        character: "典",
        title: "BÁCH KHOA Y PHỤC",
        seal: "DI SẢN MUÔN NĂM",
        subtitle: "6 Dòng Cổ Phục Ngàn Năm Văn Hiến"
    },
    generator: {
        character: "靈",
        title: "GỢI Ý DỊP & PHONG CÁCH",
        seal: "KHÍ CHẤT THANH CAO",
        subtitle: "Chuẩn Mực Y Phục Theo Hoàn Cảnh & Vibe"
    }
};

let currentActiveTab = "chat";
let isTabTransitioning = false;

/**
 * Tab Switching Logic with Royal Transition (Exactly 1.2s)
 */
function switchTab(tabName) {
    if (tabName === currentActiveTab && !isTabTransitioning) return;
    if (isTabTransitioning) return;

    const transData = TAB_TRANSITIONS[tabName];
    const overlay = document.getElementById("tab-transition-overlay");

    if (!overlay || !transData) {
        executeTabSwitch(tabName);
        return;
    }

    isTabTransitioning = true;

    // 1. Populate overlay with corresponding tab words & seal
    const charEl = document.getElementById("tab-trans-char");
    const titleEl = document.getElementById("tab-trans-title");
    const sealEl = document.getElementById("tab-trans-seal");
    const subEl = document.getElementById("tab-trans-subtitle");

    if (charEl) charEl.textContent = transData.character;
    if (titleEl) titleEl.textContent = transData.title;
    if (sealEl) sealEl.textContent = transData.seal;
    if (subEl) subEl.textContent = transData.subtitle;

    // Trigger overlay entrance
    overlay.className = "fixed inset-0 z-[99998] flex flex-col items-center justify-center pointer-events-none select-none tab-trans-active";

    // Restart Shimmer (1.1s duration for 1.2s transition)
    const shimmer = overlay.querySelector(".tab-trans-shimmer");
    if (shimmer) {
        shimmer.style.animation = "none";
        void shimmer.offsetWidth;
        shimmer.style.animation = "tabShimmerSweep 1.1s ease-in-out forwards";
    }

    // 2. Under the curtain at 350ms, execute the DOM tab swap
    setTimeout(() => {
        executeTabSwitch(tabName);
    }, 350);

    // 3. At 850ms, begin smooth fadeout / dissolve
    setTimeout(() => {
        overlay.classList.add("tab-trans-fadeout");
    }, 850);

    // 4. Exactly at 1200ms (1.2s), finish transition completely
    setTimeout(() => {
        overlay.className = "fixed inset-0 z-[99998] hidden flex-col items-center justify-center pointer-events-none select-none";
        isTabTransitioning = false;
    }, 1200);
}

function executeTabSwitch(tabName) {
    currentActiveTab = tabName;
    const tabs = ["chat", "studio", "catalog", "generator"];
    tabs.forEach(tab => {
        const section = document.getElementById(`tab-${tab}`);
        const navBtn = document.getElementById(`nav-${tab}`);
        const mobBtn = document.getElementById(`mob-${tab}`);

        if (tab === tabName) {
            section.classList.remove("hidden");
            if (navBtn) {
                navBtn.classList.add("active", "text-amber-100");
                navBtn.classList.remove("text-amber-200/90");
            }
            if (mobBtn) {
                mobBtn.classList.add("text-amber-300");
                mobBtn.classList.remove("text-amber-100/70");
            }
        } else {
            section.classList.add("hidden");
            if (navBtn) {
                navBtn.classList.remove("active", "text-amber-100");
                navBtn.classList.add("text-amber-200/90");
            }
            if (mobBtn) {
                mobBtn.classList.remove("text-amber-300");
                mobBtn.classList.add("text-amber-100/70");
            }
        }
    });

    if (tabName === "studio" && visualizer) {
        setTimeout(() => visualizer.render(), 40);
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Initialize Virtual Studio Customizer Controls
 */
function initStudioControls() {
    const catalog = window.STYLIST_CATALOG;
    if (!catalog) return;

    // 1. Render Garment Selector (6 Garments)
    const garmentGrid = document.getElementById("garment-selector-grid");
    if (garmentGrid) {
        garmentGrid.innerHTML = catalog.garments.map(g => `
            <button onclick="selectStudioGarment('${g.id}')" id="garment-btn-${g.id}"
                class="p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${g.id === studioState.garmentId ? 'bg-amber-100/90 border-amber-500 shadow-xs' : 'bg-white/80 border-stone-200 hover:border-amber-300'}">
                <span class="text-xs font-bold text-stone-900 line-clamp-1">${g.name}</span>
                <span class="text-[10px] text-stone-500 font-serif-vi line-clamp-1 mt-0.5">${g.origin.split('(')[0]}</span>
            </button>
        `).join("");
    }

    // 2. Render Bottoms Selector
    const bottomGrid = document.getElementById("bottom-selector-grid");
    if (bottomGrid) {
        const bottoms = [
            { id: "pants_white", name: "Quần Lụa Trắng" },
            { id: "pants_black", name: "Quần Lụa Đen" },
            { id: "skirt_black", name: "Váy Đụp Lụa Đen" },
            { id: "skirt_ethnic", name: "Váy Xòe Thổ Cẩm" }
        ];
        bottomGrid.innerHTML = bottoms.map(b => `
            <button onclick="selectStudioBottom('${b.id}')" id="bottom-btn-${b.id}"
                class="p-2 rounded-xl border text-center transition text-xs ${b.id === studioState.bottomType ? 'bg-amber-100/90 border-amber-500 font-semibold text-amber-900' : 'bg-white/80 border-stone-200 hover:border-amber-300'}">
                ${b.name}
            </button>
        `).join("");
    }

    // 3. Render Headdress Selector
    const headdressGrid = document.getElementById("headdress-selector-grid");
    if (headdressGrid) {
        headdressGrid.innerHTML = catalog.components.headdresses.map(h => `
            <button onclick="selectStudioHeaddress('${h.id}')" id="headdress-btn-${h.id}"
                class="p-2 rounded-xl border text-center transition text-xs ${h.id === studioState.headdress ? 'bg-amber-100/90 border-amber-500 font-semibold text-amber-900' : 'bg-white/80 border-stone-200 hover:border-amber-300'}">
                ${h.name}
            </button>
        `).join("");
    }

    // 4. Render Jewelry Selector
    const jewelryGrid = document.getElementById("jewelry-selector-grid");
    if (jewelryGrid) {
        jewelryGrid.innerHTML = catalog.components.jewelry.map(j => `
            <button onclick="selectStudioJewelry('${j.id}')" id="jewelry-btn-${j.id}"
                class="p-2 rounded-xl border text-center transition text-xs ${j.id === studioState.jewelry ? 'bg-amber-100/90 border-amber-500 font-semibold text-amber-900' : 'bg-white/80 border-stone-200 hover:border-amber-300'}">
                ${j.name}
            </button>
        `).join("");
    }

    // 5. Render Shoes Selector
    const shoesGrid = document.getElementById("shoes-selector-grid");
    if (shoesGrid) {
        shoesGrid.innerHTML = catalog.components.shoes.map(s => `
            <button onclick="selectStudioShoes('${s.id}')" id="shoes-btn-${s.id}"
                class="p-2 rounded-xl border text-center transition text-xs ${s.id === studioState.shoes ? 'bg-amber-100/90 border-amber-500 font-semibold text-amber-900' : 'bg-white/80 border-stone-200 hover:border-amber-300'}">
                ${s.name}
            </button>
        `).join("");
    }

    // Update color swatches for the current garment
    updateColorSwatchesForGarment(studioState.garmentId);
}

function updateColorSwatchesForGarment(garmentId) {
    const catalog = window.STYLIST_CATALOG;
    const garment = catalog.garments.find(g => g.id === garmentId);
    if (!garment) return;

    const swatchBar = document.getElementById("color-swatch-bar");
    if (swatchBar) {
        swatchBar.innerHTML = garment.colors.map(c => `
            <button onclick="selectStudioColor('${c.hex}', '${c.name}')" 
                title="${c.name}"
                class="color-swatch w-8 h-8 rounded-full border border-white shadow-xs flex items-center justify-center ${c.hex === studioState.color ? 'active' : ''}"
                style="background-color: ${c.hex};">
            </button>
        `).join("");
    }

    const nameEl = document.getElementById("selected-color-name");
    if (nameEl) nameEl.innerText = studioState.colorName;

    const titleBadge = document.getElementById("current-garment-title");
    if (titleBadge) titleBadge.innerText = garment.name;

    const insightEl = document.getElementById("garment-cultural-insight");
    if (insightEl) insightEl.innerText = `${garment.description} ${garment.details}`;
}

function selectStudioGarment(id) {
    studioState.garmentId = id;
    const catalog = window.STYLIST_CATALOG;
    const g = catalog.garments.find(item => item.id === id);
    if (g && g.colors.length > 0) {
        studioState.color = g.colors[0].hex;
        studioState.colorName = g.colors[0].name;
    }

    // Auto-harmonize iconic pairings
    if (id === "ao_ba_ba") {
        studioState.bottomType = "pants_black";
        studioState.headdress = "khan_ran";
        studioState.shoes = "guoc_moc";
        studioState.bag = "tui_coi";
    } else if (id === "trang_phuc_dan_toc") {
        studioState.bottomType = "skirt_ethnic";
        studioState.headdress = "natural";
        studioState.jewelry = "kieng_tho_cam";
        studioState.shoes = "hai_theu";
        studioState.bag = "tui_tho_cam";
    } else if (id === "tu_than") {
        studioState.bottomType = "skirt_black";
        studioState.headdress = "non_quai_thao";
        studioState.shoes = "guoc_moc";
        studioState.jewelry = "xa_tich_bac";
    } else if (id === "nhat_binh") {
        studioState.bottomType = "pants_white";
        studioState.headdress = "khan_vanh";
        studioState.shoes = "hai_theu";
        studioState.jewelry = "kieng_bac";
    }

    const bagSelect = document.getElementById("bag-select");
    if (bagSelect) bagSelect.value = studioState.bag;

    visualizer.updateOutfit(studioState);
    initStudioControls();
}

function selectStudioColor(hex, name) {
    studioState.color = hex;
    studioState.colorName = name;
    visualizer.updateOutfit(studioState);

    const nameEl = document.getElementById("selected-color-name");
    if (nameEl) nameEl.innerText = name;

    const swatches = document.querySelectorAll(".color-swatch");
    swatches.forEach(s => s.classList.remove("active"));
    if (event && event.target) {
        event.target.classList.add("active");
    }
}

function selectStudioBottom(id) {
    studioState.bottomType = id;
    visualizer.updateOutfit(studioState);
    initStudioControls();
}

function selectStudioHeaddress(id) {
    studioState.headdress = id;
    visualizer.updateOutfit(studioState);
    initStudioControls();
}

function selectStudioJewelry(id) {
    studioState.jewelry = id;
    visualizer.updateOutfit(studioState);
    initStudioControls();
}

function selectStudioShoes(id) {
    studioState.shoes = id;
    visualizer.updateOutfit(studioState);
    initStudioControls();
}

function selectStudioBag(val) {
    studioState.bag = val;
    visualizer.updateOutfit(studioState);
}

function selectStudioHair(val) {
    studioState.hairstyle = val;
    visualizer.updateOutfit(studioState);
}

function randomizeOutfit() {
    const catalog = window.STYLIST_CATALOG;
    const randomGarment = catalog.garments[Math.floor(Math.random() * catalog.garments.length)];
    const randomColor = randomGarment.colors[Math.floor(Math.random() * randomGarment.colors.length)];
    
    studioState.garmentId = randomGarment.id;
    studioState.color = randomColor.hex;
    studioState.colorName = randomColor.name;

    const headdresses = ["khan_vanh", "khan_dong", "khan_ran", "non_la", "non_quai_thao", "khan_mo_qua", "natural"];
    const bottoms = ["pants_white", "pants_black", "skirt_black", "skirt_ethnic"];
    const shoes = ["guoc_moc", "hai_theu", "giay_da", "dep_coi"];
    const jewelries = ["kieng_bac", "vong_ngoc", "chuoi_ngoc_trai", "xa_tich_bac", "kieng_tho_cam"];
    const bags = ["none", "tui_coi", "tui_may", "tui_tho_cam"];

    studioState.headdress = headdresses[Math.floor(Math.random() * headdresses.length)];
    studioState.bottomType = (randomGarment.id === "trang_phuc_dan_toc") ? "skirt_ethnic" : (randomGarment.id === "tu_than") ? "skirt_black" : bottoms[Math.floor(Math.random() * bottoms.length)];
    studioState.shoes = shoes[Math.floor(Math.random() * shoes.length)];
    studioState.jewelry = jewelries[Math.floor(Math.random() * jewelries.length)];
    studioState.bag = bags[Math.floor(Math.random() * bags.length)];

    const bagSelect = document.getElementById("bag-select");
    if (bagSelect) bagSelect.value = studioState.bag;

    visualizer.updateOutfit(studioState);
    initStudioControls();
}

/**
 * AI Stylist Chat Handling
 */
async function handleChatSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("chat-input");
    const query = input.value.trim();
    if (!query) return;

    input.value = "";
    appendUserMessage(query);

    const typingBubble = appendTypingIndicator();

    try {
        const apiKey = localStorage.getItem("gemini_api_key") || "";
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query, gemini_api_key: apiKey })
        });

        if (!res.ok) throw new Error("Server error");
        const data = await res.json();
        typingBubble.remove();

        appendStylistResponse(data.stylist_response);
        if (data.look_card) {
            updateRecommendationCard(data.look_card);
        }
    } catch (err) {
        typingBubble.remove();
        const fallback = getLocalConsultationFallback(query);
        appendStylistResponse(fallback.text);
        if (fallback.look_card) {
            updateRecommendationCard(fallback.look_card);
        }
    }
}

function sendQuickPrompt(promptText) {
    const input = document.getElementById("chat-input");
    if (input) {
        input.value = promptText;
        handleChatSubmit();
    }
}

function appendUserMessage(text) {
    const chatContainer = document.getElementById("chat-messages");
    const msg = document.createElement("div");
    msg.className = "flex items-start justify-end space-x-3";
    msg.innerHTML = `
        <div class="user-bubble p-4 max-w-xl text-sm leading-relaxed">
            <p>${escapeHTML(text)}</p>
        </div>
        <div class="w-8 h-8 rounded-2xl bg-stone-700 text-amber-100 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow">
            <span>Bạn</span>
        </div>
    `;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendStylistResponse(markdownText) {
    const chatContainer = document.getElementById("chat-messages");
    const msg = document.createElement("div");
    msg.className = "flex items-start space-x-3";
    const parsedHtml = window.marked ? window.marked.parse(markdownText) : markdownText;

    msg.innerHTML = `
        <div class="w-8 h-8 rounded-2xl bg-red-800 text-amber-200 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow">
            <span>Tư</span>
        </div>
        <div class="stylist-bubble p-4 max-w-2xl text-sm leading-relaxed text-stone-800 space-y-2 prose prose-stone max-w-none">
            ${parsedHtml}
        </div>
    `;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function appendTypingIndicator() {
    const chatContainer = document.getElementById("chat-messages");
    const indicator = document.createElement("div");
    indicator.className = "flex items-start space-x-3";
    indicator.innerHTML = `
        <div class="w-8 h-8 rounded-2xl bg-red-800 text-amber-200 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow">
            <span>Tư</span>
        </div>
        <div class="stylist-bubble p-3 text-xs text-stone-500 italic flex items-center space-x-2">
            <span>Cô Tư đang phối trang phục theo hoàn cảnh & phong cách của bạn...</span>
            <div class="flex space-x-1">
                <span class="w-1.5 h-1.5 bg-red-800 rounded-full animate-bounce"></span>
                <span class="w-1.5 h-1.5 bg-red-800 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span class="w-1.5 h-1.5 bg-red-800 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
        </div>
    `;
    chatContainer.appendChild(indicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return indicator;
}

function clearChat() {
    const chatContainer = document.getElementById("chat-messages");
    chatContainer.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-2xl bg-red-800 text-amber-200 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow">
                <span>Tư</span>
            </div>
            <div class="stylist-bubble p-4 max-w-2xl text-sm leading-relaxed text-stone-800">
                <p class="font-serif-vi mb-2 text-red-900 font-semibold">Kính chào quý bạn hữu,</p>
                <p>Lịch sử trò chuyện đã được làm mới. Hãy cho tôi biết hoàn cảnh và phong cách bạn muốn diện y phục nhé!</p>
            </div>
        </div>
    `;
    const preview = document.getElementById("look-preview-container");
    preview.innerHTML = `
        <div class="text-center py-8 text-stone-400 text-sm font-serif-vi">
            <i data-lucide="shirt" class="w-12 h-12 mx-auto mb-2 text-stone-300 stroke-1"></i>
            <p>Khi bạn trò chuyện, các chi tiết phối đồ (áo, quần, giày, túi, khăn, trang sức, tóc) sẽ kết tinh tại đây.</p>
        </div>
    `;
    document.getElementById("look-preview-action").classList.add("hidden");
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Update Right Preview Card in Chat
 */
function updateRecommendationCard(look) {
    currentLookRecommendation = look;
    const container = document.getElementById("look-preview-container");
    const actionBox = document.getElementById("look-preview-action");
    const dynastyBadge = document.getElementById("look-dynasty-badge");

    if (dynastyBadge) dynastyBadge.innerText = look.dynasty || "Việt Phục";

    container.innerHTML = `
        <div class="space-y-3 font-serif-vi text-xs text-stone-700">
            <div class="p-3 bg-amber-50/80 rounded-2xl border border-amber-200">
                <h4 class="font-bold text-stone-900 text-sm font-imperial mb-1">${look.title}</h4>
                <p class="text-red-900 font-semibold">${look.garment_name}</p>
                <span class="inline-block mt-1 text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Vibe: ${look.vibe || 'Thanh lịch'}</span>
            </div>

            <div>
                <span class="font-sans text-[10px] uppercase tracking-wider font-semibold text-stone-500 block mb-1">Hòa Sắc Tranh Dân Gian:</span>
                <div class="flex flex-wrap gap-1">
                    ${(look.palette || []).map((hex, idx) => `
                        <span class="inline-flex items-center space-x-1 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200 text-[10px]">
                            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${hex};"></span>
                            <span>${(look.palette_names && look.palette_names[idx]) || hex}</span>
                        </span>
                    `).join("")}
                </div>
            </div>

            <div class="space-y-1 pt-1">
                <p><strong>Quần/Váy:</strong> ${look.bottom}</p>
                <p><strong>Giày:</strong> ${look.shoes}</p>
                <p><strong>Túi:</strong> ${look.bag}</p>
                <p><strong>Khăn/Nón:</strong> ${look.headdress}</p>
                <p><strong>Trang sức:</strong> ${look.jewelry}</p>
                <p><strong>Kiểu tóc:</strong> ${look.hairstyle}</p>
            </div>

            <div class="p-2.5 bg-stone-100 rounded-xl text-[11px] italic text-stone-600 border-l-2 border-amber-600">
                "${look.etiquette_tip}"
            </div>
        </div>
    `;

    actionBox.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
}

function applyLookToStudio() {
    if (!currentLookRecommendation) return;
    const look = currentLookRecommendation;

    if (look.garment_id) studioState.garmentId = look.garment_id;
    if (look.palette && look.palette.length > 0) {
        studioState.color = look.palette[0];
        studioState.colorName = look.palette_names ? look.palette_names[0] : "Sắc Màu Cổ Phong";
    }

    if (look.headdress) {
        if (look.headdress.includes("vành")) studioState.headdress = "khan_vanh";
        else if (look.headdress.includes("đóng")) studioState.headdress = "khan_dong";
        else if (look.headdress.includes("rằn")) studioState.headdress = "khan_ran";
        else if (look.headdress.includes("quai thao") || look.headdress.includes("ba tầm")) studioState.headdress = "non_quai_thao";
        else if (look.headdress.includes("quạ")) studioState.headdress = "khan_mo_qua";
        else if (look.headdress.includes("lá")) studioState.headdress = "non_la";
        else studioState.headdress = "natural";
    }

    if (look.bottom) {
        if (look.bottom.includes("thổ cẩm")) studioState.bottomType = "skirt_ethnic";
        else if (look.bottom.includes("váy đụp") || look.bottom.includes("váy")) studioState.bottomType = "skirt_black";
        else if (look.bottom.includes("đen")) studioState.bottomType = "pants_black";
        else studioState.bottomType = "pants_white";
    }

    if (look.shoes) {
        if (look.shoes.includes("guốc")) studioState.shoes = "guoc_moc";
        else if (look.shoes.includes("hài")) studioState.shoes = "hai_theu";
        else if (look.shoes.includes("da") || look.shoes.includes("oxford")) studioState.shoes = "giay_da";
        else if (look.shoes.includes("cói")) studioState.shoes = "dep_coi";
    }

    if (look.bag) {
        if (look.bag.includes("cói")) studioState.bag = "tui_coi";
        else if (look.bag.includes("mây")) studioState.bag = "tui_may";
        else if (look.bag.includes("thổ cẩm")) studioState.bag = "tui_tho_cam";
        else studioState.bag = "none";
        const bagSelect = document.getElementById("bag-select");
        if (bagSelect) bagSelect.value = studioState.bag;
    }

    visualizer.updateOutfit(studioState);
    initStudioControls();
    switchTab("studio");
}

/**
 * Occasion & Vibe Matcher Wizard
 */
async function handleOccasionSubmit(e) {
    e.preventDefault();
    const occasion = document.getElementById("gen-occasion").value;
    const gender = document.getElementById("gen-gender").value;
    const vibeRadio = document.querySelector('input[name="vibe"]:checked');
    const vibe = vibeRadio ? vibeRadio.value : "thanh_lich";
    const garmentPref = document.getElementById("gen-garment-pref").value;

    const resultBox = document.getElementById("generator-result-box");
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
        <div class="text-center py-6">
            <div class="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p class="text-xs text-stone-500 font-serif-vi">Đang hòa sắc theo công thức: Y phục + Hoàn cảnh + Vibe...</p>
        </div>
    `;

    try {
        const res = await fetch("/api/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                occasion: occasion, 
                gender: gender, 
                vibe: vibe,
                element: garmentPref !== "auto" ? garmentPref : null 
            })
        });
        const data = await res.json();
        const look = data.look_card;
        currentLookRecommendation = look;

        resultBox.innerHTML = `
            <div class="lacquer-card p-6 bg-gradient-to-br from-amber-50/90 to-orange-50/40 border border-amber-300 space-y-4 rounded-3xl">
                <div class="flex items-center justify-between border-b border-amber-200 pb-3">
                    <div>
                        <div class="flex items-center space-x-2 mb-1">
                            <span class="red-seal text-[11px]">Công Thức Hòa Phối</span>
                            <span class="text-xs font-semibold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">Vibe ${look.vibe || 'Thanh lịch'}</span>
                        </div>
                        <h3 class="text-xl font-bold font-imperial text-stone-900">${look.title}</h3>
                    </div>
                    <span class="text-xs text-stone-500 font-serif-vi">${look.dynasty}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-serif-vi text-stone-700">
                    <div class="space-y-1.5">
                        <p><strong>Y phục chủ đạo:</strong> <span class="text-red-900 font-bold">${look.garment_name}</span></p>
                        <p><strong>Màu áo đề xuất:</strong> ${look.shirt_color || 'Đỏ son / Hoàng kim'}</p>
                        <p><strong>Quần / Váy:</strong> ${look.bottom}</p>
                        <p><strong>Chất liệu khuyên dùng:</strong> ${look.fabric}</p>
                    </div>
                    <div class="space-y-1.5">
                        <p><strong>Giày dép:</strong> ${look.shoes}</p>
                        <p><strong>Túi xách:</strong> ${look.bag}</p>
                        <p><strong>Khăn / Nón:</strong> ${look.headdress}</p>
                        <p><strong>Trang sức & Tóc:</strong> ${look.jewelry} · ${look.hairstyle}</p>
                    </div>
                </div>

                <div class="pt-1">
                    <strong class="text-xs block mb-1.5 font-sans uppercase tracking-wider text-stone-600">Bảng Màu Tranh Dân Gian:</strong>
                    <div class="flex flex-wrap gap-2">
                        ${(look.palette || []).map((hex, i) => `
                            <span class="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] bg-white border border-stone-200 shadow-2xs">
                                <span class="w-3 h-3 rounded-full mr-1.5 border border-stone-300" style="background-color: ${hex}"></span>
                                ${(look.palette_names && look.palette_names[i]) || hex}
                            </span>
                        `).join("")}
                    </div>
                </div>

                <div class="p-3.5 bg-white/90 rounded-2xl text-xs font-serif-vi italic text-stone-700 border-l-3 border-red-800 shadow-2xs">
                    "<strong>Lời khuyên văn hóa:</strong> ${look.etiquette_tip}"
                </div>

                <div class="pt-2 flex items-center space-x-3">
                    <button onclick="applyLookToStudio()" class="flex-1 py-3 px-4 rounded-2xl bg-red-800 hover:bg-red-900 text-amber-100 text-xs font-medium shadow-md flex items-center justify-center space-x-2 transition">
                        <i data-lucide="palette" class="w-4 h-4"></i>
                        <span>Thử Tạo Hình Này Trong Phòng Mix Đồ</span>
                    </button>
                    <button onclick="switchTab('chat'); sendQuickPrompt('Tư vấn thêm chi tiết cho tạo hình: ${look.title}');" class="py-3 px-4 rounded-2xl border border-amber-400 bg-white hover:bg-amber-50 text-stone-700 text-xs font-medium transition">
                        Hỏi Thêm Cô Tư
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        resultBox.innerHTML = `
            <div class="p-4 bg-red-50 text-red-800 rounded-2xl text-xs">
                Không thể tải gợi ý lúc này. Vui lòng thử lại.
            </div>
        `;
    }
}

/**
 * Initialize Encyclopedia Tab with Realistic Photo Models (Bo góc mềm mại)
 */
function initEncyclopedia() {
    const catalog = window.STYLIST_CATALOG;
    if (!catalog) return;

    const cardsContainer = document.getElementById("encyclopedia-cards");
    if (cardsContainer) {
        cardsContainer.innerHTML = catalog.garments.map(g => `
            <div class="lacquer-card overflow-hidden flex flex-col justify-between hover:shadow-xl transition group rounded-3xl border border-amber-200">
                <!-- Realistic Human Model Photo with soft rounded top & badge -->
                <div class="relative h-56 w-full overflow-hidden bg-stone-100">
                    <img src="${g.photo}" alt="${g.name}" class="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                        <span class="text-[10px] font-semibold text-amber-300 tracking-wider uppercase">${g.type}</span>
                        <h3 class="text-xl font-bold font-imperial text-white">${g.name}</h3>
                        <span class="text-xs text-amber-200/90 font-serif-vi">${g.dynasty}</span>
                    </div>
                </div>

                <div class="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div class="space-y-2">
                        <p class="text-xs text-stone-600 font-serif-vi leading-relaxed">${g.description}</p>
                        <p class="text-xs text-stone-500 font-serif-vi italic pt-1">${g.details}</p>
                    </div>

                    <div class="pt-3 border-t border-amber-200/60 flex items-center justify-between">
                        <button onclick="selectStudioGarment('${g.id}'); switchTab('studio');" class="text-xs font-semibold text-amber-900 hover:text-red-900 flex items-center space-x-1 transition">
                            <span>Phòng Mix Đồ</span>
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                        </button>
                        <div class="flex -space-x-1">
                            ${g.colors.slice(0, 4).map(c => `
                                <span class="w-4 h-4 rounded-full border border-white shadow-2xs" style="background-color: ${c.hex};" title="${c.name}"></span>
                            `).join("")}
                        </div>
                    </div>
                </div>
            </div>
        `).join("");
    }
}

function initFabricsAndNguhanh() {
    const catalog = window.STYLIST_CATALOG;
    if (!catalog) return;

    const fabricsGrid = document.getElementById("fabrics-grid");
    if (fabricsGrid) {
        fabricsGrid.innerHTML = catalog.fabrics.map(f => `
            <div class="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="red-seal text-[10px]">${f.badge}</span>
                    <span class="text-[10px] text-stone-500">${f.region}</span>
                </div>
                <h4 class="font-bold text-stone-900 text-sm font-imperial">${f.name}</h4>
                <p class="text-xs text-stone-600 font-serif-vi leading-relaxed">${f.description}</p>
                <div class="text-[11px] text-amber-900 font-serif-vi pt-1">
                    <strong>Họa tiết:</strong> ${f.pattern}
                </div>
            </div>
        `).join("");
    }

    const nguhanhGrid = document.getElementById("nguhanh-grid");
    if (nguhanhGrid) {
        nguhanhGrid.innerHTML = catalog.nguHanhGuide.map(n => `
            <div class="p-4 bg-white rounded-2xl border border-stone-200 space-y-2 text-xs font-serif-vi">
                <h4 class="font-bold text-stone-900 font-imperial text-sm">${n.title.split('(')[0]}</h4>
                <div class="flex items-center space-x-1.5 py-1">
                    ${n.colors.map(c => `
                        <span class="w-5 h-5 rounded-full border border-stone-200 shadow-2xs" style="background-color: ${c};"></span>
                    `).join("")}
                </div>
                <p class="text-stone-600 leading-relaxed">${n.desc}</p>
                <p class="text-[11px] text-red-900 font-medium pt-1">"${n.recommendedOutfit}"</p>
            </div>
        `).join("");
    }

    const etiquetteGrid = document.getElementById("etiquette-grid");
    if (etiquetteGrid) {
        etiquetteGrid.innerHTML = catalog.etiquetteRules.map(e => `
            <div class="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1">
                <h4 class="font-bold text-stone-900 text-sm font-imperial text-red-900">${e.title}</h4>
                <p class="text-stone-700 leading-relaxed">${e.desc}</p>
            </div>
        `).join("");
    }
}

/**
 * Export Look Card Modal
 */
function openExportModal() {
    const modal = document.getElementById("export-modal");
    modal.classList.remove("hidden");

    const catalog = window.STYLIST_CATALOG;
    const garment = catalog.garments.find(g => g.id === studioState.garmentId);

    document.getElementById("card-modal-title").innerText = `${garment ? garment.name : 'Việt Phục'} · Sắc ${studioState.colorName}`;
    document.getElementById("card-garment-name").innerText = garment ? garment.name : "Áo Cổ Phong";
    document.getElementById("card-color-name").innerText = studioState.colorName;
    document.getElementById("card-dynasty-text").innerText = garment ? garment.dynasty : "Đại Việt";

    const headdressObj = catalog.components.headdresses.find(h => h.id === studioState.headdress);
    document.getElementById("card-headdress-name").innerText = headdressObj ? headdressObj.name : "Tự nhiên";

    const bottomNames = {
        pants_white: "Quần Lụa Trắng Hà Đông",
        pants_black: "Quần Lụa Đen Lãnh Mỹ A",
        skirt_black: "Váy Đụp Lụa Đen",
        skirt_ethnic: "Váy Xòe Thổ Cẩm Kỷ Hà"
    };
    document.getElementById("card-bottom-name").innerText = bottomNames[studioState.bottomType] || "Quần lụa";

    const shoesObj = catalog.components.shoes.find(s => s.id === studioState.shoes);
    document.getElementById("card-shoes-name").innerText = shoesObj ? shoesObj.name : "Guốc mộc";

    const jewelryObj = catalog.components.jewelry.find(j => j.id === studioState.jewelry);
    document.getElementById("card-jewelry-name").innerText = jewelryObj ? jewelryObj.name : "Kiềng bạc";

    // Clone mini avatar into card or show photo model thumbnail
    const mini = document.getElementById("card-mini-avatar");
    if (mini) {
        if (visualizer && visualizer.viewMode === "photo" && garment && garment.photo) {
            mini.innerHTML = `<img src="${garment.photo}" alt="${garment.name}" class="w-full h-full object-cover rounded-xl">`;
        } else {
            const stage = document.getElementById("avatar-stage");
            if (stage) mini.innerHTML = stage.innerHTML;
        }
    }

    const swatchesEl = document.getElementById("card-color-swatches");
    if (swatchesEl) {
        swatchesEl.innerHTML = `
            <span class="w-4 h-4 rounded-full border border-stone-300" style="background-color: ${studioState.color};" title="${studioState.colorName}"></span>
            <span class="w-4 h-4 rounded-full border border-stone-300" style="background-color: #D4AF37;" title="Vàng Hoàng Kim"></span>
            <span class="w-4 h-4 rounded-full border border-stone-300" style="background-color: #1A5336;" title="Xanh Ngọc"></span>
            <span class="w-4 h-4 rounded-full border border-stone-300" style="background-color: #FAF6EE;" title="Nền Kem"></span>
        `;
    }

    if (window.lucide) window.lucide.createIcons();
}

function closeExportModal() {
    document.getElementById("export-modal").classList.add("hidden");
}

function downloadCardAsImage() {
    window.print();
}

function openSettingsModal() {
    document.getElementById("settings-modal").classList.remove("hidden");
    const saved = localStorage.getItem("gemini_api_key");
    if (saved) document.getElementById("custom-api-key").value = saved;
}

function closeSettingsModal() {
    document.getElementById("settings-modal").classList.add("hidden");
}

function saveSettings() {
    const key = document.getElementById("custom-api-key").value.trim();
    if (key) localStorage.setItem("gemini_api_key", key);
    else localStorage.removeItem("gemini_api_key");
    closeSettingsModal();
    alert("Cài đặt đã được lưu thành công!");
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function getLocalConsultationFallback(query) {
    return {
        text: `Dạ chào bạn, Cô Tư đã tiếp nhận yêu cầu "${query}". Bạn có thể chọn Áo Dài hoặc Áo Ngũ Thân thanh lịch cho dịp lễ hội, hoặc Áo Bà Ba Nam Bộ phối khăn rằn mộc mạc!`,
        look_card: {
            title: "Tạo Hình Việt Phục Hoàn Mỹ",
            dynasty: "Đại Việt Cổ Phong",
            garment_name: "Áo Dài Việt Nam Sắc Đỏ Son",
            garment_id: "ao_dai",
            vibe: "Thanh lịch",
            palette: ["#9E1A1A", "#D4AF37", "#1A5336", "#FAF6EE"],
            palette_names: ["Đỏ Son", "Hoàng Kim", "Xanh Ngọc", "Nền Kem"],
            bottom: "Quần lụa trắng Hà Đông",
            shoes: "Guốc mộc quai nhung",
            bag: "Túi cói quai tròn",
            headdress: "Khăn vành dây hoàng gia",
            jewelry: "Kiềng bạc chạm sen",
            hairstyle: "Tóc búi thấp cài trâm",
            fabric: "Lụa tơ tằm Vạn Phúc dệt hoa cúc",
            etiquette_tip: "Phong thái đoan trang, khoan thai và tự nhiên làm nên cốt cách người Việt."
        }
    };
}
