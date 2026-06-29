import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

script_additions = '''
        import { doc, getDoc, setDoc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

        // Tab Switching Logic
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.target).classList.add('active');

                // Auto-load data based on tab
                const target = e.target.dataset.target;
                if (target === 'votes-view' && allVotes.length === 0) fetchVotes();
                if (target === 'runoff-view') fetchRunoffVenues();
                if (target === 'schedule-view') fetchSchedule();
            });
        });

        // --- VOTES LOGIC ---
        let allVotes = [];
        const votesLoading = document.getElementById('votes-loading');
        const votesTableWrapper = document.getElementById('votes-table-wrapper');
        const votesTbody = document.getElementById('votes-table-body');
        
        async function fetchVotes() {
            votesLoading.style.display = 'block';
            votesTableWrapper.style.display = 'none';
            allVotes = [];
            
            try {
                const venuesSnapshot = await getDocs(collection(db, "venues"));
                venuesSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.voteCount > 0) {
                        allVotes.push({
                            id: doc.id,
                            name: data.name,
                            district: data.district || 'Unknown',
                            votes: data.voteCount
                        });
                    }
                });
                
                allVotes.sort((a, b) => b.votes - a.votes);
                renderVotesTable();
            } catch(e) {
                console.error(e);
                votesLoading.innerHTML = "Error loading votes";
            }
        }
        
        function renderVotesTable() {
            const searchTerm = document.getElementById('votes-search').value.toLowerCase();
            const filtered = allVotes.filter(v => v.name.toLowerCase().includes(searchTerm) || v.district.toLowerCase().includes(searchTerm));
            
            document.getElementById('votes-record-count').textContent = `${filtered.length} venues found`;
            
            votesTbody.innerHTML = filtered.map(v => `
                <tr>
                    <td>${v.district}</td>
                    <td>${v.name}</td>
                    <td><strong>${v.votes}</strong></td>
                </tr>
            `).join('');
            
            votesLoading.style.display = 'none';
            votesTableWrapper.style.display = 'block';
        }
        
        document.getElementById('votes-search').addEventListener('input', renderVotesTable);
        document.getElementById('votes-refresh-btn').addEventListener('click', fetchVotes);


        // --- RUN-OFF LOGIC ---
        let runoffVenues = [];
        const runoffLoading = document.getElementById('runoff-loading');
        const runoffTbody = document.getElementById('runoff-table-body');
        const runoffSelect = document.getElementById('runoff-district-select');

        async function fetchRunoffVenues() {
            runoffLoading.style.display = 'block';
            document.getElementById('runoff-table-wrapper').style.display = 'none';
            const dist = runoffSelect.value;
            runoffVenues = [];
            
            try {
                const q = query(collection(db, "venues"), where("district", "==", dist));
                const snap = await getDocs(q);
                snap.forEach(d => {
                    runoffVenues.push({ id: d.id, ...d.data() });
                });
                
                runoffVenues.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
                
                runoffTbody.innerHTML = runoffVenues.map((v, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${v.name || 'Unnamed'}</td>
                        <td>${v.voteCount || 0}</td>
                        <td>
                            <label class="switch">
                                <input type="checkbox" onchange="window.toggleOptOut('${v.id}', this.checked)" ${v.optOutRunoff ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </td>
                    </tr>
                `).join('');
                
                runoffLoading.style.display = 'none';
                document.getElementById('runoff-table-wrapper').style.display = 'block';
            } catch(e) {
                console.error(e);
            }
        }

        document.getElementById('runoff-refresh-btn').addEventListener('click', fetchRunoffVenues);
        runoffSelect.addEventListener('change', fetchRunoffVenues);

        window.toggleOptOut = async (venueId, isOptOut) => {
            try {
                await updateDoc(doc(db, "venues", venueId), { optOutRunoff: isOptOut });
            } catch(e) {
                console.error("Error updating opt-out:", e);
                alert("Failed to update status.");
            }
        };

        // --- SCHEDULE LOGIC ---
        const schedSelect = document.getElementById('schedule-district-select');
        
        function formatForDateTimeLocal(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d)) return '';
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }

        async function fetchSchedule() {
            const dist = schedSelect.value;
            document.getElementById('schedule-form').style.display = 'none';
            try {
                const snap = await getDoc(doc(db, "settings", "schedule"));
                if (snap.exists() && snap.data()[dist]) {
                    const data = snap.data()[dist];
                    document.getElementById('sched-round-1').value = formatForDateTimeLocal(data.roundOneStart?.toDate());
                    document.getElementById('sched-run-off').value = formatForDateTimeLocal(data.runOffStart?.toDate());
                    document.getElementById('sched-winner').value = formatForDateTimeLocal(data.winnerAnnounce?.toDate());
                    document.getElementById('sched-post').value = formatForDateTimeLocal(data.postEvent?.toDate());
                    document.getElementById('sched-winner-id').value = data.winnerId || '';
                    document.getElementById('schedule-form').style.display = 'block';
                }
            } catch (e) {
                console.error("Error loading schedule:", e);
            }
        }

        document.getElementById('schedule-refresh-btn').addEventListener('click', fetchSchedule);
        schedSelect.addEventListener('change', fetchSchedule);

        document.getElementById('schedule-save-btn').addEventListener('click', async () => {
            const dist = schedSelect.value;
            const updates = {};
            updates[dist] = {
                roundOneStart: new Date(document.getElementById('sched-round-1').value),
                runOffStart: new Date(document.getElementById('sched-run-off').value),
                winnerAnnounce: new Date(document.getElementById('sched-winner').value),
                postEvent: new Date(document.getElementById('sched-post').value),
                winnerId: document.getElementById('sched-winner-id').value || null
            };
            
            try {
                await updateDoc(doc(db, "settings", "schedule"), updates);
                const msg = document.getElementById('schedule-save-msg');
                msg.style.display = 'inline';
                setTimeout(() => msg.style.display = 'none', 2000);
            } catch(e) {
                console.error("Save error:", e);
                alert("Failed to save schedule.");
            }
        });
'''

# We need to insert this into the module script
# Find the start of the imports in dashboard.html
import_start = content.find('import { collection, getDocs }')
# Replace it with extended imports
content = content.replace(
    'import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";',
    'import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";'
)

# Insert the logic before the closing script tag
end_script_idx = content.find('</script>')
content = content[:end_script_idx] + script_additions + '\n    ' + content[end_script_idx:]

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard logic updated")
