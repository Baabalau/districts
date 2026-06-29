import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# SPLIT renderVotingModule
# We'll split the return string of renderVotingModule at '<div class="voting-section'

split_idx = content.find('<div class="voting-section')
if split_idx != -1:
    end_of_map_filters = content.rfind('</div>', 0, split_idx)
    # The map filters end right before voting-section. 
    # Actually let's just use string replace.
    
    old_func = content[content.find('function renderVotingModule'):content.find('class EventLayout extends HTMLElement')]
    
    # Let's extract the first part
    part1_end = old_func.find('<div class="voting-section')
    part1 = old_func[:part1_end] + '`;\n}\n\n'
    part1 = part1.replace('renderVotingModule(district)', 'renderMapLegend()')
    
    # Second part
    part2 = 'function renderVotingStates(district) {\n    return `\n            ' + old_func[part1_end:]
    
    # Reassemble
    new_funcs = part1 + part2
    content = content.replace(old_func, new_funcs)

# Now update the EventLayout innerHTML to use renderMapLegend() and renderVotingStates()
old_map_section = '''            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
                <div id="map"></div>
                ${renderVotingModule(districtCopy.district)}
            </div>'''

new_map_section = '''            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section" style="margin-bottom: 0;">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
                <div id="map"></div>
                ${renderMapLegend()}
            </div>

            <!-- Voting States Below Map -->
            <div class="voting-states-section js-reveal reveal-y delay-200" style="padding: 60px 20px; text-align: center; max-width: 1000px; margin: 0 auto; background: transparent;">
                ${renderVotingStates(districtCopy.district)}
            </div>'''

content = content.replace(old_map_section, new_map_section)

# Update styling for consistency
# Look at election-intro-section
content = content.replace(
    '''            <!-- Election Intro & Features ABOVE the map -->
            <div class="election-intro-section js-reveal reveal-opacity" style="padding: 60px 20px 20px 20px; text-align: center; max-width: 1000px; margin: 0 auto;">''',
    '''            <!-- Election Intro & Features ABOVE the map -->
            <div class="election-intro-section js-reveal reveal-opacity" style="padding: 60px 20px; text-align: center; max-width: 1000px; margin: 0 auto; background: transparent;">'''
)

# Look at itinerary-section
content = content.replace(
    '''            <!-- Crawl-tinery Pulled Up Beneath Map/Voting -->
            <div class="itinerary-section js-reveal reveal-y delay-200" style="margin-top: 60px;">''',
    '''            <!-- Crawl-tinery Pulled Up Beneath Map/Voting -->
            <div class="itinerary-section js-reveal reveal-y delay-200" style="padding: 60px 20px; max-width: 1000px; margin: 0 auto; background: transparent;">'''
)
content = content.replace(
    '''            <!-- Crawl-tinery Pulled Up Beneath Map -->
            <div class="itinerary-section js-reveal reveal-y delay-200" style="margin-top: 60px;">''',
    '''            <!-- Crawl-tinery Pulled Up Beneath Map -->
            <div class="itinerary-section js-reveal reveal-y delay-200" style="padding: 60px 20px; max-width: 1000px; margin: 0 auto; background: transparent; text-align: center;">'''
)

# Fix the h2 in itinerary to be consistent with other headers
content = content.replace(
    '''<h2>${shared.itinerary.heading}</h2>''',
    '''<h2 style="font-family: var(--font-hero); font-size: 2.8rem; text-transform: uppercase; color: var(--text-primary); margin-bottom: 40px;">${shared.itinerary.heading}</h2>'''
)

# Fix map-features-layout padding inside election-intro
content = content.replace(
    '''<div class="map-features-layout" style="margin-top: 0; padding-top: 0;">''',
    '''<div class="map-features-layout" style="margin-top: 40px; padding-top: 0;">'''
)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated rendering of voting module and base section stylings")
