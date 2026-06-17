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

function renderIssues(issues) {
    return issues.map((issue) => `
                    <div class="issue-item">
                        <span class="issue-text">${issue.text}</span>
                        <button class="upvote-btn" onclick="upvote(this, ${issue.votes})">▲ <span>${issue.votes}</span></button>
                    </div>`).join('');
}

function renderScheduleItems(items) {
    return items.map((item) => `<li>${item}</li>`).join('\n                            ');
}

function renderVotingModule(district) {
    return `
                <div class="map-filters" style="padding: 15px; background: var(--bg-secondary); border-top: 2px solid var(--text-primary); border-radius: 0 0 8px 8px; display: flex; justify-content: center; gap: 20px;">
                    <label style="color: var(--text-secondary); font-family: var(--font-header); font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 0.05em;">
                        <input type="checkbox" id="toggle-ranked-only" style="width: 18px; height: 18px; accent-color: var(--accent);">
                        Show Top 10 Nominees Only
                    </label>
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
                            <li><span class="rank-badge gold">1</span> <div class="v-details"><strong>The Rusty Nail</strong><br><em>Patio crawfish boil</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('The Rusty Nail')">VOTE</button></li>
                            <li><span class="rank-badge gold">2</span> <div class="v-details"><strong>Barrel Proof</strong><br><em>Brass band on the deck</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Barrel Proof')">VOTE</button></li>
                            <li><span class="rank-badge gold">3</span> <div class="v-details"><strong>The Tchoup Yard</strong><br><em>Outdoor games & DJ</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('The Tchoup Yard')">VOTE</button></li>
                            <li><span class="rank-badge silver">4</span> <div class="v-details"><strong>Capulet</strong><br><em>Frozen cocktails specials</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Capulet')">VOTE</button></li>
                            <li><span class="rank-badge silver">5</span> <div class="v-details"><strong>Bulldog Mid-City</strong><br><em>Pint night deals</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Bulldog Mid-City')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">6</span> <div class="v-details"><strong>Finn McCool's</strong><br><em>Dog-friendly patio vibes</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Finn McCool\\'s')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">7</span> <div class="v-details"><strong>Pal's Lounge</strong><br><em>Neighborhood classic</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Pal\\'s Lounge')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">8</span> <div class="v-details"><strong>Mick's Irish Pub</strong><br><em>Live sports & pool</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Mick\\'s Irish Pub')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">9</span> <div class="v-details"><strong>Rendon Inn</strong><br><em>Best late night tacos</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Rendon Inn')">VOTE</button></li>
                            <li><span class="rank-badge dark-gray">10</span> <div class="v-details"><strong>12 Mile Limit</strong><br><em>Spacious outdoor seating</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('12 Mile Limit')">VOTE</button></li>
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
                            <li><span class="rank-badge gold">1</span> <div class="v-details"><strong>The Rusty Nail</strong><br><em>Patio crawfish boil</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('The Rusty Nail')">VOTE</button></li>
                            <li><span class="rank-badge gold">2</span> <div class="v-details"><strong>Barrel Proof</strong><br><em>Brass band on the deck</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Barrel Proof')">VOTE</button></li>
                            <li><span class="rank-badge gold">3</span> <div class="v-details"><strong>The Tchoup Yard</strong><br><em>Outdoor games & DJ</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('The Tchoup Yard')">VOTE</button></li>
                            <li><span class="rank-badge silver">4</span> <div class="v-details"><strong>Capulet</strong><br><em>Frozen cocktails specials</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Capulet')">VOTE</button></li>
                            <li><span class="rank-badge silver">5</span> <div class="v-details"><strong>Bulldog Mid-City</strong><br><em>Pint night deals</em></div> <button class="vote-btn-small" onclick="window.openVoteModal('Bulldog Mid-City')">VOTE</button></li>
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
                <div class="modal-content">
                    <button class="close-modal" onclick="window.closeVoteModal()">×</button>
                    <h2>Cast Your Vote</h2>
                    <p>You are voting for <strong id="modal-venue-name"></strong>.</p>
                    <div class="auth-buttons">
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 5px;">Enter your email to authenticate your vote.</p>
                        <input type="email" placeholder="Email Address" class="email-input" id="voter-email">
                        <button class="auth-btn email" onclick="window.showShareScreen()">Submit Vote</button>
                    </div>
                </div>
            </div>

            <div id="share-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content share-content">
                    <button class="close-modal" onclick="window.closeShareModal()">×</button>
                    <div class="flex-graphic">
                        <div class="badge">VOTED!</div>
                        <h2>I VOTED!</h2>
                        <div class="shield">DISTRICTS AFTER DARK</div>
                        <p>WHERE ARE WE CRAWLING?</p>
                        <div class="voted-venue">for <span id="share-venue-name"></span></div>
                    </div>
                    <button class="share-ig-btn" onclick="window.closeShareModal()">Share to Instagram Story</button>
                    <button class="skip-btn" onclick="window.closeShareModal()">Skip & Ask a Question</button>
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

            <div class="questions-section">
                <div class="questions-panel js-reveal reveal-opacity" style="box-shadow: inset 4px 4px 0 rgba(255,255,255,0.55), inset -4px -4px 0 rgba(45, 27, 21, 0.2), inset 0 -3px 12px rgba(195, 47, 0, 0.12), 0 0 0 4px var(--brand-red), 0 0 0 10px var(--accent), 0 0 0 16px var(--text-primary), 0 0 0 22px rgba(195, 47, 0, 0.35), 18px 22px 0 rgba(195, 47, 0, 0.45); border: 4px solid var(--text-primary); transform: rotateX(2deg); padding: 40px; margin-bottom: 40px;">
                    <h2>${shared.dialogueDen.heading}</h2>
                    <p class="questions-intro">${shared.dialogueDen.intro}</p>
                    ${renderIssues(shared.dialogueDen.issues)}

                    <input type="text" class="ask-box" placeholder="${shared.dialogueDen.questionPlaceholder}">
                    <button class="submit-btn" onclick="alert('${shared.dialogueDen.submitAlert}')">${shared.dialogueDen.submitButton}</button>
                </div>
            </div>
            
            <style>
                @keyframes float {
                    0% { transform: translateY(0px) rotate(-1.2deg) scale(1.03); }
                    50% { transform: translateY(-10px) rotate(-1.2deg) scale(1.03); }
                    100% { transform: translateY(0px) rotate(-1.2deg) scale(1.03); }
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
        window.openVoteModal = (venueName) => {
            const modal = this.querySelector('#vote-modal');
            const nameEl = this.querySelector('#modal-venue-name');
            nameEl.innerText = venueName;
            this.querySelector('#share-venue-name').innerText = venueName;
            modal.style.display = 'flex';
        };

        window.closeVoteModal = () => {
            this.querySelector('#vote-modal').style.display = 'none';
        };

        window.showShareScreen = () => {
            const emailInput = this.querySelector('.email-input');
            const btn = this.querySelector('.auth-btn.email');

            if (!emailInput.value.includes('@')) {
                alert('Please enter a valid email address.');
                return;
            }

            btn.innerText = 'Authenticating...';

            setTimeout(() => {
                btn.innerText = 'Submit Vote';
                this.querySelector('#vote-modal').style.display = 'none';
                this.querySelector('#share-modal').style.display = 'flex';
                emailInput.value = '';
            }, 800);
        };

        window.closeShareModal = () => {
            this.querySelector('#share-modal').style.display = 'none';
            const questionsSection = this.querySelector('.questions-section');
            if (questionsSection) {
                questionsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                    window.openVoteModal(voteTarget);
                }
            }
        }, 150);
    }
}

customElements.define('event-layout', EventLayout);
