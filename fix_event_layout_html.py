import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Did I accidentally break the backtick template literal assignment when injecting the automated states logic?
# Let's check where this.innerHTML = ` begins and ends.
start_inner = content.find('            this.innerHTML = `')
end_inner = content.find('        `;', start_inner)

if start_inner == -1 or end_inner == -1:
    print("WARNING: Backticks are broken!")
else:
    print("Backticks look fine")
