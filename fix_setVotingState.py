import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix setVotingState which is using document.querySelector instead of this.querySelector
old_func = '''        window.setVotingState = (stateId) => {
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
        };'''

new_func = '''        window.setVotingState = (stateId) => {
            const states = ['round-1', 'run-off', 'post-election', 'post-event'];
            
            // Update map legend subtitle based on state
            const legendSubtitle = this.querySelector('#legend-round-subtitle');
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
        };'''

content = content.replace(old_func, new_func)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("setVotingState completely fixed")
