from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class SimpleOutfitRequest(BaseModel):
    occasion: Optional[str] = "Tết"
    vibe: Optional[str] = "Thanh Lịch"
    gender: Optional[str] = "Nữ Giới"
    dynasty: Optional[str] = "Nguyễn"

@router.post("/api/custom-recommend")
async def custom_recommend(request_data: SimpleOutfitRequest):
    try:
        # Trả về kết quả trực tiếp cho Frontend mà không lo lệch cấu trúc
        return {
            "status": "success",
            "garment_name": f"Áo Dài Cổ Truyền - Dịp {request_data.occasion}",
            "analysis": f"Phối theo phong cách {request_data.vibe}, tôn vinh nét đẹp văn hóa triều đại {request_data.dynasty}.",
            "image_url": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))