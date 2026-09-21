"""
FastAPI Server for Vietnamese Traditional Fashion Stylist Web Application.
Provides APIs for AI consultation, wardrobe catalog, and serves the frontend.
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.stylist_engine import TraditionalStylistEngine

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

import base64
import json
import urllib.request
import urllib.error

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

def call_gemini_api(api_key: str, prompt: str, image_base64: Optional[str] = None, image_mime: str = "image/jpeg") -> Optional[str]:
    """Call Google Gemini 1.5 Flash / 2.0 Flash directly via REST API."""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None

    # Supported model endpoints
    models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]

    parts = [{"text": prompt}]
    if image_base64:
        # Strip header if present
        if "base64," in image_base64:
            image_base64 = image_base64.split("base64,")[1]
        parts.append({
            "inline_data": {
                "mime_type": image_mime,
                "data": image_base64
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000
        }
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
            with urllib.request.urlopen(req, timeout=25) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if candidates:
                    first_candidate = candidates[0]
                    content = first_candidate.get("content", {})
                    candidate_parts = content.get("parts", [])
                    if candidate_parts:
                        return candidate_parts[0].get("text", "")
        except Exception as e:
            # Try next model fallback
            continue

    return None

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
    
    # 1. Base stylist engine styling consultation
    result = engine.generate_styling_consultation(
        query=req.query,
        user_gender=req.gender,
        occasion=req.occasion,
        preferred_dynasty=req.dynasty
    )

    # 2. Check if user provided an image or explicitly wants Gemini
    effective_api_key = req.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    
    if effective_api_key:
        look = result.get("look_card", {})
        garment_name = look.get("garment_name", "Áo Cổ Phục Việt Nam")
        
        system_instructions = (
            "Bạn là Cô Tư - nghệ nhân y phục truyền thống Việt Nam (Cổ Phục Stylist & Việt Phục Remix). "
            "Bạn am hiểu sâu sắc về Áo Dài, Áo Ngũ Thân, Áo Nhật Bình, Áo Tứ Thân, Áo Bà Ba, Trang Phục Dân Tộc. "
            "Công thức chuẩn: Trang Phục Truyền Thống + Hoàn Cảnh/Dịp + Phong Cách (Vibe). "
            "Hãy xưng hô 'Cô Tư' và gọi người dùng là 'bạn hữu' hoặc 'quý bạn'. "
            "Giọng văn đôn hậu, am hiểu điển lễ, thanh tao và mang hào khí Đại Việt."
        )

        if req.image_base64:
            prompt = (
                f"{system_instructions}\n\n"
                f"Người dùng vừa gửi ảnh chân dung/khuôn mặt của họ và đưa ra yêu cầu: '{req.query}'.\n"
                f"Tạo hình cổ phục đề xuất: {garment_name}.\n\n"
                f"Nhiệm vụ của bạn:\n"
                f"1. Nhìn ảnh người dùng, nhận xét vóc dáng, gương mặt, cốt cách và màu da một cách tinh tế, lịch thiệp.\n"
                f"2. Tư vấn xem bộ y phục '{garment_name}' hoặc bộ cổ phục người đó chọn sẽ tôn lên vẻ đẹp của họ như thế nào.\n"
                f"3. Đưa ra hướng dẫn cụ thể về cách ghép khuôn mặt họ vào bộ cổ phục: từ góc mặt, kiểu tóc búi/buông, đến cách đội khăn vấn/khăn đóng và màu sắc tôn da.\n"
                f"4. Trả lời bằng tiếng Việt trang trọng, ấm áp, định dạng markdown đẹp mắt."
            )
            ai_reply = call_gemini_api(effective_api_key, prompt, req.image_base64, req.image_mime_type)
        else:
            prompt = (
                f"{system_instructions}\n\n"
                f"Yêu cầu của người dùng: '{req.query}'.\n"
                f"Gợi ý trang phục từ hệ thống: {garment_name} (Màu: {look.get('shirt_color', '')}, Quần: {look.get('bottom', '')}, Phụ kiện: {look.get('jewelry', '')}).\n\n"
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

    # Garment metadata
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
        f"Hãy quan sát ảnh chân dung người dùng tải lên và phân tích:\n"
        f"1. Tỷ lệ khuôn mặt, nét đẹp đặc trưng và thần thái.\n"
        f"2. Độ hài hòa và tương thích khi ghép người này vào bộ {garment_name}.\n"
        f"3. Lời khuyên hòa sắc: màu áo, kiểu tóc và phụ kiện đi kèm để toát lên khí chất Đại Việt đẹp nhất.\n"
        f"Hãy trả lời ngắn gọn, tinh tế, truyền cảm hứng (khoảng 3-4 đoạn văn markdown)."
    )

    analysis = None
    if effective_api_key:
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
    uvicorn.run("backend.main.py:app", host="0.0.0.0", port=8000, reload=True)
