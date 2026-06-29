import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the top import to include setDoc and orderBy
old_top_import = 'import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";'
new_top_import = 'import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";'

if old_top_import in content:
    content = content.replace(old_top_import, new_top_import)

# Remove the duplicate mid-file import entirely
bad_import = 'import { doc, getDoc, setDoc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";'
if bad_import in content:
    content = content.replace(bad_import, '')

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard imports fixed!")
