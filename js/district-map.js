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
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxNativeZoom: 16,
        maxZoom: 17
    }).addTo(map);

    // Draw the district boundary if available
    let districtFeature = null;
    if (window.councilDistricts) {
        districtFeature = window.councilDistricts.features.find(
            f => f.properties.DISTRICTID.toLowerCase() === districtId.toLowerCase()
        );
        
        if (districtFeature) {
            // 1a. Draw boundary glow
            L.geoJSON(districtFeature, {
                style: {
                    color: '#CBA052',
                    weight: 8,
                    opacity: 0.25,
                    fillOpacity: 0
                }
            }).addTo(map);

            // 1b. Draw boundary line core
            L.geoJSON(districtFeature, {
                style: {
                    color: '#CBA052',
                    weight: 3,
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
        // Map types to distinct colors
        const colors = {
            'bar': '#D2A039',       // Gold
            'restaurant': '#B32424', // Darker Red
            'performance': '#D946EF', // Bright Purple (Live Venue)
            'music': '#D946EF',     // Bright Purple (Live Venue)
            'adult': '#D946EF',     // Bright Purple (Live Venue)
            'museum': '#45B7D1',    // Teal (Museum/Gallery)
            'gallery': '#45B7D1',   // Teal (Museum/Gallery)
            'default': '#A87B28'    // Dark Gold (Other)
        };
        
        let color = colors['default'];
        if (type && typeof type === 'string') {
            const normalizedType = type.toLowerCase();
            for (const key in colors) {
                if (normalizedType.includes(key)) {
                    color = colors[key];
                    break;
                }
            }
        }

        const isTop10 = rank && rank <= 10;
        const borderStyle = isTop10 ? 'border: 2px solid #fff;' : 'border: 2px solid transparent;';
        // Add neon glow effect matching the marker's color
        const glowStyle = `box-shadow: 0 0 8px ${color}, 0 0 12px ${color};`;

        return L.divIcon({
            className: 'custom-venue-marker',
            html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; ${glowStyle} ${borderStyle}"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
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
            console.log(`No venues found for district ${districtId.toUpperCase()} in Firestore.`);
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                venues.push(data);
            });
        }

        // Determine if venues are in bounds and mock ranks if necessary
        let inDistrictVenues = [];
        
        // --- CLIENT-SIDE OVERRIDES ---
        
        venues.forEach((place) => {
            // 2. Geocoding bug fix: Saturn Bar was mistakenly placed at 3323 N Robertson (29.9711, -90.0396).
            // Hardcode correct coordinates to Bywater location: 3067 St Claude Ave
            if (place.name && place.name.toUpperCase() === 'SATURN BAR') {
                place.lat = 29.9679094;
                place.lng = -90.0442228;
                place.district = 'C';
            }

            if (!place.lat || !place.lng) return;
            // Since we override district to C for Saturn Bar, ensure it's filtered correctly
            // if we're not on District C page (but wait, venues are already queried by districtId).
            // Actually, because Firestore returned it for District D, we should just let it be on the map
            // but at the right coordinate, or exclude it if it's no longer in bounds.
            place.inBounds = districtFeature ? isPointInDistrict(place.lat, place.lng, districtFeature) : true;
            if (place.inBounds) inDistrictVenues.push(place);
        });

        // Mock ranks if none have rank (to allow previewing the rankings UI)
        if (!inDistrictVenues.some(v => v.rank)) {
            inDistrictVenues.slice(0, 10).forEach((v, index) => v.rank = index + 1);
        }

        let allMarkers = [];
        window.venueMarkers = {}; // Store markers by venue ID for easy access

        venues.forEach((place) => {
            if (!place.lat || !place.lng) return;

            // Failsafe: if the description field still contains raw hours data, ignore it.
            const hasRealDescription = place.description && !place.description.trim().startsWith('Hours:');
            
            // Generate deep link for this venue
            const venueNameStr = place.name || 'Unnamed Venue';
            const venueShareUrl = window.location.origin + window.location.pathname + '?vote=' + encodeURIComponent(place.id) + '&name=' + encodeURIComponent(venueNameStr);
            const safeVenueShareUrl = venueShareUrl.replace(/'/g, "\\'");

                    // Use website URL if available, otherwise hide the placeholder
                    const websiteUrl = place.website ? place.website : (place.facebook ? place.facebook : null);
                    let websiteHtml = '';
                    if (websiteUrl) {
                        websiteHtml = `
                        <div style="margin-bottom: 12px; display: flex; align-items: center;">
                            <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.95rem; color: var(--neon-cyan); text-decoration: none; font-family: var(--font-main); display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s ease; border: 1px solid rgba(0, 255, 255, 0.4); padding: 6px 14px; border-radius: 20px; background: rgba(0, 255, 255, 0.05);" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> 
                                Visit Website
                            </a>
                        </div>`;
                    }
                    
                    const popupContent = `
                        <div style="width: 100%; min-width: 310px; font-family: 'EB Garamond', Georgia, serif; text-align: left; padding: 12px 12px 16px 12px; box-sizing: border-box;">
                            
                            <div style="margin-bottom: 10px;">
                                <h4 style="margin: 0 0 6px 0; color: var(--text-primary); font-family: 'EB Garamond', Georgia, serif; font-size: 1.5rem; text-transform: uppercase; line-height: 1.1; padding-right: 20px;">${place.name || 'Unnamed Venue'}</h4>
                                ${place.address ? `<p style="margin: 0 0 8px 0; font-size: 0.95rem; color: var(--text-secondary); line-height: 1.3;">${place.address}</p>` : ''}
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${hasRealDescription ? '10px' : '15px'}; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                                <p style="margin: 0; font-size: 1.05rem; color: var(--text-secondary); text-transform: capitalize; font-style: italic;">${(place.type && typeof place.type === 'string') ? place.type.replace('_', ' ') : 'Venue'}</p>
                                
                                <div style="position: relative; flex-shrink: 0;">
                                    <button onclick="const btn = this; navigator.clipboard.writeText('${safeVenueShareUrl}').then(() => { const msg = btn.nextElementSibling; const icon = btn.querySelector('.link-icon'); btn.style.background = '#618A62'; btn.style.borderColor = '#618A62'; if(icon){ icon.style.filter = 'brightness(0) saturate(100%) invert(100%)'; icon.style.opacity = '1'; } msg.style.display='block'; setTimeout(() => { msg.style.display='none'; btn.style.background = 'rgba(255,255,255,0.05)'; btn.style.borderColor = 'rgba(255,255,255,0.2)'; if(icon){ icon.style.filter = 'brightness(0) saturate(100%) invert(72%) sepia(21%) saturate(942%) hue-rotate(354deg) brightness(91%) contrast(88%)'; icon.style.opacity = '0.8'; } }, 2000); }).catch(e => console.error(e));" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;" title="Copy direct link to this venue">
                                        <img class="link-icon" src="assets/link.png" alt="Copy Link" style="width: 13px; height: 13px; object-fit: contain; filter: brightness(0) saturate(100%) invert(72%) sepia(21%) saturate(942%) hue-rotate(354deg) brightness(91%) contrast(88%); opacity: 0.8; transition: all 0.2s ease;">
                                    </button>
                                    <span style="display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; background: #618A62; color: white; font-family: var(--font-main); font-size: 0.75rem; padding: 4px 8px; border-radius: 4px; font-weight: bold; white-space: nowrap;">Copied!</span>
                                </div>
                            </div>
                    
                            <div style="margin-bottom: 12px;">
                                ${hasRealDescription ? `<p style="margin: 0 0 16px 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.5;">${place.description}</p>` : ''}
                                ${websiteHtml}
                            </div>
                            
                            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 5px; padding-bottom: 4px;">
                                <button class="brand-btn" style="width: 100%; padding: 14px 12px; font-size: 1.05rem; text-align: center; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; background: linear-gradient(180deg, var(--brand-red) 0%, #2f533a 100%); color: white; border: none; box-shadow: 0 4px 10px rgba(0,0,0,0.4);" onclick="window.openVoteModal('${place.id}', '${venueNameStr.replace(/'/g, "\\'")}')">Vote For This Business</button>
                                
                                <a href="checkin.html?venue=${place.id}" class="brand-btn" style="width: 100%; background: transparent; border: 2px solid rgba(255,255,255,0.2); color: var(--text-secondary); text-decoration: none; padding: 10px 12px; font-size: 0.95rem; text-align: center; letter-spacing: 0.5px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-weight: 500; opacity: 0.7; transition: all 0.2s ease;" onmouseover="this.style.opacity='1'; this.style.borderColor='var(--text-secondary)';" onmouseout="this.style.opacity='0.7'; this.style.borderColor='rgba(255,255,255,0.2)';">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Check In to Location
                                </a>
                            </div>
                        </div>
                    `;
            
            // Render marker, applying opacity if it's out of bounds
            const markerOptions = {
                icon: getVenueIcon(place.type, place.rank),
                opacity: place.inBounds ? 1.0 : 0.35
            };
            
            const marker = L.marker([place.lat, place.lng], markerOptions).addTo(map)
                .bindPopup(popupContent, { autoPanPaddingTopLeft: [0, 60], minWidth: 340, maxWidth: 380 });

            allMarkers.push({
                marker: marker,
                isTop10: place.rank && place.rank <= 10
            });
            
            window.venueMarkers[place.id] = marker;
        });

        // Global function to open a specific venue's popup
        window.openMapPopupForVenue = (venueId) => {
            const marker = window.venueMarkers[venueId];
            if (marker) {
                marker.openPopup();
                // Optionally center map on marker
                // map.setView(marker.getLatLng(), map.getZoom());
            }
        };

        // Populate the voting lists dynamically
        const populateLists = () => {
            const eventLayout = document.querySelector('event-layout');
            if (!eventLayout) {
                setTimeout(populateLists, 100);
                return;
            }
            
            // Sort venues by voteCount descending
            const sortedVenues = [...inDistrictVenues].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
            
            // Render a single venue list item
            const renderVenueItem = (v, i, maxRank) => {
                let badgeClass = i < 3 ? 'gold' : (i < 5 ? 'silver' : 'dark-gray');
                const safeName = v.name ? v.name.replace(/'/g, "\\'") : '';
                return `<li>
                    <span class="rank-badge ${badgeClass}">${i + 1}</span> 
                    <div class="v-details"><strong>${v.name || 'Unknown'}</strong><br><em>${(v.type && typeof v.type === 'string') ? v.type.replace('_', ' ') : ''}</em></div> 
                    <div style="display: flex; gap: 8px;">
                        <a href="checkin.html?venue=${v.id}" class="brand-btn vote-btn-small" style="background: var(--text-primary); color: var(--bg-primary); text-decoration: none; padding: 6px 12px; display: inline-flex; align-items: center; justify-content: center;" title="Check In">📍</a>
                        <button class="brand-btn vote-btn-small" onclick="window.openVoteModal('${v.id}', '${safeName}')">VOTE</button>
                    </div>
                </li>`;
            };

            // Round 1 List
            const round1List = eventLayout.querySelector('#state-round-1 .venue-list');
            if (round1List) {
                round1List.innerHTML = sortedVenues.map((v, i) => renderVenueItem(v, i, sortedVenues.length)).join('');
            }
            
            // Run-off List (Top 10, filtering out opt-outs)
            const runoffList = eventLayout.querySelector('#state-run-off .venue-list');
            if (runoffList) {
                const qualifiedForRunoff = sortedVenues.filter(v => !v.optOutRunoff).slice(0, 10);
                runoffList.innerHTML = qualifiedForRunoff.map((v, i) => renderVenueItem(v, i, 10)).join('');
            }
            
            // Leaderboards
            const updateLeaderboard = (selector, limit) => {
                const leaderboard = eventLayout.querySelector(selector);
                if (leaderboard) {
                    const h3 = leaderboard.querySelector('h3');
                    leaderboard.innerHTML = '';
                    if (h3) leaderboard.appendChild(h3);
                    
                    const maxVotes = sortedVenues.length > 0 ? (sortedVenues[0].voteCount || 1) : 1;
                    
                    sortedVenues.slice(0, limit).forEach((v, i) => {
                        const width = Math.max(10, ((v.voteCount || 0) / maxVotes) * 100);
                        const ordinal = ['1st', '2nd', '3rd', '4th', '5th'][i] || `${i+1}th`;
                        leaderboard.innerHTML += `
                        <div class="leaderboard-bar ${ordinal}" style="margin-bottom: 6px;">
                            <div class="bar-fill" style="width: ${width}%;"></div>
                            <div class="bar-content" style="padding: 6px 12px;">
                                <span class="rank">#${i + 1}</span>
                                <span class="venue-name">${v.name || 'Unknown'}</span>
                                <span class="vote-count">${v.voteCount || 0} votes</span>
                            </div>
                        </div>`;
                    });
                }
            };
            
            updateLeaderboard('#state-round-1 .leaderboard', 3);
            updateLeaderboard('#state-run-off .leaderboard', 5);
        };
        
        populateLists();

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