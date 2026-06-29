import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove state controls and pre-voting state from HTML
start_controls = content.find('<div class="state-controls"')
end_pre_voting = content.find('<div id="state-round-1"', start_controls)

content = content[:start_controls] + content[end_pre_voting:]

# 2. Add Post-Event HTML block
post_election = content.find('<div id="state-post-election"')
post_election_end = content.find('</div>\n            </div>', post_election) + 6 # end of the post-election block

new_post_event = '''
                <div id="state-post-event" class="voting-state-container" style="display: none; padding: 40px 0; text-align: center;">
                    <div class="voting-header">
                        <h2 style="font-family: var(--font-header); font-size: 2.5rem; text-transform: uppercase; color: var(--text-primary); margin-bottom: 20px;">What a Night</h2>
                        <p style="font-size: 1.1rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto;">Thank you to everyone who came out to District ${district} and supported our local nighttime economy. We'll see you at the next one!</p>
                    </div>
                </div>'''

content = content[:post_election_end] + new_post_event + content[post_election_end:]

# 3. Add Firestore fetch and evaluate logic
# Find connectedCallback to inject Firebase logic
imports = '''import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
'''
content = content.replace('import { onAuthStateChanged }', imports + 'import { onAuthStateChanged }')

# 4. Inject logic to evaluate states based on time
eval_logic = '''
            // Determine active state based on schedule
            const scheduleRef = doc(db, "settings", "schedule");
            const schedSnap = await getDoc(scheduleRef);
            let activeState = 'round-1'; // Default
            let winnerId = null;

            if (schedSnap.exists() && schedSnap.data()[districtId.toUpperCase()]) {
                const sched = schedSnap.data()[districtId.toUpperCase()];
                const now = new Date();
                
                if (sched.postEvent && now >= sched.postEvent.toDate()) {
                    activeState = 'post-event';
                } else if (sched.winnerAnnounce && now >= sched.winnerAnnounce.toDate()) {
                    activeState = 'post-election';
                    winnerId = sched.winnerId;
                } else if (sched.runOffStart && now >= sched.runOffStart.toDate()) {
                    activeState = 'run-off';
                } else {
                    activeState = 'round-1';
                }
                
                // Store globally so district-map.js can access it
                window.currentElectionState = activeState;
                window.electionWinnerId = winnerId;
            }
'''

# Put it right after vars = buildTemplateVars
content = content.replace('const vars = buildTemplateVars(districtCopy);', 'const vars = buildTemplateVars(districtCopy);\n' + eval_logic)

# Replace window.setVotingState with direct invocation and remove the old toggle script
set_voting_func_start = content.find('window.setVotingState = (stateId) => {')
set_voting_func_end = content.find('};', set_voting_func_start) + 2

# We need to make sure the evaluation actually triggers UI changes once DOM is ready.
# We'll just define the function then call it with activeState at the end of initVotingPortal
new_state_func = '''
        window.setVotingState = (stateId) => {
            const states = ['round-1', 'run-off', 'post-election', 'post-event'];
            
            // Update map legend round name based on state
            const legendRoundName = document.querySelector('#legend-round-name');
            const legendContext = legendRoundName ? legendRoundName.nextElementSibling : null;
            
            if (legendRoundName && legendContext) {
                if (stateId === 'round-1') {
                    legendRoundName.innerText = 'Round 1';
                    legendRoundName.style.display = 'block';
                    legendContext.innerText = 'Run-off begins in';
                } else if (stateId === 'run-off') {
                    legendRoundName.innerText = 'Run-Off (Top 10)';
                    legendRoundName.style.display = 'block';
                    legendContext.innerText = 'Voting closes in';
                } else if (stateId === 'post-election') {
                    legendRoundName.innerText = 'Results';
                    legendRoundName.style.display = 'block';
                    legendContext.innerText = 'Voting Closed';
                } else {
                    legendRoundName.style.display = 'none';
                    legendContext.innerText = 'Event Concluded';
                }
            }
            
            states.forEach(s => {
                const el = document.querySelector('#state-' + s);
                if (el) el.style.display = s === stateId ? 'block' : 'none';
            });
        };
        
        if (window.currentElectionState) {
            window.setVotingState(window.currentElectionState);
        }
'''

content = content[:set_voting_func_start] + new_state_func + content[set_voting_func_end:]

# Update the "Top 5" text in the HTML to "Top 10" to match instructions
content = content.replace('The top 5 venues will advance to the run-off in:', 'The top 10 venues will advance to the run-off in:')
content = content.replace('The Run-Off: Top 5', 'The Run-Off: Top 10')
content = content.replace('A final sprint to decide the winner among the top 5', 'A final sprint to decide the winner among the top 10')
content = content.replace('The top 5 advance.', 'The top 10 advance.')

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Automated state machine injected")
