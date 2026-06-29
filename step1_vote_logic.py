import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_vote_check = '''                let userData = userSnap.exists() ? userSnap.data() : {};
                let votes = userData.votes || {};
                
                // Check if user already voted for this specific venue
                if (votes[venueId]) {'''

new_vote_check = '''                let userData = userSnap.exists() ? userSnap.data() : {};
                
                if (userData.isBanned) {
                    errorMsg.textContent = `Your account is suspended.`;
                    errorMsg.style.display = 'block';
                    btn.innerText = 'Submit Vote';
                    btn.disabled = false;
                    return;
                }
                
                let votes = userData.votes || {};
                
                // Check if user already voted for this specific venue
                if (votes[venueId]) {'''

content = content.replace(old_vote_check, new_vote_check)

old_vote_record = '''                // Increment venue's voteCount
                const venueRef = doc(db, "venues", venueId);
                await updateDoc(venueRef, {
                    voteCount: increment(1)
                });'''

new_vote_record = '''                // Increment venue's voteCount
                const venueRef = doc(db, "venues", venueId);
                await updateDoc(venueRef, {
                    voteCount: increment(1)
                });
                
                // Add a detailed audit record
                const voteRecordRef = doc(db, "venues", venueId, "votes", currentUser.uid);
                await setDoc(voteRecordRef, {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName || userData.displayName || "Unknown User",
                    email: currentUser.email || userData.email || "",
                    timestamp: new Date()
                });'''

content = content.replace(old_vote_record, new_vote_record)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Vote logic updated")
