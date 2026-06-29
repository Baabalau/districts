import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the layout of renderMapLegend() inside js/event-components.js
old_legend = '''function renderMapLegend() {
    return `
                <div class="map-filters-viewport" style="background: var(--bg-secondary); margin-top: 0; margin-bottom: 40px; padding: 20px 0; border-radius: 0 0 8px 8px; width: 100%;">
                    <div class="map-filters-inner" style="width: 100%; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 30px;">
                        
                        <div style="display: flex; align-items: center; gap: 20px; padding-right: 30px; border-right: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;">
                            <span id="legend-round-name" style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.5rem; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap;">Round 1</span>
                            <div class="countdown-clock small-clock" style="margin: 0; flex-wrap: nowrap;">
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">02</span><label style="font-size: 0.7rem;">Days</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">14</span><label style="font-size: 0.7rem;">Hrs</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">20</span><label style="font-size: 0.7rem;">Mins</label></div>
                            </div>
                        </div>'''

new_legend = '''function renderMapLegend() {
    return `
                <div class="map-filters-viewport" style="background: var(--bg-secondary); margin-top: 0; margin-bottom: 0px; padding: 20px 0; border-radius: 0 0 8px 8px; width: 100%;">
                    <div class="map-filters-inner" style="width: 100%; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 30px;">
                        
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding-right: 30px; border-right: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;">
                            <div style="text-align: center;">
                                <div id="legend-round-name" style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.5rem; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; line-height: 1.2;">Round 1</div>
                                <div style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Opening Vote ends in</div>
                            </div>
                            <div class="countdown-clock small-clock" style="margin: 0; flex-wrap: nowrap;">
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">02</span><label style="font-size: 0.7rem;">Days</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">14</span><label style="font-size: 0.7rem;">Hrs</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">20</span><label style="font-size: 0.7rem;">Mins</label></div>
                            </div>
                        </div>'''

content = content.replace(old_legend, new_legend)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Map Legend Updated")
