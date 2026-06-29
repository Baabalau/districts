import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's see if the leaderboard is being populated but state-round-1 is remaining display: none
# Why would it remain display: none?
# window.setVotingState(window.currentElectionState) is called inside connectedCallback.
# BUT wait! `window.setVotingState` uses `document.querySelector('#state-round-1')`.
# If `window.setVotingState` is called BEFORE the element is actually rendered in the DOM?
# No, `this.innerHTML = \`...\`` happens right before it.
# However, custom elements update asynchronously in some browsers.
# Let's wrap setVotingState in a setTimeout or requestAnimationFrame.

old_call = '''        if (window.currentElectionState) {
            window.setVotingState(window.currentElectionState);
        }'''

new_call = '''        if (window.currentElectionState) {
            setTimeout(() => {
                window.setVotingState(window.currentElectionState);
            }, 100);
        }'''

content = content.replace(old_call, new_call)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added delay to setVotingState")
