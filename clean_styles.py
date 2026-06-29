import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Election Intro
content = content.replace(
    '''<div class="election-intro-section js-reveal reveal-opacity" style="width: 80%; max-width: 1400px; margin: 80px auto; text-align: center; background: transparent;">''',
    '''<div class="election-intro-section js-reveal reveal-opacity" style="padding: 80px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto; text-align: center;">'''
)
# Fix closing tag by adding a div before Map Section
content = content.replace(
    '''            <!-- Map Section -->''',
    '''                </div>
            </div>

            <!-- Map Section -->'''
)

# 2. Update Voting States Below Map
content = content.replace(
    '''<div class="voting-states-section js-reveal reveal-y delay-200" style="width: 80%; max-width: 1400px; margin: 80px auto; text-align: center; background: transparent;">''',
    '''<div class="voting-states-section js-reveal reveal-y delay-200" style="padding: 80px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto; text-align: center;">'''
)
content = content.replace(
    '''            <!-- Crawl-tinery Pulled Up Beneath Map -->''',
    '''                </div>
            </div>

            <!-- Crawl-tinery Pulled Up Beneath Map -->'''
)

# 3. Clean up Itinerary Section inline styles to rely on CSS
content = content.replace(
    '''<div class="itinerary-section js-reveal reveal-y delay-200" style="width: 80%; max-width: 1400px; margin: 80px auto; background: transparent; text-align: center;">''',
    '''<div class="itinerary-section js-reveal reveal-y delay-200">'''
)

# 4. Clean up map wrapper inline styles
content = content.replace(
    '''<div class="map-section-wrapper js-reveal reveal-opacity" id="map-section" style="margin-bottom: 0;">''',
    '''<div class="map-section-wrapper js-reveal reveal-opacity" id="map-section">'''
)

# 5. Add a dashed SVG connecting line for the itinerary cards
old_line = '''            .connecting-line {
                position: absolute;
                top: 80px;
                left: 25%;
                width: 50%;
                height: 0;
                border-top: 3px dashed var(--accent);
                z-index: 0;
                opacity: 0.5;
            }'''
            
new_line = '''            .connecting-line {
                position: absolute;
                top: 80px;
                left: 25%;
                width: 50%;
                height: 30px;
                background-image: radial-gradient(circle at 100% 100%, transparent 15px, var(--accent) 15px, var(--accent) 18px, transparent 18px),
                                  radial-gradient(circle at 0 0, transparent 15px, var(--accent) 15px, var(--accent) 18px, transparent 18px);
                background-size: 30px 100%;
                background-position: 0 0, 15px 0;
                background-repeat: repeat-x;
                opacity: 0.4;
                z-index: 0;
            }'''
content = content.replace(old_line, new_line)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Styles cleaned up")
