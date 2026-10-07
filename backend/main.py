"""
FastAPI Server for Vietnamese Traditional Fashion Stylist Web Application.
Provides APIs for AI consultation, wardrobe catalog, and serves the frontend.
"""

import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
import base64
import json
import random
import re
import urllib.request
import urllib.error
import urllib.parse

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

class RecommendRequest(BaseModel):
    occasion: Optional[str] = "tet"
    gender: Optional[str] = "nu"
    vibe: Optional[str] = "thanh_lich"
    element: Optional[str] = None

class OutfitImageRequest(BaseModel):
    dip: str
    vibe: str
    gioi_tinh: str
    y_phuc: str
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

def build_culture_fallback_outfit(dip: str, vibe: str, gioi_tinh: str, y_phuc: str) -> Dict[str, Any]:
    """Generates authentic Vietnamese traditional outfit styling & high-quality English image prompt."""
    is_male = "nam" in gioi_tinh.lower()
    model_gender_en = "Vietnamese handsome young man" if is_male else "Vietnamese graceful elegant young woman"
    
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

    # Style profiles
    profiles = {
        "ao_dai": {
            "name": "Áo Dài Truyền Thống",
            "ao": f"Áo Dài dáng suông thướt tha, chất liệu lụa tơ tằm Vạn Phúc dệt vân mây, sắc đỏ son hòa hoàng kim thanh nhã, tôn lên cốt cách trang nhã cho dịp {dip}.",
            "quan_vay": "Quần lụa Bạch Hạc ống rộng óng ả, buông rủ chấm gót theo từng bước đi.",
            "phu_kien": "Khăn vành dây hoặc khăn đóng đen truyền thống, kiềng bạc chạm hoa sen, guốc mộc quai nhung đỏ thắm, tay cầm đóa hoa sen thanh khiết.",
            "prompt": f"A photorealistic 8k cinematic portrait of a {model_gender_en} wearing an authentic Vietnamese Ao Dai made of premium red silk with delicate golden lotus embroidery, standing gracefully in Hoi An ancient town surrounded by warm lantern lights, soft morning light, hyper-detailed silk textile texture, cinematic depth of field, sharp focus, award-winning cultural fashion photography."
        },
        "ngu_than": {
            "name": "Áo Ngũ Thân (Áo Tấc & Tay Chẽn)",
            "ao": f"Áo Ngũ Thân tay chẽn hoặc Áo Tấc uy nghi, chất liệu lụa Hà Đông dệt họa tiết chữ Thọ và hoa văn cổ triều Nguyễn, phom suông mực thước đúng chuẩn điển lễ.",
            "quan_vay": "Quần lụa sa trắng hoặc đen than tuyền, phom đứng đắn và trang trọng.",
            "phu_kien": "Khăn đóng đen 7 nếp truyền thống, quạt tiêu trúc nan tre, chuỗi hạt bồ đề hoặc kiềng bạc, giày da thủ công hoặc guốc mộc.",
            "prompt": f"A cinematic 8k photorealistic portrait of an authentic {model_gender_en} wearing traditional Vietnamese Ngu Than dynastic tunic in deep indigo and dark gold silk, standing in front of an ancient Vietnamese temple wooden pavilion, misty morning atmosphere, intricate embroidery details, masterpiece, sharp focus, cultural heritage fashion."
        },
        "tu_than": {
            "name": "Áo Tứ Thân & Yếm Đào",
            "ao": "Áo Tứ Thân bốn vạt tha thướt thắt nút eo duyên dáng, lấp ló mép yếm đào thắm dệt lụa tơ tằm, dải thắt lưng lụa xanh thiên thanh mềm mại.",
            "quan_vay": "Váy đụp lụa đen bồng bềnh e ấp theo từng nhịp bước chân.",
            "phu_kien": "Nón ba tầm (nón quai thao) buộc dải thao tơ, khăn mỏ quạ nhung đen, xà tích bạc lấp lánh bên hông, guốc mộc cong Kinh Bắc.",
            "prompt": f"A photorealistic 8k cinematic portrait of a beautiful {model_gender_en} wearing a traditional Vietnamese Tu Than folk costume with silk pink bib (Yem Dao) and flowing outer robes, holding a large traditional Quan Ho flat palm hat (Non Quai Thao), set against a peaceful ancient Northern Vietnamese village with water lily pond, soft diffused sunlight, ultra-detailed fabric texture, cultural masterpiece."
        },
        "nhat_binh": {
            "name": "Áo Nhật Bình Cung Đình",
            "ao": "Áo Nhật Bình gấm hoàng gia màu đỏ chu sa hoặc vàng hoàng yến, cổ áo chữ nhật thêu phượng vũ và hoa cúc tinh xảo, dải viền ngũ sắc tượng trưng cho ngũ hành tương sinh.",
            "quan_vay": "Quần lụa trắng Bạch Hạc dệt vân mây chìm trang nhã.",
            "phu_kien": "Khăn vành dây xanh thiên thanh hoàng tộc, kiềng bạc nguyên khối chạm lộng họa tiết hoa sen, guốc mộc sơn son thếp vàng, quạt lụa thêu chim hạc.",
            "prompt": f"A magnificent photorealistic 8k cinematic portrait of a regal {model_gender_en} wearing a traditional Vietnamese royal Nhat Binh attire in radiant ruby red silk and gold brocade with ornate rectangular collar embroidery, standing inside the Imperial Citadel of Hue with ancient royal architecture, golden hour ambient lighting, hyper-realistic fabric details, cinematic masterpiece."
        },
        "ao_ba_ba": {
            "name": "Áo Bà Ba Nam Bộ",
            "ao": "Áo Bà Ba xẻ tà nhẹ nhàng bằng lụa satin bóng nhẹ màu ngọc bích hoặc mỡ gà, cổ tròn trang nhã mang hơi thở mộc mạc, phóng khoáng của miền sông nước.",
            "quan_vay": "Quần lụa đen rủ mềm mại, mang lại cảm giác thoải mái, thanh thoát.",
            "phu_kien": "Khăn rằn Nam Bộ kẻ caro đen trắng quàng cổ, nón lá chằm duyên dáng, guốc mộc mộc mạc.",
            "prompt": f"A cinematic 8k photorealistic portrait of a gentle {model_gender_en} wearing a traditional southern Vietnamese Ao Ba Ba made of soft pastel silk, holding a conical leaf hat (Non La) by a serene Mekong river pier at sunset, golden reflective water, authentic cultural Vietnamese portrait, highly detailed."
        },
        "trang_phuc_dan_toc": {
            "name": "Trang Phục Thổ Cẩm Dân Tộc Tây Bắc",
            "ao": "Áo chàm thổ cẩm dệt thủ công với họa tiết kỷ hà và hoa văn đính bạc độc bản, nhuộm màu tự nhiên từ vỏ cây rừng Tây Bắc.",
            "quan_vay": "Váy xòe thổ cẩm nhiều tầng rực rỡ sắc màu, chuyển động mềm mại theo từng bước chân.",
            "phu_kien": "Mũ đội đầu đính đồng bạc xủng xoảng, vòng kiềng cổ bạc trạm trổ thủ công, túi thổ cẩm thêu tay.",
            "prompt": f"A stunning photorealistic 8k cinematic portrait of a {model_gender_en} wearing authentic northwest Vietnamese ethnic minority brocade attire with vibrant hand-woven patterns and silver ornaments, set against misty green terrace fields of Sapa in morning mist, hyper-detailed texture, sharp focus, award-winning travel photography."
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
        "status": "online",
        "message": "Vietnamese Traditional Stylist Server is operational.",
        "server": "Cô Tư Cổ Phục Stylist API (FastAPI)",
        "geminiKeyConfigured": has_key,
        "soKhoaDuPhong": 1 if has_key else 0
    }

@app.get("/api/catalog")
def get_catalog():
    return engine.get_catalog()

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

    return result

@app.post("/api/try-on")
def virtual_try_on(req: TryOnRequest, raw_request: Request):
    """Virtual Try-On analysis endpoint using Gemini Vision + Image Generation."""
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
            analysis = call_gemini_api(effective_api_key, prompt, req.image_base64, req.image_mime_type or "image/jpeg")

        if not analysis:
            analysis = (
                f"Khuôn mặt và thần thái của bạn mang nét duyên dáng, đoan trang thuần khiết Á Đông, rất hài hòa với phom dáng của **{garment_name}**. "
                f"Khi khoác lên mình tà y phục này kết hợp cùng kiểu tóc búi trâm và kiềng bạc, tổng thể sẽ toát lên trọn vẹn khí chất Đại Việt mực thước và thanh cao."
            )

        blended_image = None
        if effective_api_key and req.image_base64:
            try:
                models_to_try = [
                    "gemini-3.1-flash-lite-image",
                    "gemini-3.1-flash-image",
                    "gemini-2.5-flash"
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
    """
    Tự động tổng hợp các thuộc tính thành câu lệnh tạo ảnh tiếng Anh (English Image Prompt)
    thật chi tiết và chất lượng cao theo đúng yêu cầu:
    A photorealistic 8k cinematic portrait of a Vietnamese model wearing traditional [tên áo dài/ngũ thân],
    color scheme [màu sắc], style [vibe], traditional Vietnamese background, highly detailed, masterclass photography, beautiful lighting.
    """
    is_male = "nam" in gender.lower() or gender == "male"
    model_str = "Vietnamese handsome male model" if is_male else "Vietnamese beautiful elegant female model"

    garment_name = look.get("garment_name", "Áo Dài Việt Nam")
    garment_id = look.get("garment_id", "")

    garment_en_map = {
        "ao_dai": "traditional Vietnamese Ao Dai silk dress",
        "ngu_than": "traditional Vietnamese Ngu Than dynastic royal robe (Ao Tac)",
        "tu_than": "traditional Vietnamese Tu Than folk costume with pink silk Yem bib and flowing outer robes",
        "nhat_binh": "traditional Vietnamese royal Nhat Binh robe with ornate rectangular embroidered collar",
        "ao_ba_ba": "traditional southern Vietnamese Ao Ba Ba silk blouse",
        "trang_phuc_dan_toc": "traditional Vietnamese ethnic minority brocade attire with vibrant handwoven patterns"
    }

    garment_en = garment_en_map.get(garment_id)
    if not garment_en:
        g_low = garment_name.lower()
        if "nhật bình" in g_low:
            garment_en = "traditional Vietnamese royal Nhat Binh robe"
        elif "ngũ thân" in g_low or "áo tấc" in g_low:
            garment_en = "traditional Vietnamese Ngu Than dynastic royal robe"
        elif "tứ thân" in g_low or "yếm" in g_low:
            garment_en = "traditional Vietnamese Tu Than folk costume"
        elif "bà ba" in g_low:
            garment_en = "traditional southern Vietnamese Ao Ba Ba silk blouse"
        elif "thổ cẩm" in g_low or "dân tộc" in g_low:
            garment_en = "traditional Vietnamese ethnic minority brocade attire"
        else:
            garment_en = "traditional Vietnamese Ao Dai silk dress"

    # Color scheme
    colors = []
    if look.get("shirt_color"):
        colors.append(look.get("shirt_color"))
    if look.get("palette_names"):
        colors.extend(look.get("palette_names")[:2])
    color_scheme = ", ".join(colors) if colors else "vermilion red, imperial gold and jade green"

    # Vibe style
    vibe_map = {
        "thanh_lich": "elegant, graceful and poetic",
        "co_dien": "vintage, classical dynastic royal heritage",
        "toi_gian": "minimalist, neat and pure simplicity",
        "ca_tinh": "bold, unique avant-garde cultural fusion",
        "nu_tinh": "gentle, soft, graceful and feminine"
    }
    vibe_style = vibe_map.get(vibe.lower(), vibe)

    # Background setting based on occasion
    bg_map = {
        "tet": "festive Vietnamese Tet Spring atmosphere with blooming peach blossoms and ancient wooden architecture",
        "le_chua": "serene ancient Vietnamese Buddhist pagoda courtyard with incense mist and lotus pond",
        "cuoi_hoi": "luxurious traditional Vietnamese royal wedding ceremony pavilion with lanterns and floral decor",
        "le_hoi": "vibrant traditional Vietnamese folk festival courtyard with ancient brick walls",
        "chup_anh": "cinematic courtyard of Hue Imperial Citadel or Hoi An ancient lantern town",
        "truong_hoc": "vintage Indochine architecture campus with sunlit corridor",
        "hang_ngay": "contemporary aesthetic Vietnamese tea house with vintage wooden interior"
    }
    bg_desc = bg_map.get(occasion.lower(), "traditional Vietnamese architectural background")

    # Prompt format
    prompt = (
        f"A photorealistic 8k cinematic portrait of a {model_str} wearing {garment_en}, "
        f"color scheme {color_scheme}, style {vibe_style}, {bg_desc}, "
        f"highly detailed, masterclass photography, beautiful lighting, sharp focus."
    )
    return prompt

def generate_pollinations_url(prompt: str) -> str:
    """Tạo link ảnh tự động qua Pollinations.ai API chuẩn tỷ lệ 800x1000."""
    encoded_prompt = urllib.parse.quote(prompt)
    seed = random.randint(100000, 999999)
    return f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=1000&nologo=true&seed={seed}"

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
    Core API: Nhận thông tin dịp, vibe, giới tính, y phục.
    Sử dụng Google Gemini API để tư vấn chi tiết và sinh English Image Prompt.
    Tạo link ảnh thực tế qua Pollinations.ai và trả về chuẩn JSON.
    """
    try:
        dip = req.dip.strip() if req.dip else "Tết"
        vibe = req.vibe.strip() if req.vibe else "Thanh Lịch"
        gioi_tinh = req.gioi_tinh.strip() if req.gioi_tinh else "Nữ"
        y_phuc = req.y_phuc.strip() if req.y_phuc else "auto"

        # Check API Key
        effective_api_key = req.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")

        ai_outfit = None
        ai_message = None
        image_prompt = None

        if effective_api_key and effective_api_key != "YOUR_API_KEY":
            system_prompt = (
                "Bạn là Cô Tư - Nghệ nhân am hiểu sâu sắc về Cổ phục Việt Nam và Việt Phục Remix.\n"
                "Nhiệm vụ: Tư vấn phối đồ trọn bộ cổ phục Việt Nam dựa trên 4 yếu tố người dùng cung cấp:\n"
                f"- Dịp / Hoàn cảnh: {dip}\n"
                f"- Phong cách (Vibe): {vibe}\n"
                f"- Giới tính: {gioi_tinh}\n"
                f"- Y phục ưu tiên: {y_phuc}\n\n"
                "Hãy đưa ra lời tư vấn chi tiết (phối màu, chất liệu, phụ kiện) ĐỒNG THỜI tạo ra một câu lệnh tiếng Anh "
                "miêu tả chi tiết hình ảnh thời trang (English Image Prompt) phù hợp với cổ phục Việt Nam "
                "(Ví dụ: 'A photorealistic 8k cinematic portrait of a Vietnamese model wearing traditional...').\n\n"
                "Quy chuẩn về English Image Prompt:\n"
                "- Phải mô tả chân dung người mẫu Việt Nam đúng giới tính và thần thái theo vibe.\n"
                "- Phải mô tả chính xác cổ phục Việt Nam (Áo Dài, Áo Nhật Bình, Áo Ngũ Thân, Áo Tứ Thân, Áo Bà Ba, hoặc Thổ Cẩm Tây Bắc).\n"
                "- Chi tiết chất liệu vải (lụa tơ tằm, gấm hoa, the), màu sắc ngũ hành tương sinh, hoa văn dệt thêu truyền thống.\n"
                "- Phụ kiện: khăn vành / khăn đóng / nón quai thao / kiềng bạc / guốc mộc / quạt trúc.\n"
                "- Bối cảnh cổ kính Việt Nam (Huế Citadel, Hoi An Ancient Town, ancient temple courtyard, soft cinematic light).\n"
                "- Chất lượng: 'masterpiece, photorealistic 8k, cinematic portrait, intricate fabric texture, award-winning photography, highly detailed, sharp focus'.\n\n"
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

        # Fallback if Gemini is not configured or failed to parse
        if not ai_outfit or not ai_outfit.get("ao") or not image_prompt:
            fallback = build_culture_fallback_outfit(dip, vibe, gioi_tinh, y_phuc)
            ai_outfit = {
                "ao": fallback["ao"],
                "quan_vay": fallback["quan_vay"],
                "phu_kien": fallback["phu_kien"]
            }
            if not ai_message:
                ai_message = fallback["loi_khuyen"]
            if not image_prompt:
                image_prompt = fallback["image_prompt"]

        # Generate Pollinations.ai image URL chuẩn 800x1000
        encoded_prompt = urllib.parse.quote(image_prompt)
        seed = random.randint(100000, 999999)
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=1000&nologo=true&seed={seed}"

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
            "image_url": image_url
        }

    except Exception as e:
        # Graceful error handling
        return {
            "status": "error",
            "message": f"Không thể xử lý yêu cầu gợi ý y phục: {str(e)}"
        }

# --- ENDPOINT TẠO ẢNH PHỐI ĐỒ AI (Studio Gemini Preview) ---
@app.post("/api/generate-outfit-preview")
async def generate_outfit_preview(req: GenerateOutfitPreviewRequest, raw_request: Request):
    """
    Tạo ảnh biến thể y phục ảo từ ảnh mẫu (hoặc sinh ảnh mới) sử dụng Google Gemini Image API
    với cơ chế bắt lỗi an toàn và fallback sang Pollinations.
    """
    try:
        # 1. Thu thập API Key
        client_key = req.apiKey or req.gemini_api_key or raw_request.headers.get("x-gemini-api-key", "")
        effective_api_key = (client_key.strip() if client_key else "") or os.getenv("GEMINI_API_KEY", "")
        if effective_api_key == "YOUR_API_KEY":
            effective_api_key = ""

        # 2. Đọc các tùy chọn phối đồ
        opts = req.options or {}
        garment_name = opts.get("garmentName") or "Việt phục truyền thống"
        color_name = opts.get("colorName") or opts.get("colorHex") or "Đỏ son / Hoàng kim"
        bottom_val = opts.get("bottom") or "Quần lụa ống thụng"
        headdress_val = opts.get("headdress") or "Khăn vấn / Nón"
        jewelry_val = opts.get("jewelry") or "Kiềng bạc"
        shoes_val = opts.get("shoes") or "Guốc mộc"
        bag_val = opts.get("bag") or "Túi cói"
        hair_val = opts.get("hairstyle") or "Tóc vấn"

        # 3. Tải ảnh mẫu nguồn nếu có
        source_base64 = None
        source_mime = "image/jpeg"
        if req.source_image_url:
            try:
                img_url = req.source_image_url
                if "commons.wikimedia.org" in img_url and "/Special:FilePath/" in img_url:
                    if "?" in img_url:
                        img_url += "&width=1200"
                    else:
                        img_url += "?width=1200"

                req_dl = urllib.request.Request(
                    img_url,
                    headers={"User-Agent": "VietPhucRemix/1.0 (fashion-preview)"}
                )
                with urllib.request.urlopen(req_dl, timeout=12) as dl_res:
                    img_bytes = dl_res.read()
                    source_mime = dl_res.headers.get_content_type() or "image/jpeg"
                    source_base64 = base64.b64encode(img_bytes).decode("utf-8")
            except Exception as dl_err:
                print(f"[Generate Preview] Tải ảnh mẫu thất bại ({dl_err}), chuyển sang sinh ảnh trực tiếp.")

        # 4. Thử gọi Gemini Image Generation nếu có API key
        image_result = None
        used_model = None

        if effective_api_key:
            prompt_text = (
                f"Bạn là chuyên gia thời trang y phục cổ truyền Việt Nam. Hãy tạo một bức ảnh người mẫu chân thực mặc trang phục sau:\n"
                f"- Y phục: {garment_name}\n"
                f"- Tông màu: {color_name}\n"
                f"- Quần/Váy: {bottom_val}\n"
                f"- Khăn/Nón: {headdress_val}\n"
                f"- Trang sức: {jewelry_val}\n"
                f"- Giày dép: {shoes_val}\n"
                f"- Kiểu tóc: {hair_val}\n\n"
                f"Yêu cầu: Chất lượng cao, chi tiết vải sắc nét, ánh sáng tự nhiên, đúng chuẩn văn hóa truyền thống."
            )

            models_to_try = [
                "gemini-3.1-flash-lite-image",
                "gemini-3.1-flash-image",
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

            for model_name in models_to_try:
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={effective_api_key}"
                post_req = urllib.request.Request(
                    api_url,
                    data=payload_bytes,
                    headers={"Content-Type": "application/json"}
                )
                try:
                    with urllib.request.urlopen(post_req, timeout=25) as api_res:
                        res_json = json.loads(api_res.read().decode("utf-8"))
                        candidates = res_json.get("candidates", [])
                        if candidates:
                            c_parts = candidates[0].get("content", {}).get("parts", [])
                            for p in c_parts:
                                if "inlineData" in p and p["inlineData"].get("data"):
                                    img_data = p["inlineData"]["data"]
                                    m_type = p["inlineData"].get("mimeType", "image/png")
                                    image_result = f"data:{m_type};base64,{img_data}"
                                    used_model = model_name
                                    break
                    if image_result:
                        break
                except urllib.error.HTTPError as http_err:
                    print(f"[Gemini Image {http_err.code}] {model_name}: {http_err.reason}")
                except Exception as ex:
                    print(f"[Gemini Image Error] {model_name}: {ex}")

        # 5. Fallback tạo ảnh thời trang chất lượng cao qua Pollinations nếu Gemini không có quota Image
        if not image_result:
            try:
                pollinations_prompt = (
                    f"Full body fashion photography, realistic Vietnamese traditional attire {garment_name}, "
                    f"color {color_name}, with {headdress_val}, {jewelry_val}, {bottom_val}, {shoes_val}, "
                    f"historic architecture palace background, cinematic lighting, 8k resolution, photorealistic"
                )
                encoded = urllib.parse.quote(pollinations_prompt)
                seed = random.randint(100000, 999999)
                p_url = f"https://image.pollinations.ai/prompt/{encoded}?width=768&height=1024&nologo=true&seed={seed}"

                req_p = urllib.request.Request(p_url, headers={"User-Agent": "VietPhucRemix/1.0"})
                with urllib.request.urlopen(req_p, timeout=20) as p_res:
                    p_bytes = p_res.read()
                    image_result = f"data:image/jpeg;base64,{base64.b64encode(p_bytes).decode('utf-8')}"
                    used_model = "pollinations-remix"
            except Exception as p_err:
                print(f"[Pollinations Fallback Error]: {p_err}")

        if not image_result:
            if not effective_api_key:
                return {
                    "success": False,
                    "needApiKey": True,
                    "message": "Chưa có khóa Gemini API. Hãy nhập khóa tại mục Cài Đặt trên trang web."
                }
            return {
                "success": False,
                "code": "GEMINI_IMAGE_QUOTA_EXHAUSTED",
                "message": "Không thể tạo ảnh do giới hạn quota Google API. Vui lòng thử lại sau giây lát."
            }

        return {
            "success": True,
            "generated_image": image_result,
            "generated_model": used_model or "gemini-ai"
        }

    except Exception as e:
        print(f"[Generate Outfit Preview Error]: {e}")
        return {
            "success": False,
            "message": f"Lỗi tạo ảnh phối đồ: {str(e)}"
        }

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