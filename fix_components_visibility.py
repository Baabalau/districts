import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# I see the problem. The setVotingState function HIDES all states, and then shows the active one.
# But renderVotingStates(district) is wrapped inside another div called "voting-states-section" further down.
# Let's check exactly where setVotingState gets called.

# Wait, `this.innerHTML = \`...\`` is writing the HTML.
# And inside `renderVotingStates(districtCopy.district)` we have `<div class="voting-section" id="voting-module">`
# Let's check how many elements have display: none

print("HTML check")
