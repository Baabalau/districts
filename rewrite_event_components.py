import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We need to extract the voting-section from renderVotingModule
# renderVotingModule currently returns the map filters, and then abruptly closes two divs (</div></div>) and opens the voting-section.
# Let's check exactly what it returns.
