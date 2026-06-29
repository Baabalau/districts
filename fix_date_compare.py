import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# I used .toDate() but if we just created the schedule using Node, the timestamps are NOT Firestore Timestamp objects. 
# They are plain strings because Node serialized the Date objects to ISO strings.
# Or if it's the web SDK... let's fix it to handle both.
old_eval = '''                if (sched.postEvent && now >= sched.postEvent.toDate()) {
                    activeState = 'post-event';
                } else if (sched.winnerAnnounce && now >= sched.winnerAnnounce.toDate()) {
                    activeState = 'post-election';
                    winnerId = sched.winnerId;
                } else if (sched.runOffStart && now >= sched.runOffStart.toDate()) {
                    activeState = 'run-off';
                } else {
                    activeState = 'round-1';
                }'''

new_eval = '''                const parseDate = (d) => d && d.toDate ? d.toDate() : new Date(d);
                if (sched.postEvent && now >= parseDate(sched.postEvent)) {
                    activeState = 'post-event';
                } else if (sched.winnerAnnounce && now >= parseDate(sched.winnerAnnounce)) {
                    activeState = 'post-election';
                    winnerId = sched.winnerId;
                } else if (sched.runOffStart && now >= parseDate(sched.runOffStart)) {
                    activeState = 'run-off';
                } else {
                    activeState = 'round-1';
                }'''

content = content.replace(old_eval, new_eval)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Date parsing fixed")
