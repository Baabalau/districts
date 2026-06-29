import re

with open('profile.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add notifications section HTML
old_lists = '''        <div class="list-section">
            <h3>Your Check-Ins</h3>'''

new_lists = '''        <div id="notifications-section" class="list-section" style="display: none; background: rgba(138, 47, 37, 0.1); border-left: 4px solid var(--accent); padding: 15px;">
            <h3 style="color: var(--accent); margin-bottom: 10px;">Important Notices</h3>
            <div id="notifications-list" style="font-size: 0.95rem; color: #ffebcd;">
                <!-- Dynamically populated -->
            </div>
        </div>

        <div class="list-section">
            <h3>Your Check-Ins</h3>'''

content = content.replace(old_lists, new_lists)

# Inject JS to fetch notifications
old_js = '''                    pointsVal.innerText = points;

                    // Compute Rank (Naive simple scale for MVP)'''

new_js = '''                    pointsVal.innerText = points;

                    // Fetch Notifications
                    if (userData.notifications && userData.notifications.length > 0) {
                        const notifSec = document.getElementById("notifications-section");
                        const notifList = document.getElementById("notifications-list");
                        notifSec.style.display = "block";
                        notifList.innerHTML = userData.notifications.map(n => `<div style="margin-bottom: 8px;">• ${n}</div>`).join('');
                    }

                    // Compute Rank (Naive simple scale for MVP)'''

content = content.replace(old_js, new_js)

with open('profile.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Profile logic updated to show notifications")
