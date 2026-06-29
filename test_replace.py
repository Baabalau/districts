import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Requirement 2: Move attached section of voting states and results outside and below the binding of the map.
# In EventLayout, we have:
#             <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section">
#                 <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
#                 <div id="map"></div>
#                 ${renderVotingModule(districtCopy.district)}
#             </div>
#
# Let's split renderVotingModule into two parts. 
# Or we can just extract the voting-section out of renderVotingModule entirely, or leave renderVotingModule but return TWO things.
