import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix dashboard parsing too
old_sched = '''                    document.getElementById('sched-round-1').value = formatForDateTimeLocal(data.roundOneStart?.toDate());
                    document.getElementById('sched-run-off').value = formatForDateTimeLocal(data.runOffStart?.toDate());
                    document.getElementById('sched-winner').value = formatForDateTimeLocal(data.winnerAnnounce?.toDate());
                    document.getElementById('sched-post').value = formatForDateTimeLocal(data.postEvent?.toDate());'''

new_sched = '''                    const parseD = (d) => d && d.toDate ? d.toDate() : d;
                    document.getElementById('sched-round-1').value = formatForDateTimeLocal(parseD(data.roundOneStart));
                    document.getElementById('sched-run-off').value = formatForDateTimeLocal(parseD(data.runOffStart));
                    document.getElementById('sched-winner').value = formatForDateTimeLocal(parseD(data.winnerAnnounce));
                    document.getElementById('sched-post').value = formatForDateTimeLocal(parseD(data.postEvent));'''

content = content.replace(old_sched, new_sched)

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard dates fixed")
