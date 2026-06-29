import re

with open('js/event-components.js', 'r') as f:
    content = f.read()

old_pattern = r'<!-- Crawl-tinery -->.*?</div>\s*</div>\s*</div>\s*</div>'

new_markup = '''<!-- Night's Proceedings & Election Intro -->
            <div class="proceedings-section js-reveal reveal-y delay-200" style="padding: 40px 0; background: transparent;">
                <div class="page-module" style="width: 90%; max-width: 1400px; margin: 0 auto; text-align: center;">
                    <h2 style="font-family: var(--font-hero); font-size: 3.5rem; text-transform: uppercase; color: var(--text-primary); margin-bottom: 15px; letter-spacing: 2px;">${shared.itinerary.heading}</h2>
                    <p style="font-size: 1.15rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto 10px;">Follow the trail and cast your vote to decide where District ${districtCopy.district} ends the night.</p>
                    ${renderItineraryStops(districtCopy.itinerary.stops, vars)}
                </div>
            </div>

            <!-- Venue Voting / Operator Info -->
            <div class="election-info-section js-reveal reveal-opacity" style="padding: 10px 0 40px; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto;">
                    <div class="map-features-layout" style="margin-top: 0; padding-top: 0;">
                        <div class="map-features">
                            <div class="feature-box" style="flex: 1; text-align: left;">
                                <h3 style="font-family: var(--font-hero); text-transform: uppercase; letter-spacing: 1px;">${shared.venueVoting.heading}</h3>
                                <p style="margin-bottom: 10px;"><strong>Goals:</strong> ${shared.venueVoting.goals}</p>
                                <p style="margin-bottom: 10px;"><strong>Rules:</strong> ${interpolate(shared.venueVoting.rules, vars)}</p>
                                <p><strong>${shared.venueVoting.scheduleLabel}</strong></p>
                                <ul style="padding-left: 20px; color: var(--text-secondary); font-size: 0.95rem; margin-top: 5px;">
                                    ${renderScheduleItems(shared.venueVoting.schedule)}
                                </ul>
                            </div>
                            <div class="feature-box" style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                <h3 style="font-family: var(--font-hero); text-transform: uppercase; letter-spacing: 1px;">${shared.venueOperators.heading}</h3>
                                <p style="margin-bottom: 20px;">${shared.venueOperators.body}</p>
                                <a href="${shared.venueOperators.ctaHref}" class="brand-btn" style="padding: 10px 20px; font-size: 0.9rem;">${shared.venueOperators.ctaText}</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>'''

content = re.sub(old_pattern, new_markup, content, flags=re.DOTALL)

with open('js/event-components.js', 'w') as f:
    f.write(content)
