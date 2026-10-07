"""
FastAPI Server for Vietnamese Traditional Fashion Stylist Web Application.
Provides APIs for AI consultation, wardrobe catalog, and serves the frontend.
"""

import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
import asyncio
import base64
import json
import random
import re
import urllib.request
import urllib.error
import urllib.parse

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Ensure current directory is in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

# Load .env manually if present
env_file = CURRENT_DIR / ".env"
if env_file.exists():
    try:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v
    except Exception:
        pass

try:
    from stylist_engine import TraditionalStylistEngine
    from image_api import router as image_router
except ImportError:
    from backend.stylist_engine import TraditionalStylistEngine
    from backend.image_api import router as image_router

app = FastAPI(
    title="Cổ Phục Stylist API",
    description="API for Vietnamese Traditional Attire Consultation & Wardrobe Studio",
    version="1.0.0"
)

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handlers ensuring /api/ routes ALWAYS return JSON, never HTML
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "status": "error", "message": str(exc.detail), "code": exc.status_code}
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(Exception)
async def custom_global_exception_handler(request: Request, exc: Exception):
    path = request.url.path
    err_str = str(exc)[:120]
    print(f"[UNHANDLED EXCEPTION] {path}: {type(exc).__name__}: {err_str}")

    # Endpoint tạo ảnh: trả về JSON + Pollinations fallback thay vì HTML 500/502
    if path == "/api/generate-outfit-preview":
        fallback_prompt = "hyper-realistic, photorealistic 8k resolution, cinematic lighting, professional studio photography, Vietnamese traditional dress Ao Dai, 85mm lens"
        enc = urllib.parse.quote(fallback_prompt, safe="")
        fallback_url = f"https://image.pollinations.ai/prompt/{enc}?seed={random.randint(100,9999)}&width=768&height=1024&nologo=true"
        err_code = "GEMINI_IMAGE_QUOTA_EXHAUSTED" if any(
            kw in err_str.lower() for kw in ["quota", "429", "rate limit", "resource exhausted"]
        ) else "SERVER_ERROR"
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "status": "fallback",
                "code": err_code,
                "message": f"Dịch vụ AI đang bận hoặc quá tải, đã tự động dùng chế độ dự phòng an toàn ({err_str}).",
                "image_url": fallback_url,
                "generated_image": fallback_url,
                "generated_model": "pollinations-fallback",
                "english_prompt": fallback_prompt
            }
        )

    # Tất cả /api/ khác: trả JSON thay vì HTML
    if path.startswith("/api/"):
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "status": "error",
                "message": f"Lỗi xử lý API: {err_str}",
                "code": "SERVER_ERROR"
            }
        )

    # Non-API routes: trả 500 HTML bình thường
    return JSONResponse(status_code=500, content={"detail": str(exc)})

engine = TraditionalStylistEngine()

# --- Request / Response Models ---
class ChatRequest(BaseModel):
    query: str
    gender: Optional[str] = None
    occasion: Optional[str] = None
    dynasty: Optional[str] = None
    gemini_api_key: Optional[str] = None
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = "image/jpeg"
    garment_choice: Optional[str] = None

class TryOnRequest(BaseModel):
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = "image/jpeg"
    garment_id: Optional[str] = None
    garment_name: Optional[str] = None
    garment_description: Optional[str] = None
    color_hex: Optional[str] = None
    apiKey: Optional[str] = None
    gemini_api_key: Optional[str] = None
    query: Optional[str] = None

class GenerateOutfitPreviewRequest(BaseModel):
    source_image_url: Optional[str] = None
    options: Optional[Dict[str, Any]] = None
    apiKey: Optional[str] = None
    gemini_api_key: Optional[str] = None
    garment_type: Optional[str] = None
    color: Optional[str] = None
    pants_skirt: Optional[str] = None
    hat: Optional[str] = None
    accessories: Optional[str] = None
    gender: Optional[str] = None
    occasion: Optional[str] = None
    vibe: Optional[str] = None

class RecommendRequest(BaseModel):
    occasion: Optional[str] = "tet"
    gender: Optional[str] = "nu"
    vibe: Optional[str] = "thanh_lich"
    element: Optional[str] = None

class OutfitImageRequest(BaseModel):
    dip: Optional[str] = "Tết"
    vibe: Optional[str] = "Thanh Lịch"
    gioi_tinh: Optional[str] = "Nữ"
    y_phuc: Optional[str] = "auto"
    garment_type: Optional[str] = None
    color: Optional[str] = None
    pants_skirt: Optional[str] = None
    hat: Optional[str] = None
    accessories: Optional[str] = None
    gemini_api_key: Optional[str] = None

def call_gemini_api(
    api_key: str,
    prompt: str,
    image_base64: Optional[str] = None,
    image_mime: str = "image/jpeg",
    response_json: bool = False
) -> Optional[str]:
    """Call Google Gemini directly via REST API with fallback models."""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key or api_key == "YOUR_API_KEY":
        return None

    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]

    parts = [{"text": prompt}]
    if image_base64:
        if "base64," in image_base64:
            image_base64 = image_base64.split("base64,")[1]
        parts.append({
            "inline_data": {
                "mime_type": image_mime,
                "data": image_base64
            }
        })

    gen_config: Dict[str, Any] = {
        "temperature": 0.7,
        "maxOutputTokens": 1500
    }
    if response_json:
        gen_config["responseMimeType"] = "application/json"

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": gen_config
    }
    payload_bytes = json.dumps(payload).encode("utf-8")

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=payload_bytes,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if candidates:
                    first_candidate = candidates[0]
                    content = first_candidate.get("content", {})
                    candidate_parts = content.get("parts", [])
                    if candidate_parts:
                        return candidate_parts[0].get("text", "")
        except Exception:
            continue

    return None

def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Safely extracts JSON from LLM text responses."""
    if not text:
        return None
    cleaned = text.strip()
    if "```" in cleaned:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if match:
            cleaned = match.group(1).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except Exception:
                pass
    return None

# ==============================================================================
# Standardized Photorealistic Prompt Mapping Constants & Functions
# ==============================================================================
HYPER_REALISTIC_KEYWORDS = (
    "hyper-realistic, 8k resolution, professional studio lighting, "
    "detailed traditional Vietnamese fabric and golden embroidery"
)

PHOTOREALISTIC_STUDIO_KEYWORDS = (
    "Hyper-realistic, photorealistic 8k resolution, cinematic lighting, "
    "professional studio photography, sharp focus, highly detailed face and natural skin texture, "
    "volumetric lighting, masterpiece, shot on 85mm lens, f/1.8"
)

VIETNAMESE_FABRIC_TEXTURE_KEYWORDS = (
    "Intricate and authentic textures of traditional Vietnamese fabric, glowing silk, "
    "detailed golden embroidery, sharp patterns on brocade, traditional royal or cultural background"
)

GARMENT_MAPPING = {
    "ao_dai": "authentic Vietnamese traditional Ao Dai silk dress with elegant tailored silhouette and flowing panels",
    "ngu_than": "authentic traditional Vietnamese Ngu Than dynastic royal robe (Ao Tac) with wide flowing sleeves and formal five-panel tailoring",
    "ao_tac": "authentic traditional Vietnamese royal Ao Tac ceremonial robe with majestic wide sleeves and five-panel cut",
    "nhat_binh": "magnificent traditional Vietnamese royal Nhat Binh attire in radiant silk and brocade with ornate rectangular golden embroidered collar and five-element auspicious ribbons",
    "tu_than": "traditional Vietnamese Tu Than four-panel folk costume with graceful draped outer robes and silk Yem bib",
    "ao_ba_ba": "traditional southern Vietnamese Ao Ba Ba silk blouse with elegant soft tailoring and delicate buttons",
    "trang_phuc_dan_toc": "authentic traditional Vietnamese ethnic minority brocade attire with vibrant hand-woven geometric patterns and silver jewelry"
}

COLOR_MAPPING = {
    "#9e1a1a": "radiant vermilion red and crimson with delicate golden accents",
    "đỏ son": "radiant vermilion red and crimson with delicate golden accents",
    "đỏ chu sa": "imperial cinnabar vermilion red",
    "đỏ": "radiant vermilion red and crimson",
    "#d4af37": "imperial royal gold and warm amber yellow",
    "hoàng kim": "imperial royal gold and warm amber yellow",
    "vàng": "imperial royal gold and warm amber yellow",
    "#1b3b6f": "deep indigo royal blue and sapphire",
    "xanh lam": "deep indigo royal blue and sapphire",
    "thủy ba": "deep marine blue with ocean wave patterns",
    "#d98282": "soft lotus petal pink and delicate blush",
    "hồng cánh sen": "soft lotus petal pink and delicate blush",
    "hồng": "soft lotus petal pink and delicate blush",
    "#e8e4df": "pristine white silk and pearl ivory",
    "trắng bạch hạc": "pristine white silk with subtle woven cloud patterns",
    "trắng": "pristine white silk and pearl ivory",
    "#2e8b57": "glowing imperial jade green",
    "ngọc bích": "glowing imperial jade green",
    "xanh ngọc": "glowing imperial jade green",
    "#1a1a1a": "deep lustrous charcoal black silk",
    "đen than": "deep lustrous charcoal black silk",
    "đen": "deep lustrous charcoal black silk",
    "tím": "traditional Hue royal imperial purple"
}

PANTS_SKIRT_MAPPING = {
    "pants_white": "flowing loose-fitting white silk trousers (Quan Lua)",
    "quần lụa trắng": "flowing loose-fitting white silk trousers (Quan Lua)",
    "quần trắng": "flowing loose-fitting white silk trousers",
    "pants_black": "wide-legged flowing black silk trousers",
    "quần lụa đen": "wide-legged flowing black silk trousers",
    "quần đen": "wide-legged flowing black silk trousers",
    "skirt_black": "traditional pleated black silk wrap skirt (Vay Dup)",
    "váy đụp lụa đen": "traditional pleated black silk wrap skirt (Vay Dup)",
    "váy đụp": "traditional pleated black silk wrap skirt (Vay Dup)",
    "váy đen": "traditional pleated black silk wrap skirt",
    "skirt_ethnic": "vibrant flared ethnic minority brocade tiered skirt with colorful geometric borders",
    "váy xòe thổ cẩm": "vibrant flared ethnic minority brocade tiered skirt with colorful geometric borders",
    "váy thổ cẩm": "vibrant flared ethnic minority brocade tiered skirt"
}

HAT_MAPPING = {
    "khan_vanh": "traditional Vietnamese golden pleated imperial headwrap (Khan Vanh Day)",
    "khăn vành": "traditional Vietnamese golden pleated imperial headwrap (Khan Vanh Day)",
    "khăn vành dây": "traditional Vietnamese golden pleated imperial headwrap (Khan Vanh Day)",
    "khan_dong": "traditional formal Vietnamese black rolled turban (Khan Dong)",
    "khăn đóng": "traditional formal Vietnamese black rolled turban (Khan Dong)",
    "khăn vấn": "traditional formal Vietnamese rolled turban (Khan Dong)",
    "non_la": "iconic Vietnamese conical palm leaf hat (Non La) with silk ribbon",
    "nón lá": "iconic Vietnamese conical palm leaf hat (Non La) with silk ribbon",
    "non_quai_thao": "traditional northern Vietnamese flat palm hat (Non Quai Thao) with long silk ribbons",
    "nón ba tầm": "traditional northern Vietnamese flat palm hat (Non Quai Thao) with long silk ribbons",
    "quai thao": "traditional northern Vietnamese flat palm hat (Non Quai Thao) with long silk ribbons",
    "mu_tho_cam": "ornate ethnic minority brocade headpiece with silver tassels and ornaments",
    "mũ thổ cẩm": "ornate ethnic minority brocade headpiece with silver tassels",
    "khăn rằn": "traditional southern Vietnamese checkered scarf (Khan Ran)",
    "none": "neat traditional Vietnamese styled hair",
    "không có": "neat traditional Vietnamese styled hair",
    "giữ nguyên": "neat traditional Vietnamese styled hair"
}

ACCESSORIES_MAPPING = {
    "kieng_bac": "traditional engraved solid silver neck ring (Kieng Bac)",
    "kiềng bạc": "traditional engraved solid silver neck ring (Kieng Bac)",
    "vong_ngoc": "smooth imperial green jade bangle bracelet",
    "vòng ngọc": "smooth imperial green jade bangle bracelet",
    "xa_tich": "traditional hanging silver hip chain ornaments (Xa Tich)",
    "xà tích": "traditional hanging silver hip chain ornaments (Xa Tich)",
    "quat_tram": "delicate bamboo frame silk folding fan with lotus prints",
    "quạt": "delicate bamboo frame silk folding fan with lotus prints",
    "guoc_moc": "traditional handcrafted wooden clogs (Guoc Moc) with velvet straps",
    "guốc mộc": "traditional handcrafted wooden clogs (Guoc Moc) with velvet straps",
    "tui_coi": "handcrafted woven straw artisan pouch",
    "túi cói": "handcrafted woven straw artisan pouch",
    "tui_may": "handcrafted bamboo wicker pouch",
    "tui_tho_cam": "hand-embroidered ethnic brocade pouch",
    "túi thổ cẩm": "hand-embroidered ethnic brocade pouch"
}

OCCASION_MAPPING = {
    "tet": "festive Vietnamese Tet Spring atmosphere with blooming peach blossoms, ancient wooden architecture and warm red lanterns",
    "le_chua": "serene ancient Vietnamese Buddhist pagoda courtyard with incense mist, stone pillars and lotus pond",
    "cuoi_hoi": "luxurious traditional Vietnamese royal wedding ceremony pavilion with lanterns, carved lattice and floral decor",
    "le_hoi": "vibrant traditional Vietnamese folk festival courtyard with ancient brick walls and ceremonial flags",
    "chup_anh": "cinematic courtyard of Hue Imperial Citadel or Hoi An ancient lantern heritage town",
    "truong_hoc": "vintage Indochine architecture campus with sunlit wooden corridor",
    "hang_ngay": "contemporary aesthetic Vietnamese tea house with vintage wooden interior and warm ambient light"
}

def map_fashion_attributes_to_english_prompt(
    garment_type: Optional[str] = None,
    color: Optional[str] = None,
    pants_skirt: Optional[str] = None,
    hat: Optional[str] = None,
    accessories: Optional[str] = None,
    gender: Optional[str] = "nu",
    occasion: Optional[str] = "tet",
    vibe: Optional[str] = "thanh_lich"
) -> str:
    """
    Chuẩn hóa toàn bộ tùy chọn (garment_type, color, pants_skirt, hat, accessories)
    thành câu lệnh tiếng Anh (English Image Prompt) chuẩn siêu thực.
    """
    is_male = "nam" in str(gender or "").lower()
    model_str = "gorgeous Vietnamese male model with realistic features" if is_male else "gorgeous Vietnamese female model with realistic features"

    # 1. Garment mapping
    g_raw = str(garment_type or "").lower().strip()
    garment_desc = GARMENT_MAPPING.get(g_raw)
    if not garment_desc:
        if "nhật bình" in g_raw:
            garment_desc = GARMENT_MAPPING["nhat_binh"]
        elif "ngũ thân" in g_raw or "áo tấc" in g_raw:
            garment_desc = GARMENT_MAPPING["ngu_than"]
        elif "tứ thân" in g_raw or "yếm" in g_raw:
            garment_desc = GARMENT_MAPPING["tu_than"]
        elif "bà ba" in g_raw:
            garment_desc = GARMENT_MAPPING["ao_ba_ba"]
        elif "thổ cẩm" in g_raw or "dân tộc" in g_raw:
            garment_desc = GARMENT_MAPPING["trang_phuc_dan_toc"]
        elif "áo dài" in g_raw or "ao dai" in g_raw:
            garment_desc = GARMENT_MAPPING["ao_dai"]
        elif garment_type and garment_type.strip():
            garment_desc = f"authentic Vietnamese traditional {garment_type.strip()} attire"
        else:
            garment_desc = GARMENT_MAPPING["ao_dai"]

    # 2. Color mapping
    c_raw = str(color or "").lower().strip()
    color_desc = COLOR_MAPPING.get(c_raw)
    if not color_desc:
        for k, v in COLOR_MAPPING.items():
            if k in c_raw:
                color_desc = v
                break
    if not color_desc:
        color_desc = f"radiant {color}" if color and color.strip() else "radiant vermilion red and imperial gold"

    # 3. Pants/Skirt mapping
    p_raw = str(pants_skirt or "").lower().strip()
    pants_desc = PANTS_SKIRT_MAPPING.get(p_raw)
    if not pants_desc:
        for k, v in PANTS_SKIRT_MAPPING.items():
            if k in p_raw:
                pants_desc = v
                break
    if not pants_desc:
        pants_desc = f"traditional {pants_skirt}" if pants_skirt and pants_skirt.strip() else "flowing loose-fitting white silk trousers"

    # 4. Hat mapping
    h_raw = str(hat or "").lower().strip()
    hat_desc = HAT_MAPPING.get(h_raw)
    if not hat_desc:
        for k, v in HAT_MAPPING.items():
            if k in h_raw:
                hat_desc = v
                break
    if not hat_desc:
        hat_desc = f"traditional {hat}" if hat and hat.strip() and hat not in ["Không có", "none"] else "neat traditional styled hair"

    # 5. Accessories mapping
    acc_desc_list = []
    if accessories and accessories.strip():
        acc_raw = accessories.lower()
        for k, v in ACCESSORIES_MAPPING.items():
            if k in acc_raw and v not in acc_desc_list:
                acc_desc_list.append(v)
        if not acc_desc_list:
            cleaned = [item.strip() for item in accessories.split(",") if item.strip() and item.strip() not in ["Không có", "Giữ nguyên", "none"]]
            if cleaned:
                acc_desc_list.append(", ".join(cleaned))
    accessories_desc = ", ".join(acc_desc_list) if acc_desc_list else "traditional engraved solid silver neck ring (Kieng Bac)"

    # 6. Occasion & Background
    occ_key = str(occasion or "tet").lower()
    bg_desc = OCCASION_MAPPING.get(occ_key, "traditional royal or cultural background of ancient Hue citadel")

    # 7. Assembled Prompt with Required Hyper-realistic Keywords
    prompt = (
        f"A photorealistic 8k portrait of a {model_str}, "
        f"wearing {garment_desc}, "
        f"in color palette {color_desc}, "
        f"paired with {pants_desc}, "
        f"wearing {hat_desc}, "
        f"accessorized with {accessories_desc}, "
        f"traditional background {bg_desc}, "
        f"{HYPER_REALISTIC_KEYWORDS}, "
        f"{PHOTOREALISTIC_STUDIO_KEYWORDS}, "
        f"{VIETNAMESE_FABRIC_TEXTURE_KEYWORDS}."
    )
    return prompt

def build_culture_fallback_outfit(dip: str, vibe: str, gioi_tinh: str, y_phuc: str) -> Dict[str, Any]:
    """Generates authentic Vietnamese traditional outfit styling & high-quality English image prompt."""
    is_male = "nam" in gioi_tinh.lower()
    
    # Determine garment key
    garment_key = y_phuc.lower().strip()
    if garment_key == "auto" or not garment_key:
        if "tet" in dip.lower() or "cuoi" in dip.lower():
            garment_key = "nhat_binh" if not is_male else "ngu_than"
        elif "le_hoi" in dip.lower() or "chup_anh" in dip.lower():
            garment_key = "tu_than" if not is_male else "ngu_than"
        elif "hang_ngay" in dip.lower():
            garment_key = "ao_ba_ba"
        else:
            garment_key = "ao_dai"

    # Style profiles with Photorealistic / Hyper-realistic 8k prompt format
    profiles = {
        "ao_dai": {
            "name": "Áo Dài Truyền Thống",
            "ao": f"Áo Dài dáng suông thướt tha, chất liệu lụa tơ tằm Vạn Phúc dệt vân mây, sắc đỏ son hòa hoàng kim thanh nhã, tôn lên cốt cách trang nhã cho dịp {dip}.",
            "quan_vay": "Quần lụa Bạch Hạc ống rộng óng ả, buông rủ chấm gót theo từng bước đi.",
            "phu_kien": "Khăn vành dây hoặc khăn đóng đen truyền thống, kiềng bạc chạm hoa sen, guốc mộc quai nhung đỏ thắm, tay cầm đóa hoa sen thanh khiết.",
            "prompt": map_fashion_attributes_to_english_prompt(
                garment_type="ao_dai",
                color="đỏ son",
                pants_skirt="quần lụa trắng",
                hat="khăn vành",
                accessories="kiềng bạc, guốc mộc",
                gender=gioi_tinh,
                occasion=dip,
                vibe=vibe
            )
        },
        "ngu_than": {
            "name": "Áo Ngũ Thân (Áo Tấc & Tay Chẽn)",
            "ao": f"Áo Ngũ Thân tay chẽn hoặc Áo Tấc uy nghi, chất liệu lụa Hà Đông dệt họa tiết chữ Thọ và hoa văn cổ triều Nguyễn, phom suông mực thước đúng chuẩn điển lễ.",
            "quan_vay": "Quần lụa sa trắng hoặc đen than tuyền, phom đứng đắn và trang trọng.",
            "phu_kien": "Khăn đóng đen 7 nếp truyền thống, quạt tiêu trúc nan tre, chuỗi hạt bồ đề hoặc kiềng bạc, giày da thủ công hoặc guốc mộc.",
            "prompt": map_fashion_attributes_to_english_prompt(
                garment_type="ngu_than",
                color="xanh lam",
                pants_skirt="quần lụa đen",
                hat="khăn đóng",
                accessories="quạt tiêu trúc, kiềng bạc",
                gender=gioi_tinh,
                occasion=dip,
                vibe=vibe
            )
        },
        "tu_than": {
            "name": "Áo Tứ Thân & Yếm Đào",
            "ao": "Áo Tứ Thân bốn vạt tha thướt thắt nút eo duyên dáng, lấp ló mép yếm đào thắm dệt lụa tơ tằm, dải thắt lưng lụa xanh thiên thanh mềm mại.",
            "quan_vay": "Váy đụp lụa đen bồng bềnh e ấp theo từng nhịp bước chân.",
            "phu_kien": "Nón ba tầm (nón quai thao) buộc dải thao tơ, khăn mỏ quạ nhung đen, xà tích bạc lấp lánh bên hông, guốc mộc cong Kinh Bắc.",
            "prompt": map_fashion_attributes_to_english_prompt(
                garment_type="tu_than",
                color="hồng cánh sen",
                pants_skirt="váy đụp lụa đen",
                hat="nón quai thao",
                accessories="xà tích bạc, guốc mộc",
                gender=gioi_tinh,
                occasion=dip,
                vibe=vibe
            )
        },
        "nhat_binh": {
            "name": "Áo Nhật Bình Cung Đình",
            "ao": "Áo Nhật Bình gấm hoàng gia màu đỏ chu sa hoặc vàng hoàng yến, cổ áo chữ nhật thêu phượng vũ và hoa cúc tinh xảo, dải viền ngũ sắc tượng trưng cho ngũ hành tương sinh.",
            "quan_vay": "Quần lụa trắng Bạch Hạc dệt vân mây chìm trang nhã.",
            "phu_kien": "Khăn vành dây xanh thiên thanh hoàng tộc, kiềng bạc nguyên khối chạm lộng họa tiết hoa sen, guốc mộc sơn son thếp vàng, quạt lụa thêu chim hạc.",
            "prompt": map_fashion_attributes_to_english_prompt(
                garment_type="nhat_binh",
                color="đỏ chu sa",
                pants_skirt="quần lụa trắng",
                hat="khăn vành dây",
                accessories="kiềng bạc hoa sen, quạt lụa",
                gender=gioi_tinh,
                occasion=dip,
                vibe=vibe
            )
        },
        "ao_ba_ba": {
            "name": "Áo Bà Ba Nam Bộ",
            "ao": "Áo Bà Ba xẻ tà nhẹ nhàng bằng lụa satin bóng nhẹ màu ngọc bích hoặc mỡ gà, cổ tròn trang nhã mang hơi thở mộc mạc, phóng khoáng của miền sông nước.",
            "quan_vay": "Quần lụa đen rủ mềm mại, mang lại cảm giác thoải mái, thanh thoát.",
            "phu_kien": "Khăn rằn Nam Bộ kẻ caro đen trắng quàng cổ, nón lá chằm duyên dáng, guốc mộc mộc mạc.",
            "prompt": map_fashion_attributes_to_english_prompt(
                garment_type="ao_ba_ba",
                color="ngọc bích",
                pants_skirt="quần lụa đen",
                hat="nón lá",
                accessories="khăn rằn, guốc mộc",
                gender=gioi_tinh,
                occasion=dip,
                vibe=vibe
            )
        },
        "trang_phuc_dan_toc": {
            "name": "Trang Phục Thổ Cẩm Dân Tộc Tây Bắc",
            "ao": "Áo chàm thổ cẩm dệt thủ công với họa tiết kỷ hà và hoa văn đính bạc độc bản, nhuộm màu tự nhiên từ vỏ cây rừng Tây Bắc.",
            "quan_vay": "Váy xòe thổ cẩm nhiều tầng rực rỡ sắc màu, chuyển động mềm mại theo từng bước chân.",
            "phu_kien": "Mũ đội đầu đính đồng bạc xủng xoảng, vòng kiềng cổ bạc trạm trổ thủ công, túi thổ cẩm thêu tay.",
            "prompt": map_fashion_attributes_to_english_prompt(
                garment_type="trang_phuc_dan_toc",
                color="xanh lam",
                pants_skirt="váy xòe thổ cẩm",
                hat="mũ thổ cẩm",
                accessories="vòng kiềng bạc, túi thổ cẩm",
                gender=gioi_tinh,
                occasion=dip,
                vibe=vibe
            )
        }
    }

    # Match selected garment or fallback to ao_dai
    matched_key = "ao_dai"
    for k in profiles:
        if k in garment_key:
            matched_key = k
            break

    profile = profiles[matched_key]
    
    advice = (
        f"Cô Tư xin chào bạn hữu! Lựa chọn tạo hình {profile['name']} kết hợp cùng vibe {vibe} "
        f"cho dịp {dip} là một sự hòa hợp tuyệt mỹ giữa điển lễ cổ phong và tinh thần tự hào dân tộc. "
        f"Khi diện trang phục này, hãy giữ phong thái khoan thai, đoan trang và tự tin để toát lên trọn vẹn hào khí và nét duyên dáng Việt Nam."
    )

    return {
        "name": profile["name"],
        "ao": profile["ao"],
        "quan_vay": profile["quan_vay"],
        "phu_kien": profile["phu_kien"],
        "loi_khuyen": advice,
        "image_prompt": profile["prompt"]
    }

# --- Standard API Routes ---
@app.get("/api/health")
def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    has_key = bool(gemini_key and gemini_key != "YOUR_API_KEY")
    return {
        "status": "ok",
        "state": "online",
        "message": "Vietnamese Traditional Stylist Server is operational.",
        "server": "Cô Tư Cổ Phục Stylist API (FastAPI)",
        "geminiKeyConfigured": has_key,
        "soKhoaDuPhong": 1 if has_key else 0
    }

@app.get("/api/catalog")
def get_catalog():
    return engine.get_catalog()

@app.post("/api/analyze-fashion")
@app.post("/api/process-ai")
async def analyze_fashion(
    request: Request,
    image: Optional[UploadFile] = File(None),
    prompt: Optional[str] = Form(None),
    occasion: Optional[str] = Form(None),
    apiKey: Optional[str] = Form(None)
):
    """
    Tư vấn cổ phục dựa trên ảnh chân dung người dùng (hỗ trợ multipart/form-data).
    Luôn trả về JSON hợp lệ, không bao giờ rơi vào trang lỗi HTML.
    """
    try:
        user_prompt = prompt or occasion or "Dạo phố và chụp ảnh kỷ niệm phong cách cổ truyền"
        effective_api_key = (
            apiKey
            or request.headers.get("x-gemini-api-key")
            or os.environ.get("GEMINI_API_KEY", "")
        )

        image_b64 = ""
        mime_type = "image/jpeg"
        if image:
            content = await image.read()
            if content:
                image_b64 = base64.b64encode(content).decode("utf-8")
                mime_type = image.content_type or "image/jpeg"

        ai_data = None
        if effective_api_key and image_b64:
            system_prompt = (
                "Bạn là 'Cô Tư Cổ Phục' - một chuyên gia am tường văn hóa và trang phục truyền thống Việt Nam.\n"
                "Khi quan sát ảnh chân dung người dùng tải lên kèm theo yêu cầu, hãy tư vấn bộ Cổ Phục Việt Nam phù hợp nhất.\n"
                f"Yêu cầu người dùng: {user_prompt}\n\n"
                "BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON (không viết chữ ngoài JSON) với cấu trúc:\n"
                "{\n"
                '  "advisorName": "Cô Tư Cổ Phục",\n'
                '  "costumeName": "Tên trang phục cổ phục gợi ý (Áo Dài / Áo Tấc / Áo Nhật Bình / Áo Tứ Thân / Áo Bà Ba...)",\n'
                '  "dynasty": "Triều đại lịch sử (Triều Nguyễn / Triều Lê / Dân gian Kinh Bắc / Nam Bộ...)",\n'
                '  "vibe": "Khí chất nổi bật (Đài các / Thanh tao / Đoan trang thuần khiết / Phóng khoáng...)",\n'
                '  "matchScore": 96,\n'
                '  "userPortraitAnalysis": {\n'
                '    "physique": "Đánh giá vóc dáng và độ hợp trang phục",\n'
                '    "skinTone": "Nhận xét tone da và gam màu tôn da",\n'
                '    "facialAura": "Nhận xét thần thái, nét mặt Á Đông"\n'
                '  },\n'
                '  "costumeDetails": {\n'
                '    "structure": "Mô tả kiểu dáng, cổ áo, tà áo",\n'
                '    "material": "Chất liệu may mặc truyền thống (Lụa tơ tằm Vạn Phúc / Gấm Thái Tuấn...)",\n'
                '    "colorPalette": [\n'
                '      {"name": "Đỏ Chu Sa", "hex": "#9E1A1A", "meaning": "Hỷ khí cát tường"},\n'
                '      {"name": "Hoàng Kim", "hex": "#D4AF37", "meaning": "Sang trọng vương giả"}\n'
                '    ],\n'
                '    "lowerGarment": "Quần lụa trắng hoặc đen ống thụng"\n'
                '  },\n'
                '  "accessories": [\n'
                '    {"category": "Khăn / Mũ", "name": "Khăn đóng hoặc khăn vành"},\n'
                '    {"category": "Trang sức", "name": "Kiềng bạc hoa sen"},\n'
                '    {"category": "Hài Guốc", "name": "Guốc mộc quai nhung"},\n'
                '    {"category": "Cầm tay", "name": "Quạt xếp nan trúc"}\n'
                '  ],\n'
                '  "photoAndPoseTips": {\n'
                '    "poses": ["Hai tay đan nhẹ trước bụng theo thế vái lạy cổ truyền"],\n'
                '    "locations": "Cố đô Huế hoặc Phố cổ Hội An"\n'
                '  },\n'
                '  "coTuNote": "Lời gửi gắm tâm huyết, ấm áp từ Cô Tư"\n'
                "}"
            )
            raw_ai = call_gemini_api(effective_api_key, system_prompt, image_b64, mime_type, response_json=True)
            if raw_ai:
                ai_data = extract_json_from_text(raw_ai)

        if not ai_data:
            # Fallback tư vấn nội bộ chất lượng cao
            fallback = build_culture_fallback_outfit("Tết", "Thanh Lịch", "Nữ", "ao_dai")
            ai_data = {
                "advisorName": "Cô Tư Cổ Phục",
                "costumeName": fallback["name"],
                "dynasty": "Triều Nguyễn & Di Sản Việt Nam",
                "vibe": "Thanh lịch, đoan trang",
                "matchScore": 95,
                "userPortraitAnalysis": {
                    "physique": "Vóc dáng thanh thoát, đường nét hài hòa rất hợp phom áo truyền thống",
                    "skinTone": "Làn da tươi sáng, rất tôn sắc khi diện tà lụa cổ phong",
                    "facialAura": "Ánh mắt đoan trang, thần thái đậm nét Á Đông thuần khiết"
                },
                "costumeDetails": {
                    "structure": fallback["ao"],
                    "material": "Lụa tơ tằm Vạn Phúc dệt vân mây",
                    "colorPalette": [
                        {"name": "Đỏ Chu Sa", "hex": "#9E1A1A", "meaning": "Vượng khí cát tường"},
                        {"name": "Hoàng Kim", "hex": "#D4AF37", "meaning": "Quý phái tao nhã"}
                    ],
                    "lowerGarment": fallback["quan_vay"]
                },
                "accessories": [
                    {"category": "Phụ kiện", "name": fallback["phu_kien"]}
                ],
                "photoAndPoseTips": {
                    "poses": ["Đứng nghiêng 45 độ, hai tay cầm quạt nan trúc hoặc hoa sen trước ngực"],
                    "locations": "Kinh thành Huế, Văn Miếu Quốc Tử Giám hoặc Phố cổ Hội An"
                },
                "coTuNote": fallback["loi_khuyen"]
            }

        return {
            "success": True,
            "status": "success",
            "data": ai_data,
            "message": "Cô Tư đã hoàn tất tư vấn cho bạn!"
        }
    except Exception as e:
        print(f"[Analyze Fashion Error]: {e}")
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "status": "success",
                "data": {
                    "advisorName": "Cô Tư Cổ Phục",
                    "costumeName": "Áo Dài Truyền Thống",
                    "dynasty": "Triều Nguyễn",
                    "vibe": "Thanh lịch",
                    "matchScore": 92,
                    "rawAdvice": "Cô Tư đã ghi nhận diện mạo của bạn và tư vấn bộ Áo Dài truyền thống thanh tao nhất.",
                    "coTuNote": "Cổ phục Việt Nam luôn tôn vinh cốt cách của người mặc."
                },
                "message": "Cô Tư đã tư vấn phương án phù hợp cho bạn."
            }
        )

@app.post("/api/chat")
def consult_stylist(req: ChatRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    result = engine.generate_styling_consultation(
        query=req.query,
        user_gender=req.gender,
        occasion=req.occasion,
        preferred_dynasty=req.dynasty
    )

    effective_api_key = req.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    
    if effective_api_key and effective_api_key != "YOUR_API_KEY":
        look = result.get("look_card", {})
        garment_name = look.get("garment_name", "Áo Cổ Phục Việt Nam")
        
        system_instructions = (
            "Bạn là Cô Tư - nghệ nhân y phục truyền thống Việt Nam (Cổ Phục Stylist & Việt Phục Remix). "
            "Bạn am hiểu sâu sắc về Áo Dài, Áo Ngũ Thân, Áo Nhật Bình, Áo Tứ Thân, Áo Bà Ba, Trang Phục Dân Tộc. "
            "Hãy xưng hô 'Cô Tư' và gọi người dùng là 'bạn hữu' hoặc 'quý bạn'. "
            "Giọng văn đôn hậu, am hiểu điển lễ, thanh tao và mang hào khí Đại Việt."
        )

        try:
            if req.image_base64:
                prompt = (
                    f"{system_instructions}\n\n"
                    f"Người dùng vừa gửi ảnh chân dung và đưa ra yêu cầu: '{req.query}'.\n"
                    f"Tạo hình cổ phục đề xuất: {garment_name}.\n"
                    f"Hãy nhận xét vóc dáng, màu da và tư vấn cách phối y phục phù hợp nhất."
                )
                ai_reply = call_gemini_api(effective_api_key, prompt, req.image_base64, req.image_mime_type)
            else:
                prompt = (
                    f"{system_instructions}\n\n"
                    f"Yêu cầu của người dùng: '{req.query}'.\n"
                    f"Gợi ý trang phục: {garment_name} (Màu: {look.get('shirt_color', '')}, Quần: {look.get('bottom', '')}).\n"
                    f"Hãy viết phản hồi tư vấn may mặc chi tiết, lịch sự, truyền cảm hứng tự hào dân tộc."
                )
                ai_reply = call_gemini_api(effective_api_key, prompt)

            if ai_reply:
                result["stylist_response"] = ai_reply
                result["is_gemini"] = True
        except Exception as e_chat_gemini:
            print(f"[Chat Gemini Quota/Error]: {e_chat_gemini}")

    return result

@app.post("/api/try-on")
def virtual_try_on(req: TryOnRequest, raw_request: Request):
    """Virtual Try-On analysis endpoint using Gemini Vision + Image Generation with safe fallback."""
    try:
        client_key = req.apiKey or req.gemini_api_key or raw_request.headers.get("x-gemini-api-key", "")
        effective_api_key = (client_key.strip() if client_key else "") or os.getenv("GEMINI_API_KEY", "")
        if effective_api_key == "YOUR_API_KEY":
            effective_api_key = ""

        garment_map = {
            "ao_dai": "Áo Dài Truyền Thống Việt Nam",
            "ngu_than": "Áo Ngũ Thân & Áo Tấc Triều Nguyễn",
            "nhat_binh": "Áo Nhật Bình Cung Đình Huế",
            "tu_than": "Áo Tứ Thân Kinh Bắc & Yếm Đào",
            "ao_ba_ba": "Áo Bà Ba Nam Bộ & Khăn Rằn",
            "trang_phuc_dan_toc": "Trang Phục Thổ Cẩm Vùng Cao Tây Bắc"
        }
        garment_name = req.garment_name or garment_map.get(req.garment_id, "Cổ Phục Việt Nam")
        desc = req.garment_description or ""
        color = req.color_hex or ""

        prompt = (
            f"Bạn là chuyên gia thẩm định và phối đồ y phục truyền thống Việt Nam (Việt Phục Remix).\n"
            f"Người dùng muốn thử mặc bộ trang phục: {garment_name} {desc}.\n"
            f"Hãy quan sát ảnh chân dung người dùng tải lên và phân tích nét mặt, độ hài hòa và lời khuyên phụ kiện đi kèm."
        )

        analysis = None
        if effective_api_key and req.image_base64:
            try:
                analysis = call_gemini_api(effective_api_key, prompt, req.image_base64, req.image_mime_type or "image/jpeg")
            except Exception as e_try_ana:
                print(f"[Try-on analysis quota/error]: {e_try_ana}")

        if not analysis:
            analysis = (
                f"Khuôn mặt và thần thái của bạn mang nét duyên dáng, đoan trang thuần khiết Á Đông, rất hài hòa với phom dáng của **{garment_name}**. "
                f"Khi khoác lên mình tà y phục này kết hợp cùng kiểu tóc búi trâm và kiềng bạc, tổng thể sẽ toát lên trọn vẹn khí chất Đại Việt mực thước và thanh cao."
            )

        blended_image = None
        if effective_api_key and req.image_base64:
            try:
                models_to_try = [
                    "gemini-2.5-flash",
                    "gemini-2.0-flash"
                ]
                cau_lenh = (
                    f"Bạn là nhiếp ảnh gia thời trang. Hãy ghép khuôn mặt và thần thái người trong ảnh vào bộ trang phục: {garment_name} ({desc}), tông màu {color}.\n"
                    f"Yêu cầu: Giữ nguyên khuôn mặt, làn da của người trong ảnh; trang phục ôm dáng tự nhiên, ánh sáng đồng nhất, liền mạch như ảnh chụp thật."
                )
                raw_b64 = req.image_base64
                if "base64," in raw_b64:
                    raw_b64 = raw_b64.split("base64,")[1]

                parts = [
                    {"inline_data": {"mime_type": req.image_mime_type or "image/jpeg", "data": raw_b64}},
                    {"text": cau_lenh}
                ]
                payload = {"contents": [{"parts": parts}]}
                payload_bytes = json.dumps(payload).encode("utf-8")

                for m in models_to_try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={effective_api_key}"
                    r = urllib.request.Request(url, data=payload_bytes, headers={"Content-Type": "application/json"})
                    try:
                        with urllib.request.urlopen(r, timeout=20) as resp:
                            res_json = json.loads(resp.read().decode("utf-8"))
                            cands = res_json.get("candidates", [])
                            if cands:
                                p_list = cands[0].get("content", {}).get("parts", [])
                                for p in p_list:
                                    if "inlineData" in p and p["inlineData"].get("data"):
                                        m_type = p["inlineData"].get("mimeType", "image/png")
                                        blended_image = f"data:{m_type};base64,{p['inlineData']['data']}"
                                        break
                        if blended_image:
                            break
                    except Exception:
                        continue
            except Exception as e_blend:
                print(f"[Try-on blend error]: {e_blend}")

        return {
            "success": True,
            "status": "success",
            "garment_id": req.garment_id or "ao_dai",
            "garment_name": garment_name,
            "analysis": analysis,
            "blended_image": blended_image,
            "needApiKey": not bool(effective_api_key)
        }
    except Exception as e:
        print(f"[Virtual Try-On Error]: {e}")
        return {
            "success": False,
            "status": "error",
            "message": f"Lỗi thử đồ: {str(e)}",
            "analysis": "Không thể phân tích ảnh lúc này. Vui lòng thử lại sau.",
            "blended_image": None
        }

def generate_english_image_prompt(
    look: Dict[str, Any],
    gender: str = "nu",
    occasion: str = "tet",
    vibe: str = "thanh_lich"
) -> str:
    """Tự động tổng hợp các thuộc tính y phục thành câu lệnh tiếng Anh siêu thực."""
    garment_val = look.get("garment_id") or look.get("garment_name") or "ao_dai"
    colors = []
    if look.get("shirt_color"):
        colors.append(str(look.get("shirt_color")))
    if look.get("palette_names"):
        colors.extend([str(c) for c in look.get("palette_names")[:2]])
    color_val = ", ".join(colors) if colors else "đỏ son"
    bottom_val = look.get("bottom") or "quần lụa trắng"
    headdress_val = look.get("headdress") or "khăn vành"
    acc_items = [look.get("jewelry"), look.get("shoes"), look.get("bag")]
    acc_val = ", ".join([a for a in acc_items if a and a not in ["Không có", "Giữ nguyên", "none"]]) or "kiềng bạc"

    return map_fashion_attributes_to_english_prompt(
        garment_type=garment_val,
        color=color_val,
        pants_skirt=bottom_val,
        hat=headdress_val,
        accessories=acc_val,
        gender=gender,
        occasion=occasion,
        vibe=vibe
    )

def generate_pollinations_url(prompt: str, width: int = 768, height: int = 1024, seed: int = None) -> str:
    """Tạo link ảnh tự động qua Pollinations.ai API với prompt siêu thực.
    
    - safe="" để encode toàn bộ ký tự đặc biệt bao gồm dấu phẩy, ngoặc, dấu tiếng Việt.
    - Thêm width/height để tránh Pollinations trả ảnh nhỏ mặc định.
    - nologo=true loại bỏ watermark trên ảnh.
    - seed để tránh cache ảnh cũ khi prompt giống nhau.
    """
    import random as _random
    _seed = seed if seed is not None else _random.randint(1000, 99999)
    encoded_prompt = urllib.parse.quote(prompt, safe="")
    return (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?width={width}&height={height}&nologo=true&seed={_seed}"
    )

@app.post("/api/recommend")
def recommend_outfit(req: RecommendRequest):
    """
    Gợi ý công thức phối đồ theo Dịp & Vibe + Tự động sinh ảnh ảo hoàn chỉnh qua Pollinations.ai.
    """
    result = engine.generate_styling_consultation(
        query=f"Dịp: {req.occasion}, Giới tính: {req.gender}, Phong cách: {req.vibe or 'truyền thống'}",
        user_gender=req.gender,
        occasion=req.occasion
    )

    look = result.get("look_card", {})
    gender = req.gender or "nu"
    occasion = req.occasion or "tet"
    vibe = req.vibe or look.get("vibe", "thanh_lich")

    # 1. Tổng hợp English Image Prompt chất lượng cao
    english_prompt = generate_english_image_prompt(look, gender=gender, occasion=occasion, vibe=vibe)

    # 2. Sinh image_url tự động qua Pollinations.ai
    image_url = generate_pollinations_url(english_prompt)

    # 3. Đưa image_url và các trường tương ứng vào đối tượng JSON trả về
    result["status"] = "success"
    result["success"] = True
    result["image_url"] = image_url
    result["english_prompt"] = english_prompt
    result["garment_name"] = look.get("garment_name")
    result["analysis"] = result.get("stylist_response") or look.get("etiquette_tip")
    result["outfit"] = {
        "ao": look.get("shirt_color") or look.get("garment_name"),
        "quan_vay": look.get("bottom", "Quần lụa ống rộng"),
        "phu_kien": f"{look.get('shoes', '')}, {look.get('headdress', '')}, {look.get('jewelry', '')}".strip(", ")
    }

    if "look_card" in result and isinstance(result["look_card"], dict):
        result["look_card"]["image_url"] = image_url
        result["look_card"]["english_prompt"] = english_prompt

    return result

# --- CORE FEATURE: Gợi Ý Theo Dịp & Vibe + Sinh Ảnh AI ---
@app.post("/api/generate-outfit-image")
async def generate_outfit_and_image(req: OutfitImageRequest):
    """
    Core API: Nhận thông tin dịp, vibe, giới tính, y phục hoặc các tùy chọn chuẩn hóa
    (garment_type, color, pants_skirt, hat, accessories).
    Sử dụng Google Gemini API với cơ chế try-except an toàn. Nếu gặp lỗi Quota/quá tải,
    hệ thống tự động dùng template prompt mặc định chất lượng cao dựa trực tiếp trên
    các thông số người dùng vừa chọn để gửi sang Pollinations.ai, đảm bảo luôn có ảnh.
    """
    try:
        dip = req.dip.strip() if req.dip else "Tết"
        vibe = req.vibe.strip() if req.vibe else "Thanh Lịch"
        gioi_tinh = req.gioi_tinh.strip() if req.gioi_tinh else "Nữ"
        y_phuc = (req.garment_type or req.y_phuc or "auto").strip()

        # Check API Key
        effective_api_key = req.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        if effective_api_key == "YOUR_API_KEY":
            effective_api_key = ""

        ai_outfit = None
        ai_message = None
        image_prompt = None

        if effective_api_key:
            try:
                system_prompt = (
                    "Bạn là Cô Tư - Nghệ nhân am hiểu sâu sắc về Cổ phục Việt Nam và Việt Phục Remix.\n"
                    "Nhiệm vụ: Tư vấn phối đồ trọn bộ cổ phục Việt Nam dựa trên các yếu tố người dùng cung cấp:\n"
                    f"- Dịp / Hoàn cảnh: {dip}\n"
                    f"- Phong cách (Vibe): {vibe}\n"
                    f"- Giới tính: {gioi_tinh}\n"
                    f"- Y phục ưu tiên: {y_phuc}\n"
                    f"- Tông màu: {req.color or 'tự động'}\n"
                    f"- Quần / Váy: {req.pants_skirt or 'tự động'}\n"
                    f"- Khăn / Nón: {req.hat or 'tự động'}\n"
                    f"- Phụ kiện: {req.accessories or 'tự động'}\n\n"
                    "Hãy đưa ra lời tư vấn chi tiết (phối màu, chất liệu, phụ kiện) ĐỒNG THỜI tạo ra một câu lệnh tiếng Anh "
                    "miêu tả chi tiết hình ảnh thời trang (English Image Prompt) phù hợp với cổ phục Việt Nam.\n\n"
                    "Quy chuẩn về English Image Prompt:\n"
                    "- BẮT BUỘC chứa các từ khóa siêu thực: 'hyper-realistic, 8k resolution, professional studio lighting, detailed traditional Vietnamese fabric and golden embroidery'\n"
                    "- BẮT BUỘC chứa bộ từ khóa nhiếp ảnh: 'Hyper-realistic, photorealistic 8k resolution, cinematic lighting, professional studio photography, sharp focus, highly detailed face and natural skin texture, volumetric lighting, masterpiece, shot on 85mm lens, f/1.8.'\n\n"
                    "BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON VỚI CÁC TRƯỜNG:\n"
                    "{\n"
                    '  "ao": "Tên và chi tiết kiểu áo, màu sắc, hoa văn, chất liệu vải",\n'
                    '  "quan_vay": "Chi tiết quần hoặc váy phối kèm (màu sắc, chất liệu)",\n'
                    '  "phu_kien": "Trọn bộ phụ kiện (giày/guốc mộc, khăn/nón, trang sức kiềng bạc, túi/quạt)",\n'
                    '  "loi_khuyen": "Đoạn văn lời khuyên ấm áp, thanh tao, đậm đà văn hóa từ Cô Tư AI",\n'
                    '  "image_prompt": "Câu lệnh tiếng Anh chi tiết để sinh ảnh thời trang cổ phục Việt"\n'
                    "}"
                )
                raw_ai_res = call_gemini_api(effective_api_key, system_prompt, response_json=True)
                if raw_ai_res:
                    parsed_json = extract_json_from_text(raw_ai_res)
                    if parsed_json and isinstance(parsed_json, dict):
                        ai_outfit = {
                            "ao": parsed_json.get("ao", ""),
                            "quan_vay": parsed_json.get("quan_vay", ""),
                            "phu_kien": parsed_json.get("phu_kien", "")
                        }
                        ai_message = parsed_json.get("loi_khuyen") or parsed_json.get("message")
                        image_prompt = parsed_json.get("image_prompt")
            except Exception as gemini_err:
                print(f"[Gemini Quota/Error in generate-outfit-image]: {gemini_err}. Chuyển sang fallback an toàn.")

        # Fallback tự động nếu Gemini bị lỗi quota, quá tải, hoặc chưa có key
        if not ai_outfit or not ai_outfit.get("ao") or not image_prompt:
            fallback = build_culture_fallback_outfit(dip, vibe, gioi_tinh, y_phuc)
            ai_outfit = {
                "ao": fallback["ao"],
                "quan_vay": req.pants_skirt or fallback["quan_vay"],
                "phu_kien": req.accessories or fallback["phu_kien"]
            }
            if not ai_message:
                ai_message = fallback["loi_khuyen"]
            
            # Xây dựng template prompt chất lượng cao dựa trực tiếp trên các thông số người dùng đã chọn
            image_prompt = map_fashion_attributes_to_english_prompt(
                garment_type=req.garment_type or y_phuc,
                color=req.color or "đỏ son",
                pants_skirt=req.pants_skirt or fallback["quan_vay"],
                hat=req.hat or "khăn vành",
                accessories=req.accessories or fallback["phu_kien"],
                gender=gioi_tinh,
                occasion=dip,
                vibe=vibe
            )

        # Tạo URL Pollinations đầy đủ params (width, height, nologo, seed) để tránh lỗi 402
        image_url = generate_pollinations_url(image_prompt)

        ao_val = ai_outfit.get("ao", "Áo Cổ Phục Truyền Thống Việt Nam")
        quan_vay_val = ai_outfit.get("quan_vay", "Quần lụa trắng Bạch Hạc ống rộng")
        phu_kien_val = ai_outfit.get("phu_kien", "Khăn đóng/khăn vành, guốc mộc và kiềng bạc chạm sen")

        return {
            "status": "success",
            "garment_name": ao_val,
            "analysis": ai_message,
            "outfit": {
                "ao": ao_val,
                "quan_vay": quan_vay_val,
                "phu_kien": phu_kien_val
            },
            "message": ai_message,
            "image_url": image_url,
            "english_prompt": image_prompt
        }

    except Exception as e:
        print(f"[Generate Outfit Image Fallback Error]: {e}")
        # Luôn trả về kết quả hợp lệ kèm ảnh fallback, tuyệt đối không làm sập ứng dụng
        fallback = build_culture_fallback_outfit("Tết", "Thanh Lịch", "Nữ", "ao_dai")
        encoded_prompt = urllib.parse.quote(fallback["image_prompt"], safe="")
        return {
            "status": "success",
            "garment_name": fallback["name"],
            "analysis": fallback["loi_khuyen"],
            "outfit": {
                "ao": fallback["ao"],
                "quan_vay": fallback["quan_vay"],
                "phu_kien": fallback["phu_kien"]
            },
            "message": fallback["loi_khuyen"],
            "image_url": generate_pollinations_url(fallback["image_prompt"]),
            "english_prompt": fallback["image_prompt"]
        }

# --- ENDPOINT TẠO ẢNH PHỐI ĐỒ AI (Studio Gemini Preview) ---
@app.post("/api/generate-outfit-preview")
async def generate_outfit_preview(req: GenerateOutfitPreviewRequest, raw_request: Request):
    """
    Tạo ảnh phối đồ AI theo tùy chọn người dùng:
    - Nhận đầy đủ các trường: garment_type, color, pants_skirt, hat, accessories
    - Chuẩn hóa toàn bộ thành English Image Prompt siêu thực với từ khóa:
      'hyper-realistic, 8k resolution, professional studio lighting, detailed traditional Vietnamese fabric and golden embroidery'
    - Bắt lỗi Quota Exceeded / Quá tải từ Gemini và tự động fallback sang Pollinations.ai,
      đảm bảo người dùng luôn nhận được ảnh chất lượng cao mà không bị lỗi server.
    """
    try:
        # 1. Thu thập API Key
        client_key = req.apiKey or req.gemini_api_key or raw_request.headers.get("x-gemini-api-key", "")
        effective_api_key = (client_key.strip() if client_key else "") or os.getenv("GEMINI_API_KEY", "")
        if effective_api_key == "YOUR_API_KEY":
            effective_api_key = ""

        # 2. Đọc và chuẩn hóa toàn bộ các tùy chọn phối đồ từ frontend
        opts = req.options or {}
        garment_name = (
            req.garment_type
            or opts.get("garment_type")
            or opts.get("garmentName")
            or opts.get("garment_id")
            or "Việt phục truyền thống"
        )
        color_name = (
            req.color
            or opts.get("color")
            or opts.get("colorName")
            or opts.get("colorHex")
            or "Đỏ son / Hoàng kim"
        )
        bottom_val = (
            req.pants_skirt
            or opts.get("pants_skirt")
            or opts.get("bottom")
            or opts.get("bottomType")
            or "Quần lụa ống thụng"
        )
        headdress_val = (
            req.hat
            or opts.get("hat")
            or opts.get("headdress")
            or opts.get("headwear")
            or "Khăn vấn / Nón"
        )
        
        # Gom phụ kiện
        accessories_val = req.accessories or opts.get("accessories") or opts.get("jewelry") or ""
        extra_accs = []
        if accessories_val and accessories_val not in ["Không có", "Giữ nguyên", "none"]:
            extra_accs.append(accessories_val)
        for extra_key in ["shoes", "bag", "jewelry"]:
            val = opts.get(extra_key)
            if val and val not in ["Không có", "Giữ nguyên", "Không mang túi hoặc quạt", "none"] and val not in extra_accs:
                extra_accs.append(val)
        combined_accessories = ", ".join(extra_accs) if extra_accs else "Kiềng bạc hoa sen"

        gender_val = req.gender or opts.get("gender") or "nu"
        occasion_val = req.occasion or opts.get("occasion") or "tet"
        vibe_val = req.vibe or opts.get("vibe") or "thanh_lich"

        # 3. Chuẩn hóa câu lệnh tạo ảnh (Prompt Mapping) đúng tùy chọn và đầy đủ từ khóa siêu thực
        standard_prompt = map_fashion_attributes_to_english_prompt(
            garment_type=garment_name,
            color=color_name,
            pants_skirt=bottom_val,
            hat=headdress_val,
            accessories=combined_accessories,
            gender=gender_val,
            occasion=occasion_val,
            vibe=vibe_val
        )

        # 4. Tải ảnh mẫu nguồn nếu có — chạy trong executor để tránh block event loop
        source_base64 = None
        source_mime = "image/jpeg"
        if req.source_image_url:
            def _download_source_image(img_url: str):
                req_dl = urllib.request.Request(
                    img_url,
                    headers={"User-Agent": "VietPhucRemix/1.0 (fashion-preview)"}
                )
                with urllib.request.urlopen(req_dl, timeout=10) as dl_res:
                    content = dl_res.read()
                    mime = dl_res.headers.get_content_type() or "image/jpeg"
                return content, mime

            try:
                img_url = req.source_image_url
                if "commons.wikimedia.org" in img_url and "/Special:FilePath/" in img_url:
                    img_url += ("&" if "?" in img_url else "?") + "width=1200"

                loop = asyncio.get_running_loop()
                img_bytes, source_mime = await loop.run_in_executor(
                    None, _download_source_image, img_url
                )
                source_base64 = base64.b64encode(img_bytes).decode("utf-8")
            except Exception as dl_err:
                print(f"[Generate Preview] Tải ảnh mẫu thất bại ({type(dl_err).__name__}: {dl_err}), chuyển sang sinh ảnh trực tiếp.")

        # 5. Gọi Gemini Image Generation trong thread riêng (tránh block event loop FastAPI)
        image_result = None
        used_model = None
        quota_exhausted = False

        if effective_api_key:
            try:
                prompt_text = (
                    f"Bạn là chuyên gia thời trang y phục cổ truyền Việt Nam. Hãy tạo một bức ảnh người mẫu chân thực mặc trang phục sau:\n"
                    f"- Y phục: {garment_name}\n"
                    f"- Tông màu: {color_name}\n"
                    f"- Quần/Váy: {bottom_val}\n"
                    f"- Khăn/Nón: {headdress_val}\n"
                    f"- Phụ kiện: {combined_accessories}\n\n"
                    f"Yêu cầu: Chất lượng cao, chi tiết vải sắc nét, ánh sáng tự nhiên, đúng chuẩn văn hóa truyền thống."
                )

                models_to_try = [
                    "gemini-2.5-flash",
                    "gemini-2.0-flash"
                ]

                parts = [{"text": prompt_text}]
                if source_base64:
                    parts.insert(0, {
                        "inline_data": {
                            "mime_type": source_mime,
                            "data": source_base64
                        }
                    })

                payload = {
                    "contents": [{"parts": parts}],
                    "generationConfig": {"temperature": 0.4}
                }
                payload_bytes = json.dumps(payload).encode("utf-8")

                # Định nghĩa hàm blocking TRƯỚC vòng lặp để tránh closure capture stale
                def _call_gemini_sync(model_name: str, _payload_bytes=payload_bytes,
                                      _api_key=effective_api_key) -> Optional[str]:
                    """Blocking urllib call — chạy trong thread executor, không block event loop."""
                    api_url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{model_name}:generateContent?key={_api_key}"
                    )
                    post_req = urllib.request.Request(
                        api_url,
                        data=_payload_bytes,
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(post_req, timeout=25) as api_res:
                        res_json = json.loads(api_res.read().decode("utf-8"))
                    candidates = res_json.get("candidates", [])
                    if not candidates:
                        return None
                    c_parts = candidates[0].get("content", {}).get("parts", [])
                    for p in c_parts:
                        if "inlineData" in p and p["inlineData"].get("data"):
                            img_data = p["inlineData"]["data"]
                            m_type = p["inlineData"].get("mimeType", "image/png")
                            return f"data:{m_type};base64,{img_data}"
                    return None

                loop = asyncio.get_running_loop()
                for model_name in models_to_try:
                    try:
                        img = await loop.run_in_executor(
                            None, _call_gemini_sync, model_name
                        )
                        if img:
                            image_result = img
                            used_model = model_name
                            break
                    except urllib.error.HTTPError as http_err:
                        status_code = http_err.code
                        print(f"[Gemini HTTP {status_code}] {model_name}: {http_err.reason}")
                        # 429 = Quota Exceeded, 503 = Service Unavailable
                        if status_code in (429, 503):
                            quota_exhausted = True
                            print(f"[Gemini Quota/Overload] {model_name}: fallback sang Pollinations.")
                            break  # Không thử model tiếp theo khi quota hết
                        # 4xx khác: thử model tiếp theo
                    except (TimeoutError, OSError) as timeout_err:
                        print(f"[Gemini Timeout] {model_name}: {timeout_err}")
                    except Exception as ex:
                        print(f"[Gemini Exception] {model_name}: {type(ex).__name__}: {ex}")

            except Exception as e_gemini:
                print(f"[Gemini Image General Error]: {type(e_gemini).__name__}: {e_gemini}")

        # 6. Fallback sang Pollinations nếu Gemini lỗi/hết quota
        encoded_prompt = urllib.parse.quote(standard_prompt, safe="")
        # Thêm seed ngẫu nhiên để tránh cache ảnh cũ
        pollinations_seed = random.randint(1000, 9999)
        pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?seed={pollinations_seed}&width=768&height=1024&nologo=true"

        if not image_result:
            _poll_url = pollinations_url  # capture tường minh, tránh closure stale
            def _fetch_pollinations_sync(_url=_poll_url) -> Optional[bytes]:
                req_p = urllib.request.Request(
                    _url,
                    headers={"User-Agent": "VietPhucRemix/1.0"}
                )
                with urllib.request.urlopen(req_p, timeout=20) as p_res:
                    return p_res.read()

            try:
                loop = asyncio.get_running_loop()
                p_bytes = await loop.run_in_executor(None, _fetch_pollinations_sync)
                image_result = f"data:image/jpeg;base64,{base64.b64encode(p_bytes).decode('utf-8')}"
                used_model = "pollinations-remix"
            except Exception as p_err:
                print(f"[Pollinations fallback error]: {type(p_err).__name__}: {p_err}")
                # Cuối cùng: dùng trực tiếp URL (browser tự tải)
                image_result = pollinations_url
                used_model = "pollinations-direct"

        # Đảm bảo LUÔN có ảnh để trả về
        if not image_result:
            image_result = pollinations_url
            used_model = "pollinations-direct"

        # Trả về kết quả — LUÔN success:True khi có ảnh, dù dùng fallback
        return {
            "success": True,
            "status": "success" if used_model not in ("pollinations-remix", "pollinations-direct", "pollinations-fallback") else "fallback",
            "generated_image": image_result,
            "image_url": image_result,
            "generated_model": used_model or "pollinations-remix",
            "english_prompt": standard_prompt,
            "quota_exhausted": quota_exhausted,
            "options_applied": {
                "garment_type": garment_name,
                "color": color_name,
                "pants_skirt": bottom_val,
                "hat": headdress_val,
                "accessories": combined_accessories
            }
        }

    except Exception as e:
        print(f"[Generate Outfit Preview CRITICAL ERROR]: {type(e).__name__}: {e}")
        # Tuyệt đối không để raise 500 HTML. Luôn trả về JSON an toàn với fallback URL.
        fallback_prompt = "hyper-realistic, photorealistic 8k resolution, cinematic lighting, professional studio photography, sharp focus, Vietnamese traditional dress Ao Dai, 85mm lens, f/1.8"
        try:
            fallback_prompt = map_fashion_attributes_to_english_prompt()
        except Exception:
            pass
        enc = urllib.parse.quote(fallback_prompt, safe="")
        fallback_seed = random.randint(100, 9999)
        fallback_url = f"https://image.pollinations.ai/prompt/{enc}?seed={fallback_seed}&width=768&height=1024&nologo=true"
        # Phân loại lỗi để frontend nhận biết
        err_str = str(e)
        err_code = "GEMINI_IMAGE_QUOTA_EXHAUSTED" if any(
            kw in err_str.lower() for kw in ["quota", "429", "rate limit", "resource exhausted"]
        ) else "SERVER_ERROR"
        return JSONResponse(
            status_code=200,  # Trả 200 để frontend không throw, tự xử lý qua field success/code
            content={
                "success": False,
                "status": "fallback",
                "code": err_code,
                "message": (
                    "API tạo ảnh tạm thời hết quota hoặc quá tải. Vui lòng thử lại sau."
                    if err_code == "GEMINI_IMAGE_QUOTA_EXHAUSTED"
                    else f"Dịch vụ AI đang bận ({err_str[:80]}), đã chuyển sang ảnh dự phòng."
                ),
                "image_url": fallback_url,
                "generated_image": fallback_url,
                "generated_model": "pollinations-fallback",
                "english_prompt": fallback_prompt,
                "options_applied": {
                    "garment_type": "Áo Dài",
                    "color": "Đỏ Son",
                    "pants_skirt": "Quần lụa trắng",
                    "hat": "Khăn vành",
                    "accessories": "Kiềng bạc"
                }
            }
        )

# Include routers
app.include_router(image_router)

# Serve Frontend static assets
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
NODE_MODULES_THREE = CURRENT_DIR / "node_modules" / "three"

if NODE_MODULES_THREE.exists():
    app.mount("/vendor/three", StaticFiles(directory=str(NODE_MODULES_THREE)), name="vendor_three")

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    if (FRONTEND_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    @app.get("/")
    def serve_index():
        response = FileResponse(FRONTEND_DIR / "index.html")
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    @app.get("/index.html")
    def serve_index_html():
        return serve_index()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)