class EventLayout extends HTMLElement {
    connectedCallback() {
        const district = this.getAttribute('district') || 'A';
        const date = this.getAttribute('date') || 'TBD';
        const time = this.getAttribute('time') || '7:00 PM - 10:00 PM';
        const location = this.getAttribute('location') || 'New Orleans';

        this.innerHTML = `
            <div class="event-hero">
                <div class="hero-left">
                    <h1>District ${district} Crawl</h1>
                    <h2>${date} | ${time} | ${location}</h2>
                    <p>Join us for an unforgettable night exploring the hidden gems and local favorites of District ${district}. Connect with your neighbors, meet your councilmember, and experience the culture that makes our city unique.</p>
                    <button id="rsvp-btn" class="brand-btn" style="margin-top: 20px; font-size: 1.1rem; padding: 15px 30px;">RSVP to District ${district} Crawl</button>
                    <p id="rsvp-msg" style="margin-top: 10px; color: var(--accent); font-weight: bold; display: none;"></p>
                </div>
                <div class="hero-right">
                    <div class="host-shape host-council">
                        <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Councilmember">
                        <h3>Councilmember Smith</h3>
                        <p>The Policy Pro</p>
                    </div>
                    <div class="host-shape host-influencer">
                        <img src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Influencer">
                        <h3>@NOLANightOwl</h3>
                        <p>The Tastemaker</p>
                    </div>
                </div>
            </div>

            <div class="event-about">
                <div class="event-about-content">
                    <h2>Behind the Series</h2>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                </div>
            </div>

            <div class="map-layout">
                <div class="map-container">
                    <h2>The route map</h2>
                    <div id="map"></div>
                </div>
                <div class="map-features">
                    <div class="feature-box">
                        <h3>Map Controls</h3>
                        <div class="feature-toggle">
                            <span>Show Participating Venues</span>
                            <input type="checkbox" checked>
                        </div>
                        <div class="feature-toggle">
                            <span>Show Transit Routes</span>
                            <input type="checkbox">
                        </div>
                        <div class="feature-toggle">
                            <span>Show Parking Zones</span>
                            <input type="checkbox">
                        </div>
                    </div>
                    <div class="feature-box">
                        <h3>Live Updates</h3>
                        <p class="feature-muted">No current alerts for the District ${district} route.</p>
                    </div>
                </div>
            </div>

            <div class="itinerary-section">
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

            <div class="quotes-section">
                <div class="quote-block quote-left">
                    "This isn't just about nightlife; it's about connecting with the community where they are. We're breaking down the walls of City Hall."
                    <span class="quote-author">— Councilmember Smith</span>
                </div>
                <div class="quote-block quote-right">
                    "District ${district} has some of the most vibrant, unsung spots in the city. I can't wait to show everyone what makes this neighborhood tick."
                    <span class="quote-author">— @NOLANightOwl</span>
                </div>
            </div>

            <div class="trivia-section" style="margin-top: 60px; padding: 40px; background: rgba(0,0,0,0.05); border-radius: 10px; border: 2px solid var(--text-primary);">
                <h2>Local Trivia: District ${district}</h2>
                <p>Answer correctly to earn 50 points and unlock a promo code for tonight's crawl!</p>
                <div id="trivia-container" style="margin-top: 20px;">
                    <p style="font-weight: bold; font-size: 1.2rem; margin-bottom: 15px;">What year was the city of New Orleans founded?</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="trivia-option" data-correct="false" style="padding: 10px 20px; background: transparent; color: var(--text-primary); border: 2px solid var(--text-primary); cursor: pointer; border-radius: 5px; font-family: var(--font-main); font-weight: bold; transition: all 0.2s;">1701</button>
                        <button class="trivia-option" data-correct="true" style="padding: 10px 20px; background: transparent; color: var(--text-primary); border: 2px solid var(--text-primary); cursor: pointer; border-radius: 5px; font-family: var(--font-main); font-weight: bold; transition: all 0.2s;">1718</button>
                        <button class="trivia-option" data-correct="false" style="padding: 10px 20px; background: transparent; color: var(--text-primary); border: 2px solid var(--text-primary); cursor: pointer; border-radius: 5px; font-family: var(--font-main); font-weight: bold; transition: all 0.2s;">1803</button>
                        <button class="trivia-option" data-correct="false" style="padding: 10px 20px; background: transparent; color: var(--text-primary); border: 2px solid var(--text-primary); cursor: pointer; border-radius: 5px; font-family: var(--font-main); font-weight: bold; transition: all 0.2s;">1812</button>
                    </div>
                    <p id="trivia-msg" style="margin-top: 20px; font-weight: bold; font-size: 1.1rem; color: var(--brand-red); display: none;"></p>
                </div>
            </div>

            <div class="questions-section">
                <div class="questions-panel">
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
        `;
    }
}

customElements.define('event-layout', EventLayout);
