import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add missing imports first
old_imports = 'import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy, collectionGroup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";'
new_imports = 'import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, increment, arrayUnion, query, where, orderBy, collectionGroup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";'
content = content.replace(old_imports, new_imports)

# Add admin functions to dashboard.html right before the end of the script tag
admin_logic = '''
        // --- ADMIN ACTIONS ---
        window.invalidateCheckin = async (venueId, userId) => {
            if (!confirm("Are you sure you want to invalidate this check-in? This will decrement the venue's visit count and remove the check-in photo.")) return;
            
            try {
                // Delete check-in doc
                await deleteDoc(doc(db, "venues", venueId, "customers", userId));
                
                // Decrement venue total
                const venueRef = doc(db, "venues", venueId);
                const venueSnap = await getDoc(venueRef);
                if (venueSnap.exists() && venueSnap.data().visitCount > 0) {
                    await updateDoc(venueRef, { visitCount: increment(-1) });
                }
                
                // Add notification to user
                await updateDoc(doc(db, "users", userId), {
                    notifications: arrayUnion(`Your check-in at a venue was invalidated. Please ensure your photo clearly shows the required elements.`)
                });
                
                alert("Check-in invalidated.");
                fetchData(true); // Refresh
            } catch (e) {
                console.error("Error invalidating check-in:", e);
                alert("Error invalidating check-in: " + e.message);
            }
        };

        window.banUser = async (userId) => {
            if (!confirm("Are you sure you want to ban this user? They will no longer be able to check-in or vote.")) return;
            
            try {
                await setDoc(doc(db, "users", userId), { 
                    isBanned: true,
                    notifications: arrayUnion("Your account has been suspended due to suspicious activity. You can no longer participate in voting or check-ins.")
                }, { merge: true });
                alert("User banned.");
            } catch (e) {
                console.error("Error banning user:", e);
                alert("Error banning user: " + e.message);
            }
        };

        window.expandVotes = async (venueId) => {
            const row = document.getElementById(`votes-expand-${venueId}`);
            const contentDiv = document.getElementById(`votes-content-${venueId}`);
            
            // Toggle visibility
            if (row.style.display === 'table-row') {
                row.style.display = 'none';
                return;
            }
            
            row.style.display = 'table-row';
            contentDiv.innerHTML = '<span style="color:var(--text-secondary);">Loading vote audit records...</span>';
            
            try {
                const votesSnap = await getDocs(collection(db, "venues", venueId, "votes"));
                if (votesSnap.empty) {
                    contentDiv.innerHTML = '<span style="color:#ff6b6b;">No detailed vote audit records found. (Votes cast prior to the audit system update cannot be expanded).</span>';
                    return;
                }
                
                let html = `
                    <table style="width: 100%; background: #0b101c; border-radius: 8px;">
                        <thead>
                            <tr>
                                <th style="padding: 8px; font-size:0.85rem;">Time</th>
                                <th style="padding: 8px; font-size:0.85rem;">User</th>
                                <th style="padding: 8px; font-size:0.85rem;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                votesSnap.forEach(d => {
                    const data = d.data();
                    const t = data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : 'Unknown Time';
                    html += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 8px; font-size:0.85rem; color:var(--text-secondary);">${t}</td>
                            <td style="padding: 8px; font-size:0.85rem;">${data.displayName} <br><span style="opacity:0.6">${data.email}</span></td>
                            <td style="padding: 8px; font-size:0.85rem;">
                                <button onclick="window.invalidateVote('${venueId}', '${d.id}', event)" style="margin-right: 5px; background: #6b3333; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size:0.75rem;">Invalidate Vote</button>
                                <button onclick="window.banUser('${d.id}'); event.stopPropagation();" style="background: #333; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size:0.75rem;">Ban User</button>
                            </td>
                        </tr>
                    `;
                });
                
                html += '</tbody></table>';
                contentDiv.innerHTML = html;
                
            } catch (e) {
                console.error("Error expanding votes:", e);
                contentDiv.innerHTML = `<span style="color:#ff6b6b;">Error: ${e.message}</span>`;
            }
        };

        window.invalidateVote = async (venueId, userId, event) => {
            event.stopPropagation(); // prevent row collapse
            if (!confirm("Are you sure you want to invalidate this vote? This will decrement the venue's vote count.")) return;
            
            try {
                // Delete vote audit record
                await deleteDoc(doc(db, "venues", venueId, "votes", userId));
                
                // Remove vote from user's object
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    let votes = userSnap.data().votes || {};
                    if (votes[venueId]) {
                        delete votes[venueId];
                        await setDoc(userRef, { votes: votes }, { merge: true });
                    }
                    
                    // Send notification
                    await setDoc(userRef, {
                        notifications: arrayUnion(`Your vote for a venue was invalidated.`)
                    }, { merge: true });
                }
                
                // Decrement venue total
                const venueRef = doc(db, "venues", venueId);
                const venueSnap = await getDoc(venueRef);
                if (venueSnap.exists() && venueSnap.data().voteCount > 0) {
                    await updateDoc(venueRef, { voteCount: increment(-1) });
                }
                
                alert("Vote invalidated.");
                // refresh sub-table
                window.expandVotes(venueId); // close
                window.expandVotes(venueId); // reopen to reload
            } catch (e) {
                console.error("Error invalidating vote:", e);
                alert("Error invalidating vote: " + e.message);
            }
        };

    </script>
'''

content = content.replace('    </script>', admin_logic)

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard logic updated with Admin actions")
