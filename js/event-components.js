import './leaderboard.js';
import { auth, db } from "./firebase-config.js";
import { doc, updateDoc, increment, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

function interpolate(text, vars) {
    if (!text) return '';
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function renderHeroIntro(intro, vars) {
    const paragraphs = Array.isArray(intro) ? intro : [intro];
    return paragraphs
        .filter(Boolean)
        .map((paragraph) => `<p>${interpolate(paragraph, vars)}</p>`)
        .join('');
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

// Matches homepage event cards (index.html #events)
const DISTRICT_HERO_IMAGES = {
    a: 'assets/district_a_image.jpeg',
    b: 'assets/district_b_image.jpg',
    c: 'assets/district_c_image.png',
    d: 'assets/district_d_image.jpg',
    e: 'assets/district_e_image.jpg'
};

function getDistrictHeroImage(districtId, fallback) {
    return DISTRICT_HERO_IMAGES[districtId] || fallback;
}

function renderItineraryStops(stops, vars) {
    return `
    <style>
        .proceedings-container {
            position: relative;
            padding: 40px 0 80px;
            width: 100%;
            margin: 0 auto;
        }
        
        .proceedings-path {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
        }

        .proc-step {
            position: relative;
            z-index: 1;
            margin-bottom: 80px;
            display: flex;
        }
        .proc-step.left { justify-content: flex-start; }
        .proc-step.right { justify-content: flex-end; }
        .proc-step.center { justify-content: center; margin-bottom: 0; }

        .proc-card {
            width: 100%;
            max-width: 500px;
            background: linear-gradient(165deg, rgba(15, 22, 38, 0.95) 0%, rgba(15, 22, 38, 0.8) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 35px;
            border-radius: 16px;
            text-align: left;
            backdrop-filter: blur(10px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.6);
        }
        .proc-step.center .proc-card {
            max-width: 100%;
            border-color: var(--brand-red);
            border-width: 2px;
            box-shadow: 0 0 25px rgba(138, 47, 37, 0.25);
            text-align: center;
        }

        .stop-avatar-container {
            display: flex; align-items: center; gap: 18px; margin-bottom: 20px;
        }
        .proc-step.center .stop-avatar-container {
            justify-content: center;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 25px;
        }

        .stop-avatar {
            width: 80px; height: 80px; border-radius: 50%; object-fit: cover;
            border: 2px solid var(--accent); background: var(--bg-secondary);
            display: flex; align-items: center; justify-content: center;
            font-size: 2.2rem; color: var(--accent); flex-shrink: 0;
        }
        .proc-step.center .stop-avatar {
            width: 90px; height: 90px; font-size: 2.8rem;
            box-shadow: 0 0 15px rgba(203, 160, 82, 0.4);
        }
        
        .proc-instructions {
            background: rgba(0,0,0,0.4);
            border-radius: 12px;
            padding: 30px;
            margin-top: 35px;
            border-left: 4px solid var(--accent);
            text-align: left;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .proc-instructions h4 {
            color: var(--text-primary); margin: 0 0 15px 0; font-size: 1.3rem; font-family: var(--font-header); text-transform: uppercase; letter-spacing: 1px;
        }
        .proc-instructions ul {
            margin: 0; padding-left: 20px; color: var(--text-main); font-size: 1.05rem; line-height: 1.6;
        }
        .proc-instructions li { margin-bottom: 12px; }
        .proc-instructions li:last-child { margin-bottom: 0; }

        .desktop-path { display: inline; }
        .mobile-path { display: none; }

        @media (max-width: 900px) {
            .proc-step.left, .proc-step.right, .proc-step.center { justify-content: center; margin-bottom: 40px; }
            .desktop-path { display: none; }
            .mobile-path { display: inline; }
        }
    </style>
    
    <div class="proceedings-container">
        <!-- 3D Winding SVG Path (responsive) -->
        <svg class="proceedings-path" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- DESKTOP Layers ('S' shape) -->
            <g class="desktop-path">
                <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="rgba(138,47,37,0.35)" stroke-width="22" vector-effect="non-scaling-stroke" transform="translate(6, 6)" />
                <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="var(--text-primary)" stroke-width="16" vector-effect="non-scaling-stroke" transform="translate(4, 4)" />
                <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="var(--accent)" stroke-width="10" vector-effect="non-scaling-stroke" transform="translate(2, 2)" />
                <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="var(--brand-red)" stroke-width="4" vector-effect="non-scaling-stroke" />
            </g>
            
            <!-- MOBILE Layers (Gentle centered wave) -->
            <g class="mobile-path">
                <path d="M 50,5 C 80,35 20,65 50,95" fill="none" stroke="rgba(138,47,37,0.35)" stroke-width="22" vector-effect="non-scaling-stroke" transform="translate(6, 6)" />
                <path d="M 50,5 C 80,35 20,65 50,95" fill="none" stroke="var(--text-primary)" stroke-width="16" vector-effect="non-scaling-stroke" transform="translate(4, 4)" />
                <path d="M 50,5 C 80,35 20,65 50,95" fill="none" stroke="var(--accent)" stroke-width="10" vector-effect="non-scaling-stroke" transform="translate(2, 2)" />
                <path d="M 50,5 C 80,35 20,65 50,95" fill="none" stroke="var(--brand-red)" stroke-width="4" vector-effect="non-scaling-stroke" />
            </g>
        </svg>

        ${stops.map((stop, index) => {
            const alignClass = index === 0 ? 'left' : (index === 1 ? 'right' : 'center');
            
            let avatarHtml = '';
            if (index === 0) {
                avatarHtml = `<img src="${vars.influencerImg}" class="stop-avatar" alt="${vars.influencerName}">`;
            } else if (index === 1) {
                avatarHtml = `<img src="${vars.councilImg}" class="stop-avatar" alt="${vars.councilName}">`;
            } else {
                avatarHtml = `<div class="stop-avatar">🗳️</div>`;
            }

            let extraHtml = '';
            let subtitleHtml = `<p style="margin: 0; font-size: 1.1rem; line-height: 1.6; color: var(--text-secondary);">${interpolate(stop.body, vars)}</p>`;
            
            if (index === 2) {
                // Combine the "How it works" instructions into the third stop to unify the narrative
                subtitleHtml = `<p style="margin: 0; font-size: 1.15rem; line-height: 1.6; color: var(--text-secondary);">Where are we ending the night? The polls open 14 days before the event.</p>`;
                extraHtml = `
                    <div class="proc-instructions">
                        <h4>How it works</h4>
                        <ul>
                            <li><strong>Round 1:</strong> Voting opens for all districts when the press release drops. Vote for your favorite neighborhood spots. The top 10 advance.</li>
                            <li><strong>The Run-Off:</strong> Starts the Monday before the event at 3:00 PM. A final sprint to decide the winner among the top 10.</li>
                            <li><strong>The Prize:</strong> The winning venue hosts the final stop. Every vote is an entry into the Golden Ticket Raffle!</li>
                        </ul>
                    </div>
                `;
            }

            return `
            <div class="proc-step ${alignClass} stop-${index + 1}">
                <div class="proc-card">
                    <div class="stop-avatar-container">
                        ${avatarHtml}
                        <div style="text-align: ${index === 2 ? 'center' : 'left'};">
                            <div class="stop-number" style="font-size: 1.2rem; margin-bottom: 4px; color: var(--accent); font-weight: bold; letter-spacing: 1px;">STOP ${stop.number}</div>
                            <h3 style="margin: 0; font-size: 1.7rem; font-family: var(--font-header); text-transform: uppercase;">${index === 2 ? 'The Election: Stop 3' : interpolate(stop.title, vars)}</h3>
                        </div>
                    </div>
                    ${subtitleHtml}
                    ${extraHtml}
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

function renderVenueOperatorsStrip(shared) {
    return `
        <div class="venue-operators-strip">
            <span class="venue-operators-label">${shared.venueOperators.heading}</span>
            <span class="venue-operators-text">${shared.venueOperators.body}</span>
            <a href="${shared.venueOperators.ctaHref}" class="brand-btn venue-operators-btn">${shared.venueOperators.ctaText}</a>
        </div>`;
}

function renderMapLegend() {
    return `
                <div class="map-filters-viewport" style="background: var(--bg-secondary); margin-top: 0; margin-bottom: 0px; padding: 20px 0; border-radius: 0 0 8px 8px; width: 100%;">
                    <div class="map-filters-inner" style="width: 100%; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 30px;">
                        
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; border-right: 1px solid rgba(255,255,255,0.2);">
                            <div style="text-align: center;">
                                <div id="legend-round-subtitle" style="color: var(--text-secondary); font-size: 1.2rem; font-family: var(--font-hero); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">RUN-OFF BEGINS IN</div>
                            </div>
                            <div class="countdown-clock small-clock" style="margin: 0; flex-wrap: nowrap;">
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">02</span><label style="font-size: 0.7rem;">Days</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">14</span><label style="font-size: 0.7rem;">Hrs</label></div>
                                <div class="time-box" style="padding: 6px 12px; min-width: 50px;"><span style="font-size: 2rem; line-height: 1;">20</span><label style="font-size: 0.7rem;">Mins</label></div>
                            </div>
                        </div>

                        <div style="flex: 1; display: flex; gap: 20px; flex-wrap: wrap; align-items: center; justify-content: center;">
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

// Reusable Venue Explorer: one component that toggles between a vote-ranked
// Leaderboard view and a Browse view (A-Z/Z-A sort + business-type filter).
// Used in both the round-1 and run-off states to avoid duplicated markup.
function renderVenueExplorer() {
    return `
                    <div class="venue-explorer">
                        <div class="explorer-tabs">
                            <button type="button" class="explorer-tab active" data-view="leaderboard">Leaderboard</button>
                            <button type="button" class="explorer-tab" data-view="browse">Browse All</button>
                        </div>
                        <div class="explorer-controls" style="display: none;">
                            <select class="sort-select" aria-label="Sort venues">
                                <option value="az">Name: A&ndash;Z</option>
                                <option value="za">Name: Z&ndash;A</option>
                            </select>
                            <select class="type-filter" aria-label="Filter by business type">
                                <option value="all">All Types</option>
                                <option value="Bar">Bar</option>
                                <option value="Restaurant">Restaurant</option>
                                <option value="Live Venue">Live Venue</option>
                                <option value="Museum/Gallery">Museum/Gallery</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="explorer-pane leaderboard-pane">
                            <div class="leaderboard" style="margin-bottom: 0;">
                                <h3>Current Leaders</h3>
                                <ul class="venue-list leaderboard-list">
                                    <!-- Dynamically populated from Firestore -->
                                </ul>
                            </div>
                        </div>
                        <div class="explorer-pane browse-pane" style="display: none;">
                            <div class="venue-list-container">
                                <ul class="venue-list">
                                    <!-- Dynamically populated from Firestore -->
                                </ul>
                                <div class="pagination" style="display: none;"></div>
                            </div>
                        </div>
                    </div>`;
}

function renderVotingStates(district) {
    return `
            <div class="voting-section" id="voting-module">
                <div id="state-round-1" class="voting-state-container" style="display: block;">
                    <div class="voting-header" style="display: none;">
                        <h2>Round 1: Choose Your Final Stop</h2>
                        <p>The top 10 venues will advance to the run-off in:</p>
                        <div class="countdown-clock small-clock">
                            <div class="time-box"><span>02</span><label>Days</label></div>
                            <div class="time-box"><span>14</span><label>Hrs</label></div>
                            <div class="time-box"><span>20</span><label>Mins</label></div>
                        </div>
                    </div>
                    ${renderVenueExplorer()}
                </div>

                <div id="state-run-off" class="voting-state-container" style="display: none;">
                    <div class="voting-header" style="display: none;">
                        <h2>The Run-Off: Top 10</h2>
                        <p>It's down to the wire! The polls close in:</p>
                    </div>
                    ${renderVenueExplorer()}
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
                <div id="state-post-event" class="voting-state-container" style="display: none; padding: 40px 0; text-align: center;">
                    <div class="voting-header">
                        <h2 style="font-family: var(--font-header); font-size: 2.5rem; text-transform: uppercase; color: var(--text-primary); margin-bottom: 20px;">What a Night</h2>
                        <p style="font-size: 1.1rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">Thank you to everyone who came out to District ${district} and supported our local nighttime economy. We'll see you at the next one!</p>
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

            // Render immediately with a safe default state. The election schedule is
            // fetched asynchronously AFTER render (see applyElectionSchedule) so a slow,
            // throttled, or failed Firestore read can never block the page from loading.
            window.currentElectionState = window.currentElectionState || 'round-1';
            window.electionWinnerId = window.electionWinnerId || null;


            const heroBg = getDistrictHeroImage(districtId, districtCopy.bgImg);

            this.innerHTML = `
            <div class="event-hero-wrap" style="background-image: linear-gradient(rgba(15, 22, 38, 0.85), rgba(15, 22, 38, 0.95)), url('${heroBg}'); background-position: center; background-size: cover; background-attachment: fixed;">
                <div class="event-hero">
                <div class="hero-left">
                    <h1 class="title-3d">${interpolate(shared.hero.title, vars)}</h1>
                    <h2>${districtCopy.date}</h2>
                    ${renderHeroIntro(districtCopy.heroIntro, vars)}
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
            </div>

            <div class="purpose-section js-reveal reveal-opacity" style="margin: 30px 0; background: transparent;">
                <div class="purpose-module">
                    <div class="purpose-frame js-reveal reveal-y delay-200">
                        <div class="purpose-copy">
                            <h2>${shared.behindSeries.heading}</h2>
                            <p>${shared.behindSeries.body}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Night's Proceedings & Election Intro -->
            <div class="proceedings-section js-reveal reveal-y delay-200" style="padding: 20px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto; text-align: center;">
                    <h2 style="font-family: var(--font-hero); font-size: 3.5rem; text-transform: uppercase; color: var(--text-primary); margin-top: 20px; margin-bottom: 15px; letter-spacing: 2px;">${shared.itinerary.heading}</h2>
                    <p style="font-size: 1.15rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto 10px;">Follow the trail and cast your vote to decide where District ${districtCopy.district} ends the night.</p>
                    ${renderItineraryStops(districtCopy.itinerary.stops, vars)}
                </div>
            </div>

            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section" style="margin-bottom: 0;">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
                <div id="map"></div>
                ${renderMapLegend()}
            </div>

            <!-- Voting States Below Map -->
            <div class="voting-states-section js-reveal reveal-y delay-200" style="padding: 30px 0; background: transparent;">
                <div class="page-module" style="width: 80%; max-width: 1400px; margin: 0 auto; text-align: center;">
                ${renderVotingStates(districtCopy.district)}
                ${renderVenueOperatorsStrip(shared)}
                </div>
            </div>

            <!-- Local Legends Photo Wall Bento Grid -->
            <div class="local-legends-section js-reveal reveal-opacity" style="padding: 30px 0; background: var(--bg-primary); width: 100%; overflow: hidden;">
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
            // Non-blocking: resolve the live election state after the page is on screen.
            this.applyElectionSchedule(districtId);
        } catch (error) {
            console.error('CRITICAL ERROR loading event page:', error);
            this.innerHTML = `<p style="padding: 2rem; margin-top: 100px; text-align: center; color: red; font-size: 2rem; z-index: 9999; position: relative;">Unable to load event content: ${error.message}</p>`;
        }
    }

    async applyElectionSchedule(districtId) {
        try {
            const scheduleRef = doc(db, "settings", "schedule");
            const schedSnap = await getDoc(scheduleRef);
            if (!schedSnap.exists() || !schedSnap.data()[districtId.toUpperCase()]) return;

            const sched = schedSnap.data()[districtId.toUpperCase()];
            const now = new Date();
            const parseDate = (d) => (d && d.toDate ? d.toDate() : new Date(d));

            let activeState = 'round-1';
            let winnerId = null;
            if (sched.postEvent && now >= parseDate(sched.postEvent)) {
                activeState = 'post-event';
            } else if (sched.winnerAnnounce && now >= parseDate(sched.winnerAnnounce)) {
                activeState = 'post-election';
                winnerId = sched.winnerId;
            } else if (sched.runOffStart && now >= parseDate(sched.runOffStart)) {
                activeState = 'run-off';
            }

            window.currentElectionState = activeState;
            window.electionWinnerId = winnerId;
            if (window.setVotingState) window.setVotingState(activeState);
        } catch (err) {
            console.warn('Election schedule unavailable; defaulting to round-1 state.', err);
        }
    }

    initScrollAnimations() {
        setTimeout(() => {
            // threshold 0: reveal as soon as any part enters the viewport. A higher
            // threshold breaks for very tall sections (e.g. the full venue list), which
            // can never occupy 15% of the screen and would otherwise stay invisible.
            const observerOptions = {
                root: null,
                rootMargin: '0px 0px -40px 0px',
                threshold: 0
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
                
                if (userData.isBanned) {
                    errorMsg.textContent = `Your account is suspended.`;
                    errorMsg.style.display = 'block';
                    btn.innerText = 'Submit Vote';
                    btn.disabled = false;
                    return;
                }
                
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
                
                // Add a detailed audit record
                const voteRecordRef = doc(db, "venues", venueId, "votes", currentUser.uid);
                await setDoc(voteRecordRef, {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName || userData.displayName || "Unknown User",
                    email: currentUser.email || userData.email || "",
                    timestamp: new Date()
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
            const states = ['round-1', 'run-off', 'post-election', 'post-event'];
            
            // Update map legend subtitle based on state
            const legendSubtitle = document.querySelector('#legend-round-subtitle');
            if (legendSubtitle) {
                if (stateId === 'round-1') {
                    legendSubtitle.innerText = 'RUN-OFF BEGINS IN';
                } else if (stateId === 'run-off') {
                    legendSubtitle.innerText = 'VOTING CLOSES IN';
                } else if (stateId === 'post-election') {
                    legendSubtitle.innerText = 'VOTING CLOSED';
                } else {
                    legendSubtitle.innerText = 'EVENT COMPLETE';
                }
            }
            
            states.forEach(s => {
                const el = this.querySelector('#state-' + s);
                if (el) el.style.display = s === stateId ? 'block' : 'none';
            });
        };
        
        if (window.currentElectionState) {
            setTimeout(() => {
                window.setVotingState(window.currentElectionState);
            }, 100);
        }


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
