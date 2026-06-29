import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix map-filters-viewport extra closing divs
content = content.replace('''                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>''', '''                            </div>
                        </div>
                    </div>
                </div>''')

# 2. Update state-pre-voting inside renderVotingModule
old_pre_voting = '''                <div id="state-pre-voting" class="voting-state-container">
                    <div class="voting-header" style="margin-bottom: 10px;">
                        <h2 style="font-size: 2.5rem; margin-bottom: 5px;">The Election: Stop 3</h2>
                        <p style="font-size: 1.1rem; color: var(--text-secondary);">Where are we ending the night? The polls open 14 days before the event.</p>
                    </div>
                    <div class="instruction-box" style="padding: 15px 20px; max-width: 700px; margin: 0 auto 20px auto; text-align: left; background: rgba(15, 22, 38, 0.5);">
                        <h3 style="margin-bottom: 10px; font-size: 1.1rem; color: var(--text-primary);">How it works</h3>
                        <ul style="margin: 0; padding-left: 20px; font-size: 0.95rem;">
                            <li style="margin-bottom: 5px;"><strong>Round 1:</strong> Voting opens for all districts when the press release drops. Vote for your favorite neighborhood spots. The top 5 advance.</li>
                            <li style="margin-bottom: 5px;"><strong>The Run-Off:</strong> Starts the Monday before the event at 3:00 PM. A final sprint to decide the winner among the top 5.</li>
                            <li style="margin-bottom: 0;"><strong>The Prize:</strong> The winning venue hosts the final stop. Every vote is an entry into the Golden Ticket Raffle!</li>
                        </ul>
                    </div>
                </div>'''

new_pre_voting = '''                <div id="state-pre-voting" class="voting-state-container">
                    <div style="text-align: center; padding: 40px 20px;">
                        <h3 style="font-size: 1.8rem; color: var(--text-primary); font-family: var(--font-hero); text-transform: uppercase;">Voting Opens Soon!</h3>
                        <p style="font-size: 1.1rem; color: var(--text-secondary); margin-top: 10px;">Explore the venues on the map. Voting will begin 14 days before the event.</p>
                    </div>
                </div>'''

content = content.replace(old_pre_voting, new_pre_voting)

# 3. Restructure EventLayout.connectedCallback
# We need to replace the section from <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section"> to the end of <style>
# We can use regex to find the innerHTML block and replace it.

inner_html_start = content.find('            this.innerHTML = `')
if inner_html_start != -1:
    inner_html_end = content.find('            this.initScrollAnimations();', inner_html_start)
    if inner_html_end != -1:
        # Extract the whole innerHTML assignment
        original_inner_html = content[inner_html_start:inner_html_end]
        
        # Build the new innerHTML
        new_inner_html = '''            this.innerHTML = `
            <div class="event-hero" style="background: linear-gradient(rgba(15, 22, 38, 0.85), rgba(15, 22, 38, 0.95)), url('${districtCopy.bgImg}') center/cover; background-attachment: fixed;">
                <div class="hero-left">
                    <h1 class="title-3d" style="margin-bottom: 10px;">${interpolate(shared.hero.title, vars)}</h1>
                    <h2>${districtCopy.date} | ${districtCopy.time} | ${districtCopy.location}</h2>
                    <p>${interpolate(districtCopy.heroIntro, vars)}</p>
                    <button type="button" id="vote-scroll-btn" class="brand-btn" style="margin-top: 20px; font-size: 1.1rem; padding: 15px 30px;" onclick="document.getElementById('map-section').scrollIntoView({behavior: 'smooth'})">${interpolate(shared.hero.rsvpButton, vars)}</button>
                </div>
                <div class="hero-right" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div class="flow-couple" style="transform-origin: center;">
                        <div class="flow-card" style="animation: float 6s ease-in-out infinite;">
                            <img src="${districtCopy.influencerImg}" alt="${districtCopy.influencerName}">
                            <div class="card-caption">${districtCopy.influencerName}<span>${shared.roles.influencer}</span></div>
                        </div>
                        <div class="couple-ampersand" style="animation: float 6s ease-in-out infinite 1s;">&amp;</div>
                        <div class="flow-card" style="animation: float 6s ease-in-out infinite 2s;">
                            <img src="${districtCopy.councilImg}" alt="${districtCopy.councilName}">
                            <div class="card-caption">${districtCopy.councilName}<span>${shared.roles.council}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="purpose-section js-reveal reveal-opacity" style="padding-top: 40px; padding-bottom: 40px; background: transparent;">
                <div class="purpose-module">
                    <div class="purpose-frame js-reveal reveal-y delay-200">
                        <h2>${shared.behindSeries.heading}</h2>
                        <p>${shared.behindSeries.body}</p>
                    </div>
                </div>
            </div>

            <!-- Election Intro & Features ABOVE the map -->
            <div class="election-intro-section js-reveal reveal-opacity" style="padding: 60px 20px 20px 20px; text-align: center; max-width: 1000px; margin: 0 auto;">
                <div class="voting-header" style="margin-bottom: 20px;">
                    <h2 style="font-size: 2.8rem; margin-bottom: 5px; font-family: var(--font-hero); text-transform: uppercase; color: var(--text-primary);">The Election: Stop 3</h2>
                    <p style="font-size: 1.1rem; color: var(--text-secondary);">Where are we ending the night? The polls open 14 days before the event.</p>
                </div>
                <div class="instruction-box" style="padding: 25px; max-width: 800px; margin: 0 auto 40px auto; text-align: left; background: rgba(15, 22, 38, 0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                    <h3 style="margin-bottom: 15px; font-size: 1.2rem; color: var(--text-primary); font-family: var(--font-hero); text-transform: uppercase; letter-spacing: 1px;">How it works</h3>
                    <ul style="margin: 0; padding-left: 20px; font-size: 1rem; color: var(--text-main); line-height: 1.6;">
                        <li style="margin-bottom: 10px;"><strong>Round 1:</strong> Voting opens for all districts when the press release drops. Vote for your favorite neighborhood spots. The top 5 advance.</li>
                        <li style="margin-bottom: 10px;"><strong>The Run-Off:</strong> Starts the Monday before the event at 3:00 PM. A final sprint to decide the winner among the top 5.</li>
                        <li style="margin-bottom: 0;"><strong>The Prize:</strong> The winning venue hosts the final stop. Every vote is an entry into the Golden Ticket Raffle!</li>
                    </ul>
                </div>
                
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

            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
                <div id="map"></div>
                ${renderVotingModule(districtCopy.district)}
            </div>

            <!-- Crawl-tinery Pulled Up Beneath Map -->
            <div class="itinerary-section js-reveal reveal-y delay-200" style="margin-top: 60px;">
                <h2>${shared.itinerary.heading}</h2>
                <div class="itinerary-grid">${renderItineraryStops(districtCopy.itinerary.stops, vars)}</div>
            </div>
            
            <div class="leaderboard-section js-reveal reveal-y delay-200" style="margin: 40px auto; max-width: 800px; padding: 0 20px;">
                <district-leaderboard></district-leaderboard>
            </div>

            <!-- Local Legends Photo Wall Bento Grid -->
            <div class="local-legends-section js-reveal reveal-opacity" style="padding: 80px 0; background: var(--bg-primary); width: 100%; overflow: hidden;">
                <h2 style="text-align: center; font-family: var(--font-hero); font-size: 3.5rem; color: var(--text-primary); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; text-shadow: 2px 2px 0px var(--brand-red);">Local Legends</h2>
                
                <div class="bento-photo-wall">
                    <div class="bento-item bento-large" style="background-image: url('assets/district_d_image.jpg');">
                        <div class="bento-overlay"><span>Community First</span></div>
                    </div>
                    <div class="bento-item" style="background-image: url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop');">
                        <div class="bento-overlay"><span>Live Music</span></div>
                    </div>
                    <div class="bento-item bento-tall" style="background-image: url('https://images.unsplash.com/photo-1520862238258-005eec06c04b?w=600&h=800&fit=crop');">
                        <div class="bento-overlay"><span>The Vibe</span></div>
                    </div>
                    <div class="bento-item bento-wide" style="background-image: url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop');">
                        <div class="bento-overlay"><span>Good Eats</span></div>
                    </div>
                    <div class="bento-item" style="background-image: url('https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&h=400&fit=crop');">
                        <div class="bento-overlay"><span>Cheers</span></div>
                    </div>
                </div>
            </div>

            <style>
                @keyframes float {
                    0% { transform: translateY(0px) rotate(-1.2deg) scale(1.03); }
                    50% { transform: translateY(-10px) rotate(-1.2deg) scale(1.03); }
                    100% { transform: translateY(0px) rotate(-1.2deg) scale(1.03); }
                }
                @keyframes bounceArrow {
                    0%, 100% { transform: translateY(0) rotate(-5deg) skewX(-5deg); }
                    50% { transform: translateY(10px) rotate(-5deg) skewX(-5deg); }
                }
                .animated-arrow {
                    animation: bounceArrow 1.5s infinite ease-in-out;
                }
                .arrow-3d {
                    display: inline-block;
                    font-family: var(--font-hero);
                    font-size: 4.5rem;
                    font-weight: 900;
                    color: var(--text-primary);
                    text-shadow: 
                        1px 1px 0px #0F1626,
                        2px 2px 0px var(--accent),
                        3px 3px 0px var(--accent),
                        4px 4px 0px var(--accent),
                        5px 5px 0px var(--brand-red),
                        6px 6px 0px var(--brand-red),
                        7px 7px 0px var(--brand-red),
                        10px 12px 15px rgba(0,0,0,0.45);
                }
                
                /* Local Legends Bento Wall Styles */
                .bento-photo-wall {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    grid-auto-rows: 250px;
                    grid-auto-flow: dense;
                    gap: 15px;
                    padding: 0 15px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .bento-item {
                    position: relative;
                    border-radius: 12px;
                    overflow: hidden;
                    background-size: cover;
                    background-position: center;
                    background-color: #1a1a1a;
                    transition: transform 0.4s ease, box-shadow 0.4s ease;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                
                .bento-item:hover {
                    transform: scale(1.02);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.5);
                    z-index: 2;
                }
                
                .bento-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(15,22,38,0.9) 0%, rgba(15,22,38,0.2) 50%, rgba(15,22,38,0) 100%);
                    display: flex;
                    align-items: flex-end;
                    padding: 20px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .bento-item:hover .bento-overlay {
                    opacity: 1;
                }
                
                .bento-overlay span {
                    color: var(--text-primary);
                    font-family: var(--font-hero);
                    font-size: 1.5rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transform: translateY(15px);
                    transition: transform 0.3s ease;
                }
                
                .bento-item:hover .bento-overlay span {
                    transform: translateY(0);
                }
                
                @media (min-width: 768px) {
                    .bento-photo-wall {
                        grid-template-columns: repeat(4, 1fr);
                    }
                    .bento-large {
                        grid-column: span 2;
                        grid-row: span 2;
                    }
                    .bento-wide {
                        grid-column: span 2;
                        grid-row: span 1;
                    }
                    .bento-tall {
                        grid-column: span 1;
                        grid-row: span 2;
                    }
                }
            </style>
        `;
'''

        content = content.replace(original_inner_html, new_inner_html)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Update complete")
