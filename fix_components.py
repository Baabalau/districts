import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove time and location from hero
old_hero_date = "<h2>${districtCopy.date} | ${districtCopy.time} | ${districtCopy.location}</h2>"
new_hero_date = "<h2>${districtCopy.date}</h2>"
content = content.replace(old_hero_date, new_hero_date)

# 2. Reduce padding
content = content.replace('margin: 80px 0', 'margin: 30px 0')
content = content.replace('padding: 80px 0', 'padding: 30px 0')

# 3. Fix Map Legend Area (Equally splitting container and hiding "Round X")
old_legend = '''                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding-right: 30px; border-right: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;">
                            <div style="text-align: center;">
                                <div id="legend-round-name" style="display: none; color: var(--text-primary); font-family: var(--font-hero); font-size: 1.5rem; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; line-height: 1.2;">Round 1</div>
                                <div style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Opening Vote ends in</div>
                            </div>
                            <div class="countdown-clock small-clock" style="margin: 0; flex-wrap: nowrap;">
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">02</span><label style="font-size: 0.7rem;">Days</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">14</span><label style="font-size: 0.7rem;">Hrs</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">20</span><label style="font-size: 0.7rem;">Mins</label></div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: center; justify-content: flex-start; flex-grow: 1;">'''

new_legend = '''                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; border-right: 1px solid rgba(255,255,255,0.2);">
                            <div style="text-align: center;">
                                <div id="legend-round-subtitle" style="color: var(--text-secondary); font-size: 1.2rem; font-family: var(--font-hero); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">RUN-OFF BEGINS IN</div>
                            </div>
                            <div class="countdown-clock small-clock" style="margin: 0; flex-wrap: nowrap;">
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">02</span><label style="font-size: 0.7rem;">Days</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">14</span><label style="font-size: 0.7rem;">Hrs</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">20</span><label style="font-size: 0.7rem;">Mins</label></div>
                            </div>
                        </div>

                        <div style="flex: 1; display: flex; gap: 20px; flex-wrap: wrap; align-items: center; justify-content: center;">'''

content = content.replace(old_legend, new_legend)

# 4. Remove all caps from behind series title in css/event-styles.css
# Let's write that in a separate script or here

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("JS components fixed")
