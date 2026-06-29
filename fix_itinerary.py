import re

with open('js/event-components.js', 'r') as f:
    content = f.read()

# Replace renderItineraryStops
old_func_pattern = r'function renderItineraryStops\(stops, vars, shared\).*?function renderScheduleItems\(items\)'

new_func = '''function renderItineraryStops(stops, vars) {
    return `
    <style>
        .proceedings-container {
            position: relative;
            padding: 40px 0 80px;
            max-width: 1100px;
            margin: 0 auto;
        }
        
        .proceedings-path {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            pointer-events: none;
        }

        .proc-step {
            position: relative;
            z-index: 1;
            margin-bottom: 80px;
            display: flex;
        }
        .proc-step.left { justify-content: flex-start; }
        .proc-step.right { justify-content: flex-end; }
        .proc-step.center { justify-content: center; margin-bottom: 0; }

        .proc-card {
            width: 100%;
            max-width: 500px;
            background: linear-gradient(165deg, rgba(15, 22, 38, 0.95) 0%, rgba(15, 22, 38, 0.8) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 35px;
            border-radius: 16px;
            text-align: left;
            backdrop-filter: blur(10px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.6);
        }
        .proc-step.center .proc-card {
            max-width: 850px;
            border-color: var(--brand-red);
            border-width: 2px;
            box-shadow: 0 0 25px rgba(138, 47, 37, 0.25);
            text-align: center;
        }

        .stop-avatar-container {
            display: flex; align-items: center; gap: 18px; margin-bottom: 20px;
        }
        .proc-step.center .stop-avatar-container {
            justify-content: center;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 25px;
        }

        .stop-avatar {
            width: 80px; height: 80px; border-radius: 50%; object-fit: cover;
            border: 2px solid var(--accent); background: var(--bg-secondary);
            display: flex; align-items: center; justify-content: center;
            font-size: 2.2rem; color: var(--accent); flex-shrink: 0;
        }
        .proc-step.center .stop-avatar {
            width: 90px; height: 90px; font-size: 2.8rem;
            box-shadow: 0 0 15px rgba(203, 160, 82, 0.4);
        }
        
        .proc-instructions {
            background: rgba(0,0,0,0.4);
            border-radius: 12px;
            padding: 30px;
            margin-top: 35px;
            border-left: 4px solid var(--accent);
            text-align: left;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .proc-instructions h4 {
            color: var(--text-primary); margin: 0 0 15px 0; font-size: 1.3rem; font-family: var(--font-header); text-transform: uppercase; letter-spacing: 1px;
        }
        .proc-instructions ul {
            margin: 0; padding-left: 20px; color: var(--text-main); font-size: 1.05rem; line-height: 1.6;
        }
        .proc-instructions li { margin-bottom: 12px; }
        .proc-instructions li:last-child { margin-bottom: 0; }

        @media (max-width: 900px) {
            .proc-step.left, .proc-step.right, .proc-step.center { justify-content: center; margin-bottom: 40px; }
            .proceedings-path { display: none; }
        }
    </style>
    
    <div class="proceedings-container">
        <!-- 3D Winding SVG Path (visible on desktop) -->
        <svg class="proceedings-path" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- Layers for the 3D stroke effect, using non-scaling-stroke so thickness stays uniform -->
            <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="rgba(138,47,37,0.35)" stroke-width="22" vector-effect="non-scaling-stroke" transform="translate(6, 6)" />
            <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="var(--text-primary)" stroke-width="16" vector-effect="non-scaling-stroke" transform="translate(4, 4)" />
            <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="var(--accent)" stroke-width="10" vector-effect="non-scaling-stroke" transform="translate(2, 2)" />
            <path d="M 25,10 C 25,35 75,35 75,55 C 75,75 50,75 50,95" fill="none" stroke="var(--brand-red)" stroke-width="4" vector-effect="non-scaling-stroke" />
        </svg>

        ${stops.map((stop, index) => {
            const alignClass = index === 0 ? 'left' : (index === 1 ? 'right' : 'center');
            
            let avatarHtml = '';
            if (index === 0) {
                avatarHtml = `<img src="${vars.influencerImg}" class="stop-avatar" alt="${vars.influencerName}">`;
            } else if (index === 1) {
                avatarHtml = `<img src="${vars.councilImg}" class="stop-avatar" alt="${vars.councilName}">`;
            } else {
                avatarHtml = `<div class="stop-avatar">🗳️</div>`;
            }

            let extraHtml = '';
            let subtitleHtml = `<p style="margin: 0; font-size: 1.1rem; line-height: 1.6; color: var(--text-secondary);">${interpolate(stop.body, vars)}</p>`;
            
            if (index === 2) {
                // Combine the "How it works" instructions into the third stop to unify the narrative
                subtitleHtml = `<p style="margin: 0; font-size: 1.15rem; line-height: 1.6; color: var(--text-secondary);">Where are we ending the night? The polls open 14 days before the event.</p>`;
                extraHtml = `
                    <div class="proc-instructions">
                        <h4>How it works</h4>
                        <ul>
                            <li><strong>Round 1:</strong> Voting opens for all districts when the press release drops. Vote for your favorite neighborhood spots. The top 10 advance.</li>
                            <li><strong>The Run-Off:</strong> Starts the Monday before the event at 3:00 PM. A final sprint to decide the winner among the top 10.</li>
                            <li><strong>The Prize:</strong> The winning venue hosts the final stop. Every vote is an entry into the Golden Ticket Raffle!</li>
                        </ul>
                    </div>
                `;
            }

            return `
            <div class="proc-step ${alignClass} stop-${index + 1}">
                <div class="proc-card">
                    <div class="stop-avatar-container">
                        ${avatarHtml}
                        <div style="text-align: ${index === 2 ? 'center' : 'left'};">
                            <div class="stop-number" style="font-size: 1.2rem; margin-bottom: 4px; color: var(--accent); font-weight: bold; letter-spacing: 1px;">STOP ${stop.number}</div>
                            <h3 style="margin: 0; font-size: 1.7rem; font-family: var(--font-header); text-transform: uppercase;">${index === 2 ? 'The Election: Stop 3' : interpolate(stop.title, vars)}</h3>
                        </div>
                    </div>
                    ${subtitleHtml}
                    ${extraHtml}
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

function renderScheduleItems(items)'''

content = re.sub(old_func_pattern, new_func, content, flags=re.DOTALL)

with open('js/event-components.js', 'w') as f:
    f.write(content)
