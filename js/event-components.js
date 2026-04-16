class EventLayout extends HTMLElement {
    connectedCallback() {
        const district = this.getAttribute('district') || 'A';
        const date = this.getAttribute('date') || 'TBD';
        const time = this.getAttribute('time') || '7:00 PM - 10:00 PM';
        const location = this.getAttribute('location') || 'New Orleans';
        const councilImg = this.getAttribute('council-img') || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
        const councilName = this.getAttribute('council-name') || 'Councilmember Smith';
        const influencerImg = this.getAttribute('influencer-img') || 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
        const influencerName = this.getAttribute('influencer-name') || '@NOLANightOwl';

        this.innerHTML = `
            <div class="event-hero">
                <div class="hero-left">
                    <h1>District ${district} Crawl</h1>
                    <h2>${date} | ${time} | ${location}</h2>
                    <p>Join us for an unforgettable night exploring the hidden gems and local favorites of District ${district}. Connect with your neighbors, meet your councilmember, and experience the culture that makes our city unique.</p>
                    <button id="rsvp-btn" class="brand-btn" style="margin-top: 20px; font-size: 1.1rem; padding: 15px 30px;">RSVP to District ${district} Crawl</button>
                    <p id="rsvp-msg" style="margin-top: 10px; color: var(--accent); font-weight: bold; display: none;"></p>
                </div>
                <div class="hero-right" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <div class="flow-couple" style="animation: float 6s ease-in-out infinite; transform-origin: center;">
                        <div class="flow-card">
                            <img src="${influencerImg}" alt="${influencerName}">
                            <div class="card-caption">${influencerName}<span>The Tastemaker</span></div>
                        </div>
                        <div class="couple-ampersand">&amp;</div>
                        <div class="flow-card">
                            <img src="${councilImg}" alt="${councilName}">
                            <div class="card-caption">${councilName}<span>The Policy Pro</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="purpose-section js-reveal reveal-opacity" style="padding-top: 40px; padding-bottom: 40px; background: transparent;">
                <div class="purpose-module">
                    <div class="purpose-frame js-reveal reveal-y delay-200">
                        <h2>Behind the Series</h2>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                    </div>
                </div>
            </div>

            <div class="map-section-wrapper js-reveal reveal-opacity">
                <h2 class="title-3d map-title"><u>District ${district}</u><br><span style="font-size: 0.8em; color: var(--accent);">${location}</span></h2>
                <div id="map"></div>
            </div>

            <div class="itinerary-section js-reveal reveal-y delay-200">
                <h2>Crawl-tinery</h2>
                <div class="itinerary-grid">
                    <div class="stop-card stop-1">
                        <div class="stop-number">01</div>
                        <h3>The Tastemaker's Pick</h3>
                        <p>Our first stop is hand-selected by our local influencer. Expect signature cocktails and an electric atmosphere to kick off the night.</p>
                    </div>
                    <div class="stop-card stop-2">
                        <div class="stop-number">02</div>
                        <h3>The Councilmember's Choice</h3>
                        <p>A classic neighborhood institution chosen by your representative. A perfect spot to grab a bite and discuss community matters.</p>
                    </div>
                    <div class="stop-card stop-3">
                        <div class="stop-number">03</div>
                        <h3>The Audience Vote</h3>
                        <p>You decide where we end the night! Vote on our interactive poll during the crawl to select our final destination.</p>
                    </div>
                </div>
            </div>
            
            <div class="map-features-layout js-reveal reveal-y delay-400">
                <div class="map-features">
                    <div class="feature-box" style="flex: 1;">
                        <h3>Venue Voting</h3>
                        <p style="margin-bottom: 10px;"><strong>Goals:</strong> Highlight local favorites and bring new traffic to unsung spots.</p>
                        <p style="margin-bottom: 10px;"><strong>Rules:</strong> Venues must be located within District ${district}. Voting ends 48 hours before the crawl.</p>
                        <p><strong>Schedule:</strong></p>
                        <ul style="padding-left: 20px; color: var(--text-secondary); font-size: 0.95rem; margin-top: 5px;">
                            <li>Voting Opens: 14 days prior</li>
                            <li>Voting Closes: 2 days prior</li>
                            <li>Winner Announced: Day of the Crawl</li>
                        </ul>
                    </div>
                    <div class="feature-box" style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <h3>Venue Operators</h3>
                        <p style="margin-bottom: 20px;">Want your establishment featured on the interactive map during the crawl?</p>
                        <a href="#" class="brand-btn" style="padding: 10px 20px; font-size: 0.9rem;">Include My Venue</a>
                    </div>
                </div>
            </div>

            <div class="quotes-section">
                <div class="quote-block quote-left js-reveal reveal-y delay-200">
                    "This isn't just about nightlife; it's about connecting with the community where they are. We're breaking down the walls of City Hall."
                    <span class="quote-author">— ${councilName}</span>
                </div>
                <div class="quote-block quote-right js-reveal reveal-y delay-400">
                    "District ${district} has some of the most vibrant, unsung spots in the city. I can't wait to show everyone what makes this neighborhood tick."
                    <span class="quote-author">— ${influencerName}</span>
                </div>
            </div>

            <div class="questions-section">
                <div class="questions-panel js-reveal reveal-opacity" style="box-shadow: inset 4px 4px 0 rgba(255,255,255,0.55), inset -4px -4px 0 rgba(45, 27, 21, 0.2), inset 0 -3px 12px rgba(195, 47, 0, 0.12), 0 0 0 4px var(--brand-red), 0 0 0 10px var(--accent), 0 0 0 16px var(--text-primary), 0 0 0 22px rgba(195, 47, 0, 0.35), 18px 22px 0 rgba(195, 47, 0, 0.45); border: 4px solid var(--text-primary); transform: rotateX(2deg); padding: 40px; margin-bottom: 40px;">
                    <h2>The Dialogue Den</h2>
                    <p class="questions-intro">Vote on the issues you want the Councilmember to address tonight, or submit your own question below.</p>
                    
                    <div class="issue-item">
                        <span class="issue-text">Late-Night Transit Reliability</span>
                        <button class="upvote-btn" onclick="upvote(this, 145)">▲ <span>145</span></button>
                    </div>
                    <div class="issue-item">
                        <span class="issue-text">Noise Ordinance Revisions</span>
                        <button class="upvote-btn" onclick="upvote(this, 89)">▲ <span>89</span></button>
                    </div>
                    <div class="issue-item">
                        <span class="issue-text">Small Business Security Grants</span>
                        <button class="upvote-btn" onclick="upvote(this, 62)">▲ <span>62</span></button>
                    </div>

                    <input type="text" class="ask-box" placeholder="Ask a question anonymously...">
                    <button class="submit-btn" onclick="alert('Question submitted for the crawl!')">Drop it on the Digital Napkin</button>
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

        setTimeout(() => {
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.15
            };
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);
            const animatedElements = this.querySelectorAll('.js-reveal');
            animatedElements.forEach(el => observer.observe(el));
        }, 100);
    }
}

customElements.define('event-layout', EventLayout);
