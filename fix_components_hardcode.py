import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace round-1 leaderboard
old_r1 = '''                    <div class="leaderboard" style="margin-bottom: 20px;">
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
                    </div>'''

new_r1 = '''                    <div class="leaderboard" style="margin-bottom: 20px;">
                        <h3 style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.2rem; margin-bottom: 10px; text-transform: uppercase;">Current Leaders</h3>
                    </div>'''

content = content.replace(old_r1, new_r1)

# Replace run-off leaderboard
old_r2 = '''                    <div class="leaderboard" style="margin-bottom: 20px;">
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
                    </div>'''

new_r2 = '''                    <div class="leaderboard" style="margin-bottom: 20px;">
                        <h3 style="color: var(--text-primary); font-family: var(--font-hero); font-size: 1.2rem; margin-bottom: 10px; text-transform: uppercase;">Current Leaders</h3>
                    </div>'''

content = content.replace(old_r2, new_r2)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Hardcoded HTML removed")
