import re

with open('js/district-map.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the Run-Off List logic to filter opt-outs and slice 10 instead of 5
old_runoff_list = '''            // Run-off List (Top 5)
            const runoffList = eventLayout.querySelector('#state-run-off .venue-list');
            if (runoffList) {
                runoffList.innerHTML = sortedVenues.slice(0, 5).map((v, i) => renderVenueItem(v, i, 5)).join('');
            }'''

new_runoff_list = '''            // Run-off List (Top 10, filtering out opt-outs)
            const runoffList = eventLayout.querySelector('#state-run-off .venue-list');
            if (runoffList) {
                const qualifiedForRunoff = sortedVenues.filter(v => !v.optOutRunoff).slice(0, 10);
                runoffList.innerHTML = qualifiedForRunoff.map((v, i) => renderVenueItem(v, i, 10)).join('');
            }'''

content = content.replace(old_runoff_list, new_runoff_list)

with open('js/district-map.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("District map logic updated")
