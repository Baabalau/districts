import pandas as pd
import json
import uuid

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

    print("Loading spreadsheets...")
    master_df = pd.read_excel('/Users/baabalau/Desktop/Nighttime_Businesses_Districts After Dark.xlsx')
    operational_df = pd.read_excel('nightlife_operational.xlsx')

    print(f"Master sheet has {len(master_df)} rows")
    print(f"Operational sheet has {len(operational_df)} rows")

    new_rows = []
    
    for idx, row in operational_df.iterrows():
        name = row.get('Name', '')
        address = row.get('GeoAddress', '')
        op_hours = row.get('OperatingHours', '')
        b_type = row.get('Type', '')
        
        # Skip if already in master sheet
        if not master_df[master_df['name'].astype(str).str.lower() == str(name).lower()].empty:
            continue
            
        # Since we don't have lat/lng in the operational sheet, we'll assign a default NOLA center
        # and district 'A' as a fallback. For a real geocoding, we'd use Google Maps API or similar.
        lat = 29.9511
        lng = -90.0715 
        district = "Unknown"
        
        for feature in districts_geojson['features']:
            if is_point_in_feature(lng, lat, feature):
                district = feature['properties']['DISTRICTID'].upper()
                break
                
        new_row = {
            'id': str(uuid.uuid4())[:8],
            'name': name,
            'district': district,
            'lat': lat,
            'lng': lng,
            'description': f"Hours: {op_hours}",
            'type': b_type,
            'imageUrl': '',
            'address': address,
            'address #': '',
            'address street': ''
        }
        new_rows.append(new_row)

    print(f"Adding {len(new_rows)} new rows to master sheet...")
    new_df = pd.DataFrame(new_rows)
    combined_df = pd.concat([master_df, new_df], ignore_index=True)
    
    out_path = '/Users/baabalau/Desktop/Nighttime_Businesses_Districts After Dark_UPDATED.xlsx'
    combined_df.to_excel(out_path, index=False)
    print(f"Saved updated sheet to {out_path}")

if __name__ == '__main__':
    main()
