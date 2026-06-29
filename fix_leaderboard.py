import re

with open('js/district-map.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_func = '''            const updateLeaderboard = (selector, limit) => {
                const leaderboard = eventLayout.querySelector(selector);
                if (leaderboard) {
                    const h3 = leaderboard.querySelector('h3');
                    leaderboard.innerHTML = '';
                    if (h3) leaderboard.appendChild(h3);
                    
                    const maxVotes = sortedVenues.length > 0 ? (sortedVenues[0].voteCount || 1) : 1;
                    
                    sortedVenues.slice(0, limit).forEach((v, i) => {
                        const width = Math.max(10, ((v.voteCount || 0) / maxVotes) * 100);
                        const ordinal = ['1st', '2nd', '3rd', '4th', '5th'][i] || `${i+1}th`;
                        leaderboard.innerHTML += `
                        <div class="leaderboard-bar ${ordinal}" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: ${width}%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#${i + 1}</span>
                                <span class="venue-name">${v.name || 'Unknown'}</span>
                                <span class="vote-count">${v.voteCount || 0} votes</span>
                            </div>
                        </div>`;
                    });
                }
            };
            
            updateLeaderboard('#state-round-1 .leaderboard', 3);
            updateLeaderboard('#state-run-off .leaderboard', 5);'''

new_func = '''            const updateLeaderboard = (selector, limit) => {
                const leaderboard = eventLayout.querySelector(selector);
                if (leaderboard) {
                    const h3 = leaderboard.querySelector('h3');
                    leaderboard.innerHTML = '';
                    if (h3) leaderboard.appendChild(h3);
                    
                    // Filter venues that actually have votes
                    const venuesWithVotes = sortedVenues.filter(v => (v.voteCount || 0) > 0);
                    const maxVotes = venuesWithVotes.length > 0 ? venuesWithVotes[0].voteCount : 1;
                    
                    for (let i = 0; i < limit; i++) {
                        const v = venuesWithVotes[i]; // May be undefined if not enough voted venues
                        const width = v ? Math.max(10, ((v.voteCount || 0) / maxVotes) * 100) : 10;
                        const ordinal = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'][i] || `${i+1}th`;
                        const name = v ? (v.name || 'Unknown') : '<span style="opacity: 0.5; font-style: italic;">Awaiting Votes...</span>';
                        const votesStr = v ? `${v.voteCount} votes` : '';
                        
                        leaderboard.innerHTML += `
                        <div class="leaderboard-bar ${ordinal}" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: ${width}%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#${i + 1}</span>
                                <span class="venue-name">${name}</span>
                                <span class="vote-count">${votesStr}</span>
                            </div>
                        </div>`;
                    }
                }
            };
            
            updateLeaderboard('#state-round-1 .leaderboard', 10);
            updateLeaderboard('#state-run-off .leaderboard', 10);'''

content = content.replace(old_func, new_func)

with open('js/district-map.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Leaderboard logic updated")
