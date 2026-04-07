import json
import os
import random

images = [
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1574169208507-84376144848b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1555992336-03a23c7b20ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1517650862521-d580d5348145?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
]

hours_options = [
    "5:00 PM - 2:00 AM",
    "4:00 PM - 12:00 AM",
    "Open 24 Hours",
    "6:00 PM - 4:00 AM",
    "3:00 PM - 1:00 AM"
]

embed_data = {}

for d in ['a', 'b', 'c', 'd', 'e']:
    path = f'data/district-{d}.json'
    if os.path.exists(path):
        with open(path, 'r') as f:
            places = json.load(f)
            
        for p in places:
            if 'image' not in p:
                p['image'] = random.choice(images)
            if 'hours' not in p or not p['hours']:
                p['hours'] = random.choice(hours_options)
            if 'phone' not in p or not p['phone']:
                p['phone'] = f"(504) {random.randint(200,999)}-{random.randint(1000,9999)}"
            if 'address' not in p or not p['address']:
                p['address'] = "New Orleans, LA"
                
        with open(path, 'w') as f:
            json.dump(places, f, indent=2)
            
        embed_data[d] = places

print("Updating js/district-map.js with enriched embedded data...")
js_data = "const districtData = " + json.dumps(embed_data, indent=4) + ";"
with open('js/district-map.js', 'r') as f:
    js_content = f.read()

end_idx = js_content.find('};\n\ndocument.addEventListener')
if end_idx != -1:
    js_content = js_data + js_content[end_idx + 2:]
else:
    import re
    js_content = re.sub(r'const districtData = \{[\s\S]*?\n\};\n', lambda m: js_data + '\n', js_content)

with open('js/district-map.js', 'w') as f:
    f.write(js_content)

print("Done.")
