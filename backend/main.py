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

from fastapi import FastAPI, HTTPException
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
    image_base64: str
    image_mime_type: Optional[str] = "image/jpeg"
    garment_id: str
    gemini_api_key: Optional[str] = None
    query: Optional[str] = None

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
    return {"status": "ok", "message": "Vietnamese Traditional Stylist Server is operational."}

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
def virtual_try_on(req: TryOnRequest):
    """Virtual Try-On analysis endpoint using Gemini Vision."""
    effective_api_key = req.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    garment_id = req.garment_id

    garment_map = {
        "ao_dai": "Áo Dài Truyền Thống Việt Nam",
        "ngu_than": "Áo Ngũ Thân & Áo Tấc Triều Nguyễn",
        "nhat_binh": "Áo Nhật Bình Cung Đình Huế",
        "tu_than": "Áo Tứ Thân Kinh Bắc & Yếm Đào",
        "ao_ba_ba": "Áo Bà Ba Nam Bộ & Khăn Rằn",
        "trang_phuc_dan_toc": "Trang Phục Thổ Cẩm Vùng Cao Tây Bắc"
    }
    garment_name = garment_map.get(garment_id, "Cổ Phục Việt Nam")

    prompt = (
        f"Bạn là chuyên gia thẩm định và phối đồ y phục truyền thống Việt Nam (Việt Phục Remix).\n"
        f"Người dùng muốn thử mặc bộ trang phục: {garment_name}.\n"
        f"Hãy quan sát ảnh chân dung người dùng tải lên và phân tích nét mặt, độ hài hòa và lời khuyên phụ kiện đi kèm."
    )

    analysis = None
    if effective_api_key and effective_api_key != "YOUR_API_KEY":
        analysis = call_gemini_api(effective_api_key, prompt, req.image_base64, req.image_mime_type)

    if not analysis:
        analysis = (
            f"Khuôn mặt và thần thái của bạn mang nét duyên dáng, đoan trang thuần khiết Á Đông, rất hài hòa với phom dáng của **{garment_name}**. "
            f"Khi khoác lên mình tà y phục này kết hợp cùng kiểu tóc búi trâm và kiềng bạc, tổng thể sẽ toát lên trọn vẹn khí chất Đại Việt mực thước và thanh cao."
        )

    return {
        "status": "success",
        "garment_id": garment_id,
        "garment_name": garment_name,
        "analysis": analysis
    }

@app.post("/api/recommend")
def recommend_outfit(req: RecommendRequest):
    result = engine.generate_styling_consultation(
        query=f"Dịp: {req.occasion}, Giới tính: {req.gender}, Phong cách: {req.vibe or 'truyền thống'}",
        user_gender=req.gender,
        occasion=req.occasion
    )
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

        # Generate Pollinations.ai image URL
        encoded_prompt = urllib.parse.quote(image_prompt)
        seed = random.randint(100000, 999999)
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={seed}"

        return {
            "status": "success",
            "outfit": {
                "ao": ai_outfit.get("ao", "Áo Cổ Phục Truyền Thống Việt Nam"),
                "quan_vay": ai_outfit.get("quan_vay", "Quần lụa trắng Bạch Hạc ống rộng"),
                "phu_kien": ai_outfit.get("phu_kien", "Khăn đóng/khăn vành, guốc mộc và kiềng bạc chạm sen")
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

# Include routers
app.include_router(image_router)

# Serve Frontend static assets
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    def serve_index():
        response = FileResponse(FRONTEND_DIR / "index.html")
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)