import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure we import db correctly for event-components.js
if 'import { auth, db } from "./firebase-config.js";' in content:
    # it exists but let's check its position relative to others
    pass

# We added 'import { doc, getDoc }' inside a replace, let's check for duplicates
if content.count('import { doc, getDoc }') > 1:
    content = content.replace('import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";\n', '', 1)

# Check the catch block in connectedCallback to ensure it's not swallowing Firebase errors invisibly
old_catch = '''        } catch (error) {
            console.error('Error loading event page copy:', error);
            this.innerHTML = '<p style="padding: 2rem; text-align: center;">Unable to load event content. Please refresh the page.</p>';
        }'''

new_catch = '''        } catch (error) {
            console.error('CRITICAL ERROR loading event page:', error);
            this.innerHTML = `<p style="padding: 2rem; text-align: center; color: red;">Unable to load event content: ${error.message}</p>`;
        }'''
content = content.replace(old_catch, new_catch)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Event error handling enhanced")
