import re

with open('js/event-components.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update buildTemplateVars
old_vars = '''function buildTemplateVars(districtCopy) {
    return {
        district: districtCopy.district,
        date: districtCopy.date,
        time: districtCopy.time,
        location: districtCopy.location,
        councilName: districtCopy.councilName,
        influencerName: districtCopy.influencerName
    };
}'''

new_vars = '''function buildTemplateVars(districtCopy) {
    return {
        district: districtCopy.district,
        date: districtCopy.date,
        time: districtCopy.time,
        location: districtCopy.location,
        councilName: districtCopy.councilName,
        influencerName: districtCopy.influencerName,
        councilImg: districtCopy.councilImg,
        influencerImg: districtCopy.influencerImg
    };
}'''

content = content.replace(old_vars, new_vars)

# 2. Update renderItineraryStops
old_itinerary = '''function renderItineraryStops(stops, vars) {
    return stops.map((stop, index) => `
                    <div class="stop-card stop-${index + 1}">
                        <div class="stop-number">${stop.number}</div>
                        <h3>${interpolate(stop.title, vars)}</h3>
                        <p>${interpolate(stop.body, vars)}</p>
                    </div>`).join('');
}'''

new_itinerary = '''function renderItineraryStops(stops, vars) {
    const isMobile = window.innerWidth <= 768;
    return `
    <style>
        .itinerary-grid-custom {
            display: grid;
            grid-template-columns: 1fr;
            gap: 40px;
            position: relative;
        }
        @media (min-width: 768px) {
            .itinerary-grid-custom {
                grid-template-columns: 1fr 1fr;
            }
            .stop-3-full {
                grid-column: 1 / -1;
                max-width: 800px;
                margin: 0 auto;
                width: 100%;
            }
            .connecting-line {
                position: absolute;
                top: 80px;
                left: 25%;
                width: 50%;
                height: 0;
                border-top: 3px dashed var(--accent);
                z-index: 0;
                opacity: 0.5;
            }
        }
        .stop-card-custom {
            background: linear-gradient(165deg, rgba(15, 22, 38, 0.8) 0%, rgba(15, 22, 38, 0.6) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 12px;
            text-align: left;
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .stop-avatar-container {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        .stop-avatar {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--accent);
            background: var(--bg-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            color: var(--accent);
        }
        .stop-business-placeholder {
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
            border: 1px dashed rgba(255,255,255,0.2);
            display: flex;
            gap: 15px;
            align-items: center;
        }
        .stop-business-img {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.3);
            font-size: 1.5rem;
        }
        .stop-business-info h4 {
            margin: 0 0 5px 0;
            color: var(--text-primary);
            font-size: 1.1rem;
        }
        .stop-business-info p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
    </style>
    <div class="itinerary-grid-custom">
        <div class="connecting-line"></div>
        ${stops.map((stop, index) => {
            let avatarHtml = '';
            if (index === 0) {
                avatarHtml = `<img src="${vars.influencerImg}" class="stop-avatar" alt="${vars.influencerName}">`;
            } else if (index === 1) {
                avatarHtml = `<img src="${vars.councilImg}" class="stop-avatar" alt="${vars.councilName}">`;
            } else {
                avatarHtml = `<div class="stop-avatar">?</div>`;
            }

            const businessHtml = `
                <div class="stop-business-placeholder">
                    <div class="stop-business-img">🖼️</div>
                    <div class="stop-business-info">
                        <h4>Venue Name</h4>
                        <p>123 Venue Street</p>
                    </div>
                </div>
            `;

            const cardClass = index === 2 ? 'stop-card-custom stop-3-full' : 'stop-card-custom';

            return `
            <div class="${cardClass} stop-${index + 1}">
                <div class="stop-avatar-container">
                    ${avatarHtml}
                    <div>
                        <div class="stop-number" style="position: static; font-size: 1.2rem; margin-bottom: 5px; color: var(--accent); opacity: 1;">${stop.number}</div>
                        <h3 style="margin: 0; font-size: 1.4rem;">${interpolate(stop.title, vars)}</h3>
                    </div>
                </div>
                <p style="margin: 0; font-size: 1rem; line-height: 1.5;">${interpolate(stop.body, vars)}</p>
                ${businessHtml}
            </div>`;
        }).join('')}
    </div>`;
}'''

content = content.replace(old_itinerary, new_itinerary)

with open('js/event-components.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated itinerary grid")
