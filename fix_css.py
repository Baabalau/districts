import re

with open('css/event-styles.css', 'r', encoding='utf-8') as f:
    content = f.read()

# specifically target .purpose-frame h2
old_block = """.purpose-frame h2 {
    font-family: var(--font-header);
    font-size: clamp(1.75rem, 4vw, 2.75rem);
    text-transform: uppercase;"""

new_block = """.purpose-frame h2 {
    font-family: var(--font-header);
    font-size: clamp(1.75rem, 4vw, 2.75rem);
    text-transform: none;"""

content = content.replace(old_block, new_block)

with open('css/event-styles.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("Targeted CSS fixed")
