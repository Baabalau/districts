import json
import urllib.request
import urllib.parse
import os
import re

def point_in_polygon(x, y, poly):
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(1, n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def is_point_in_feature(lon, lat, feature):
    geom = feature['geometry']
    geom_type = geom['type']
    coords = geom['coordinates']
    
    if geom_type == 'Polygon':
        # Check against outer ring, ignore holes for simplicity
        poly = coords[0]
        if point_in_polygon(lon, lat, poly):
            return True
    elif geom_type == 'MultiPolygon':
        for polygon in coords:
            poly = polygon[0]
            if point_in_polygon(lon, lat, poly):
                return True
    return False

def main():
    print("Loading council districts...")
    with open('council_districts.js', 'r') as f:
        data = f.read()
        data = data[data.find('{'):].strip().rstrip(';')
        districts_geojson = json.loads(data)

    print("Fetching OSM places...")
    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = """
    [out:json][timeout:25];
    (
      node["amenity"~"bar|pub|nightclub"](29.86,-90.14,30.15,-89.85);
      way["amenity"~"bar|pub|nightclub"](29.86,-90.14,30.15,-89.85);
    );
    out center;
    """
    
    req = urllib.request.Request(overpass_url, data=overpass_query.encode('utf-8'))
    req.add_header('User-Agent', 'DistrictsAfterDark/1.0 (contact@example.com)')
    with urllib.request.urlopen(req) as response:
        osm_data = json.loads(response.read().decode('utf-8'))

    elements = osm_data.get('elements', [])
    print(f"Found {len(elements)} places in New Orleans.")

    # Group by district
    districts = {
        'A': [], 'B': [], 'C': [], 'D': [], 'E': []
    }

    for el in elements:
        tags = el.get('tags', {})
        name = tags.get('name')
        if not name:
            continue
            
        if el['type'] == 'node':
            lat = el['lat']
            lon = el['lon']
        else:
            lat = el['center']['lat']
            lon = el['center']['lon']
            
        amenity = tags.get('amenity', 'bar')
        
        # Additional fields
        phone = tags.get('phone') or tags.get('contact:phone') or ''
        website = tags.get('website') or tags.get('contact:website') or ''
        housenumber = tags.get('addr:housenumber', '')
        street = tags.get('addr:street', '')
        address = f"{housenumber} {street}".strip()
        hours = tags.get('opening_hours', '')
        cuisine = tags.get('cuisine', '')
        
        place = {
            'name': name,
            'amenity': amenity,
            'lat': lat,
            'lng': lon,
            'phone': phone,
            'website': website,
            'address': address,
            'hours': hours,
            'cuisine': cuisine
        }
        
        # Find which district it belongs to
        for feature in districts_geojson['features']:
            if is_point_in_feature(lon, lat, feature):
                dist_id = feature['properties']['DISTRICTID'].upper()
                if dist_id in districts:
                    districts[dist_id].append(place)
                break
                
    os.makedirs('data', exist_ok=True)
    
    embed_data = {}
    
    for dist_id, places in districts.items():
        out_path = f"data/district-{dist_id.lower()}.json"
        with open(out_path, 'w') as f:
            json.dump(places, f, indent=2)
        print(f"Saved {len(places)} places to {out_path}")
        embed_data[dist_id.lower()] = places
        
    print("Updating js/district-map.js with embedded data...")
    js_data = "const districtData = " + json.dumps(embed_data, indent=4) + ";"
    with open('js/district-map.js', 'r') as f:
        js_content = f.read()
        
    # Replace existing const districtData
    # Find the end of the districtData object
    end_idx = js_content.find('};\n\ndocument.addEventListener')
    if end_idx != -1:
        js_content = js_data + js_content[end_idx + 2:]
    else:
        # Fallback if the exact string isn't found
        js_content = re.sub(r'const districtData = \{[\s\S]*?\n\};\n', lambda m: js_data + '\n', js_content)
    
    with open('js/district-map.js', 'w') as f:
        f.write(js_content)
        
    print("Done.")

if __name__ == "__main__":
    main()
