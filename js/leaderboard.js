import { db, auth } from "./firebase-config.js";
import { collection, query, orderBy, limit, getDocs, getDoc, doc, where, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

class DistrictLeaderboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        // Wait for auth to resolve before fetching so we know who the current user is
        onAuthStateChanged(auth, (user) => {
            this.fetchLeaderboard(user);
        });
    }

    async fetchLeaderboard(currentUser) {
        try {
            const usersRef = collection(db, "users");
            // Fetch top 10 users by totalPoints
            const q = query(usersRef, orderBy("totalPoints", "desc"), limit(10));
            const querySnapshot = await getDocs(q);

            let rank = 1;
            let listHtml = '';
            
            let currentUserInTop10 = false;
            
            if (querySnapshot.empty) {
                listHtml = '<div class="empty-state">No Local Legends yet. Be the first to check in!</div>';
            } else {
                querySnapshot.forEach((document) => {
                    const data = document.data();
                    const name = data.displayName || "Anonymous Crawler";
                    const points = data.totalPoints || 0;
                    
                    if (currentUser && document.id === currentUser.uid) {
                        currentUserInTop10 = true;
                    }
                    
                    let medal = '';
                    if (rank === 1) medal = '🥇 ';
                    else if (rank === 2) medal = '🥈 ';
                    else if (rank === 3) medal = '🥉 ';

                    let itemStyle = (currentUser && document.id === currentUser.uid) ? 'border-color: #CBA052; background: rgba(203, 160, 82, 0.1);' : '';

                    listHtml += `
                        <div class="leaderboard-item" style="${itemStyle}">
                            <div class="rank">${rank}</div>
                            <div class="name">${medal}${name} ${currentUser && document.id === currentUser.uid ? '(You)' : ''}</div>
                            <div class="points">${points} pts</div>
                        </div>
                    `;
                    rank++;
                });
            }

            if (currentUser && !currentUserInTop10) {
                try {
                    const userRef = doc(db, "users", currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const myPoints = userData.totalPoints || 0;
                        
                        // Query to find exactly how many people have MORE points
                        const higherScoreQuery = query(usersRef, where("totalPoints", ">", myPoints));
                        const countSnapshot = await getCountFromServer(higherScoreQuery);
                        const myRank = countSnapshot.data().count + 1;
                        
                        listHtml += `
                            <div style="text-align: center; color: #CBA052; margin: 10px 0;">...</div>
                            <div class="leaderboard-item" style="border-color: #CBA052; background: rgba(203, 160, 82, 0.1);">
                                <div class="rank">${myRank}</div>
                                <div class="name">${userData.displayName || "Anonymous Crawler"} (You)</div>
                                <div class="points">${myPoints} pts</div>
                            </div>
                        `;
                    }
                } catch (e) {
                    console.log("Could not fetch personal rank", e);
                }
            }

            const container = this.shadowRoot.querySelector('#leaderboard-list');
            if (container) {
                container.innerHTML = listHtml;
            }

        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            const container = this.shadowRoot.querySelector('#leaderboard-list');
            if (container) {
                container.innerHTML = '<div class="empty-state">Error loading leaderboard. Please try again later.</div>';
            }
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'EB Garamond', Georgia, serif;
                    background: #182238; /* bg-secondary */
                    border-radius: 12px;
                    padding: 30px;
                    border: 2px solid #CBA052; /* text-primary */
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    color: #f4f4f4;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #CBA052;
                    padding-bottom: 15px;
                }
                h2 {
                    font-family: 'Oswald', sans-serif;
                    text-transform: uppercase;
                    color: #CBA052;
                    margin: 0 0 5px 0;
                    font-size: 2rem;
                    letter-spacing: 1px;
                }
                .subtitle {
                    color: #DEBA84; /* text-secondary */
                    font-size: 1.1rem;
                    font-style: italic;
                    margin: 0;
                }
                .leaderboard-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .leaderboard-item {
                    display: flex;
                    align-items: center;
                    background: rgba(15, 22, 38, 0.6); /* bg-primary */
                    padding: 15px 20px;
                    border-radius: 8px;
                    border-left: 4px solid #8A2F25; /* accent */
                    transition: transform 0.2s;
                }
                .leaderboard-item:hover {
                    transform: translateX(5px);
                    background: rgba(15, 22, 38, 0.9);
                }
                .rank {
                    font-family: 'Oswald', sans-serif;
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #DEBA84;
                    width: 40px;
                }
                .name {
                    flex-grow: 1;
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: #f4f4f4;
                }
                .points {
                    font-family: 'Oswald', sans-serif;
                    font-size: 1.2rem;
                    color: #4C835C; /* brand-red (greenish) */
                    font-weight: bold;
                }
                .empty-state {
                    text-align: center;
                    padding: 30px;
                    color: #DEBA84;
                    font-style: italic;
                }
                .loading {
                    text-align: center;
                    padding: 20px;
                    color: #DEBA84;
                }
            </style>
            <div class="header">
                <h2>Local Legends</h2>
                <p class="subtitle">Top supporters across the city.</p>
            </div>
            <div class="leaderboard-list" id="leaderboard-list">
                <div class="loading">Loading rankings...</div>
            </div>
        `;
    }
}

customElements.define('district-leaderboard', DistrictLeaderboard);
