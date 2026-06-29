import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the messy double-closing divs I added
content = content.replace(
'''            </div>

                </div>
            </div>

            <!-- Map Section -->''',
'''                </div>
            </div>

            <!-- Map Section -->'''
)

content = content.replace(
'''            </div>

                </div>
            </div>

            <!-- Crawl-tinery Pulled Up Beneath Map -->''',
'''                </div>
            </div>

            <!-- Crawl-tinery Pulled Up Beneath Map -->'''
)

# And make sure itinerary-section matches the padding styles
content = content.replace(
'''            <!-- Crawl-tinery Pulled Up Beneath Map -->
            <div class="itinerary-section js-reveal reveal-y delay-200">''',
'''            <!-- Crawl-tinery Pulled Up Beneath Map -->
            <div class="itinerary-section js-reveal reveal-y delay-200" style="padding: 80px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto;">'''
)
content = content.replace(
'''                <div class="itinerary-grid">${renderItineraryStops(districtCopy.itinerary.stops, vars)}</div>
            </div>''',
'''                <div class="itinerary-grid">${renderItineraryStops(districtCopy.itinerary.stops, vars)}</div>
                </div>
            </div>'''
)

# Also fix the map section spacing
content = content.replace(
'''            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section">''',
'''            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section" style="margin-bottom: 0;">'''
)


with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed HTML nesting")
