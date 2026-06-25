import './leaderboard.js';
import { auth, db } from "./firebase-config.js";
import { doc, updateDoc, increment, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

function interpolate(text, vars) {
    if (!text) return '';
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function buildTemplateVars(districtCopy) {
    return {
        district: districtCopy.district,
        date: districtCopy.date,
        time: districtCopy.time,
        location: districtCopy.location,
        councilName: districtCopy.councilName,
        influencerName: districtCopy.influencerName
    };
}

function renderItineraryStops(stops, vars) {
    return stops.map((stop, index) => `
                    <div class="stop-card stop-${index + 1}">
                        <div class="stop-number">${stop.number}</div>
                        <h3>${interpolate(stop.title, vars)}</h3>
                        <p>${interpolate(stop.body, vars)}</p>
                    </div>`).join('');
}

function renderScheduleItems(items) {
    return items.map((item) => `<li>${item}</li>`).join('\n                            ');
}

function renderVotingModule(district) {
    return `
                <div class="map-filters" style="padding: 15px 25px; background: var(--bg-secondary); border-top: 2px solid var(--text-primary); border-radius: 0 0 8px 8px; display: flex; justify-content: center; gap: 24px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #D2A039; box-shadow: 0 0 8px #D2A039;"></div>
                        <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.95rem; font-weight: 700; text-transform: uppercase;">Bar</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #B32424; box-shadow: 0 0 8px #B32424;"></div>
                        <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.95rem; font-weight: 700; text-transform: uppercase;">Restaurant</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #D946EF; box-shadow: 0 0 8px #D946EF;"></div>
                        <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.95rem; font-weight: 700; text-transform: uppercase;">Live Venue</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #45B7D1; box-shadow: 0 0 8px #45B7D1;"></div>
                        <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.95rem; font-weight: 700; text-transform: uppercase;">Museum/Gallery</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #A87B28; box-shadow: 0 0 8px #A87B28;"></div>
                        <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.95rem; font-weight: 700; text-transform: uppercase;">Other</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; border-left: 1px solid rgba(203, 160, 82, 0.3); padding-left: 20px;">
                        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: transparent; border: 2px solid #fff;"></div>
                        <span style="color: var(--text-secondary); font-family: var(--font-header); font-size: 0.85rem; font-style: italic;">Top 10</span>
                    </div>
                </div>
            </div>

            <div class="voting-section js-reveal reveal-y delay-200" id="voting-module">
                <div class="state-controls" style="text-align: center; margin-bottom: 20px;">
                    <span style="color: var(--text-secondary); margin-right: 10px; font-weight: bold; font-size: 0.9rem; text-transform: uppercase;">Preview States:</span>
                    <button onclick="window.setVotingState('pre-voting')">Pre-Voting</button>
                    <button onclick="window.setVotingState('round-1')">Round 1</button>
                    <button onclick="window.setVotingState('run-off')">Run-Off</button>
                    <button onclick="window.setVotingState('post-election')">Post-Election</button>
                </div>

                <div id="state-pre-voting" class="voting-state-container">
                    <div class="voting-header">
                        <h2>The Election: Stop 3</h2>
                        <p>Where are we ending the night? The polls open 14 days before the event.</p>
                    </div>
                    <div class="countdown-clock">
                        <div class="time-box"><span>14</span><label>Days</label></div>
                        <div class="time-box"><span>08</span><label>Hours</label></div>
                        <div class="time-box"><span>45</span><label>Mins</label></div>
                        <div class="time-box"><span>12</span><label>Secs</label></div>
                    </div>
                    <div class="instruction-box">
                        <h3>How it works</h3>
                        <ul>
                            <li><strong>Round 1:</strong> Voting opens for all districts when the press release drops. Vote for your favorite neighborhood spots. The top 5 advance.</li>
                            <li><strong>The Run-Off:</strong> Starts the Monday before the event at 3:00 PM. A final sprint to decide the winner among the top 5.</li>
                            <li><strong>The Prize:</strong> The winning venue hosts the final stop. Every vote is an entry into the Golden Ticket Raffle!</li>
                        </ul>
                    </div>
                </div>

                <div id="state-round-1" class="voting-state-container" style="display: none;">
                    <div class="voting-header">
                        <h2>Round 1: Choose Your Final Stop</h2>
                        <p>The top 5 venues will advance to the run-off in:</p>
                        <div class="countdown-clock small-clock">
                            <div class="time-box"><span>02</span><label>Days</label></div>
                            <div class="time-box"><span>14</span><label>Hrs</label></div>
                            <div class="time-box"><span>20</span><label>Mins</label></div>
                        </div>
                    </div>
                    <p style="text-align: center; color: var(--text-secondary); margin-bottom: 20px;">Use the numbers on the map above to locate venues.</p>
                    <div class="venue-list-container">
                        <ul class="venue-list">
                            <li><span class="rank-badge gold">1</span> <div class="v-details"><strong>The Rusty Nail</strong><br><em>Patio crawfish boil</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_1', 'The Rusty Nail')">VOTE</button></li>
                            <li><span class="rank-badge gold">2</span> <div class="v-details"><strong>Barrel Proof</strong><br><em>Brass band on the deck</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_2', 'Barrel Proof')">VOTE</button></li>
                            <li><span class="rank-badge gold">3</span> <div class="v-details"><strong>The Tchoup Yard</strong><br><em>Outdoor games & DJ</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_3', 'The Tchoup Yard')">VOTE</button></li>
                            <li><span class="rank-badge silver">4</span> <div class="v-details"><strong>Capulet</strong><br><em>Frozen cocktails specials</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_4', 'Capulet')">VOTE</button></li>
                            <li><span class="rank-badge silver">5</span> <div class="v-details"><strong>Bulldog Mid-City</strong><br><em>Pint night deals</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_5', 'Bulldog Mid-City')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">6</span> <div class="v-details"><strong>Finn McCool's</strong><br><em>Dog-friendly patio vibes</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_6', 'Finn McCool\\'s')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">7</span> <div class="v-details"><strong>Pal's Lounge</strong><br><em>Neighborhood classic</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_7', 'Pal\\'s Lounge')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">8</span> <div class="v-details"><strong>Mick's Irish Pub</strong><br><em>Live sports & pool</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_8', 'Mick\\'s Irish Pub')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">9</span> <div class="v-details"><strong>Rendon Inn</strong><br><em>Best late night tacos</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_9', 'Rendon Inn')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">10</span> <div class="v-details"><strong>12 Mile Limit</strong><br><em>Spacious outdoor seating</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_10', '12 Mile Limit')">VOTE</button></li>
                        </ul>
                        <div class="pagination">
                            <button disabled>← Prev</button>
                            <span>Page 1 of 4</span>
                            <button>Next →</button>
                        </div>
                    </div>
                </div>

                <div id="state-run-off" class="voting-state-container" style="display: none;">
                    <div class="voting-header">
                        <h2>The Run-Off: Top 5</h2>
                        <p>It's down to the wire! The polls close in:</p>
                        <div class="countdown-clock small-clock critical">
                            <div class="time-box"><span>12</span><label>Hrs</label></div>
                            <div class="time-box"><span>45</span><label>Mins</label></div>
                            <div class="time-box"><span>09</span><label>Secs</label></div>
                        </div>
                    </div>
                    <div class="leaderboard">
                        <div class="leaderboard-bar 1st">
                            <div class="bar-fill" style="width: 85%;"></div>
                            <div class="bar-content">
                                <span class="rank">#1</span>
                                <span class="venue-name">The Rusty Nail</span>
                                <span class="vote-count">1,245 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 2nd">
                            <div class="bar-fill" style="width: 65%;"></div>
                            <div class="bar-content">
                                <span class="rank">#2</span>
                                <span class="venue-name">Barrel Proof</span>
                                <span class="vote-count">980 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 3rd">
                            <div class="bar-fill" style="width: 45%;"></div>
                            <div class="bar-content">
                                <span class="rank">#3</span>
                                <span class="venue-name">The Tchoup Yard</span>
                                <span class="vote-count">650 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 4th">
                            <div class="bar-fill" style="width: 35%;"></div>
                            <div class="bar-content">
                                <span class="rank">#4</span>
                                <span class="venue-name">Capulet</span>
                                <span class="vote-count">420 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 5th">
                            <div class="bar-fill" style="width: 25%;"></div>
                            <div class="bar-content">
                                <span class="rank">#5</span>
                                <span class="venue-name">Bulldog Mid-City</span>
                                <span class="vote-count">295 votes</span>
                            </div>
                        </div>
                    </div>
                    <div class="venue-list-container">
                        <ul class="venue-list">
                            <li><span class="rank-badge gold">1</span> <div class="v-details"><strong>The Rusty Nail</strong><br><em>Patio crawfish boil</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_1', 'The Rusty Nail')">VOTE</button></li>
                            <li><span class="rank-badge gold">2</span> <div class="v-details"><strong>Barrel Proof</strong><br><em>Brass band on the deck</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_2', 'Barrel Proof')">VOTE</button></li>
                            <li><span class="rank-badge gold">3</span> <div class="v-details"><strong>The Tchoup Yard</strong><br><em>Outdoor games & DJ</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_3', 'The Tchoup Yard')">VOTE</button></li>
                            <li><span class="rank-badge silver">4</span> <div class="v-details"><strong>Capulet</strong><br><em>Frozen cocktails specials</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_4', 'Capulet')">VOTE</button></li>
                            <li><span class="rank-badge silver">5</span> <div class="v-details"><strong>Bulldog Mid-City</strong><br><em>Pint night deals</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('mock_5', 'Bulldog Mid-City')">VOTE</button></li>
                        </ul>
                    </div>
                </div>

                <div id="state-post-election" class="voting-state-container" style="display: none;">
                    <div class="voting-header">
                        <h2>The Results Are In</h2>
                        <p>Voting has concluded for District ${district}.</p>
                    </div>
                    <div class="winner-card">
                        <div class="badge">WINNER</div>
                        <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop" alt="The Rusty Nail">
                        <h3>The Rusty Nail</h3>
                        <p>With 1,842 total votes, The Rusty Nail is the official Stop 3 for the Nightcrawl!</p>
                        <button id="rsvp-btn" class="brand-btn" style="margin-top: 15px;">RSVP NOW</button>
                        <p id="rsvp-msg" style="margin-top: 10px; color: var(--accent); font-weight: bold; display: none;"></p>
                    </div>
                </div>
            </div>

            <div id="vote-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content vote-modal-content">
                    <div class="vote-modal-header">
                        <h2 style="font-size: 22px; font-family: var(--font-main); color: var(--text-secondary); font-weight: 500; text-transform: none;">VOTE for the District ${district} nightcrawl to end the night at...</h2>
                        <button class="close-modal" onclick="window.closeVoteModal()">×</button>
                    </div>
                    <div class="animated-arrow arrow-3d" style="margin: 0 0 10px 0;">↓</div>
                    <div id="modal-venue-name" style="font-size: 3.2rem; color: var(--text-primary); font-family: var(--font-hero); text-transform: uppercase; margin-bottom: 35px; line-height: 1.1; letter-spacing: 1px; text-shadow: 2px 2px 0px var(--accent);"></div>
                    <div class="auth-buttons" id="vote-auth-section">
                        <!-- Populated dynamically based on auth state -->
                    </div>
                </div>
            </div>

            <div id="share-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content share-content" style="padding: 30px 20px; background: #0F1626; max-width: 450px;">
                    <button class="close-modal" onclick="window.closeShareModal()">×</button>
                    <h2 style="font-size: 1.8rem; margin-bottom: 5px; color: var(--text-primary); font-family: var(--font-hero); text-transform: uppercase;">Vote Confirmed!</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 1rem;">Save this graphic and share it to your Instagram Story to rally more votes!</p>
                    
                    <div style="position: relative; width: 100%; max-width: 280px; margin: 0 auto 20px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <!-- The canvas will generate the final image, and we'll display it in this img tag so users can long-press to save -->
                        <img id="generated-share-graphic" src="" alt="Your Custom Share Graphic" style="width: 100%; height: auto; display: block;">
                        <canvas id="share-canvas" width="1080" height="1920" style="display: none;"></canvas>
                    </div>
                    
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px; font-style: italic;">Mobile: Long-press the image to save.<br>Desktop: Right-click and "Save Image As".</p>
                    
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: left;">
                        <p style="color: var(--text-primary); font-weight: bold; margin-bottom: 8px; font-size: 0.95rem;">Add this link to your Instagram Link Sticker:</p>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="text" id="share-url-input" readonly style="flex: 1; padding: 10px; border-radius: 4px; border: 1px solid var(--text-secondary); background: #182238; color: white; font-size: 0.85rem; outline: none;">
                            <button onclick="window.copyShareUrl()" style="padding: 10px 15px; background: var(--brand-red); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: background 0.2s;">Copy</button>
                        </div>
                        <p id="copy-success-msg" style="color: #7fd99a; font-size: 0.8rem; margin-top: 8px; display: none; text-align: center;">Link copied to clipboard!</p>
                    </div>

                    <button class="brand-btn" style="width: 100%; margin-bottom: 10px;" onclick="window.closeShareModal()">Done</button>
                </div>
            </div>`;
}

class EventLayout extends HTMLElement {
    async connectedCallback() {
        const districtId = (this.getAttribute('district') || 'A').toLowerCase();

        try {
            const [sharedResponse, districtResponse] = await Promise.all([
                fetch('data/event-pages/shared.json'),
                fetch(`data/event-pages/district-${districtId}.json`)
            ]);

            if (!sharedResponse.ok || !districtResponse.ok) {
                throw new Error(`Failed to load event copy for district ${districtId.toUpperCase()}`);
            }

            const shared = await sharedResponse.json();
            const districtCopy = await districtResponse.json();
            const vars = buildTemplateVars(districtCopy);

            this.innerHTML = `
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

            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
                <div id="map"></div>
                ${renderVotingModule(districtCopy.district)}

            <div class="leaderboard-section js-reveal reveal-y delay-200" style="margin: 40px auto; max-width: 800px; padding: 0 20px;">
                <district-leaderboard></district-leaderboard>
            </div>

            <div class="itinerary-section js-reveal reveal-y delay-200">
                <h2>${shared.itinerary.heading}</h2>
                <div class="itinerary-grid">${renderItineraryStops(districtCopy.itinerary.stops, vars)}
                </div>
            </div>
            
            <div class="map-features-layout js-reveal reveal-y delay-400">
                <div class="map-features">
                    <div class="feature-box" style="flex: 1;">
                        <h3>${shared.venueVoting.heading}</h3>
                        <p style="margin-bottom: 10px;"><strong>Goals:</strong> ${shared.venueVoting.goals}</p>
                        <p style="margin-bottom: 10px;"><strong>Rules:</strong> ${interpolate(shared.venueVoting.rules, vars)}</p>
                        <p><strong>${shared.venueVoting.scheduleLabel}</strong></p>
                        <ul style="padding-left: 20px; color: var(--text-secondary); font-size: 0.95rem; margin-top: 5px;">
                            ${renderScheduleItems(shared.venueVoting.schedule)}
                        </ul>
                    </div>
                    <div class="feature-box" style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <h3>${shared.venueOperators.heading}</h3>
                        <p style="margin-bottom: 20px;">${shared.venueOperators.body}</p>
                        <a href="${shared.venueOperators.ctaHref}" class="brand-btn" style="padding: 10px 20px; font-size: 0.9rem;">${shared.venueOperators.ctaText}</a>
                    </div>
                </div>
            </div>

            <div class="quotes-section">
                <div class="quote-block quote-left js-reveal reveal-y delay-200">
                    "${interpolate(districtCopy.councilQuote, vars)}"
                    <span class="quote-author">— ${districtCopy.councilName}</span>
                </div>
                <div class="quote-block quote-right js-reveal reveal-y delay-400">
                    "${interpolate(districtCopy.influencerQuote, vars)}"
                    <span class="quote-author">— ${districtCopy.influencerName}</span>
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
            </style>
        `;

            this.initScrollAnimations();
            this.initVotingPortal();
        } catch (error) {
            console.error('Error loading event page copy:', error);
            this.innerHTML = '<p style="padding: 2rem; text-align: center;">Unable to load event content. Please refresh the page.</p>';
        }
    }

    initScrollAnimations() {
        setTimeout(() => {
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.15
            };
            const observer = new IntersectionObserver((entries, scrollObserver) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        scrollObserver.unobserve(entry.target);
                    }
                });
            }, observerOptions);
            const animatedElements = this.querySelectorAll('.js-reveal');
            animatedElements.forEach(el => observer.observe(el));
        }, 100);
    }

    initVotingPortal() {
        let currentUser = null;
        onAuthStateChanged(auth, (user) => {
            currentUser = user;
            const authSection = this.querySelector('#vote-auth-section');
            if (!authSection) return;
            
            if (user) {
                authSection.innerHTML = `
                    <button class="auth-btn email" id="submit-vote-btn" style="width: 100%; padding: 15px; font-size: 1.1rem;">Submit Vote</button>
                    <p id="vote-error-msg" style="color: var(--brand-red); font-size: 0.9rem; margin-top: 10px; display: none;"></p>
                `;
                
                const submitBtn = this.querySelector('#submit-vote-btn');
                submitBtn.addEventListener('click', () => window.submitVote());
            } else {
                authSection.innerHTML = `
                    <button class="auth-btn email" style="width: 100%; padding: 15px; font-size: 1.1rem;" onclick="window.location.href='login.html?redirect=' + encodeURIComponent(window.location.pathname)">Log In with Email or Google</button>
                `;
            }
        });

        window.openVoteModal = (venueId, venueName) => {
            const modal = this.querySelector('#vote-modal');
            const nameEl = this.querySelector('#modal-venue-name');
            nameEl.innerText = venueName;
            this.querySelector('#share-venue-name').innerText = venueName;
            modal.dataset.venueId = venueId;
            modal.dataset.venueName = venueName;
            
            // Reset error message if it exists
            const errorMsg = this.querySelector('#vote-error-msg');
            if (errorMsg) errorMsg.style.display = 'none';
            
            modal.style.display = 'flex';
        };

        window.closeVoteModal = () => {
            this.querySelector('#vote-modal').style.display = 'none';
        };

        window.submitVote = async () => {
            if (!currentUser) {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
                return;
            }

            const modal = this.querySelector('#vote-modal');
            const venueId = modal.dataset.venueId;
            const btn = this.querySelector('#submit-vote-btn');
            const errorMsg = this.querySelector('#vote-error-msg');
            
            if (!venueId || venueId === 'undefined' || venueId === 'null') {
                errorMsg.textContent = "Error: Invalid venue selected.";
                errorMsg.style.display = 'block';
                return;
            }

            // Determine district from URL
            const path = window.location.pathname;
            const match = path.match(/district-([a-e])\.html/i);
            const districtId = match ? match[1].toUpperCase() : 'B';

            btn.innerText = 'Submitting...';
            btn.disabled = true;

            try {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                
                let userData = userSnap.exists() ? userSnap.data() : {};
                let votes = userData.votes || {};
                
                // Check if user already voted in this district
                if (votes[districtId]) {
                    errorMsg.textContent = `You have already voted in District ${districtId}.`;
                    errorMsg.style.display = 'block';
                    btn.innerText = 'Submit Vote';
                    btn.disabled = false;
                    return;
                }
                
                // Update user's votes
                votes[districtId] = venueId;
                await setDoc(userRef, { votes: votes }, { merge: true });
                
                // Increment venue's voteCount
                const venueRef = doc(db, "venues", venueId);
                await updateDoc(venueRef, {
                    voteCount: increment(1)
                });
                
                window.showShareScreen();
            } catch (error) {
                console.error("Error submitting vote:", error);
                errorMsg.textContent = "Error submitting vote. Please try again.";
                errorMsg.style.display = 'block';
                btn.innerText = 'Submit Vote';
                btn.disabled = false;
            }
        };

        window.showShareScreen = () => {
            const btn = this.querySelector('#submit-vote-btn');
            if (btn) {
                btn.innerText = 'Submit Vote';
                btn.disabled = false;
            }
            this.querySelector('#vote-modal').style.display = 'none';
            
            // Generate the custom graphic using Canvas
            const canvas = this.querySelector('#share-canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            // Load the base template graphic
            img.src = 'assets/Voter%20Share_draft1.PNG';
            
            img.onload = () => {
                // Draw the template
                ctx.drawImage(img, 0, 0, 1080, 1920);
                
                // Get the venue name from the modal dataset
                const modal = this.querySelector('#vote-modal');
                const venueName = modal.dataset.venueName || "A LOCAL BUSINESS";
                const venueId = modal.dataset.venueId || "";
                
                // Configure text styling
                ctx.font = 'bold 72px "Oswald", sans-serif';
                ctx.fillStyle = '#8a2d24'; // Dark red color to match the design
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Add a subtle drop shadow to the text to ensure readability
                ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                // The coordinates for the "Type Business Name Here" box 
                // (Estimated based on 1080x1920 IG story dimensions)
                const textX = 1080 / 2 + 100; // Shifted slightly right to fit in the white box
                const textY = 520; // Y-coordinate of the white box
                
                // Draw the venue name onto the canvas
                // We use a max width to ensure long names shrink to fit the box
                ctx.fillText(venueName.toUpperCase(), textX, textY, 650);
                
                // Convert canvas to a data URL and set it as the image source
                const dataUrl = canvas.toDataURL('image/png');
                this.querySelector('#generated-share-graphic').src = dataUrl;
                
                // Generate the deep link URL for this specific venue
                const shareUrl = window.location.origin + window.location.pathname + '?vote=' + encodeURIComponent(venueId);
                const urlInput = this.querySelector('#share-url-input');
                if (urlInput) {
                    urlInput.value = shareUrl;
                }
                
                // Show the modal
                this.querySelector('#share-modal').style.display = 'flex';
            };
            
            // Fallback in case image fails to load
            img.onerror = () => {
                console.error("Failed to load share graphic template.");
                this.querySelector('#share-modal').style.display = 'flex';
            };
        };

        window.closeShareModal = () => {
            this.querySelector('#share-modal').style.display = 'none';
        };

        window.copyShareUrl = () => {
            const urlInput = this.querySelector('#share-url-input');
            if (urlInput) {
                urlInput.select();
                urlInput.setSelectionRange(0, 99999); // For mobile devices
                navigator.clipboard.writeText(urlInput.value).then(() => {
                    const successMsg = this.querySelector('#copy-success-msg');
                    if (successMsg) {
                        successMsg.style.display = 'block';
                        setTimeout(() => {
                            successMsg.style.display = 'none';
                        }, 3000);
                    }
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        };

        window.setVotingState = (stateId) => {
            const states = ['pre-voting', 'round-1', 'run-off', 'post-election'];
            states.forEach(s => {
                const el = this.querySelector('#state-' + s);
                if (el) {
                    el.style.display = s === stateId ? 'block' : 'none';
                }
            });
        };

        setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const voteTarget = urlParams.get('vote');
            if (voteTarget) {
                const isPreVoting = this.querySelector('#state-pre-voting')?.style.display !== 'none';
                const isPostElection = this.querySelector('#state-post-election')?.style.display !== 'none';

                if (!isPreVoting && !isPostElection) {
                    window.openVoteModal(null, voteTarget);
                }
            }
        }, 150);
    }
}

customElements.define('event-layout', EventLayout);
