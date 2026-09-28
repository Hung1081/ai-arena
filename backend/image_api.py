from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import google.generativeai as genai

router = APIRouter()

class OutfitImageRequest(BaseModel):
    dip: str
    vibe: str
    gioi_tinh: str
    y_phuc: str

@router.post("/api/generate-outfit-image")
async def generate_outfit_and_image(request_data: OutfitImageRequest):
    try:
        # Cấu hình Gemini API (Lấy key từ biến môi trường hoặc cấu hình sẵn của bạn)
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"Tư vấn y phục truyền thống Việt Nam cho: Dịp '{request_data.dip}', Vibe '{request_data.vibe}', Giới tính '{request_data.gioi_tinh}', Y phục '{request_data.y_phuc}'. Trả về định dạng tư vấn chi tiết."
            # Gọi Gemini lấy nội dung chữ tư vấn
            # ai_response = model.generate_content(prompt)

        # Dữ liệu trả về cho giao diện (Bao gồm thông tin phối đồ và link ảnh minh họa thực tế)
        # Bạn có thể thay đổi link ảnh bên dưới bằng ảnh do DALL-E hoặc Stable Diffusion sinh ra
        return {
            "status": "success",
            "outfit": {
                "ao": f"Áo dài/Ngũ thân thiết kế riêng cho {request_data.dip}",
                "quan_vay": "Quần lụa truyền thống",
                "giay": "Hài thêu hoa",
                "khan_non": "Khăn đóng hoặc Mấn đồng bộ"
            },
            "message": f"Tuyệt vời! Bộ trang phục mang phong cách {request_data.vibe} sẽ giúp bạn tỏa sáng trong dịp {request_data.dip}.",
            "image_url": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b" 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))