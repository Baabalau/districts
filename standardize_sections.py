import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Election Intro Section
content = content.replace(
    '''<div class="election-intro-section js-reveal reveal-opacity" style="padding: 60px 20px; text-align: center; max-width: 1000px; margin: 0 auto; background: transparent;">''',
    '''<div class="election-intro-section js-reveal reveal-opacity" style="width: 80%; max-width: 1400px; margin: 80px auto; text-align: center; background: transparent;">'''
)

# 2. Update Voting States Section
content = content.replace(
    '''<div class="voting-states-section js-reveal reveal-y delay-200" style="padding: 60px 20px; text-align: center; max-width: 1000px; margin: 0 auto; background: transparent;">''',
    '''<div class="voting-states-section js-reveal reveal-y delay-200" style="width: 80%; max-width: 1400px; margin: 80px auto; text-align: center; background: transparent;">'''
)

# 3. Update Itinerary Section
content = content.replace(
    '''<div class="itinerary-section js-reveal reveal-y delay-200" style="padding: 60px 20px; max-width: 1000px; margin: 0 auto; background: transparent; text-align: center;">''',
    '''<div class="itinerary-section js-reveal reveal-y delay-200" style="width: 80%; max-width: 1400px; margin: 80px auto; background: transparent; text-align: center;">'''
)

# 4. Make Purpose section match
content = content.replace(
    '''<div class="purpose-section js-reveal reveal-opacity" style="padding-top: 40px; padding-bottom: 40px; background: transparent;">''',
    '''<div class="purpose-section js-reveal reveal-opacity" style="margin: 80px 0; background: transparent;">'''
)

# 5. Fix How it Works box width to match
content = content.replace(
    '''<div class="instruction-box" style="padding: 25px; max-width: 800px; margin: 0 auto 40px auto; text-align: left; background: rgba(15, 22, 38, 0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">''',
    '''<div class="instruction-box" style="padding: 30px; max-width: 900px; margin: 0 auto 40px auto; text-align: left; background: rgba(15, 22, 38, 0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">'''
)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Standardized.")
