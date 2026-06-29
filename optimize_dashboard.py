import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to add collectionGroup to imports
if 'collectionGroup' not in content:
    content = content.replace(
        'import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";',
        'import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy, collectionGroup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";'
    )

# Implement global venue caching
# We'll create a new init data function right after authentication
init_logic = '''        let allData = [];
        let currentSort = { column: 'time', direction: 'desc' };
        let globalVenues = null; // Cache to save database reads

        // Authentication check
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = "login.html";
            } else {
                await fetchGlobalVenues();
                fetchData();
            }
        });

        async function fetchGlobalVenues(force = false) {
            if (globalVenues && !force) return;
            globalVenues = {};
            try {
                const snap = await getDocs(collection(db, "venues"));
                snap.forEach(d => {
                    globalVenues[d.id] = { id: d.id, ...d.data() };
                });
                console.log("Cached " + Object.keys(globalVenues).length + " venues to save reads.");
            } catch (e) {
                console.error("Error caching venues:", e);
            }
        }
'''

content = re.sub(r"let allData = \[\];\s*let currentSort = \{ column: 'time', direction: 'desc' \};\s*// Authentication check\s*onAuthStateChanged\(auth, \(user\) => \{\s*if \(\!user\) \{\s*window\.location\.href = \"login\.html\";\s*\} else \{\s*fetchData\(\);\s*\}\s*\}\);", init_logic, content)

# Rewrite fetchData() to use collectionGroup
old_fetchData = '''        async function fetchData() {
            loadingEl.style.display = "block";
            tableWrapper.style.display = "none";
            allData = [];

            try {
                // 1. Fetch all venues to get their IDs and Names
                const venuesSnapshot = await getDocs(collection(db, "venues"));
                
                // 2. Loop through each venue and fetch its "customers" subcollection
                const fetchPromises = venuesSnapshot.docs.map(async (venueDoc) => {
                    const venueId = venueDoc.id;
                    const venueName = venueDoc.data().name || "Unknown Business";
                    
                    const customersSnapshot = await getDocs(collection(db, "venues", venueId, "customers"));
                    
                    customersSnapshot.forEach((custDoc) => {
                        const custData = custDoc.data();
                        
                        // Parse timestamp
                        let timeObj = new Date(0);
                        if (custData.lastVisit && custData.lastVisit.toDate) {
                            timeObj = custData.lastVisit.toDate();
                        }
                        
                        allData.push({
                            id: `${venueId}_${custDoc.id}`,
                            business: venueName,
                            user: custData.displayName || custData.email || "Unknown User",
                            email: custData.email || "",
                            time: timeObj,
                            timeFormatted: timeObj.toLocaleString(),
                            visits: custData.visitCount || 1,
                            photoUrl: custData.photoUrl || null,
                            photoStatus: custData.photoStatus || "none"
                        });
                    });
                });

                await Promise.all(fetchPromises);'''

new_fetchData = '''        async function fetchData(forceRefresh = false) {
            loadingEl.style.display = "block";
            tableWrapper.style.display = "none";
            allData = [];

            try {
                if (!globalVenues || forceRefresh) {
                    await fetchGlobalVenues(true);
                }
                
                // Use collectionGroup to fetch ALL check-ins with 1 read per checkin, instead of 700+ empty queries
                const customersSnapshot = await getDocs(collectionGroup(db, "customers"));
                
                customersSnapshot.forEach((custDoc) => {
                    const custData = custDoc.data();
                    const venueId = custDoc.ref.parent.parent.id;
                    const venueName = globalVenues[venueId] ? globalVenues[venueId].name : "Unknown Business";
                    
                    // Parse timestamp
                    let timeObj = new Date(0);
                    if (custData.lastVisit && custData.lastVisit.toDate) {
                        timeObj = custData.lastVisit.toDate();
                    }
                    
                    allData.push({
                        id: `${venueId}_${custDoc.id}`,
                        business: venueName,
                        user: custData.displayName || custData.email || "Unknown User",
                        email: custData.email || "",
                        time: timeObj,
                        timeFormatted: timeObj.toLocaleString(),
                        visits: custData.visitCount || 1,
                        photoUrl: custData.photoUrl || null,
                        photoStatus: custData.photoStatus || "none"
                    });
                });'''

content = content.replace(old_fetchData, new_fetchData)

# Change refresh button to trigger force refresh
content = content.replace("refreshBtn.addEventListener('click', fetchData);", "refreshBtn.addEventListener('click', () => fetchData(true));")

# Optimize fetchVotes
old_fetchVotes = '''        async function fetchVotes() {
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
                });'''

new_fetchVotes = '''        async function fetchVotes(forceRefresh = false) {
            votesLoading.style.display = 'block';
            votesTableWrapper.style.display = 'none';
            allVotes = [];
            
            try {
                if (!globalVenues || forceRefresh) {
                    await fetchGlobalVenues(true);
                }
                
                Object.values(globalVenues).forEach(data => {
                    if (data.voteCount > 0) {
                        allVotes.push({
                            id: data.id,
                            name: data.name,
                            district: data.district || 'Unknown',
                            votes: data.voteCount
                        });
                    }
                });'''

content = content.replace(old_fetchVotes, new_fetchVotes)
content = content.replace("document.getElementById('votes-refresh-btn').addEventListener('click', fetchVotes);", "document.getElementById('votes-refresh-btn').addEventListener('click', () => fetchVotes(true));")

# Optimize fetchRunoffVenues
old_fetchRunoff = '''        async function fetchRunoffVenues() {
            runoffLoading.style.display = 'block';
            document.getElementById('runoff-table-wrapper').style.display = 'none';
            const dist = runoffSelect.value;
            runoffVenues = [];
            
            try {
                const q = query(collection(db, "venues"), where("district", "==", dist));
                const snap = await getDocs(q);
                snap.forEach(d => {
                    runoffVenues.push({ id: d.id, ...d.data() });
                });'''

new_fetchRunoff = '''        async function fetchRunoffVenues(forceRefresh = false) {
            runoffLoading.style.display = 'block';
            document.getElementById('runoff-table-wrapper').style.display = 'none';
            const dist = runoffSelect.value;
            runoffVenues = [];
            
            try {
                if (!globalVenues || forceRefresh) {
                    await fetchGlobalVenues(true);
                }
                
                Object.values(globalVenues).forEach(d => {
                    if (d.district === dist) {
                        runoffVenues.push(d);
                    }
                });'''

content = content.replace(old_fetchRunoff, new_fetchRunoff)
content = content.replace("document.getElementById('runoff-refresh-btn').addEventListener('click', fetchRunoffVenues);", "document.getElementById('runoff-refresh-btn').addEventListener('click', () => fetchRunoffVenues(true));")
content = content.replace("runoffSelect.addEventListener('change', fetchRunoffVenues);", "runoffSelect.addEventListener('change', () => fetchRunoffVenues(false));")

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard optimized for reads")
