import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# I had added a second import of getDoc in the automate_states script but let's check it.
old_import = '''import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";'''

if old_import in content:
    content = content.replace(old_import, 'import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";')

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Imports cleaned up")
