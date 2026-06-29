import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Make itinerary heading match CSS
content = content.replace(
    '''<h2 style="font-family: var(--font-hero); font-size: 2.8rem; text-transform: uppercase; color: var(--text-primary); margin-bottom: 40px;">${shared.itinerary.heading}</h2>''',
    '''<h2 style="font-family: var(--font-header); font-size: 2.5rem; text-align: left; text-transform: uppercase; color: var(--text-primary); margin-bottom: 40px;">${shared.itinerary.heading}</h2>'''
)

# Election intro h2 match
content = content.replace(
    '''<h2 style="font-size: 2.8rem; margin-bottom: 5px; font-family: var(--font-hero); text-transform: uppercase; color: var(--text-primary);">The Election: Stop 3</h2>''',
    '''<h2 style="font-size: 2.5rem; margin-bottom: 5px; font-family: var(--font-header); text-transform: uppercase; color: var(--text-primary);">The Election: Stop 3</h2>'''
)

# Instruction box h3 match
content = content.replace(
    '''<h3 style="margin-bottom: 15px; font-size: 1.2rem; color: var(--text-primary); font-family: var(--font-hero); text-transform: uppercase; letter-spacing: 1px;">How it works</h3>''',
    '''<h3 style="margin-bottom: 15px; font-size: 1.4rem; color: var(--text-primary); font-family: var(--font-header); text-transform: uppercase; letter-spacing: 1px;">How it works</h3>'''
)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Styles updated")
