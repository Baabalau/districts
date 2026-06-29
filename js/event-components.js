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
        influencerName: districtCopy.influencerName,
        councilImg: districtCopy.councilImg,
        influencerImg: districtCopy.influencerImg
    };
}

function renderItineraryStops(stops, vars) {
    const isMobile = window.innerWidth <= 768;
    return `
    <style>
        .itinerary-grid-custom {
            display: grid;
            grid-template-columns: 1fr;
            gap: 40px;
            position: relative;
        }
        @media (min-width: 768px) {
            .itinerary-grid-custom {
                grid-template-columns: 1fr 1fr;
            }
            .stop-3-full {
                grid-column: 1 / -1;
                max-width: 800px;
                margin: 0 auto;
                width: 100%;
            }
            .connecting-line {
                position: absolute;
                top: 80px;
                left: 25%;
                width: 50%;
                height: 30px;
                background-image: radial-gradient(circle at 100% 100%, transparent 15px, var(--accent) 15px, var(--accent) 18px, transparent 18px),
                                  radial-gradient(circle at 0 0, transparent 15px, var(--accent) 15px, var(--accent) 18px, transparent 18px);
                background-size: 30px 100%;
                background-position: 0 0, 15px 0;
                background-repeat: repeat-x;
                opacity: 0.4;
                z-index: 0;
            }
        }
        .stop-card-custom {
            background: linear-gradient(165deg, rgba(15, 22, 38, 0.8) 0%, rgba(15, 22, 38, 0.6) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 12px;
            text-align: left;
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .stop-avatar-container {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        .stop-avatar {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--accent);
            background: var(--bg-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: var(--accent);
        }
        .stop-business-placeholder {
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
            border: 1px dashed rgba(255,255,255,0.2);
            display: flex;
            gap: 15px;
            align-items: center;
        }
        .stop-business-img {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.3);
            font-size: 1.5rem;
        }
        .stop-business-info h4 {
            margin: 0 0 5px 0;
            color: var(--text-primary);
            font-size: 1.1rem;
        }
        .stop-business-info p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
    </style>
    <div class="itinerary-grid-custom">
        <div class="connecting-line"></div>
        ${stops.map((stop, index) => {
            let avatarHtml = '';
            if (index === 0) {
                avatarHtml = `<img src="${vars.influencerImg}" class="stop-avatar" alt="${vars.influencerName}">`;
            } else if (index === 1) {
                avatarHtml = `<img src="${vars.councilImg}" class="stop-avatar" alt="${vars.councilName}">`;
            } else {
                avatarHtml = `<div class="stop-avatar">?</div>`;
            }

            const businessHtml = `
                <div class="stop-business-placeholder">
                    <div class="stop-business-img">🖼️</div>
                    <div class="stop-business-info">
                        <h4>Venue Name</h4>
                        <p>123 Venue Street</p>
                    </div>
                </div>
            `;

            const cardClass = index === 2 ? 'stop-card-custom stop-3-full' : 'stop-card-custom';

            return `
            <div class="${cardClass} stop-${index + 1}">
                <div class="stop-avatar-container">
                    ${avatarHtml}
                    <div>
                        <div class="stop-number" style="position: static; font-size: 1.2rem; margin-bottom: 5px; color: var(--accent); opacity: 1;">${stop.number}</div>
                        <h3 style="margin: 0; font-size: 1.4rem;">${interpolate(stop.title, vars)}</h3>
                    </div>
                </div>
                <p style="margin: 0; font-size: 1rem; line-height: 1.5;">${interpolate(stop.body, vars)}</p>
                ${businessHtml}
            </div>`;
        }).join('')}
    </div>`;
}

function renderScheduleItems(items) {
    return items.map((item) => `<li>${item}</li>`).join('\n                            ');
}

function renderMapLegend() {
    return `
                <div class="map-filters-viewport" style="background: var(--bg-secondary); margin-top: 0; margin-bottom: 0px; padding: 20px 0; border-radius: 0 0 8px 8px; width: 100%;">
                    <div class="map-filters-inner" style="width: 100%; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 30px;">
                        
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding-right: 30px; border-right: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;">
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

                        <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: center; justify-content: flex-start; flex-grow: 1;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #D2A039; box-shadow: 0 0 8px #D2A039;"></div>
                                <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">Bar</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #B32424; box-shadow: 0 0 8px #B32424;"></div>
                                <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">Restaurant</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #D946EF; box-shadow: 0 0 8px #D946EF;"></div>
                                <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">Live Venue</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #45B7D1; box-shadow: 0 0 8px #45B7D1;"></div>
                                <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">Museum/Gallery</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #A87B28; box-shadow: 0 0 8px #A87B28;"></div>
                                <span style="color: var(--text-primary); font-family: var(--font-header); font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">Other</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; border-left: 1px solid rgba(203, 160, 82, 0.3); padding-left: 15px;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: transparent; border: 2px solid #fff;"></div>
                                <span style="color: var(--text-secondary); font-family: var(--font-header); font-size: 0.8rem; font-style: italic;">Currently Top 10</span>
                            </div>
                        </div>
                    </div>
                </div>

            `;
}

function renderVotingStates(district) {
    return `
            <div class="voting-section js-reveal reveal-y delay-200" id="voting-module">
                <div class="state-controls" style="text-align: center; margin-bottom: 20px;">
                    <span style="color: var(--text-secondary); margin-right: 10px; font-weight: bold; font-size: 0.9rem; text-transform: uppercase;">Preview States:</span>
                    <button onclick="window.setVotingState('pre-voting')">Pre-Voting</button>
                    <button onclick="window.setVotingState('round-1')">Round 1</button>
                    <button onclick="window.setVotingState('run-off')">Run-Off</button>
                    <button onclick="window.setVotingState('post-election')">Post-Election</button>
                </div>

                <div id="state-pre-voting" class="voting-state-container">
                    <div style="text-align: center; padding: 40px 20px;">
                        <h3 style="font-size: 1.8rem; color: var(--text-primary); font-family: var(--font-hero); text-transform: uppercase;">Voting Opens Soon!</h3>
                        <p style="font-size: 1.1rem; color: var(--text-secondary); margin-top: 10px;">Explore the venues on the map. Voting will begin 14 days before the event.</p>
                    </div>
                </div>

                <div id="state-round-1" class="voting-state-container" style="display: none;">
                    <div class="voting-header" style="display: none;">
                        <h2>Round 1: Choose Your Final Stop</h2>
                        <p>The top 5 venues will advance to the run-off in:</p>
                        <div class="countdown-clock small-clock">
                            <div class="time-box"><span>02</span><label>Days</label></div>
                            <div class="time-box"><span>14</span><label>Hrs</label></div>
                            <div class="time-box"><span>20</span><label>Mins</label></div>
                        </div>
                    </div>
                    <p style="text-align: center; color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">Use the numbers on the map above to locate venues.</p>
                    
                    <div class="leaderboard" style="margin-bottom: 20px;">
                        <h3 style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.2rem; margin-bottom: 10px; text-transform: uppercase;">Current Leaders</h3>
                        <div class="leaderboard-bar 1st" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 85%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#1</span>
                                <span class="venue-name">The Rusty Nail</span>
                                <span class="vote-count">1,245 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 2nd" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 65%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#2</span>
                                <span class="venue-name">Barrel Proof</span>
                                <span class="vote-count">980 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 3rd" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 45%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#3</span>
                                <span class="venue-name">The Tchoup Yard</span>
                                <span class="vote-count">650 votes</span>
                            </div>
                        </div>
                    </div>

                    <div class="venue-list-container">
                        <ul class="venue-list">
                            <!-- Dynamically populated from Firestore -->
                        </ul>
                        <div class="pagination">
                            <button disabled>← Prev</button>
                            <span>Page 1 of 4</span>
                            <button>Next →</button>
                        </div>
                    </div>
                </div>

                <div id="state-run-off" class="voting-state-container" style="display: none;">
                    <div class="voting-header" style="display: none;">
                        <h2>The Run-Off: Top 5</h2>
                        <p>It's down to the wire! The polls close in:</p>
                    </div>
                    <div class="leaderboard" style="margin-bottom: 20px;">
                        <h3 style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.2rem; margin-bottom: 10px; text-transform: uppercase;">Current Leaders</h3>
                        <div class="leaderboard-bar 1st" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 85%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#1</span>
                                <span class="venue-name">The Rusty Nail</span>
                                <span class="vote-count">1,245 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 2nd" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 65%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#2</span>
                                <span class="venue-name">Barrel Proof</span>
                                <span class="vote-count">980 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 3rd" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 45%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#3</span>
                                <span class="venue-name">The Tchoup Yard</span>
                                <span class="vote-count">650 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 4th" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 35%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#4</span>
                                <span class="venue-name">Capulet</span>
                                <span class="vote-count">420 votes</span>
                            </div>
                        </div>
                        <div class="leaderboard-bar 5th" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: 25%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#5</span>
                                <span class="venue-name">Bulldog Mid-City</span>
                                <span class="vote-count">295 votes</span>
                            </div>
                        </div>
                    </div>
                    <div class="venue-list-container">
                        <ul class="venue-list">
                            <!-- Dynamically populated from Firestore -->
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

            <style>
                .share-modal-content-box {
                    max-width: 480px;
                    width: 90%;
                }
                .share-modal-body {
                    display: flex;
                    flex-direction: column;
                    gap: 25px;
                }
                @media (min-width: 768px) {
                    .share-modal-content-box {
                        max-width: 750px !important;
                    }
                    .share-modal-body {
                        flex-direction: row;
                        align-items: flex-start;
                    }
                    .share-modal-instructions {
                        flex: 0 0 38%;
                    }
                    .share-modal-graphics {
                        flex: 1;
                        justify-content: flex-start !important;
                    }
                }
            </style>
            <div id="share-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content share-content share-modal-content-box" style="padding: 25px 20px 20px 20px; background: #0F1626; max-height: 90vh; overflow-y: auto;">
                    <button class="close-modal" onclick="window.closeShareModal()" style="top: 20px; right: 20px;">×</button>
                    <h2 id="share-modal-title" style="font-size: 1.6rem; margin-top: 0; margin-bottom: 25px; color: var(--text-primary); font-family: var(--font-hero); padding-right: 30px; line-height: 1.2;">Vote Confirmed!</h2>
                    
                    <div class="share-modal-body">
                        <div class="share-modal-instructions">
                            <div style="background: rgba(255,255,255,0.05); padding: 12px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); text-align: left; margin-bottom: 0;">
                                <p style="color: var(--text-secondary); font-family: var(--font-main); font-size: 1.05rem; margin: 0 0 12px 0; line-height: 1.3;">Encourage friends to vote for this business, too! <b style="color: var(--text-primary);">Save the image below & share as an Instagram story.</b> Use Instagram's text and sticker tools to add the business name and the link to vote for this business.</p>
                                <input type="text" id="share-url-input" readonly style="position: absolute; left: -9999px;" aria-hidden="true">
                                <div style="text-align: left;">
                                    <button onclick="window.copyShareUrl()" style="padding: 8px 14px; background: #618A62; color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.9rem; font-family: var(--font-main); transition: background 0.2s; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;">
                                        <img class="link-icon" src="assets/link.png" alt="" style="width: 14px; height: 14px; object-fit: contain; filter: brightness(0) saturate(100%) invert(72%) sepia(21%) saturate(942%) hue-rotate(354deg) brightness(91%) contrast(88%); opacity: 0.8; transition: all 0.2s ease;"> Copy Link
                                    </button>
                                </div>
                                <p id="copy-success-msg" style="color: #7fd99a; font-family: var(--font-main); font-size: 0.85rem; margin: 8px 0 0 0; display: none; text-align: left;">Link copied to clipboard!</p>
                            </div>
                        </div>

                        <div class="share-modal-graphics" style="display: flex; justify-content: center; align-items: stretch; gap: 15px;">
                            <div style="position: relative; width: 100%; max-width: 220px; flex-shrink: 0;">
                                <!-- The graphic is displayed directly without canvas modification -->
                                <img id="generated-share-graphic" src="" alt="Your Custom Share Graphic" style="width: 100%; height: auto; display: block; border: 2px solid var(--text-primary); border-radius: 12px; box-sizing: border-box; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
                            </div>
                            
                            <div style="position: relative; display: flex; flex-direction: column; flex-grow: 1; max-width: 130px;">
                                <p style="position: absolute; top: 0%; color: var(--text-primary); font-family: var(--font-main); font-size: 0.9rem; font-weight: bold; line-height: 1.3; margin: 0;">&lt;&lt; Open image in Instagram as a Story</p>
                                <p style="position: absolute; top: 35%; color: var(--text-primary); font-family: var(--font-main); font-size: 0.9rem; font-weight: bold; line-height: 1.3; margin: 0;">&lt;&lt; Use Text Tool to place business name here</p>
                                <p style="position: absolute; bottom: 12%; color: var(--text-primary); font-family: var(--font-main); font-size: 0.9rem; font-weight: bold; line-height: 1.3; margin: 0;">&lt;&lt; Use sticker to copy/paste link here</p>
                            </div>
                        </div>
                    </div>
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

            <div class="purpose-section js-reveal reveal-opacity" style="margin: 80px 0; background: transparent;">
                <div class="purpose-module">
                    <div class="purpose-frame js-reveal reveal-y delay-200">
                        <h2>${shared.behindSeries.heading}</h2>
                        <p>${shared.behindSeries.body}</p>
                    </div>
                </div>
            </div>

            <!-- Election Intro & Features ABOVE the map -->
            <div class="election-intro-section js-reveal reveal-opacity" style="padding: 80px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto; text-align: center;">
                <div class="voting-header" style="margin-bottom: 20px;">
                    <h2 style="font-size: 2.5rem; margin-bottom: 5px; font-family: var(--font-header); text-transform: uppercase; color: var(--text-primary);">The Election: Stop 3</h2>
                    <p style="font-size: 1.1rem; color: var(--text-secondary);">Where are we ending the night? The polls open 14 days before the event.</p>
                </div>
                <div class="instruction-box" style="padding: 30px; max-width: 900px; margin: 0 auto 40px auto; text-align: left; background: rgba(15, 22, 38, 0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
                    <h3 style="margin-bottom: 15px; font-size: 1.4rem; color: var(--text-primary); font-family: var(--font-header); text-transform: uppercase; letter-spacing: 1px;">How it works</h3>
                    <ul style="margin: 0; padding-left: 20px; font-size: 1rem; color: var(--text-main); line-height: 1.6;">
                        <li style="margin-bottom: 10px;"><strong>Round 1:</strong> Voting opens for all districts when the press release drops. Vote for your favorite neighborhood spots. The top 5 advance.</li>
                        <li style="margin-bottom: 10px;"><strong>The Run-Off:</strong> Starts the Monday before the event at 3:00 PM. A final sprint to decide the winner among the top 5.</li>
                        <li style="margin-bottom: 0;"><strong>The Prize:</strong> The winning venue hosts the final stop. Every vote is an entry into the Golden Ticket Raffle!</li>
                    </ul>
                </div>
                
                <div class="map-features-layout" style="margin-top: 40px; padding-top: 0;">
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
            </div>

            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section" style="margin-bottom: 0;">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
                <div id="map"></div>
                ${renderMapLegend()}
            </div>

            <!-- Voting States Below Map -->
            <div class="voting-states-section js-reveal reveal-y delay-200" style="padding: 80px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto; text-align: center;">
                ${renderVotingStates(districtCopy.district)}
                </div>
            </div>

            <!-- Crawl-tinery Pulled Up Beneath Map -->
            <div class="itinerary-section js-reveal reveal-y delay-200" style="padding: 80px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto;">
                <h2 style="font-family: var(--font-header); font-size: 2.5rem; text-align: left; text-transform: uppercase; color: var(--text-primary); margin-bottom: 40px;">${shared.itinerary.heading}</h2>
                <div class="itinerary-grid">${renderItineraryStops(districtCopy.itinerary.stops, vars)}</div>
                </div>
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
                    <button class="auth-btn email" style="width: 100%; padding: 15px; font-size: 1.1rem;" onclick="const m = document.querySelector('#vote-modal'); window.location.href='login.html?redirect=' + encodeURIComponent(window.location.pathname + '?vote=' + m.dataset.venueId + '&name=' + encodeURIComponent(m.dataset.venueName || ''))">Log In with Email or Google</button>
                `;
            }
        });

        window.openVoteModal = (venueId, venueName) => {
            const modal = this.querySelector('#vote-modal');
            const nameEl = this.querySelector('#modal-venue-name');
            nameEl.innerText = venueName;
            
            const shareVenueName = this.querySelector('#share-venue-name');
            if (shareVenueName) {
                shareVenueName.innerText = venueName;
            }
            
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
            const modal = this.querySelector('#vote-modal');
            const venueId = modal.dataset.venueId;
            const venueName = modal.dataset.venueName || '';
            
            if (!currentUser) {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + '?vote=' + venueId + '&name=' + encodeURIComponent(venueName));
                return;
            }
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
                
                // Check if user already voted for this specific venue
                if (votes[venueId]) {
                    errorMsg.textContent = `You have already voted for ${venueName || 'this venue'}.`;
                    errorMsg.style.display = 'block';
                    btn.innerText = 'Submit Vote';
                    btn.disabled = false;
                    return;
                }
                
                // Update user's votes
                votes[venueId] = true;
                await setDoc(userRef, { votes: votes }, { merge: true });
                
                // Increment venue's voteCount
                const venueRef = doc(db, "venues", venueId);
                await updateDoc(venueRef, {
                    voteCount: increment(1)
                });
                
                window.showShareScreen();
            } catch (error) {
                console.error("Error submitting vote:", error);
                errorMsg.textContent = "Error: " + error.message.replace("Firebase: ", "");
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
            
            // Get the venue details
            const modal = this.querySelector('#vote-modal');
            const venueName = modal.dataset.venueName || "A LOCAL BUSINESS";
            const venueId = modal.dataset.venueId || "";
            
            // Determine district from URL
            const path = window.location.pathname;
            const match = path.match(/district-([a-e])\.html/i);
            const districtId = match ? match[1].toUpperCase() : 'B';

            // Personalize the success message with the venue name
            const titleEl = this.querySelector('#share-modal-title');
            if (titleEl) {
                // Capitalize only the first letter of the sentence, keep venue name as is
                titleEl.innerHTML = `Vote for <span style="text-transform: uppercase;">${venueName}</span> confirmed!`;
                titleEl.style.textTransform = 'none'; // Override the CSS uppercase
            }

            // Generate the deep link URL for this specific venue immediately
            const shareUrl = window.location.origin + window.location.pathname + '?vote=' + encodeURIComponent(venueId) + '&name=' + encodeURIComponent(venueName);
            const urlInput = this.querySelector('#share-url-input');
            if (urlInput) {
                urlInput.value = shareUrl;
            }
            
            // Set the image source directly without using canvas
            const imgEl = this.querySelector('#generated-share-graphic');
            if (imgEl) {
                imgEl.src = `assets/District%20Parings/VoteShare_${districtId}.png`;
            }
            
            // Show the modal
            this.querySelector('#share-modal').style.display = 'flex';
        };

        window.closeShareModal = () => {
            this.querySelector('#share-modal').style.display = 'none';
        };

        window.copyShareUrl = () => {
            const urlInput = this.querySelector('#share-url-input');
            if (urlInput) {
                navigator.clipboard.writeText(urlInput.value).then(() => {
                    const btn = this.querySelector('button[onclick="window.copyShareUrl()"]');
                    const icon = btn ? btn.querySelector('.link-icon') : null;
                    const successMsg = this.querySelector('#copy-success-msg');
                    
                    if (btn) {
                        const origBg = btn.style.background;
                        const origBorder = btn.style.borderColor;
                        btn.style.background = '#618A62';
                        btn.style.borderColor = '#618A62';
                        
                        if (icon) {
                            icon.dataset.origFilter = icon.style.filter;
                            icon.dataset.origOp = icon.style.opacity;
                            icon.style.filter = 'brightness(0) saturate(100%) invert(100%)';
                            icon.style.opacity = '1';
                        }
                        
                        if (successMsg) successMsg.style.display = 'block';
                        
                        setTimeout(() => {
                            if (successMsg) successMsg.style.display = 'none';
                            btn.style.background = origBg;
                            btn.style.borderColor = origBorder;
                            if (icon) {
                                icon.style.filter = icon.dataset.origFilter;
                                icon.style.opacity = icon.dataset.origOp;
                            }
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        };

        window.setVotingState = (stateId) => {
            const states = ['pre-voting', 'round-1', 'run-off', 'post-election'];
            
            // Update map legend round name based on state
            const legendRoundName = this.querySelector('#legend-round-name');
            if (legendRoundName) {
                if (stateId === 'pre-voting') legendRoundName.innerText = 'Voting Opens Soon';
                else if (stateId === 'round-1') legendRoundName.innerText = 'Round 1';
                else if (stateId === 'run-off') legendRoundName.innerText = 'Run-Off';
                else if (stateId === 'post-election') legendRoundName.innerText = 'Results';
            }
            
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
                // We want to open the map popup for this venue, not just the vote modal directly.
                // The map rendering is asynchronous, so we wait for the markers to be populated.
                const checkMapInterval = setInterval(() => {
                    if (window.openMapPopupForVenue) {
                        clearInterval(checkMapInterval);
                        window.openMapPopupForVenue(voteTarget);
                        // Also scroll to the map
                        const mapSection = document.getElementById('map-section');
                        if (mapSection) {
                            mapSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                }, 200);
                
                // Fallback: clear interval after 5 seconds if map fails to load
                setTimeout(() => clearInterval(checkMapInterval), 5000);
            }
        }, 150);
    }
}

customElements.define('event-layout', EventLayout);
