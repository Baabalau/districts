import os
import pandas as pd
import requests
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def filter_operating_businesses(input_excel, output_excel):
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print("ERROR: Google Maps API key not found or is set to default.")
        return

    print("Initializing New Places API Client...")
    
    print(f"Reading {input_excel}...")
    df = pd.read_excel(input_excel)
    
    operating_rows = []
    closed_rows = []
    not_found_rows = []
    
    total = len(df)
    print(f"Checking {total} businesses against Google Places API (New)...")
    
    # Places API (New) endpoint
    text_search_url = "https://places.googleapis.com/v1/places:searchText"
    
    for index, row in df.iterrows():
        name = row.get('Name', '')
        address = row.get('GeoAddress', '')
        
        # Build search query assuming they are mostly in New Orleans
        query = f"{name} {address} New Orleans"
        
        payload = {
            "textQuery": query
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.name,places.id,places.businessStatus,places.currentOpeningHours,places.regularOpeningHours"
        }
        
        try:
            response = requests.post(text_search_url, json=payload, headers=headers)
            result = response.json()
            
            places = result.get('places', [])
            
            if places:
                place = places[0]
                status = place.get('businessStatus')
                
                if status == 'OPERATIONAL':
                    hours_str = "Hours not available"
                    
                    # Try to extract hours
                    opening_hours = place.get('currentOpeningHours') or place.get('regularOpeningHours')
                    if opening_hours:
                        weekday_descriptions = opening_hours.get('weekdayDescriptions', [])
                        if weekday_descriptions:
                            hours_str = " | ".join(weekday_descriptions)
                    
                    operating_row = row.copy()
                    operating_row['OperatingHours'] = hours_str
                    operating_rows.append(operating_row)
                else:
                    # Likely 'CLOSED_TEMPORARILY' or 'CLOSED_PERMANENTLY'
                    closed_rows.append(row)
            else:
                if 'error' in result:
                    print(f"\nAPI Error: {result['error'].get('message', result['error'])}")
                not_found_rows.append(row)
                
        except Exception as e:
            print(f"Error checking {name}: {e}")
            not_found_rows.append(row)
            
        if (index + 1) % 10 == 0:
            print(f"Processed {index + 1}/{total}...")
            
        # Optional: Add small sleep to not overwhelm rate limits
        time.sleep(0.05)
            
    operating_df = pd.DataFrame(operating_rows)
    closed_df = pd.DataFrame(closed_rows)
    not_found_df = pd.DataFrame(not_found_rows)
    
    print("\n--- Results ---")
    print(f"Total processed: {total}")
    print(f"Operational: {len(operating_df)}")
    print(f"Closed: {len(closed_df)}")
    print(f"Not Found / Error: {len(not_found_df)}")
    
    print(f"\nSaving operational businesses to {output_excel}...")
    operating_df.to_excel(output_excel, index=False)
    print("Done!")

if __name__ == "__main__":
    filter_operating_businesses('nightlife_filtered.xlsx', 'nightlife_operational.xlsx')
