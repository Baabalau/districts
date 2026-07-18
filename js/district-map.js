import { auth, db } from "./firebase-config.js";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { renderVoteTally } from "./vote-tally.js";

/** Returns true when the election is over and voting should be disabled. */
function isVotingClosed() {
    const state = window.currentElectionState || window._displayedElectionState || 'round-1';
    return state === 'post-election' || state === 'post-event';
}

/** Best display address when Firestore `address` was overwritten by a bare street number. */
export function formatVenueAddress(venue) {
    if (!venue) return '';

    const pick = (key) => {
        const val = venue[key];
        return typeof val === 'string' ? val.trim() : '';
    };

    const full = pick('address');
    const street = pick('addressstreet') || pick('addressStreet');
    const number = pick('addressnumber') || pick('addressNumber');
    const hasStreetName = (value) => /[a-zA-Z]{2,}/.test(value);

    if (hasStreetName(full)) {
        return full.split(',')[0].trim();
    }

    if (hasStreetName(street)) {
        if (/^\d+\s*[a-zA-Z]/.test(street)) {
            return street.split(',')[0].trim();
        }
        if (number || (/^\d/.test(full) && !hasStreetName(full))) {
            const streetNumber = number || full;
            return `${streetNumber} ${street}`.replace(/\s+/g, ' ').trim().split(',')[0].trim();
        }
        return street.split(',')[0].trim();
    }

    if (full) return full.split(',')[0].trim();
    return [number, street].filter(Boolean).join(' ').trim();
}

// Reads the per-district static snapshot (settings/venues_<D>) and the live
// vote-count aggregate (settings/voteCounts_<D>) and merges them into the venue
// array the map/leaderboard expects. Returns null if the snapshot doc is missing
// so the caller can fall back to a full collection read.
export async function loadVenuesFromSnapshot(districtUpper) {
    try {
        const snap = await getDoc(doc(db, "settings", `venues_${districtUpper}`));
        if (!snap.exists()) return null;

        let points;
        try {
            points = JSON.parse(snap.data().points || "[]");
        } catch (e) {
            console.error("Could not parse district venue snapshot:", e);
            return null;
        }
        if (!Array.isArray(points) || points.length === 0) return null;

        // Live counts are best-effort: if the aggregate is missing/unreadable we
        // still render venues with a sane default of 0 votes.
        let counts = {};
        try {
            const countsSnap = await getDoc(doc(db, "settings", `voteCounts_${districtUpper}`));
            if (countsSnap.exists()) counts = countsSnap.data().counts || {};
        } catch (e) {
            console.warn("Could not read vote-count aggregate; defaulting to 0.", e);
        }

        return points.map((p) => ({ ...p, voteCount: Number(counts[p.id]) || 0 }));
    } catch (e) {
        console.warn("Snapshot read failed; will fall back to full read.", e);
        return null;
    }
}

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
        'a': { center: [29.970, -90.107], zoom: 13 },
        'b': { center: [29.942, -90.090], zoom: 14 },
        'c': { center: [29.958, -90.04], zoom: 12 },
        'd': { center: [30.000, -90.064], zoom: 13 },
        'e': { center: [30.010, -89.997], zoom: 13 },
    };

    // Initial map framing per district (full district remains pannable via maxBounds below).
    // sw/ne = south-west and north-east corners as [lat, lng].
    const districtInitialView = {
        // Lakeview / Uptown — explicit framing so load matches designed viewport (see district-a map)
        'a': {
            center: [29.970, -90.107],
            zoom: 13,
            mobile: {
                center: [29.970, -90.107],
                zoom: 12
            }
        },
        // French Quarter / CBD — explicit framing so load matches designed viewport (see district-b map)
        'b': {
            center: [29.942, -90.090],
            zoom: 14,
            mobile: {
                center: [29.942, -90.090],
                zoom: 13
            }
        },
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
        // Gentilly / St. Roch — explicit framing so load matches designed viewport (see district-d map)
        'd': {
            center: [30.000, -90.064],
            zoom: 13,
            mobile: {
                center: [30.000, -90.064],
                zoom: 12
            }
        },
        // New Orleans East / Lower 9th — frame the urban core (venues cluster west),
        // not the full district polygon which stretches far east toward the lake.
        'e': {
            center: [30.010, -89.997],
            zoom: 13,
            mobile: {
                center: [30.010, -89.997],
                zoom: 12
            }
        }
    };

    const config = districtConfigs[districtId];

    // Initialize Leaflet Map
    const map = L.map('map', {
        zoomControl: false
    }).setView(config.center, config.zoom);
    
    // Zoom control — lower-left, styled in district-page.css
    L.control.zoom({
        position: 'bottomleft'
    }).addTo(map);

    // On mobile, Leaflet sizes popups from content min-widths — clamp to the map
    // container so cards don't run edge-to-edge. Desktop keeps bindPopup defaults.
    function fitMapPopupForMobile(popup) {
        if (!window.matchMedia('(max-width: 768px)').matches) return;
        const el = popup.getElement();
        if (!el) return;
        map.invalidateSize();
        const maxW = Math.max(220, map.getSize().x - 56);
        const wrapper = el.querySelector('.leaflet-popup-content-wrapper');
        const content = el.querySelector('.leaflet-popup-content');
        if (wrapper) {
            wrapper.style.width = `${maxW}px`;
            wrapper.style.maxWidth = `${maxW}px`;
            wrapper.style.overflow = 'hidden';
            wrapper.style.boxSizing = 'border-box';
        }
        if (content) {
            content.style.width = 'auto';
            content.style.maxWidth = '100%';
            content.style.minWidth = '0';
            content.style.margin = '10px 12px';
            content.style.boxSizing = 'border-box';
            content.style.overflow = 'hidden';
        }
    }

    map.on('popupopen', (e) => fitMapPopupForMobile(e.popup));

    function getPopupOptions() {
        const base = { autoPanPaddingTopLeft: [0, 60], className: 'venue-map-popup-pane' };
        if (!window.matchMedia('(max-width: 768px)').matches) {
            return { ...base, minWidth: 340, maxWidth: 380 };
        }
        map.invalidateSize();
        const maxW = Math.max(220, map.getSize().x - 56);
        return { ...base, minWidth: 0, maxWidth: maxW };
    }

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
                } else if (initialView?.center && initialView?.zoom != null && !initialView.sw) {
                    map.setView(initialView.center, initialView.zoom);
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
        const glowStyle = `box-shadow: 0 0 8px ${color}, 0 0 12px ${color};`;

        // Top 10: white ring around the category-colored core (matches map legend).
        // Uses a nested wrapper so the ring isn't clipped by Leaflet's iconSize box.
        if (isTop10) {
            return L.divIcon({
                className: 'custom-venue-marker custom-venue-marker--top10',
                html: `<div class="venue-marker-ring"><div class="venue-marker-core venue-marker-core--top10" style="background-color: ${color}; ${glowStyle}"></div></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        }

        return L.divIcon({
            className: 'custom-venue-marker',
            html: `<div class="venue-marker-core" style="background-color: ${color}; ${glowStyle}"></div>`,
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
        const districtUpper = districtId.toUpperCase();

        // Hybrid read: static venue data comes from a pre-published per-district
        // snapshot doc (1 read), live vote counts from a single aggregate doc
        // (1 read) - instead of reading every venue in the collection (~150 reads)
        // on every pageview. Falls back to the full collection read if the
        // snapshot has not been published yet, so the page never hard-breaks.
        let venues = await loadVenuesFromSnapshot(districtUpper);

        if (venues === null) {
            console.warn(`No snapshot for district ${districtUpper}; falling back to full venue read.`);
            venues = [];
            const venuesRef = collection(db, "venues");
            const q = query(venuesRef, where("district", "==", districtUpper));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                console.log(`No venues found for district ${districtUpper} in Firestore.`);
            } else {
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    data.id = docSnap.id;
                    venues.push(data);
                });
            }
        }

        // Separate the polygon-boundary filter (for map visuals) from the list of
        // venues eligible to appear in the voter explorer.
        //
        // inDistrictVenues  — passes the council-district polygon check; used for
        //                     map rank badges and marker opacity.
        // allVenuesWithCoords — all geocoded (lat/lng) venues tagged for this district,
        //                     regardless of whether coordinates fall inside the polygon.
        //                     Geocoding imprecision can push a venue just outside the
        //                     boundary; that should not make it invisible to voters.
        let inDistrictVenues = [];
        let allVenuesWithCoords = [];

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

            place.inBounds = districtFeature ? isPointInDistrict(place.lat, place.lng, districtFeature) : true;
            if (place.inBounds) inDistrictVenues.push(place);

            // All geocoded venues go into this list regardless of polygon outcome.
            allVenuesWithCoords.push(place);
        });

        // Live vote rankings for map Top 10 highlighting (polygon-aware, matches
        // the visual rank badges on map markers).
        const sortedByVotes = [...inDistrictVenues].sort((a, b) => {
            const diff = (b.voteCount || 0) - (a.voteCount || 0);
            if (diff !== 0) return diff;
            return (a.name || '').localeCompare(b.name || '');
        });
        sortedByVotes.forEach((v, index) => {
            v.rank = (v.voteCount || 0) > 0 ? index + 1 : null;
        });

        let allMarkers = [];
        window.venueMarkers = {}; // Store markers by venue ID for easy access

        venues.forEach((place) => {
            if (!place.lat || !place.lng) return;

            // Failsafe: if the description field still contains raw hours data, ignore it.
            const hasRealDescription = place.description && !place.description.trim().startsWith('Hours:');
            
            // Generate deep link for this venue
            const venueNameStr = place.name || 'Unnamed Venue';
            const venueShareUrl = window.location.origin + '/v/' + encodeURIComponent(place.id) + '.html';
            const safeVenueShareUrl = venueShareUrl.replace(/'/g, "\\'");
            const displayAddress = formatVenueAddress(place);

                    // Use website URL if available, otherwise hide the placeholder
                    const websiteUrl = place.website ? place.website : (place.facebook ? place.facebook : null);
                    let websiteHtml = '';
                    if (websiteUrl) {
                        websiteHtml = `
                        <div class="venue-map-popup__website">
                            <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 0.95rem; color: var(--neon-cyan); text-decoration: none; font-family: var(--font-main); display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s ease; border: 1px solid rgba(0, 255, 255, 0.4); padding: 6px 14px; border-radius: 20px; background: rgba(0, 255, 255, 0.05);" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> 
                                Visit Website
                            </a>
                        </div>`;
                    }
                    
                    const popupContent = `
                        <div class="venue-map-popup">
                            <div class="venue-map-popup__header">
                                <h4 class="venue-map-popup__title">${place.name || 'Unnamed Venue'}</h4>
                                ${renderVoteTally(place.voteCount, place.id)}
                            </div>
                            ${displayAddress ? `<p class="venue-map-popup__address">${displayAddress}</p>` : ''}
                            
                            <div class="venue-map-popup__meta">
                                <p class="venue-map-popup__type">${(place.type && typeof place.type === 'string') ? place.type.replace('_', ' ') : 'Venue'}</p>
                                
                                <div class="venue-map-popup__share">
                                    <button onclick="const btn = this; navigator.clipboard.writeText('${safeVenueShareUrl}').then(() => { const msg = btn.nextElementSibling; const icon = btn.querySelector('.link-icon'); btn.style.background = '#618A62'; btn.style.borderColor = '#618A62'; if(icon){ icon.style.filter = 'brightness(0) saturate(100%) invert(100%)'; icon.style.opacity = '1'; } msg.style.display='block'; setTimeout(() => { msg.style.display='none'; btn.style.background = 'rgba(255,255,255,0.05)'; btn.style.borderColor = 'rgba(255,255,255,0.2)'; if(icon){ icon.style.filter = 'brightness(0) saturate(100%) invert(72%) sepia(21%) saturate(942%) hue-rotate(354deg) brightness(91%) contrast(88%)'; icon.style.opacity = '0.8'; } }, 2000); }).catch(e => console.error(e));" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;" title="Copy direct link to this venue">
                                        <img class="link-icon" src="assets/link.png" alt="Copy Link" style="width: 13px; height: 13px; object-fit: contain; filter: brightness(0) saturate(100%) invert(72%) sepia(21%) saturate(942%) hue-rotate(354deg) brightness(91%) contrast(88%); opacity: 0.8; transition: all 0.2s ease;">
                                    </button>
                                    <span style="display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; background: #618A62; color: white; font-family: var(--font-main); font-size: 0.75rem; padding: 4px 8px; border-radius: 4px; font-weight: bold; white-space: nowrap;">Copied!</span>
                                </div>
                            </div>
                    
                            ${(hasRealDescription || websiteHtml) ? `<div class="venue-map-popup__body">${hasRealDescription ? `<p class="venue-map-popup__description">${place.description}</p>` : ''}${websiteHtml}</div>` : ''}
                            
                            <div class="venue-map-popup__actions">
                                ${isVotingClosed() 
                                    ? `<button class="brand-btn venue-map-popup__btn voting-closed-btn" disabled>Voting Closed</button>`
                                    : `<button class="brand-btn venue-map-popup__btn" onclick="window.openVoteModal('${place.id}', '${venueNameStr.replace(/'/g, "\\'")}', ${Number(place.voteCount) || 0})">Vote For Business</button>`}
                                
                                <a href="checkin.html?venue=${place.id}" class="brand-btn venue-map-popup__btn venue-map-popup__btn--checkin">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Check In to Location
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
                .bindPopup(popupContent, getPopupOptions());

            allMarkers.push({
                marker: marker,
                isTop10: place.rank && place.rank <= 10
            });
            
            window.venueMarkers[place.id] = marker;
        });

        // Global function to open a specific venue's popup. Centers the map on the
        // marker first so the popup is actually in view, then opens it once the
        // pan/zoom settles (with a fallback in case the view doesn't move).
        window.openMapPopupForVenue = (venueId) => {
            const marker = window.venueMarkers[venueId];
            if (!marker) return;

            const targetZoom = Math.max(map.getZoom(), 15);
            map.once('moveend', () => marker.openPopup());
            map.setView(marker.getLatLng(), targetZoom, { animate: true });

            // Fallback: if the view was already at the target, moveend won't fire.
            setTimeout(() => marker.openPopup(), 500);
        };

        // Populate the voting lists dynamically
        const populateLists = () => {
            const eventLayout = document.querySelector('event-layout');
            // Wait until the innerHTML is actually populated by checking for the voting-module
            if (!eventLayout || !eventLayout.querySelector('#voting-module')) {
                setTimeout(populateLists, 100);
                return;
            }
            
            // Sort ALL geocoded venues by voteCount for the explorer/leaderboard.
            // Using allVenuesWithCoords (not inDistrictVenues) so venues whose
            // coordinates fall slightly outside the council-district polygon due to
            // geocoding imprecision still appear in the list and are votable.
            const sortedVenues = [...allVenuesWithCoords].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
            
            // Map a raw venue type to one of the 5 map-legend categories
            // (mirrors the substring matching used in getVenueIcon).
            const categorizeType = (type) => {
                if (!type || typeof type !== 'string') return 'Other';
                const t = type.toLowerCase();
                if (t.includes('bar')) return 'Bar';
                if (t.includes('restaurant')) return 'Restaurant';
                if (t.includes('performance') || t.includes('music') || t.includes('adult')) return 'Live Venue';
                if (t.includes('museum') || t.includes('gallery')) return 'Museum/Gallery';
                return 'Other';
            };
            const categoryColor = (category) => ({
                'Bar': '#D2A039',
                'Restaurant': '#B32424',
                'Live Venue': '#D946EF',
                'Museum/Gallery': '#45B7D1',
                'Other': '#A87B28'
            }[category] || '#A87B28');

            // Render a single venue list item (Browse view). The Browse list is
            // alphabetical, not a ranking, so it shows a type-colored dot (matching
            // the map legend) instead of a gold/silver/bronze medal badge.
            const buildVenueSubtitle = (v) => {
                const typeStr = (v.type && typeof v.type === 'string') ? v.type.replace('_', ' ') : 'Venue';
                const addressSnippet = formatVenueAddress(v);

                if (addressSnippet) {
                    return `
                    <div class="venue-subtitle-flip">
                        <div class="flipper-container flipper-container--double">
                            <div>${typeStr}</div>
                            <div>${addressSnippet}</div>
                        </div>
                    </div>`;
                }
                return `<em class="venue-subtitle">${typeStr}</em>`;
            };

            const buildLeaderboardSubtitle = (v) => {
                const typeStr = (v.type && typeof v.type === 'string') ? v.type.replace('_', ' ') : 'Venue';
                const addressSnippet = formatVenueAddress(v);

                let subtitleFlipHtml = '';
                if (addressSnippet) {
                    subtitleFlipHtml = `
                    <div class="venue-subtitle-flip venue-subtitle-flip--leaderboard">
                        <div class="flipper-container flipper-container--double">
                            <div>${typeStr}</div>
                            <div>${addressSnippet}</div>
                        </div>
                    </div>`;
                } else {
                    subtitleFlipHtml = `<em class="venue-subtitle">${typeStr}</em>`;
                }

                return subtitleFlipHtml;
            };

            const renderVenueActions = (v, actionMode = 'normal') => {
                const safeName = v.name ? v.name.replace(/'/g, "\\'") : '';
                const votingClosed = isVotingClosed();

                const renderExpandedCheckIn = (compact = false) => {
                    const label = compact ? 'Check In' : 'Check In at Business';
                    const btnClass = compact
                        ? 'brand-btn venue-checkin-btn venue-checkin-btn-expanded venue-checkin-btn-compact'
                        : 'brand-btn venue-checkin-btn venue-checkin-btn-expanded';
                    return `<a href="checkin.html?venue=${v.id}" class="${btnClass}" title="Check In at Business">
                        <span class="desktop-text"><span class="checkin-pin" aria-hidden="true">📍</span> ${label}</span>
                        <span class="mobile-text"><span class="checkin-pin" aria-hidden="true">📍</span></span>
                    </a>`;
                };

                // Post-election browse tab: expanded check-in only, no vote tally
                if (actionMode === 'post-election-browse') {
                    return `<div class="venue-actions post-election-actions">
                        ${renderExpandedCheckIn(false)}
                    </div>`;
                }

                // Post-election runoff results: vote tally + gold divider + compact check-in
                if (actionMode === 'post-election-results') {
                    return `<div class="venue-actions post-election-results-actions">
                        <div class="venue-actions-stack">
                            ${renderVoteTally(v.voteCount, v.id)}
                            <div class="venue-actions-buttons">
                                ${renderExpandedCheckIn(true)}
                            </div>
                        </div>
                    </div>`;
                }
                
                return `<div class="venue-actions">
                        <div class="venue-actions-stack">
                            ${renderVoteTally(v.voteCount, v.id)}
                            <div class="venue-actions-buttons">
                                ${votingClosed 
                                    ? `<button class="brand-btn venue-vote-btn voting-closed-btn" disabled title="Voting Closed">
                                        <span class="desktop-text">VOTING CLOSED</span>
                                        <span class="mobile-text">🔒</span>
                                    </button>`
                                    : `<button class="brand-btn venue-vote-btn" onclick="window.openVoteModal('${v.id}', '${safeName}', ${Number(v.voteCount) || 0})" title="Vote for Business">
                                        <span class="desktop-text">VOTE FOR BUSINESS</span>
                                        <span class="mobile-text">🗳️</span>
                                    </button>`}
                                <a href="checkin.html?venue=${v.id}" class="brand-btn venue-checkin-btn" title="Check In to Location">📍</a>
                            </div>
                        </div>
                    </div>`;
            };

            // Shared venue card used by both Browse (type dot) and Leaderboard (rank badge).
            const renderVenueCard = ({ leftIndicatorHtml, nameHtml, subtitleHtml = '', actionsHtml = '' }) => {
                return `<li class="venue-card">
                    ${leftIndicatorHtml}
                    <div class="v-details">
                        ${nameHtml}
                        ${subtitleHtml}
                    </div>
                    ${actionsHtml}
                </li>`;
            };

            const renderVenueItem = (v, actionMode = 'normal') => {
                const category = categorizeType(v.type);
                const leftIndicator = `<span class="type-dot" style="background-color: ${categoryColor(category)};" title="${category}"></span>`;
                const nameHtml = `<strong class="venue-name">${v.name || 'Unknown'}</strong>`;
                const subtitleHtml = buildVenueSubtitle(v);
                return renderVenueCard({
                    leftIndicatorHtml: leftIndicator,
                    nameHtml,
                    subtitleHtml,
                    actionsHtml: renderVenueActions(v, actionMode)
                });
            };

            // Paginated venue lists (avoids one long scroll of businesses)
            const PAGE_SIZE = 10;
            const renderPaginatedList = (stateSelector, venues, actionMode = 'normal') => {
                const container = eventLayout.querySelector(`${stateSelector} .venue-list-container`);
                if (!container) return;
                const list = container.querySelector('.venue-list');
                if (!list) return;

                let pagination = container.querySelector('.pagination');
                if (!pagination) {
                    pagination = document.createElement('div');
                    pagination.className = 'pagination';
                    container.appendChild(pagination);
                }

                const totalPages = Math.max(1, Math.ceil(venues.length / PAGE_SIZE));

                const renderPage = (page) => {
                    const currentPage = Math.min(Math.max(1, page), totalPages);
                    const start = (currentPage - 1) * PAGE_SIZE;
                    const pageItems = venues.slice(start, start + PAGE_SIZE);
                    list.innerHTML = pageItems.map((v) => renderVenueItem(v, actionMode)).join('');

                    if (venues.length <= PAGE_SIZE) {
                        pagination.style.display = 'none';
                        return;
                    }
                    pagination.style.display = 'flex';
                    pagination.innerHTML = `
                        <button class="page-prev" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
                        <span>Page ${currentPage} of ${totalPages}</span>
                        <button class="page-next" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
                    const prevBtn = pagination.querySelector('.page-prev');
                    const nextBtn = pagination.querySelector('.page-next');
                    if (prevBtn) prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
                    if (nextBtn) nextBtn.addEventListener('click', () => renderPage(currentPage + 1));
                };

                renderPage(1);
            };

            // Vote-ranked leaderboard (top 10), shown in the Leaderboard pane.
            // During run-off, only show venues that actually have votes (no "Awaiting Votes" slots).
            const updateLeaderboard = (selector, limit, isRunoff = false, actionMode = 'normal') => {
                const leaderboard = eventLayout.querySelector(selector);
                if (!leaderboard) return;

                const list = leaderboard.querySelector('.leaderboard-list');
                if (!list) return;

                const venuesWithVotes = sortedVenues.filter(v => (v.voteCount || 0) > 0);
                
                // During run-off or post-election results, show only venues with votes (up to limit)
                // During round-1, show empty slots up to limit
                const showOnlyWithVotes = isRunoff || actionMode === 'post-election-results';
                const displayCount = showOnlyWithVotes ? Math.min(venuesWithVotes.length, limit) : limit;
                
                let htmlString = '';

                for (let i = 0; i < displayCount; i++) {
                    const v = venuesWithVotes[i];
                    const badgeClass = i === 0 ? 'gold' : (i === 1 ? 'silver' : (i === 2 ? 'bronze' : 'dark-gray'));
                    const leftIndicator = `<span class="rank-badge ${badgeClass}">${i + 1}</span>`;

                    if (v) {
                        htmlString += renderVenueCard({
                            leftIndicatorHtml: leftIndicator,
                            nameHtml: `<strong class="venue-name">${v.name || 'Unknown'}</strong>`,
                            subtitleHtml: buildLeaderboardSubtitle(v),
                            actionsHtml: renderVenueActions(v, actionMode)
                        });
                    } else if (!showOnlyWithVotes) {
                        // Only show "Awaiting Votes" during round-1
                        htmlString += renderVenueCard({
                            leftIndicatorHtml: leftIndicator,
                            nameHtml: `<strong class="venue-name venue-name-placeholder">Awaiting Votes...</strong>`
                        });
                    }
                }
                
                // If no venues have votes during run-off/post-election, show a message
                if (showOnlyWithVotes && venuesWithVotes.length === 0) {
                    htmlString = '<li class="venue-card" style="text-align: center; padding: 20px; color: var(--text-secondary); font-style: italic;">No businesses received votes before the run-off.</li>';
                }

                list.innerHTML = htmlString;
            };
            
            // Expose a function to refresh leaderboards when state changes
            window.refreshLeaderboards = (stateId) => {
                const isRunoff = stateId === 'run-off';
                const isPostElection = stateId === 'post-election' || stateId === 'post-event';
                updateLeaderboard('#state-round-1 .leaderboard', 10, isRunoff, 'normal');
                updateLeaderboard('#state-run-off .leaderboard', 10, isRunoff, 'normal');
                updateLeaderboard('#state-post-election .leaderboard', 10, isPostElection, 'post-election-results');
            };

            // Combined Venue Explorer: one component toggling between the vote-ranked
            // Leaderboard and a Browse view (A-Z/Z-A sort + business-type filter + search).
            // Everything operates on the already-fetched in-memory array -> 0 extra reads.
            const setupVenueExplorer = (stateSelector, browseVenues, postElectionMode = false) => {
                const explorer = eventLayout.querySelector(`${stateSelector} .venue-explorer`);
                if (!explorer) return;

                const leaderboardActionMode = postElectionMode ? 'post-election-results' : 'normal';
                const browseActionMode = postElectionMode ? 'post-election-browse' : 'normal';

                // Leaderboard pane (vote rankings)
                // Check current election state to determine display mode
                const state = window.currentElectionState || window._displayedElectionState || 'round-1';
                const showFinalResults = state === 'run-off' || state === 'post-election' || state === 'post-event';
                updateLeaderboard(`${stateSelector} .leaderboard`, 10, showFinalResults, leaderboardActionMode);

                // Browse pane: search + alphabetical sort + type filter, applied client-side
                const searchInput = explorer.querySelector('.venue-search');
                const sortSelect = explorer.querySelector('.sort-select');
                const typeFilter = explorer.querySelector('.type-filter');

                const applyBrowse = () => {
                    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
                    const sortVal = sortSelect ? sortSelect.value : 'az';
                    const typeVal = typeFilter ? typeFilter.value : 'all';
                    let list = browseVenues.slice();
                    
                    // Filter by search term (name or address)
                    if (searchVal) {
                        list = list.filter(v => {
                            const name = (v.name || '').toLowerCase();
                            const address = (v.address || '').toLowerCase();
                            return name.includes(searchVal) || address.includes(searchVal);
                        });
                    }
                    
                    // Filter by business type
                    if (typeVal !== 'all') {
                        list = list.filter(v => categorizeType(v.type) === typeVal);
                    }
                    
                    list.sort((a, b) => {
                        const an = (a.name || '').toLowerCase();
                        const bn = (b.name || '').toLowerCase();
                        return sortVal === 'za' ? bn.localeCompare(an) : an.localeCompare(bn);
                    });
                    renderPaginatedList(stateSelector, list, browseActionMode);
                };

                if (searchInput) searchInput.addEventListener('input', applyBrowse);
                if (sortSelect) sortSelect.addEventListener('change', applyBrowse);
                if (typeFilter) typeFilter.addEventListener('change', applyBrowse);
                applyBrowse();

                // Tab toggle between Leaderboard and Browse panes
                const tabs = explorer.querySelectorAll('.explorer-tab');
                const controls = explorer.querySelector('.explorer-controls');
                const lbPane = explorer.querySelector('.leaderboard-pane');
                const browsePane = explorer.querySelector('.browse-pane');
                tabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        const isBrowse = tab.dataset.view === 'browse';
                        tabs.forEach(t => t.classList.toggle('active', t === tab));
                        if (controls) controls.style.display = isBrowse ? 'flex' : 'none';
                        if (lbPane) lbPane.style.display = isBrowse ? 'none' : 'block';
                        if (browsePane) browsePane.style.display = isBrowse ? 'block' : 'none';
                    });
                });
            };

            // Round 1: all qualifying venues. Run-off: top 10 (excluding opt-outs).
            setupVenueExplorer('#state-round-1', sortedVenues, false);
            const qualifiedForRunoff = sortedVenues.filter(v => !v.optOutRunoff).slice(0, 10);
            setupVenueExplorer('#state-run-off', qualifiedForRunoff, false);
            // Post-election: show all venues for browsing, leaderboard shows final runoff results
            setupVenueExplorer('#state-post-election', sortedVenues, true);
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