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
                    <button id="rsvp-btn" class="brand-btn" style="margin-top: 20px; font-size: 1.1rem; padding: 15px 30px;">${interpolate(shared.hero.rsvpButton, vars)}</button>
                    <p id="rsvp-msg" style="margin-top: 10px; color: var(--accent); font-weight: bold; display: none;"></p>
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

            <div class="map-section-wrapper js-reveal reveal-opacity">
                <h2 class="title-3d map-title"><u>District ${districtCopy.district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${districtCopy.location}</span></h2>
                <div id="map"></div>
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
}

customElements.define('event-layout', EventLayout);
