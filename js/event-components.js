import './leaderboard.js';
import { auth, db } from "./firebase-config.js";
import { doc, updateDoc, increment, getDoc, setDoc, collection, collectionGroup, getDocs, query, where, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { isAdminUser } from "./admin-auth.js";
import { renderVoteTally, animateVoteTallySlotMachine } from "./vote-tally.js";

// "Local Legend" threshold. checkin.html awards 50 points per visit, so a
// Legend has earned LEGEND_POINTS_THRESHOLD points (== LEGEND_CHECKIN_COUNT visits).
const LEGEND_POINTS_THRESHOLD = 500;
const LEGEND_CHECKIN_COUNT = 10;

function interpolate(text, vars) {
    if (!text) return '';
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// Escapes text for safe insertion into innerHTML (captions can include
// user-provided display names).
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function renderHeroIntro(intro, vars) {
    const paragraphs = Array.isArray(intro) ? intro : [intro];
    return paragraphs
        .filter(Boolean)
        .map((paragraph) => `<p>${interpolate(paragraph, vars)}</p>`)
        .join('');
}

function renderHeroTitle(title, vars) {
    const text = interpolate(title, vars);
    const match = text.match(/^District\s+(\S+)\s+(.+)$/i);
    if (match) {
        return `<span class="title-3d-line">District ${escapeHtml(match[1])}</span><span class="title-3d-line">${escapeHtml(match[2])}</span>`;
    }
    return escapeHtml(text);
}

function buildTemplateVars(districtCopy) {
    const councilFirstName = districtCopy.councilName?.split(' ')[0] ?? '';
    const influencerFirstName = districtCopy.influencerName?.split(' ')[0] ?? '';
    const brandedAccounts = ['EatenPathNola', 'EmpowerYouNola'];
    const influencerIntro = brandedAccounts.includes(districtCopy.influencerAccountTitle)
        ? `${districtCopy.influencerName} of ${districtCopy.influencerAccountTitle}`
        : districtCopy.influencerName;

    return {
        district: districtCopy.district,
        date: districtCopy.date,
        time: districtCopy.time,
        location: districtCopy.location,
        councilName: districtCopy.councilName,
        councilDisplayName: districtCopy.councilDisplayName || districtCopy.councilName,
        councilFirstName,
        influencerName: districtCopy.influencerName,
        influencerFirstName,
        influencerIntro,
        influencerAccountTitle: districtCopy.influencerAccountTitle ?? '',
        councilImg: districtCopy.councilImg,
        influencerImg: districtCopy.influencerImg,
        influencerSocialUrl: districtCopy.influencerSocialUrl,
        councilBioUrl: districtCopy.councilBioUrl
    };
}

// Pulls a readable @handle out of a social profile URL (falls back to a
// generic label if the URL shape is unexpected).
function socialHandleFromUrl(url) {
    try {
        const path = new URL(url).pathname.replace(/\/+$/, '').split('/').pop();
        return path ? `@${path}` : 'Profile';
    } catch {
        return 'Profile';
    }
}

// Formats a schedule date (Firestore Timestamp or ISO string) into copy like
// "Monday, August 4 at 3:00 PM" for the run-off teaser on the Election card.
function parseScheduleDate(dateVal) {
    if (!dateVal) return null;
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return isNaN(d) ? null : d;
}

function getCountdownParts(targetDate, now = new Date()) {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, mins: 0 };
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    };
}

function formatScheduleDateTime(dateVal) {
    const d = parseScheduleDate(dateVal);
    if (!d) return null;
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    // On-the-hour display, e.g. "6 PM" (omit ":00" minutes). If a non-hour time
    // ever slips through, fall back to showing minutes so we never mislead.
    const timeOpts = d.getMinutes() === 0 ? { hour: 'numeric' } : { hour: 'numeric', minute: '2-digit' };
    const timeStr = d.toLocaleTimeString('en-US', timeOpts);
    return `${dateStr} at ${timeStr}`;
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

function itineraryStyles() {
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
            text-align: left;
        }

        .stop-avatar-container {
            display: flex; align-items: center; gap: 18px; margin-bottom: 20px;
        }

        .stop-avatar {
            width: 95px; height: 95px; border-radius: 50%; object-fit: cover;
            box-sizing: border-box;
            border: 3px solid transparent;
            background: conic-gradient(from -45deg, var(--text-primary), var(--accent), var(--brand-red), var(--text-primary)) border-box;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
            display: flex; align-items: center; justify-content: center;
            font-size: 2.2rem; color: var(--accent); flex-shrink: 0;
        }
        .proc-step.center .stop-avatar {
            width: 95px; height: 95px; font-size: 2.8rem;
            background:
                linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
                conic-gradient(from -45deg, var(--text-primary), var(--accent), var(--brand-red), var(--text-primary)) border-box;
        }

        /* Modified 3D title (scaled-down version of the homepage event-card
           title) used for the "First Stop / Second Stop / Last Stop" labels. */
        .stop-label-3d {
            display: inline-block;
            font-family: var(--font-hero);
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-primary);
            text-transform: uppercase;
            transform: rotate(-2deg) skewX(-5deg);
            text-shadow:
                1px 1px 0px #0F1626,
                2px 2px 0px var(--accent),
                3px 3px 0px var(--accent),
                4px 4px 0px var(--brand-red),
                5px 5px 8px rgba(0,0,0,0.4);
            letter-spacing: 1px;
            margin-bottom: 6px;
        }

        .stop-host-link {
            display: block;
            margin-top: 14px;
            font-weight: 700;
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
            color: var(--text-primary);
            text-decoration: none;
            white-space: normal;
            overflow-wrap: anywhere;
        }
        .stop-host-link:hover { text-decoration: underline; }

        .proc-card-body {
            margin: 0;
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
            color: var(--text-secondary);
        }

        .election-runoff-date {
            margin: 10px 0 0 0;
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
            color: var(--text-primary);
            font-weight: 600;
        }
        .election-runoff-date .runoff-date-value {
            color: rgba(203, 160, 82, 1);
            font-weight: 800;
            text-decoration: underline;
        }
        .election-runoff-disclaimer {
            margin: 8px 0 0 0;
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
            color: var(--text-secondary);
        }
        .election-runoff-disclaimer em {
            font-style: italic;
        }

        .proc-instructions {
            background: none;
            border-radius: 0;
            padding: 24px 0 0;
            margin-top: 35px;
            border: none;
            border-top: 1px solid var(--text-primary);
            text-align: left;
        }
        .proc-instructions h4 {
            color: var(--text-primary); margin: 0 0 6px 0; font-size: 1.3rem; font-family: var(--font-header); text-transform: uppercase; letter-spacing: 1px;
        }
        .proc-instructions > p.hiw-intro {
            margin: 0 0 20px 0;
            color: var(--text-secondary);
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
            max-width: 620px;
        }
        .proc-instructions ul {
            margin: 0;
            padding-left: 20px;
            color: var(--text-main);
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
        }
        .proc-instructions li { margin-bottom: 12px; }
        .proc-instructions li:last-child { margin-bottom: 0; }

        /* Redesigned "How It Works" — focuses on the map/leaderboard below and
           on recruiting votes via social shares, styled as engaging icon cards. */
        .how-it-works-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 4px;
        }
        .hiw-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            padding: 22px 20px;
            text-align: left;
            transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .hiw-card:hover {
            transform: translateY(-4px);
            border-color: rgba(203,160,82,0.4);
            background: rgba(255,255,255,0.05);
        }
        .hiw-icon {
            width: 52px; height: 52px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.6rem;
            margin-bottom: 16px;
            box-sizing: border-box;
            border: 3px solid transparent;
            background:
                linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
                conic-gradient(from -45deg, var(--text-primary), var(--accent), var(--brand-red), var(--text-primary)) border-box;
            filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4));
        }
        .hiw-card h5 {
            margin: 0 0 8px 0;
            font-family: var(--font-hero);
            text-transform: uppercase;
            font-size: 1.05rem;
            color: var(--text-primary);
            letter-spacing: 0.5px;
        }
        .hiw-card p {
            margin: 0;
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
            color: var(--text-secondary);
        }
        .hiw-scroll-cue {
            margin-top: 22px;
            text-align: center;
            font-family: var(--font-hero);
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 1.5px;
            color: var(--accent);
            animation: hiwBounce 1.8s ease-in-out infinite;
        }
        @keyframes hiwBounce {
            0%, 100% { transform: translateY(0); opacity: 0.85; }
            50% { transform: translateY(4px); opacity: 1; }
        }
        @media (max-width: 900px) {
            .how-it-works-grid { grid-template-columns: 1fr; }
        }

        /* Run-off "revealed pick" cards */
        .reveal-card { padding-top: 0; overflow: hidden; }
        .reveal-card-media {
            display: block;
            width: calc(100% + 70px);
            margin: -35px -35px 22px -35px;
            height: 210px;
            object-fit: cover;
            background: var(--bg-secondary);
        }
        .reveal-card-media[hidden] { display: none; }
        .reveal-role-label {
            display: inline-block;
            font-family: var(--font-header);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-size: 0.8rem;
            color: var(--accent);
            margin-bottom: 6px;
        }
        .reveal-stop-number {
            font-size: 1.1rem; margin-bottom: 4px; color: var(--text-secondary);
            font-weight: bold; letter-spacing: 1px;
        }
        .reveal-business-name {
            margin: 0 0 16px 0;
            font-size: 1.9rem;
            font-family: var(--font-header);
            text-transform: uppercase;
            color: var(--text-primary);
            line-height: 1.05;
        }
        .reveal-body {
            margin: 0 0 22px 0;
            font-size: var(--body-text-size);
            line-height: var(--body-line-height);
            color: var(--text-secondary);
        }
        .reveal-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .reveal-actions .reveal-btn {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            font-family: var(--font-header);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 0.82rem;
            font-weight: 700;
            padding: 11px 18px;
            border-radius: 24px;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .reveal-btn.reveal-map-link {
            background: var(--brand-red);
            color: #fff;
            border: 1px solid var(--brand-red);
        }
        .reveal-btn.reveal-map-link:hover { filter: brightness(1.12); }
        .reveal-btn.reveal-web-link {
            background: transparent;
            color: var(--text-primary);
            border: 1px solid rgba(203,160,82,0.5);
        }
        .reveal-btn.reveal-web-link:hover { border-color: var(--text-primary); }
        .reveal-btn.reveal-web-link[hidden] { display: none; }

        .desktop-path { display: inline; }
        .mobile-path { display: none; }

        @media (max-width: 900px) {
            .proc-step.left, .proc-step.right, .proc-step.center { justify-content: center; margin-bottom: 40px; }
            .proc-card {
                width: 100%;
                max-width: none;
                padding: 28px 20px;
            }
            .proc-step.center .proc-card {
                max-width: none;
            }
            .stop-avatar-container {
                gap: 12px;
                align-items: flex-start;
            }
            .stop-avatar {
                width: 68px;
                height: 68px;
                font-size: 1.75rem;
                border-width: 2px;
            }
            .proc-step.center .stop-avatar {
                width: 68px;
                height: 68px;
                font-size: 2.1rem;
            }
            .stop-avatar-container h3 {
                font-size: 1.35rem !important;
                line-height: 1.3 !important;
            }
            .desktop-path { display: none; }
            .mobile-path { display: inline; }
        }
    </style>`;
}

function proceedingsPathSvg() {
    return `
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
        </svg>`;
}

// Ordinal flavor labels for the 3 nightcrawl stops (replaces the plain
// "STOP 01/02/03" caption with the homepage's 3D title treatment).
const STOP_ORDINAL_LABELS = ['First Stop', 'Second Stop', 'Last Stop'];

// A single teaser stop card (used for the influencer & council stops in the
// default, pre-run-off Crawl-tinery).
function renderHostStop(stop, index, vars) {
    const alignClass = index === 0 ? 'left' : 'right';
    const hostRole = stop.hostRole ?? (index === 0 ? 'influencer' : 'council');
    const avatarHtml = hostRole === 'influencer'
        ? `<img src="${vars.influencerImg}" class="stop-avatar" alt="${vars.influencerName}">`
        : `<img src="${vars.councilImg}" class="stop-avatar" alt="${vars.councilName}">`;

    // Stop links out to the host's social account or official bio page.
    let hostLinkHtml = '';
    if (hostRole === 'influencer' && vars.influencerSocialUrl) {
        hostLinkHtml = `<a href="${vars.influencerSocialUrl}" target="_blank" rel="noopener noreferrer" class="stop-host-link">Follow ${socialHandleFromUrl(vars.influencerSocialUrl)}</a>`;
    } else if (hostRole === 'council' && vars.councilBioUrl) {
        hostLinkHtml = `<a href="${vars.councilBioUrl}" target="_blank" rel="noopener noreferrer" class="stop-host-link">View ${vars.councilName}'s bio</a>`;
    }

    return `
            <div class="proc-step ${alignClass} stop-${index + 1}">
                <div class="proc-card">
                    <div class="stop-avatar-container">
                        ${avatarHtml}
                        <div style="text-align: left;">
                            <div class="stop-label-3d">${STOP_ORDINAL_LABELS[index]}</div>
                            <h3 style="margin: 0; font-size: 1.7rem; line-height: 36px; font-family: var(--font-header); text-transform: uppercase;">${interpolate(stop.title, vars)}</h3>
                        </div>
                    </div>
                    <p class="proc-card-body">${interpolate(stop.body, vars)}</p>
                    ${hostLinkHtml}
                </div>
            </div>`;
}

// The final "Stop 3 / The Election" card. Shared by both Crawl-tinery variants
// since the third stop is decided by the public vote in every phase. The
// run-off start date/time (#election-runoff-date-value) is filled in from the
// live schedule by updateRunoffDateDisplay() once it's fetched.
function renderElectionStop() {
    return `
            <div class="proc-step center stop-3">
                <div class="proc-card">
                    <div class="stop-avatar-container">
                        <div class="stop-avatar">🗳️</div>
                        <div style="text-align: left;">
                            <div class="stop-label-3d">${STOP_ORDINAL_LABELS[2]}</div>
                            <h3 style="margin: 0; font-size: 1.7rem; line-height: 36px; font-family: var(--font-header); text-transform: uppercase;">Tell Us Where to End the Night</h3>
                        </div>
                    </div>
                    <p class="proc-card-body">Your favorite neighborhood restaurant? A dive bar? A great spot for live music? It's up to you!</p>
                    <p class="election-runoff-date" id="election-runoff-date">A run-off of your top ten choices starts <span class="runoff-date-value">soon</span>.</p>
                    <p class="election-runoff-disclaimer"><em>* Event hosts (Nighttime Economy, Council Office and influencer) must agree to appear at a location for it to be included in the run-off.</em></p>

                    <div class="proc-instructions">
                        <h4>How It Works</h4>
                        <p class="hiw-intro">Every vote below is a real vote for the crawl's final stop. Here's how to make yours count.</p>
                        <div class="how-it-works-grid">
                            <div class="hiw-card">
                                <div class="hiw-icon">🗺️</div>
                                <h5>Explore &amp; Vote on the Map</h5>
                                <p>Scroll down to browse every bar, restaurant, live venue, and museum/gallery in the district &mdash; each one color-coded and pinned to the map below.</p>
                            </div>
                            <div class="hiw-card">
                                <div class="hiw-icon">🏆</div>
                                <h5>Browse Businesses on the Leaderboard</h5>
                                <p>Tap any pin, or use the leaderboard and browse list below, to vote for your favorite spots. Vote for as many businesses as you like &mdash; the top 10 advance to the run-off.</p>
                            </div>
                            <div class="hiw-card">
                                <div class="hiw-icon">📲</div>
                                <h5>Recruit More Votes</h5>
                                <p>Copy a venue's direct link from its map popup or leaderboard card and drop it into an Instagram or TikTok story to rally your friends and followers.</p>
                            </div>
                        </div>
                        <div class="hiw-scroll-cue">↓ Scroll down to explore the map &amp; leaderboard ↓</div>
                    </div>
                </div>
            </div>`;
}

// A single "revealed pick" card for the run-off Crawl-tinery. Content is
// populated at runtime from the venue doc + schedule (see populateRunoffCrawltinery).
function renderRevealCard({ role, roleLabel, stopNumber, alignClass, avatar, hostName, title, hostLinkUrl, businessName, address, image, website, body }) {
    const isLeft = alignClass === 'left';
    
    let hostLinkHtml = '';
    if (hostLinkUrl) {
        hostLinkHtml = `<div style="margin-top: 15px; margin-bottom: 0;"><a href="${hostLinkUrl}" target="_blank" rel="noopener noreferrer" class="stop-host-link">View ${hostName}'s bio</a></div>`;
    }

    return `
            <div class="proc-step ${alignClass}" data-pick-role="${role}">
                <div class="proc-card reveal-card">
                    <div class="stop-avatar-container">
                        <img src="${avatar}" class="stop-avatar" alt="${hostName}">
                        <div style="text-align: ${isLeft ? 'left' : 'right'};">
                            <div class="stop-label-3d">${stopNumber === '01' ? 'FIRST STOP' : 'SECOND STOP'}</div>
                            <h3 style="margin: 0; font-size: 1.7rem; line-height: 36px; font-family: var(--font-header); text-transform: uppercase;">${title}</h3>
                        </div>
                    </div>
                    
                    <div class="reveal-business-info" style="display: flex; gap: 20px; margin-top: 20px; margin-bottom: 20px; align-items: center;">
                        <img class="reveal-card-media" data-field="image" src="${image || ''}" alt="${businessName || ''}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; flex-shrink: 0; ${image ? '' : 'display: none;'}">
                        <div>
                            <h4 class="reveal-business-name" data-field="name" style="margin: 0 0 5px 0; font-size: 1.4rem; font-family: var(--font-header); color: var(--accent);">${businessName || 'To Be Revealed'}</h4>
                            <div class="reveal-business-address" data-field="address" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px; ${address ? '' : 'display: none;'}">${address || ''}</div>
                            <div class="reveal-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button type="button" class="brand-btn reveal-btn reveal-map-link" data-field="map" style="padding: 5px 10px; font-size: 0.8rem; display: none;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    Map
                                </button>
                                <a class="brand-btn reveal-btn reveal-web-link" data-field="website" href="${website || '#'}" target="_blank" rel="noopener noreferrer" style="padding: 5px 10px; font-size: 0.8rem; ${website ? 'display: inline-flex; align-items: center;' : 'display: none;'}">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                    Website
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <p class="reveal-body" data-field="body" style="margin: 0; font-size: 1.15rem; line-height: 1.6; color: var(--text-secondary);">${body || ''}</p>
                    ${hostLinkHtml}
                </div>
            </div>`;
}

// Default (pre-run-off) Crawl-tinery: teases the two host stops + the election.
function renderDefaultCrawltinery(stops, vars) {
    return `
    <div class="proceedings-container">
        ${proceedingsPathSvg()}
        ${renderHostStop(stops[0], 0, vars)}
        ${renderHostStop(stops[1], 1, vars)}
        ${renderElectionStop()}
    </div>`;
}

// Run-off Crawl-tinery: reveals the two businesses the hosts selected, then the
// still-live election for the third stop.
function renderRunoffCrawltinery(vars, influencerRole, councilRole, stops) {
    const getRoleData = (role) => {
        if (role === 'council') return { label: councilRole, avatar: vars.councilImg, name: vars.councilName, link: vars.councilBioUrl };
        return { label: influencerRole, avatar: vars.influencerImg, name: vars.influencerName, link: vars.influencerSocialUrl };
    };

    const stop1 = stops[0];
    const stop2 = stops[1];
    const s1Data = getRoleData(stop1.hostRole);
    const s2Data = getRoleData(stop2.hostRole);

    return `
    <div class="proceedings-container">
        ${proceedingsPathSvg()}
        ${renderRevealCard({ 
            role: stop1.hostRole, 
            roleLabel: s1Data.label, 
            stopNumber: '01', 
            alignClass: 'left', 
            avatar: s1Data.avatar, 
            hostName: s1Data.name, 
            title: interpolate(stop1.title, vars), 
            hostLinkUrl: s1Data.link,
            businessName: stop1.businessName,
            address: stop1.address,
            image: stop1.image,
            website: stop1.website,
            body: interpolate(stop1.runoffBody || stop1.body, vars)
        })}
        ${renderRevealCard({ 
            role: stop2.hostRole, 
            roleLabel: s2Data.label, 
            stopNumber: '02', 
            alignClass: 'right', 
            avatar: s2Data.avatar, 
            hostName: s2Data.name, 
            title: interpolate(stop2.title, vars), 
            hostLinkUrl: s2Data.link,
            businessName: stop2.businessName,
            address: stop2.address,
            image: stop2.image,
            website: stop2.website,
            body: interpolate(stop2.runoffBody || stop2.body, vars)
        })}
        ${renderElectionStop()}
    </div>`;
}

// Renders both Crawl-tinery variants. The run-off variant is hidden until the
// run-off begins; setVotingState() toggles between them based on the schedule.
function renderItinerary(districtCopy, vars, shared) {
    const influencerRole = districtCopy.influencerAccountTitle || shared.roles.influencer;
    const councilRole = shared.roles.council;
    return `
    ${itineraryStyles()}
    <div id="crawltinery-default">
        ${renderDefaultCrawltinery(districtCopy.itinerary.stops, vars)}
    </div>
    <div id="crawltinery-runoff" style="display: none;">
        ${renderRunoffCrawltinery(vars, influencerRole, councilRole, districtCopy.itinerary.stops)}
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
                                <div id="legend-round-subtitle" style="color: var(--text-secondary); font-size: 1.2rem; font-family: var(--font-hero); letter-spacing: 1px; margin-top: 2px;">Top 10 run-off begins in</div>
                            </div>
                            <div class="countdown-clock small-clock">
                                <div class="time-box"><span>--</span><label>Days</label></div>
                                <div class="time-box"><span>--</span><label>Hrs</label></div>
                                <div class="time-box"><span>--</span><label>Mins</label></div>
                            </div>
                        </div>

                        <div class="map-legend-items">
                            <div class="map-legend-item">
                                <div class="map-legend-dot" style="background-color: #D2A039; box-shadow: 0 0 8px #D2A039;"></div>
                                <span class="map-legend-label">Bar</span>
                            </div>
                            <div class="map-legend-item">
                                <div class="map-legend-dot" style="background-color: #B32424; box-shadow: 0 0 8px #B32424;"></div>
                                <span class="map-legend-label">Restaurant</span>
                            </div>
                            <div class="map-legend-item">
                                <div class="map-legend-dot" style="background-color: #D946EF; box-shadow: 0 0 8px #D946EF;"></div>
                                <span class="map-legend-label">Live Venue</span>
                            </div>
                            <div class="map-legend-item">
                                <div class="map-legend-dot" style="background-color: #45B7D1; box-shadow: 0 0 8px #45B7D1;"></div>
                                <span class="map-legend-label">Museum/Gallery</span>
                            </div>
                            <div class="map-legend-item">
                                <div class="map-legend-dot" style="background-color: #A87B28; box-shadow: 0 0 8px #A87B28;"></div>
                                <span class="map-legend-label">Other</span>
                            </div>
                            <div class="map-legend-item map-legend-item--top10">
                                <div class="map-legend-dot map-legend-dot--outline"></div>
                                <span class="map-legend-label map-legend-label--muted">Currently Top 10</span>
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
                            <input type="search" class="venue-search" placeholder="Search venues..." aria-label="Search venues">
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
                            <div class="time-box"><span>--</span><label>Days</label></div>
                            <div class="time-box"><span>--</span><label>Hrs</label></div>
                            <div class="time-box"><span>--</span><label>Mins</label></div>
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
            </div>`;
}

// Modals use position:fixed, so they must NOT live inside a .js-reveal section:
// those sections get a transform on scroll-in, which makes fixed descendants
// anchor to the section (below the map / off-screen) instead of the viewport.
// Rendered at the event-layout root instead (see connectedCallback).
function renderVoteModals(district) {
    return `
            <div id="vote-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content vote-modal-content">
                    <button type="button" class="close-modal vote-modal-close" onclick="window.closeVoteModal()" aria-label="Close">×</button>
                    <div class="vote-modal-header">
                        <h2>Vote for the last stop of the nightcrawl in District ${district} to be ...</h2>
                    </div>
                    <div class="vote-modal-body">
                        <div class="animated-arrow arrow-3d vote-modal-arrow">↓</div>
                        <div id="modal-venue-name" class="vote-modal-venue-name"></div>
                        <div id="modal-vote-tally" class="modal-vote-tally-wrap"></div>
                        <div class="auth-buttons" id="vote-auth-section">
                            <!-- Populated dynamically based on auth state -->
                        </div>
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
                                <div id="share-instructions-text" style="color: var(--text-secondary); font-family: var(--font-main); font-size: 1.05rem; line-height: 1.3;">
                                    <p style="margin: 0 0 10px 0;">Encourage friends to vote for <b id="share-instructions-venue" style="color: var(--text-primary);">this business</b>, too!</p>
                                    <p style="margin: 0 0 10px 0;">Save this image, then share it as an Instagram story.</p>
                                    <p style="margin: 0 0 12px 0;">Use Instagram's text and sticker tools to add the business name and the custom link below.</p>
                                </div>
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
                    <h1 class="title-3d">${renderHeroTitle(shared.hero.title, vars)}</h1>
                    <h2>${districtCopy.date}</h2>
                    ${renderHeroIntro(districtCopy.heroIntro || shared.heroIntro, vars)}
                    <button type="button" id="vote-scroll-btn" class="brand-btn" onclick="document.getElementById('map-section').scrollIntoView({behavior: 'smooth'})">${interpolate(shared.hero.rsvpButton, vars)}</button>
                </div>
                <div class="hero-right">
                    <div class="hero-cards-stack">
                        <div class="flow-card council-card" style="animation: float 6s ease-in-out infinite 1s;">
                            <img src="${districtCopy.councilImg}" alt="${districtCopy.councilName}">
                            <div class="card-caption"><span class="interior-hosts">${districtCopy.councilName}</span><span class="interior-neighborhoods">${shared.roles.council}</span></div>
                        </div>
                        <div class="couple-ampersand stack-ampersand" style="animation: float 6s ease-in-out infinite 1.5s;">&amp;</div>
                        <div class="flow-card influencer-card" style="animation: float 6s ease-in-out infinite;">
                            <img src="${districtCopy.influencerImg}" alt="${districtCopy.influencerName}">
                            <div class="card-caption"><span class="interior-hosts">${districtCopy.influencerName}</span><span class="interior-neighborhoods">${districtCopy.influencerAccountTitle || shared.roles.influencer}</span></div>
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
            <div class="proceedings-section js-reveal reveal-y delay-200">
                <div class="page-module">
                    <h2 class="title-3d section-title crawl-tinery-title">${shared.itinerary.heading}</h2>
                    <div class="proceedings-intro">
                        <p class="proceedings-intro__lede">Follow the trail and cast your vote to decide where District ${districtCopy.district} ends the night.</p>
                    </div>
                    ${renderItinerary(districtCopy, vars, shared)}
                </div>
            </div>

            <!-- Map Section -->
            <div class="map-section-wrapper js-reveal reveal-opacity" id="map-section" style="margin-bottom: 0;">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><span class="map-title-neighborhoods">${districtCopy.location}</span></h2>
                <div id="map"></div>
                ${renderMapLegend()}
            </div>

            <!-- Voting States Below Map -->
            <div class="voting-states-section js-reveal reveal-y delay-200" style="padding: 30px 0; margin-bottom: 30px; background: transparent;">
                <div class="page-module">
                ${renderVotingStates(districtCopy.district)}
                ${renderVenueOperatorsStrip(shared)}
                </div>
            </div>

            ${renderVoteModals(districtCopy.district)}

            <!-- Local Legends Photo Wall Bento Grid (populated from check-in photos) -->
            <div class="local-legends-section js-reveal reveal-opacity" style="background: var(--bg-primary); width: 100%; overflow: hidden;">
                <h2 class="title-3d section-title" id="local-legends-title">Become a Local Legend</h2>
                <p id="local-legends-subtitle">Earn 50 points every time you check in at a hospitality business in District ${districtCopy.district} &mdash;<br>reach 500 to become a Local Legend.</p>

                <div class="bento-photo-wall" id="local-legends-wall">
                    <div class="legends-loading" style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 40px 0;">Loading check-ins&hellip;</div>
                </div>
            </div>

            <style>
                @keyframes float {
                    0% { transform: translateY(0px) var(--base-transform, ); }
                    50% { transform: translateY(-4px) var(--base-transform, ); }
                    100% { transform: translateY(0px) var(--base-transform, ); }
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
                    grid-template-columns: repeat(3, 1fr);
                    grid-auto-rows: 100px;
                    grid-auto-flow: dense;
                    gap: 8px;
                    padding: 0 20px;
                    max-width: 1120px;
                    margin: 0 auto;
                }

                /* Keep every tile uniform on phones — no oversized bento spans */
                .bento-large,
                .bento-tall,
                .bento-wide {
                    grid-column: span 1;
                    grid-row: span 1;
                }
                
                .bento-item {
                    position: relative;
                    border-radius: 8px;
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

                .bento-photo {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    z-index: 0;
                    display: block;
                }
                
                .bento-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    background: linear-gradient(to top, rgba(15,22,38,0.9) 0%, rgba(15,22,38,0.2) 50%, rgba(15,22,38,0) 100%);
                    display: flex;
                    align-items: flex-end;
                    padding: 8px 10px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .bento-item:hover .bento-overlay {
                    opacity: 1;
                }
                
                .bento-overlay span {
                    color: var(--text-primary);
                    font-family: var(--font-hero);
                    font-size: 0.75rem;
                    line-height: 1.05;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                    transform: translateY(15px);
                    transition: transform 0.3s ease;
                }
                
                .bento-item:hover .bento-overlay span {
                    transform: translateY(0);
                }

                /* Legend badge (shown in "legends only" mode) */
                .bento-legend-badge {
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    z-index: 2;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: linear-gradient(135deg, var(--accent), var(--brand-red));
                    color: #fff;
                    font-family: var(--font-hero);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 5px 10px;
                    border-radius: 20px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.5);
                }

                /* Empty state when a district has no qualifying check-in photos yet */
                .legends-empty {
                    grid-column: 1 / -1;
                    text-align: center;
                    color: var(--text-secondary);
                    padding: 50px 20px;
                    border: 1px dashed rgba(203,160,82,0.3);
                    border-radius: 12px;
                    background: rgba(255,255,255,0.02);
                    font-size: 1.05rem;
                    line-height: 1.6;
                }
                .legends-empty strong { color: var(--text-primary); display: block; font-family: var(--font-hero); text-transform: uppercase; font-size: 1.3rem; margin-bottom: 8px; letter-spacing: 1px; }

                @media (min-width: 768px) {
                    .bento-photo-wall {
                        grid-template-columns: repeat(3, 1fr);
                        grid-auto-rows: 130px;
                        gap: 10px;
                        padding: 0 clamp(24px, 5vw, 48px);
                        max-width: 800px;
                    }

                    .bento-item {
                        border-radius: 10px;
                    }

                    .bento-overlay {
                        padding: 10px 12px;
                    }

                    .bento-overlay span {
                        font-size: 0.75rem;
                        line-height: 1.1;
                        letter-spacing: 0.5px;
                    }
                }

                @media (min-width: 1024px) {
                    .bento-photo-wall {
                        grid-template-columns: repeat(4, 1fr);
                        grid-auto-rows: 200px;
                        gap: 12px;
                        padding: 0 clamp(32px, 6vw, 72px);
                        max-width: 1120px;
                    }

                    .bento-item {
                        border-radius: 12px;
                    }

                    .bento-overlay {
                        padding: 20px;
                    }

                    .bento-overlay span {
                        font-size: 1.5rem;
                        line-height: 1.2;
                        letter-spacing: 1px;
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
            const footer = document.querySelector('site-footer');
            if (footer?.setPhotoCredit && districtCopy.photoCredit) {
                footer.setPhotoCredit(districtCopy.photoCredit);
            }
            // Non-blocking: resolve the live election state after the page is on screen.
            this.applyElectionSchedule(districtId);
            // Admin-only: in-page toolbar to preview each election phase locally.
            this.initAdminPreview();
            // Local Legends reads every check-in citywide (collectionGroup), so
            // defer it until the wall scrolls into view. Most visitors vote/browse
            // the map without reaching it, avoiding that cost entirely at scale.
            this.deferLocalLegends(districtId);
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

            let activeState = 'round-1';
            let winnerId = null;
            if (sched.postEvent && now >= parseScheduleDate(sched.postEvent)) {
                activeState = 'post-event';
            } else if (sched.winnerAnnounce && now >= parseScheduleDate(sched.winnerAnnounce)) {
                activeState = 'post-election';
                winnerId = sched.winnerId;
            } else if (sched.runOffStart && now >= parseScheduleDate(sched.runOffStart)) {
                activeState = 'run-off';
            }

            window.currentElectionState = activeState;
            window.electionWinnerId = winnerId;
            this._electionSchedule = sched;

            // Populate the run-off Crawl-tinery cards from the schedule's picks so
            // they are ready before we toggle them into view.
            this.populateRunoffCrawltinery(sched);
            this.updateRunoffDateDisplay(sched.runOffStart);

            // Local Legends board mode is controlled from the same dashboard doc.
            this.setLocalLegendsMode(sched.localLegendsMode || 'default');

            if (window.setVotingState) window.setVotingState(activeState);
            this.startCountdownTimer(activeState);
        } catch (err) {
            console.warn('Election schedule unavailable; defaulting to round-1 state.', err);
        }
    }

    // Fills in the run-off start date/time on the Election card (Stop 3) so
    // visitors know exactly when voting narrows to the top 10. Leaves the
    // "soon" placeholder if the schedule hasn't been set yet.
    updateRunoffDateDisplay(runOffStart) {
        const el = this.querySelector('#election-runoff-date .runoff-date-value');
        if (!el) return;
        const formatted = formatScheduleDateTime(runOffStart);
        if (formatted) el.textContent = formatted;
    }

    getCountdownTarget(stateId, sched = this._electionSchedule) {
        if (!sched) return null;
        if (stateId === 'round-1') return parseScheduleDate(sched.runOffStart);
        if (stateId === 'run-off') return parseScheduleDate(sched.winnerAnnounce);
        return null;
    }

    updateCountdownClocks(stateId) {
        const sched = this._electionSchedule;
        const target = this.getCountdownTarget(stateId, sched);
        let display;
        if (!sched) {
            display = ['--', '--', '--'];
        } else if (!target) {
            display = ['00', '00', '00'];
        } else {
            const parts = getCountdownParts(target);
            const pad = (n) => String(n).padStart(2, '0');
            display = [pad(parts.days), pad(parts.hours), pad(parts.mins)];
        }

        this.querySelectorAll('.countdown-clock').forEach((clock) => {
            const spans = clock.querySelectorAll('.time-box span');
            if (spans.length >= 3) {
                spans[0].textContent = display[0];
                spans[1].textContent = display[1];
                spans[2].textContent = display[2];
            }
        });
    }

    startCountdownTimer(initialState) {
        if (this._countdownInterval) clearInterval(this._countdownInterval);
        this._displayedElectionState = initialState;
        this.updateCountdownClocks(initialState);
        this._countdownInterval = setInterval(() => {
            const state = this._displayedElectionState || window.currentElectionState || 'round-1';
            this.updateCountdownClocks(state);
        }, 60000);
    }

    // Loads the Local Legends photo wall from real check-in photos for this
    // district, then renders it in whatever mode is currently active. The board
    // has two modes, switched from the dashboard (settings/schedule):
    //   'default' — every recent check-in photo (evidence of participation)
    //   'legends' — only photos from crawlers who reached Legend status
    // The heavy fetch runs once; setLocalLegendsMode() just re-filters/re-renders.
    // Fire initLocalLegends only when the photo wall is about to enter the
    // viewport (or immediately if IntersectionObserver is unavailable). Runs once.
    deferLocalLegends(districtId) {
        const wall = this.querySelector('#local-legends-wall');
        if (!wall) return;

        if (!('IntersectionObserver' in window)) {
            this.initLocalLegends(districtId);
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            if (entries.some((e) => e.isIntersecting)) {
                obs.disconnect();
                this.initLocalLegends(districtId);
            }
        }, { rootMargin: '400px 0px' });
        observer.observe(wall);
    }

    async initLocalLegends(districtId) {
        const wall = this.querySelector('#local-legends-wall');
        if (!wall) return;

        // Expose for the admin preview toolbar / console testing.
        window.setLocalLegendsMode = (m) => this.setLocalLegendsMode(m);

        try {
            const districtUpper = districtId.toUpperCase();

            // 1) District venues -> id set + id->name map. Prefer the pre-published
            // per-district snapshot (1 read); fall back to the indexed collection
            // query only if the snapshot has not been published yet.
            const venueNames = {};
            const snapDoc = await getDoc(doc(db, "settings", `venues_${districtUpper}`));
            let usedSnapshot = false;
            if (snapDoc.exists()) {
                try {
                    const points = JSON.parse(snapDoc.data().points || "[]");
                    if (Array.isArray(points) && points.length) {
                        points.forEach((p) => { venueNames[p.id] = p.name || 'A Local Business'; });
                        usedSnapshot = true;
                    }
                } catch (e) {
                    console.warn('Could not parse district venue snapshot for legends:', e);
                }
            }
            if (!usedSnapshot) {
                const venuesSnap = await getDocs(
                    query(collection(db, "venues"), where("district", "==", districtUpper))
                );
                venuesSnap.forEach((d) => { venueNames[d.id] = (d.data().name || 'A Local Business'); });
            }
            const districtVenueIds = new Set(Object.keys(venueNames));

            // 2) All check-in photos, filtered client-side to this district.
            // collectionGroup mirrors the dashboard's proven read pattern; we keep
            // only docs with a usable uploaded photo.
            const photos = [];
            const customersSnap = await getDocs(collectionGroup(db, "customers"));
            customersSnap.forEach((docSnap) => {
                const venueId = docSnap.ref.parent.parent.id;
                if (!districtVenueIds.has(venueId)) return;
                const data = docSnap.data();
                const url = data.photoUrl;
                if (!url || url === 'pending_upload' || url === 'Pending Upload') return;
                photos.push({
                    uid: docSnap.id,
                    venueId,
                    venueName: venueNames[venueId] || 'A Local Business',
                    photoUrl: url,
                    displayName: data.displayName || 'A Local Legend',
                    lastVisit: data.lastVisit && data.lastVisit.toDate ? data.lastVisit.toDate() : new Date(0)
                });
            });

            // 3) Set of "Legend" users (>= LEGEND_POINTS_THRESHOLD points) for the
            // legends-only mode. One indexed range query, scoped to actual legends.
            const legendUids = new Set();
            try {
                const legendsSnap = await getDocs(
                    query(collection(db, "users"), where("totalPoints", ">=", LEGEND_POINTS_THRESHOLD))
                );
                legendsSnap.forEach((d) => legendUids.add(d.id));
            } catch (e) {
                console.warn('Could not load Legend users; legends-only mode may be empty.', e);
            }

            // Newest check-ins first.
            photos.sort((a, b) => b.lastVisit - a.lastVisit);

            this._legendsData = { photos, legendUids };
            this.renderLocalLegends(window.localLegendsMode || 'default');
        } catch (err) {
            console.warn('Unable to load Local Legends photos:', err);
            this.renderLocalLegends(window.localLegendsMode || 'default');
        }
    }

    // Switches the board mode (called by the dashboard-driven schedule and
    // exposed globally for admin preview). Safe to call before data loads.
    setLocalLegendsMode(mode) {
        window.localLegendsMode = mode;
        if (this._legendsData) this.renderLocalLegends(mode);
        else this.updateLocalLegendsCopy(mode); // keep header in sync pre-load
    }

    // Updates just the title + subtitle for the active mode.
    updateLocalLegendsCopy(mode) {
        const title = this.querySelector('#local-legends-title');
        const subtitle = this.querySelector('#local-legends-subtitle');
        if (!title || !subtitle) return;
        const district = this.getAttribute('district') || '';
        if (mode === 'legends') {
            title.textContent = 'Our Local Legends';
            subtitle.textContent = `Meet the District ${district} crawlers who earned ${LEGEND_POINTS_THRESHOLD}+ points (${LEGEND_CHECKIN_COUNT} check-ins) to reach Legend status.`;
        } else {
            title.textContent = 'Become a Local Legend';
            subtitle.innerHTML = `Earn 50 points every time you check in at a hospitality business in District ${escapeHtml(district)} &mdash;<br>reach 500 to become a Local Legend.`;
        }
    }

    // Empty-state markup shown when a district has no usable check-in photos yet
    // (none submitted, or none that successfully load).
    legendsEmptyHtml(isLegendsMode) {
        return isLegendsMode
            ? `<div class="legends-empty"><strong>Legends Incoming</strong>No one has reached Legend status in District ${this.getAttribute('district') || ''} yet. Keep checking in &mdash; the first Local Legend could be you!</div>`
            : `<div class="legends-empty"><strong>Be the First Legend</strong>No check-in photos yet. Check in at a participating business and share your photo to claim your spot on the wall.</div>`;
    }

    // Renders the bento wall for the given mode from the cached photo data.
    // Behavior when there are no check-in photos yet (or an image fails to load):
    //   - No qualifying photos  -> a friendly empty-state call to action.
    //   - A photo URL 404s/blocks -> that tile is dropped (never a blank box);
    //     if every tile fails, we fall back to the empty state.
    renderLocalLegends(mode) {
        const wall = this.querySelector('#local-legends-wall');
        if (!wall) return;

        this.updateLocalLegendsCopy(mode);

        const data = this._legendsData || { photos: [], legendUids: new Set() };
        const isLegendsMode = mode === 'legends';
        let items = data.photos;
        if (isLegendsMode) items = items.filter((p) => data.legendUids.has(p.uid));

        // Cap the wall so it stays a tidy bento (most recent win).
        items = items.slice(0, 9);

        if (items.length === 0) {
            wall.innerHTML = this.legendsEmptyHtml(isLegendsMode);
            return;
        }

        // Repeating size pattern gives the grid its bento rhythm.
        const sizePattern = ['bento-large', '', 'bento-tall', 'bento-wide', '', '', 'bento-tall', '', 'bento-wide'];

        wall.innerHTML = items.map((p, i) => {
            const sizeClass = sizePattern[i % sizePattern.length];
            const badge = isLegendsMode ? `<div class="bento-legend-badge">★ Legend</div>` : '';
            const caption = escapeHtml(isLegendsMode ? p.displayName : p.venueName);
            return `
                <div class="bento-item ${sizeClass}">
                    <img class="bento-photo" src="${escapeHtml(p.photoUrl)}" alt="${caption}" loading="lazy">
                    ${badge}
                    <div class="bento-overlay"><span>${caption}</span></div>
                </div>`;
        }).join('');

        // Drop any tile whose photo can't load so a broken/expired URL never
        // renders as an empty dark box; if they all fail, show the empty state.
        wall.querySelectorAll('.bento-photo').forEach((img) => {
            img.addEventListener('error', () => {
                const tile = img.closest('.bento-item');
                if (tile) tile.remove();
                if (!wall.querySelector('.bento-item')) {
                    wall.innerHTML = this.legendsEmptyHtml(isLegendsMode);
                }
            });
        });
    }

    // Fills the run-off Crawl-tinery "revealed pick" cards. The business identity
    // (name, photo, website, map location) is pulled from each venue doc so the
    // admin only has to paste a venue ID + write the blurb in the dashboard.
    async populateRunoffCrawltinery(sched) {
        if (!sched) return;
        const picks = [
            { role: 'influencer', id: sched.influencerPickId, body: sched.influencerPickBody },
            { role: 'council', id: sched.councilPickId, body: sched.councilPickBody }
        ];

        for (const pick of picks) {
            const card = this.querySelector(`[data-pick-role="${pick.role}"]`);
            if (!card) continue;

            const bodyEl = card.querySelector('[data-field="body"]');
            if (bodyEl && pick.body) bodyEl.textContent = pick.body;

            if (!pick.id) continue;

            try {
                const venueSnap = await getDoc(doc(db, "venues", pick.id));
                if (!venueSnap.exists()) continue;
                const venue = venueSnap.data();

                const nameEl = card.querySelector('[data-field="name"]');
                if (nameEl && venue.name) nameEl.textContent = venue.name;

                const addressEl = card.querySelector('[data-field="address"]');
                if (addressEl && venue.address) {
                    addressEl.textContent = venue.address;
                    addressEl.style.display = 'block';
                }

                const imgEl = card.querySelector('[data-field="image"]');
                if (imgEl && venue.image) {
                    imgEl.src = venue.image;
                    imgEl.alt = venue.name || '';
                    imgEl.style.display = 'block';
                }

                const webEl = card.querySelector('[data-field="website"]');
                const websiteUrl = venue.website || venue.facebook;
                if (webEl && websiteUrl) {
                    webEl.href = websiteUrl;
                    webEl.style.display = 'inline-flex';
                    webEl.style.alignItems = 'center';
                }

                const mapBtn = card.querySelector('[data-field="map"]');
                if (mapBtn) {
                    mapBtn.style.display = 'inline-flex';
                    mapBtn.style.alignItems = 'center';
                    mapBtn.addEventListener('click', () => {
                        if (window.openMapPopupForVenue) window.openMapPopupForVenue(pick.id);
                        const mapSection = document.getElementById('map-section');
                        if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth' });
                    });
                }
            } catch (err) {
                console.warn(`Unable to load run-off pick for ${pick.role}:`, err);
            }
        }
    }

    // Admin-only floating toolbar for previewing each election phase. It only
    // renders for the admin account, is never shown to the public, and only
    // changes the LOCAL view (via setVotingState) — it writes nothing to
    // Firestore, so the live schedule and public site are never affected.
    initAdminPreview() {
        onAuthStateChanged(auth, async (user) => {
            const existing = document.getElementById('admin-preview-bar');

            if (!(await isAdminUser(user))) {
                if (existing) existing.remove();
                return;
            }
            if (existing) return; // already rendered for this session

            const phases = [
                { id: 'round-1', label: 'Round 1' },
                { id: 'run-off', label: 'Run-Off' },
                { id: 'post-election', label: 'Winner' },
                { id: 'post-event', label: 'Post-Event' }
            ];

            const bar = document.createElement('div');
            bar.id = 'admin-preview-bar';
            bar.innerHTML = `
                <style>
                    #admin-preview-bar {
                        position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
                        z-index: 99999; display: flex; align-items: center; gap: 12px;
                        flex-wrap: wrap; justify-content: center;
                        background: #0F1626; border: 1px solid var(--accent, #8A2F25);
                        border-bottom: none; border-radius: 10px 10px 0 0;
                        padding: 10px 16px; box-shadow: 0 -6px 20px rgba(0,0,0,0.5);
                        font-family: var(--font-header, 'Oswald', sans-serif);
                        max-width: 96vw;
                    }
                    #admin-preview-bar .apb-tag {
                        font-size: 0.7rem; letter-spacing: 1.5px; text-transform: uppercase;
                        color: var(--accent, #8A2F25); font-weight: 700;
                    }
                    #admin-preview-bar .apb-viewing {
                        font-size: 0.8rem; color: #DEBA84; text-transform: uppercase; letter-spacing: 0.5px;
                    }
                    #admin-preview-bar .apb-viewing b { color: #fff; }
                    #admin-preview-bar .apb-btn {
                        background: transparent; color: #CBA052;
                        border: 1px solid rgba(203,160,82,0.4); border-radius: 20px;
                        padding: 6px 14px; font-size: 0.78rem; font-weight: 700;
                        text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer;
                        font-family: inherit; transition: all 0.15s ease;
                    }
                    #admin-preview-bar .apb-btn:hover { border-color: #CBA052; color: #fff; }
                    #admin-preview-bar .apb-btn.active { background: var(--brand-red, #B32424); color: #fff; border-color: var(--brand-red, #B32424); }
                    #admin-preview-bar .apb-live { border-color: rgba(69,183,209,0.6); color: #45B7D1; }
                    #admin-preview-bar .apb-live:hover { border-color: #45B7D1; color: #fff; }
                    #admin-preview-bar .apb-close {
                        background: none; border: none; color: #DEBA84; font-size: 1.2rem;
                        cursor: pointer; line-height: 1; padding: 0 4px;
                    }
                    #admin-preview-bar .apb-divider { width: 1px; height: 22px; background: rgba(255,255,255,0.15); }
                </style>
                <span class="apb-tag">Admin Preview</span>
                <span class="apb-viewing">Viewing: <b class="apb-current">—</b></span>
                <span class="apb-divider"></span>
                ${phases.map(p => `<button type="button" class="apb-btn" data-phase="${p.id}">${p.label}</button>`).join('')}
                <button type="button" class="apb-btn apb-live" data-phase="__live__">Reset to Live</button>
                <span class="apb-divider"></span>
                <span class="apb-tag">Legends</span>
                <button type="button" class="apb-btn" data-legends-mode="default">Default</button>
                <button type="button" class="apb-btn" data-legends-mode="legends">Legends Only</button>
                <span class="apb-divider"></span>
                <button type="button" class="apb-close" title="Hide toolbar (reload to bring back)">×</button>
            `;
            document.body.appendChild(bar);

            const currentLabel = bar.querySelector('.apb-current');
            const phaseButtons = bar.querySelectorAll('[data-phase]');
            const legendsButtons = bar.querySelectorAll('[data-legends-mode]');

            const prettyPhase = (id) => (phases.find(p => p.id === id) || {}).label || id;

            const markActive = (phaseId) => {
                phaseButtons.forEach(b => b.classList.toggle('active', b.dataset.phase === phaseId));
            };

            phaseButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.dataset.phase === '__live__'
                        ? (window.currentElectionState || 'round-1')
                        : btn.dataset.phase;
                    if (window.setVotingState) window.setVotingState(target);
                    currentLabel.textContent = btn.dataset.phase === '__live__'
                        ? `${prettyPhase(target)} (live)`
                        : prettyPhase(target);
                    markActive(btn.dataset.phase === '__live__' ? null : target);
                });
            });

            // Local Legends board-mode preview (local only; never writes).
            legendsButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.legendsMode;
                    if (window.setLocalLegendsMode) window.setLocalLegendsMode(mode);
                    legendsButtons.forEach(b => b.classList.toggle('active', b === btn));
                });
            });

            // Initialise the "Viewing" indicator with whatever is on screen now.
            currentLabel.textContent = prettyPhase(window.currentElectionState || 'round-1');

            bar.querySelector('.apb-close').addEventListener('click', () => bar.remove());
        });
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

        window.openVoteModal = (venueId, venueName, voteCount) => {
            const modal = this.querySelector('#vote-modal');
            const nameEl = this.querySelector('#modal-venue-name');
            nameEl.innerText = venueName;
            
            const shareVenueName = this.querySelector('#share-venue-name');
            if (shareVenueName) {
                shareVenueName.innerText = venueName;
            }
            
            modal.dataset.venueId = venueId;
            modal.dataset.venueName = venueName;
            modal.dataset.voteCount = Number(voteCount) || 0;

            // Render the current tally fresh each time so it never carries over a
            // spinning/landed state (or a stale count) from a previous vote.
            const tallyContainer = this.querySelector('#modal-vote-tally');
            if (tallyContainer) {
                tallyContainer.innerHTML = renderVoteTally(modal.dataset.voteCount);
            }

            // Reset the submit button back to its default label in case a previous
            // vote left it reading "Vote Tallied".
            const submitBtn = this.querySelector('#submit-vote-btn');
            if (submitBtn) {
                submitBtn.innerText = 'Submit Vote';
                submitBtn.disabled = false;
                submitBtn.classList.remove('vote-tallied');
            }

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

            // Sentinel thrown inside the transaction when the user has already
            // voted for this venue, so we can show a friendly message instead of
            // a generic error.
            const ALREADY_VOTED = 'ALREADY_VOTED';
            const ACCOUNT_BANNED = 'ACCOUNT_BANNED';

            try {
                const userRef = doc(db, "users", currentUser.uid);
                const venueRef = doc(db, "venues", venueId);
                const voteRecordRef = doc(db, "venues", venueId, "votes", currentUser.uid);
                // Per-district display aggregate: lets the district map read all
                // counts in one doc. Incremented in the SAME transaction so it can
                // never drift from the authoritative venues/{id}.voteCount.
                const countsRef = doc(db, "settings", `voteCounts_${districtId}`);

                // Atomic vote: the audit doc (create-only, rules forbid update) is
                // the server-authoritative dedup guard. Reading it inside the
                // transaction guarantees no partial writes, no permanent block on a
                // failed increment, and no double-count race across tabs/clicks.
                await runTransaction(db, async (tx) => {
                    const userSnap = await tx.get(userRef);
                    const userData = userSnap.exists() ? userSnap.data() : {};
                    if (userData.isBanned) throw new Error(ACCOUNT_BANNED);

                    const auditSnap = await tx.get(voteRecordRef);
                    if (auditSnap.exists()) throw new Error(ALREADY_VOTED);

                    tx.update(venueRef, { voteCount: increment(1) });
                    tx.set(countsRef, {
                        counts: { [venueId]: increment(1) },
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    tx.set(voteRecordRef, {
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || userData.displayName || "Unknown User",
                        email: currentUser.email || userData.email || "",
                        timestamp: serverTimestamp()
                    });
                    tx.set(userRef, { votes: { [venueId]: true } }, { merge: true });
                });

                // Celebrate the vote landing: roll the tally up by one with a
                // slot-machine animation, confirm on the button, then hand off to
                // the share screen after the user has had a moment to see it land.
                const priorVoteCount = parseInt(modal.dataset.voteCount, 10) || 0;
                const newVoteCount = priorVoteCount + 1;
                modal.dataset.voteCount = newVoteCount;

                btn.innerText = 'Vote Tallied ✓';
                btn.classList.add('vote-tallied');

                const tallyEl = this.querySelector('#modal-vote-tally .prominent-vote-tally');

                // The modal has its own copy of the tally, but the map popup / venue
                // explorer card the user voted from renders its OWN separate tally
                // element for the same venue (from a one-time page-load fetch, not a
                // live listener). Without this, that underlying tally silently stays
                // stale after a successful vote. Refresh every on-screen copy in step.
                const otherTallyEls = document.querySelectorAll(
                    `.prominent-vote-tally[data-venue-id="${CSS.escape(venueId)}"]`
                );
                await Promise.all([
                    animateVoteTallySlotMachine(tallyEl, priorVoteCount, newVoteCount),
                    ...Array.from(otherTallyEls).map((el) =>
                        animateVoteTallySlotMachine(el, priorVoteCount, newVoteCount)
                    )
                ]);

                setTimeout(() => {
                    window.showShareScreen();
                }, 3000);
            } catch (error) {
                if (error && error.message === ALREADY_VOTED) {
                    errorMsg.textContent = `You have already voted for ${venueName || 'this venue'}.`;
                } else if (error && error.message === ACCOUNT_BANNED) {
                    errorMsg.textContent = `Your account is suspended.`;
                } else {
                    console.error("Error submitting vote:", error);
                    errorMsg.textContent = "Error: " + error.message.replace("Firebase: ", "");
                }
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
                btn.classList.remove('vote-tallied');
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

            // Personalize the "encourage friends" instructions with the venue name too.
            const instructionsVenueEl = this.querySelector('#share-instructions-venue');
            if (instructionsVenueEl) {
                instructionsVenueEl.textContent = venueName || 'this business';
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
            this._displayedElectionState = stateId;

            // Toggle the Crawl-tinery variant: the default teaser shows only in
            // round-1 (and pre-launch); once the run-off begins the host picks stay
            // revealed for every later phase.
            const defaultCrawl = this.querySelector('#crawltinery-default');
            const runoffCrawl = this.querySelector('#crawltinery-runoff');
            const picksRevealed = stateId !== 'round-1';
            if (defaultCrawl) defaultCrawl.style.display = picksRevealed ? 'none' : 'block';
            if (runoffCrawl) runoffCrawl.style.display = picksRevealed ? 'block' : 'none';
            
            // Update map legend subtitle based on state
            const legendSubtitle = document.querySelector('#legend-round-subtitle');
            if (legendSubtitle) {
                if (stateId === 'round-1') {
                    legendSubtitle.innerText = 'Top 10 run-off begins in';
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

            this.updateCountdownClocks(stateId);
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
                // The map + Firestore markers load asynchronously, so wait for THIS venue's
                // marker specifically (not just the helper) before scrolling and opening it.
                let attempts = 0;
                const checkMapInterval = setInterval(() => {
                    attempts++;
                    const markerReady = window.openMapPopupForVenue &&
                        window.venueMarkers && window.venueMarkers[voteTarget];

                    if (markerReady) {
                        clearInterval(checkMapInterval);
                        // Anchor to the map first, then open the popup once the smooth
                        // scroll and the map's initial framing have settled.
                        const mapSection = document.getElementById('map-section');
                        if (mapSection) {
                            mapSection.scrollIntoView({ behavior: 'smooth' });
                        }
                        setTimeout(() => window.openMapPopupForVenue(voteTarget), 700);
                    } else if (attempts >= 50) {
                        // Give up after ~10s (marker may not exist for this district).
                        clearInterval(checkMapInterval);
                    }
                }, 200);
            }
        }, 150);
    }
}

customElements.define('event-layout', EventLayout);
