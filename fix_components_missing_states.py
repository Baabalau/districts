import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# I deleted the hardcoded leaderboards inside the HTML template but I might have accidentally broken the state divs.
# Let's check `function renderVotingStates(district) {`
old_render = '''function renderVotingStates(district) {
    return `
            <div class="voting-section js-reveal reveal-y delay-200" id="voting-module">
                <div id="state-round-1" class="voting-state-container" style="display: none;">
                    <div class="voting-header" style="display: none;">
                        <h2>Round 1: Choose Your Final Stop</h2>
                        <p>The top 10 venues will advance to the run-off in:</p>
                        <div class="countdown-clock small-clock">
                            <div class="time-box"><span>02</span><label>Days</label></div>
                            <div class="time-box"><span>14</span><label>Hrs</label></div>
                            <div class="time-box"><span>20</span><label>Mins</label></div>
                        </div>
                    </div>
                    <p style="text-align: center; color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">Use the numbers on the map above to locate venues.</p>
                    
                    <div class="leaderboard" style="margin-bottom: 20px;">
                        <h3 style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.2rem; margin-bottom: 10px; text-transform: uppercase;">Current Leaders</h3>
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
                        <h2>The Run-Off: Top 10</h2>
                        <p>It's down to the wire! The polls close in:</p>
                    </div>
                    <div class="leaderboard" style="margin-bottom: 20px;">
                        <h3 style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.2rem; margin-bottom: 10px; text-transform: uppercase;">Current Leaders</h3>
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
                    
                    <div class="winner-announcement" style="text-align: center; padding: 40px; background: rgba(210, 160, 57, 0.1); border: 2px solid var(--accent); border-radius: 12px; margin: 30px 0;">
                        <h3 style="color: var(--text-primary); font-family: var(--font-hero); font-size: 2rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px;">And the winner is...</h3>
                        <div id="winner-name-display" style="font-size: 3.5rem; font-family: var(--font-header); font-weight: 700; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); margin: 20px 0;">Loading...</div>
                        <p style="font-size: 1.1rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">Congratulations! This venue will host the final stop of the District ${district} nightcrawl.</p>
                        
                        <div style="margin-top: 30px;">
                            <a href="#rsvp-section" class="brand-btn" style="font-size: 1.2rem; padding: 15px 40px;">RSVP Now to Attend</a>
                        </div>
                    </div>
                </div>
            </div>
    `;
}'''

# Ensure it's correct
if old_render in content:
    print("Voting states HTML is intact.")
else:
    print("Voting states HTML is mutated or missing!")

