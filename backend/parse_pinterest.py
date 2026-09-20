import re
import json

path = "/Users/hung/.gemini/antigravity/brain/0a941e64-e405-4768-802a-13e313b4dbf6/.system_generated/steps/110/content.md"

with open(path, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

# Look for <script id="__PWS_DATA__" or similar JSON script blocks
json_blobs = re.findall(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL)
print(f"Found {len(json_blobs)} JSON script blocks")

extracted_pins = []

for blob in json_blobs:
    try:
        data = json.loads(blob)
        # Search recursively for pin data
        def search_dict(d):
            if isinstance(d, dict):
                if "images" in d and ("description" in d or "title" in d or "grid_title" in d or "closeup_unified_description" in d):
                    orig = d.get("images", {}).get("orig", {}).get("url") or d.get("images", {}).get("736x", {}).get("url") or d.get("images", {}).get("474x", {}).get("url")
                    title = d.get("title") or d.get("grid_title") or d.get("closeup_unified_description") or d.get("description") or ""
                    if orig:
                        extracted_pins.append({
                            "url": orig,
                            "title": title[:100],
                            "desc": (d.get("description") or "")[:200]
                        })
                for v in d.values():
                    search_dict(v)
            elif isinstance(d, list):
                for item in d:
                    search_dict(item)
        search_dict(data)
    except Exception as e:
        pass

print(f"Extracted pins with metadata: {len(extracted_pins)}")

# Also extract all 736x image URLs directly
img_736x = list(dict.fromkeys(re.findall(r'https://i\.pinimg\.com/736x/[a-f0-9/]+\.jpg', html)))
print(f"Total 736x images directly found: {len(img_736x)}")

# Print sample extracted pins
for i, pin in enumerate(extracted_pins[:10]):
    print(f"Pin {i+1}: {pin['title']} -> {pin['url']}")

if not extracted_pins and img_736x:
    print("Using 736x image URLs directly:")
    for url in img_736x[:15]:
        print(url)
