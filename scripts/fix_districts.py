import pandas as pd
import json

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

    input_path = '/Users/baabalau/Desktop/Nighttime_Businesses_Districts After Dark (2).xlsx'
    output_path = '/Users/baabalau/Desktop/Nighttime_Businesses_Districts After Dark_DISTRICTS_FIXED.xlsx'
    
    print(f"Loading {input_path}...")
    df = pd.read_excel(input_path)
    
    updated_count = 0
    district_counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'Unknown': 0}
    
    for idx, row in df.iterrows():
        lat = row.get('lat')
        lng = row.get('lng')
        
        if pd.notna(lat) and pd.notna(lng) and str(lat).strip() != '' and str(lng).strip() != '':
            try:
                lat_f = float(lat)
                lng_f = float(lng)
                
                found_district = "Unknown"
                for feature in districts_geojson['features']:
                    if is_point_in_feature(lng_f, lat_f, feature):
                        found_district = feature['properties']['DISTRICTID'].upper()
                        break
                
                # We always overwrite just in case they were all "B" originally
                if df.at[idx, 'district'] != found_district:
                    df.at[idx, 'district'] = found_district
                    updated_count += 1
                
                if found_district in district_counts:
                    district_counts[found_district] += 1
                else:
                    district_counts['Unknown'] += 1
            except ValueError:
                district_counts['Unknown'] += 1
                pass
        else:
             district_counts['Unknown'] += 1

    print(f"Updated {updated_count} rows with accurate districts based on coordinates.")
    print(f"Final District Spread: {district_counts}")
    
    print(f"Saving to {output_path}...")
    df.to_excel(output_path, index=False)
    print("Done!")

if __name__ == '__main__':
    main()
