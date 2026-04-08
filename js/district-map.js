import { auth, db } from "./firebase-config.js";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Determine district from URL
    const path = window.location.pathname;
    const match = path.match(/district-([a-e])\.html/i);
    const districtId = match ? match[1].toLowerCase() : 'b'; // default to b if not found

    const districtConfigs = {
        'a': { center: [29.985, -90.10], zoom: 14 },
        'b': { center: [29.9546, -90.0673], zoom: 15 },
        'c': { center: [29.958, -90.042], zoom: 14 },
        'd': { center: [30.01, -90.05], zoom: 14 },
        'e': { center: [30.00, -89.99], zoom: 13 }
    };

    const config = districtConfigs[districtId];

    // Initialize Leaflet Map
    const map = L.map('map').setView(config.center, config.zoom);

    // Light basemap — matches index / event page theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const accentIcon = L.divIcon({
        className: 'custom-route-marker',
        html: '<div style="background-color: #EE8442; width: 15px; height: 15px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.25); border: 2px solid #fff;"></div>',
        iconSize: [15, 15],
        iconAnchor: [7.5, 7.5]
    });

    const brandIcon = L.divIcon({
        className: 'custom-route-marker-brand',
        html: '<div style="background-color: #C32F00; width: 15px; height: 15px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid #fff;"></div>',
        iconSize: [15, 15],
        iconAnchor: [7.5, 7.5]
    });

    const smallVenueIcon = L.divIcon({
        className: 'custom-venue-marker',
        html: '<div style="background-color: #EE8442; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.2); border: 1px solid #fff;"></div>',
        iconSize: [8, 8],
        iconAnchor: [4, 4]
    });

    try {
        // Fetch venues from Firestore where district matches
        const venuesRef = collection(db, "venues");
        const q = query(venuesRef, where("district", "==", districtId.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No venues found for district ${districtId.toUpperCase()}`);
        }

        querySnapshot.forEach((doc) => {
            const place = doc.data();
            
            // Handle missing lat/lng gracefully
            if (!place.lat || !place.lng) return;

            const popupContent = `
                <div style="width: 220px; font-family: Inter, sans-serif;">
                    <div style="height: 120px; background-image: url('${place.imageUrl || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}'); background-size: cover; background-position: center; border-radius: 5px 5px 0 0; margin: -14px -14px 10px -14px;"></div>
                    <h4 style="margin: 0 0 5px 0; color: #C32F00; font-family: Montserrat, sans-serif; font-size: 1.2rem; text-transform: uppercase;">${place.name || 'Unnamed Venue'}</h4>
                    <p style="margin: 0 0 10px 0; font-size: 0.8rem; color: #4A3022; text-transform: capitalize;">${place.type ? place.type.replace('_', ' ') : 'Venue'}</p>
                    <div style="font-size: 0.85rem; color: #2D1B15; line-height: 1.4;">
                        ${place.description ? `<div style="margin-bottom: 3px;">${place.description}</div>` : ''}
                    </div>
                </div>
            `;
            L.marker([place.lat, place.lng], {icon: smallVenueIcon}).addTo(map)
                .bindPopup(popupContent);
        });
    } catch (error) {
        console.error("Error fetching venues from Firestore:", error);
    }

    // Expose interactive functions to the window so HTML buttons can access them
    window.upvote = function(buttonElement, currentVotes) {
        let span = buttonElement.querySelector('span');
        let currentNumber = parseInt(span.innerText);
        
        if (currentNumber === currentVotes) {
            span.innerText = currentNumber + 1;
            buttonElement.style.background = 'var(--accent, #EE8442)';
            buttonElement.style.color = '#2D1B15';
        }
    };

    // Setup RSVP & Trivia logic based on Auth state
    onAuthStateChanged(auth, (user) => {
        // --- RSVP Logic ---
        // Ensure web component is somewhat parsed
        setTimeout(() => {
            const rsvpBtn = document.getElementById("rsvp-btn");
            const rsvpMsg = document.getElementById("rsvp-msg");
            
            if (rsvpBtn) {
                rsvpBtn.addEventListener("click", async () => {
                    if (!user) {
                        window.location.href = "login.html";
                        return;
                    }
                    rsvpBtn.disabled = true;
                    rsvpBtn.textContent = "RSVP'ing...";
                    try {
                        const userRef = doc(db, "users", user.uid);
                        await updateDoc(userRef, {
                            rsvps: arrayUnion(districtId.toUpperCase())
                        });
                        rsvpBtn.textContent = "RSVP'd!";
                        rsvpBtn.style.background = "var(--text-primary)";
                        rsvpMsg.style.display = "block";
                        rsvpMsg.textContent = "You're on the list! Check your profile.";
                    } catch (e) {
                        console.error("Error RSVPing: ", e);
                        rsvpBtn.textContent = "Error. Try again.";
                        rsvpBtn.disabled = false;
                    }
                });
            }

            // --- Trivia Logic ---
            const triviaOptions = document.querySelectorAll(".trivia-option");
            const triviaMsg = document.getElementById("trivia-msg");

            triviaOptions.forEach(btn => {
                btn.addEventListener("click", async () => {
                    // Disable all
                    triviaOptions.forEach(b => b.disabled = true);
                    
                    const isCorrect = btn.getAttribute("data-correct") === "true";
                    
                    if (isCorrect) {
                        btn.style.background = "var(--text-primary)";
                        btn.style.color = "var(--bg-primary)";
                        
                        if (user) {
                            try {
                                const userRef = doc(db, "users", user.uid);
                                await updateDoc(userRef, {
                                    totalPoints: increment(50),
                                    unlockedPromos: arrayUnion("NOLA-NIGHTS-26")
                                });
                                triviaMsg.style.display = "block";
                                triviaMsg.style.color = "var(--text-primary)";
                                triviaMsg.textContent = "Correct! +50 Points. Promo code added to your profile!";
                            } catch (e) {
                                console.error("Error updating points: ", e);
                            }
                        } else {
                            triviaMsg.style.display = "block";
                            triviaMsg.style.color = "var(--text-primary)";
                            triviaMsg.innerHTML = 'Correct! <a href="login.html" style="color:var(--brand-red);">Log in</a> to save your points and unlock your promo code.';
                        }
                    } else {
                        btn.style.borderColor = "var(--brand-red)";
                        btn.style.color = "var(--brand-red)";
                        
                        // highlight the correct one
                        const correctBtn = document.querySelector('.trivia-option[data-correct="true"]');
                        if (correctBtn) {
                            correctBtn.style.background = "var(--text-primary)";
                            correctBtn.style.color = "var(--bg-primary)";
                        }
                        
                        triviaMsg.style.display = "block";
                        triviaMsg.textContent = "Incorrect. Better luck next time!";
                    }
                });
            });
        }, 100); // Slight delay for web component init
    });
});