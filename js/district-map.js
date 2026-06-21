import { auth, db } from "./firebase-config.js";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Determine district from URL
    const path = window.location.pathname;
    const match = path.match(/district-([a-e])\.html/i);
    const districtId = match ? match[1].toLowerCase() : 'b'; // default to b if not found

    // Wait for EventLayout to render the #map container
    const mapContainerInterval = setInterval(async () => {
        if (!document.getElementById('map')) return;
        clearInterval(mapContainerInterval);

        const districtConfigs = {
        'a': { center: [29.985, -90.10], zoom: 14 },
        'b': { center: [29.9546, -90.0673], zoom: 15 },
        'c': { center: [29.958, -90.04], zoom: 12 },
        'd': { center: [30.01, -90.05], zoom: 14 },
        'e': { center: [30.00, -89.99], zoom: 13 }
    };

    // Initial map framing per district (full district remains pannable via maxBounds below).
    // sw/ne = south-west and north-east corners as [lat, lng].
    const districtInitialView = {
        // Marigny / French Quarter — mobile uses explicit center+zoom (fitBounds is unreliable on narrow viewports)
        'c': {
            sw: [29.954, -90.068],
            ne: [29.972, -90.048],
            padding: [11, 11],
            mobile: {
                center: [29.960, -90.062],
                zoom: 14
            }
        },
        // Western half of District E — New Orleans East off-screen until user pans east
        'e': {
            sw: [29.962, -90.032],
            ne: [30.105, -89.945],
            padding: [6, 6]
        }
    };

    const config = districtConfigs[districtId];

    // Initialize Leaflet Map
    const map = L.map('map', {
        zoomControl: false
    }).setView(config.center, config.zoom);
    
    // Move zoom control to top right to avoid overlapping with the title
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Dark basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Draw the district boundary if available
    let districtFeature = null;
    if (window.councilDistricts) {
        districtFeature = window.councilDistricts.features.find(
            f => f.properties.DISTRICTID.toLowerCase() === districtId.toLowerCase()
        );
        
        if (districtFeature) {
            // 1. Draw boundary line only (no interior fill)
            L.geoJSON(districtFeature, {
                style: {
                    color: '#2B3561',
                    weight: 4,
                    opacity: 1,
                    fillOpacity: 0
                }
            }).addTo(map);

            // 2. Draw inverted polygon to tint the outside
            let rings = [];
            if (districtFeature.geometry.type === 'Polygon') {
                districtFeature.geometry.coordinates.forEach(ring => {
                    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
                    rings.push(ring.map(c => [c[1], c[0]]));
                });
            } else if (districtFeature.geometry.type === 'MultiPolygon') {
                districtFeature.geometry.coordinates.forEach(polygon => {
                    polygon.forEach(ring => {
                        rings.push(ring.map(c => [c[1], c[0]]));
                    });
                });
            }

            // Outer ring covering the world
            const outerRing = [
                [90, -180],
                [90, 180],
                [-90, 180],
                [-90, -180]
            ];

            L.polygon([outerRing, ...rings], {
                color: 'transparent',
                fillColor: '#1D1A16',
                fillOpacity: 0.35
            }).addTo(map);

            const fullBounds = L.geoJSON(districtFeature).getBounds();
            const initialView = districtInitialView[districtId];

            function applyInitialFraming() {
                map.invalidateSize();
                const isMobile = window.innerWidth <= 768;

                if (initialView?.mobile && isMobile) {
                    map.setView(initialView.mobile.center, initialView.mobile.zoom);
                } else if (initialView) {
                    const initialBounds = L.latLngBounds(initialView.sw, initialView.ne);
                    map.fitBounds(initialBounds, { padding: initialView.padding || [20, 20] });
                    if (initialView.zoomOffset) {
                        map.setZoom(map.getZoom() + initialView.zoomOffset);
                    }
                } else {
                    map.fitBounds(fullBounds, { padding: [20, 20] });
                }

                map.options.minZoom = map.getZoom() - 1;
            }

            applyInitialFraming();
            // Map container may not have final mobile dimensions until layout paints
            requestAnimationFrame(() => applyInitialFraming());
            setTimeout(applyInitialFraming, 250);

            // Users can still pan across the entire district (e.g. Algiers, New Orleans East)
            map.setMaxBounds(fullBounds.pad(0.8));
        }
    }

    // Dynamic icon generator based on venue type and rank
    function getVenueIcon(type, rank) {
        if (rank) {
            // Use the same styling logic as the list view rank badges
            let badgeClass = 'rank-badge';
            if (rank <= 3) badgeClass += ' gold';
            else if (rank <= 5) badgeClass += ' silver';
            else badgeClass += ' dark-gray';
            
            return L.divIcon({
                className: 'custom-venue-marker',
                html: `<div class="${badgeClass}" style="width: 28px; height: 28px; font-size: 0.9rem; margin: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">${rank}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
        }

        // Map types to distinct colors (fallback for non-ranked venues)
        const colors = {
            'bar': '#D2A039',       // Accent orange -> Gold
            'restaurant': '#2B3561', // Brand red -> Dark Blue
            'club': '#1E2545',      // Dark red -> Darker Blue
            'lounge': '#1D1A16',    // Dark brown -> Dark Outline
            'music': '#D5BC8A',     // Light brown -> Tan
            'default': '#A87B28'    // Accent dark -> Dark Gold
        };
        
        let color = colors['default'];
        if (type) {
            const normalizedType = type.toLowerCase();
            for (const key in colors) {
                if (normalizedType.includes(key)) {
                    color = colors[key];
                    break;
                }
            }
        }

        return L.divIcon({
            className: 'custom-venue-marker',
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid #fff;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
    }

    function isPointInDistrict(lat, lng, feature) {
        if (!feature || !feature.geometry) return true;
        
        function pointInPolygon(point, vs) {
            let x = point[0], y = point[1];
            let inside = false;
            for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
                let xi = vs[i][0], yi = vs[i][1];
                let xj = vs[j][0], yj = vs[j][1];
                let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        const pt = [lng, lat]; // GeoJSON uses [lng, lat]
        if (feature.geometry.type === 'Polygon') {
            return pointInPolygon(pt, feature.geometry.coordinates[0]);
        } else if (feature.geometry.type === 'MultiPolygon') {
            for (let i = 0; i < feature.geometry.coordinates.length; i++) {
                if (pointInPolygon(pt, feature.geometry.coordinates[i][0])) return true;
            }
        }
        return false;
    }

    try {
        // Fetch venues from Firestore where district matches
        const venuesRef = collection(db, "venues");
        const q = query(venuesRef, where("district", "==", districtId.toUpperCase()));
        const querySnapshot = await getDocs(q);

        let venues = [];

        if (querySnapshot.empty) {
            console.log(`No venues found for district ${districtId.toUpperCase()}. Loading mock data for demonstration.`);
            // Mock Data for demonstration since the database is empty right now
            venues = [
                { name: "The Rusty Nail", type: "bar", lat: config.center[0] + 0.005, lng: config.center[1] + 0.005, rank: 1, description: "Patio crawfish boil" },
                { name: "Barrel Proof", type: "bar", lat: config.center[0] - 0.002, lng: config.center[1] - 0.008, rank: 2, description: "Brass band on the deck" },
                { name: "The Tchoup Yard", type: "lounge", lat: config.center[0] - 0.006, lng: config.center[1] + 0.002, rank: 3, description: "Outdoor games & DJ" },
                { name: "Capulet", type: "restaurant", lat: config.center[0] + 0.008, lng: config.center[1] - 0.004, rank: 4, description: "Frozen cocktails specials" },
                { name: "Bulldog Mid-City", type: "bar", lat: config.center[0] - 0.004, lng: config.center[1] - 0.012, rank: 5, description: "Pint night deals" },
                { name: "Finn McCool's", type: "bar", lat: config.center[0] + 0.012, lng: config.center[1] + 0.008, rank: 6, description: "Dog-friendly patio vibes" }
            ];
        } else {
            querySnapshot.forEach((doc) => {
                venues.push(doc.data());
            });
        }

        // Determine if venues are in bounds and mock ranks if necessary
        let inDistrictVenues = [];
        venues.forEach((place) => {
            if (!place.lat || !place.lng) return;
            place.inBounds = districtFeature ? isPointInDistrict(place.lat, place.lng, districtFeature) : true;
            if (place.inBounds) inDistrictVenues.push(place);
        });

        // Mock ranks if none have rank (to allow previewing the rankings UI)
        if (!inDistrictVenues.some(v => v.rank)) {
            inDistrictVenues.slice(0, 10).forEach((v, index) => v.rank = index + 1);
        }

        venues.forEach((place) => {
            if (!place.lat || !place.lng) return;

            const popupContent = `
                <div style="width: 220px; font-family: 'EB Garamond', Georgia, serif;">
                    <div style="height: 120px; background-image: url('${place.imageUrl || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80'}'); background-size: cover; background-position: center; border-radius: 5px 5px 0 0; margin: -14px -14px 10px -14px;"></div>
                    <h4 style="margin: 0 0 5px 0; color: #2B3561; font-family: 'EB Garamond', Georgia, serif; font-size: 1.2rem; text-transform: uppercase;">${place.name || 'Unnamed Venue'}</h4>
                    <p style="margin: 0 0 10px 0; font-size: 0.8rem; color: #4A3C2F; text-transform: capitalize;">${place.type ? place.type.replace('_', ' ') : 'Venue'}</p>
                    <div style="font-size: 0.85rem; color: #1D1A16; line-height: 1.4;">
                        ${place.description ? `<div style="margin-bottom: 3px;">${place.description}</div>` : ''}
                    </div>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(45, 27, 21, 0.1);">
                        <label style="display: flex; align-items: center; gap: 8px; font-weight: bold; cursor: pointer; color: #8A2F25;">
                            <input type="radio" name="map-vote" value="${place.name}" onclick="window.openVoteModal('${place.name.replace(/'/g, "\\'")}')" style="accent-color: #8A2F25;">
                            Vote for this Venue
                        </label>
                    </div>
                </div>
            `;
            
            // Render marker, applying opacity if it's out of bounds
            const markerOptions = {
                icon: getVenueIcon(place.type, place.rank),
                opacity: place.inBounds ? 1.0 : 0.35
            };
            
            L.marker([place.lat, place.lng], markerOptions).addTo(map)
                .bindPopup(popupContent, { autoPanPaddingTopLeft: [0, 60] });
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
            buttonElement.style.background = 'var(--accent, #D2A039)';
            buttonElement.style.color = '#1D1A16';
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
    }, 100); // end of mapContainerInterval
});