import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure loading elements start with display:none where appropriate so it's not a perpetual loading screen if auth fails or hasn't completed
content = content.replace('<div id="loading">Loading check-in data...</div>', '<div id="loading" style="display:none;">Loading check-in data...</div>')
content = content.replace('<div id="votes-loading">Loading voting data...</div>', '<div id="votes-loading" style="display:none;">Loading voting data...</div>')

# In JS, hide loading immediately if they hit an error or aren't authed
# Wait, auth triggers fetchData which shows loading. But if auth is waiting, it shouldn't show.

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Loading screens hidden by default")
