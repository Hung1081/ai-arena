"""
Comprehensive Test Suite for Upgraded Vietnamese Traditional Fashion Stylist Web Application.
Verifies all items from "Khái quát ý tưởng Việt phục" Google Sheet specifications.
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    print("✓ Health check endpoint passed")

def test_catalog_upgrades():
    res = client.get("/api/catalog")
    assert res.status_code == 200
    data = res.json()
    
    # Check 6 garments
    garments = data["garments"]
    garment_ids = [g["id"] for g in garments]
    assert "ao_dai" in garment_ids
    assert "ngu_than" in garment_ids
    assert "tu_than" in garment_ids
    assert "nhat_binh" in garment_ids
    assert "ao_ba_ba" in garment_ids
    assert "trang_phuc_dan_toc" in garment_ids
    print("✓ Catalog verified: Includes Áo Bà Ba and Trang Phục Dân Tộc")

    # Check 7 Occasions
    assert "occasions" in data
    occ_ids = [o["id"] for o in data["occasions"]]
    for occ in ["tet", "le_chua", "cuoi_hoi", "le_hoi", "chup_anh", "truong_hoc", "hang_ngay"]:
        assert occ in occ_ids
    print("✓ 7 Occasions verified (Tết, Lễ/Chùa, Cưới hỏi, Lễ hội, Chụp ảnh, Trường học, Hằng ngày)")

    # Check 5 Vibes
    assert "vibes" in data
    vibe_ids = [v["id"] for v in data["vibes"]]
    for v in ["thanh_lich", "co_dien", "toi_gian", "ca_tinh", "nu_tinh"]:
        assert v in vibe_ids
    print("✓ 5 Vibes verified (Thanh lịch, Cổ điển, Tối giản, Cá tính, Nữ tính)")

    # Check components: shoes, bags, headdresses, jewelry, hairstyles
    comps = data["components"]
    assert "shoes" in comps and len(comps["shoes"]) >= 4
    assert "bags" in comps and len(comps["bags"]) >= 4
    assert "headdresses" in comps and len(comps["headdresses"]) >= 5
    assert "jewelry" in comps and len(comps["jewelry"]) >= 4
    assert "hairstyles" in comps and len(comps["hairstyles"]) >= 3
    print("✓ Mix & match components verified: Shoes, Bags, Headdresses, Jewelry, Hairstyles")

def test_chat_ao_ba_ba():
    res = client.post("/api/chat", json={"query": "Tôi muốn diện Áo Bà Ba đi chụp ảnh sông nước miền Tây"})
    assert res.status_code == 200
    data = res.json()
    assert "ao_ba_ba" == data["look_card"]["garment_id"]
    assert "khăn rằn" in data["look_card"]["headdress"].lower() or "khăn rằn" in data["stylist_response"].lower()
    print("✓ Chat Áo Bà Ba Nam Bộ recommendation passed")

def test_chat_ethnic_attire():
    res = client.post("/api/chat", json={"query": "Gợi ý trang phục thổ cẩm dân tộc cá tính vùng cao Tây Bắc"})
    assert res.status_code == 200
    data = res.json()
    assert "trang_phuc_dan_toc" == data["look_card"]["garment_id"]
    print("✓ Chat Ethnic / Thổ Cẩm recommendation passed")

def test_recommend_formula_matrix():
    # Test formula: Áo Dài + Đi học / Sự kiện trường + Thanh lịch
    res = client.post("/api/recommend", json={
        "occasion": "truong_hoc",
        "gender": "nu",
        "vibe": "thanh_lich"
    })
    assert res.status_code == 200
    look = res.json()["look_card"]
    assert "shoes" in look
    assert "bag" in look
    assert "jewelry" in look
    assert "hairstyle" in look
    print("✓ Recommendation formula matrix passed (Attire + Occasion + Vibe + Accessories)")

def test_static_assets():
    res_index = client.get("/")
    assert res_index.status_code == 200
    assert "Áo Bà Ba" in res_index.text
    assert "Trang Phục Dân Tộc" in res_index.text
    print("✓ Frontend index.html served with new components")

if __name__ == "__main__":
    test_health()
    test_catalog_upgrades()
    test_chat_ao_ba_ba()
    test_chat_ethnic_attire()
    test_recommend_formula_matrix()
    test_static_assets()
    print("\nAll upgraded verification tests passed successfully!")
