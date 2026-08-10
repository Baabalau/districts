const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_DISTRICT = (process.argv[2] || 'c').toLowerCase();

function loadDistrictData(districtId) {
    const jsonPath = path.join(ROOT, 'data', 'event-pages', `district-${districtId}.json`);
    if (!fs.existsSync(jsonPath)) {
        throw new Error(`District data not found: ${jsonPath}`);
    }
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function assetUrl(relativePath) {
    return `file://${path.join(ROOT, relativePath)}`;
}

function imageSrc(imagePath) {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    return assetUrl(imagePath);
}

function interpolate(text, vars) {
    if (!text) return '';
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function buildVars(districtCopy) {
    const councilFirstName = districtCopy.councilName?.split(' ')[0] ?? '';
    const influencerFirstName = districtCopy.influencerName?.split(' ')[0] ?? '';
    const brandedAccounts = ['EatenPathNola', 'EmpowerYouNola'];
    const influencerIntro = brandedAccounts.includes(districtCopy.influencerAccountTitle)
        ? `${districtCopy.influencerName} of ${districtCopy.influencerAccountTitle}`
        : districtCopy.influencerName;

    return {
        district: districtCopy.district,
        date: districtCopy.date,
        councilName: districtCopy.councilName,
        councilDisplayName: districtCopy.councilDisplayName || districtCopy.councilName,
        councilFirstName,
        influencerName: districtCopy.influencerName,
        influencerFirstName,
        influencerIntro,
        influencerAccountTitle: districtCopy.influencerAccountTitle ?? '',
        influencerRole: districtCopy.influencerAccountTitle || 'The Tastemaker'
    };
}

function formatStreetAddress(address) {
    if (!address || typeof address !== 'string') return '';
    const trimmed = address.trim();
    const commaIdx = trimmed.indexOf(',');
    return commaIdx === -1 ? trimmed : trimmed.slice(0, commaIdx).trim();
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function getStopHostRole(stop, index) {
    return stop.hostRole ?? (index === 0 ? 'influencer' : 'council');
}

const SHARED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Oswald:wght@700&display=swap');

:root {
    --bg-primary: #0F1626;
    --bg-secondary: #182238;
    --text-primary: #CBA052;
    --text-secondary: #DEBA84;
    --accent: #8A2F25;
    --brand-red: #4C835C;
    --font-hero: 'Oswald', sans-serif;
    --font-header: 'EB Garamond', Georgia, serif;
    --font-main: 'EB Garamond', Georgia, serif;
    --body-text-size: 1.375rem;
    --body-line-height: 32px;
}

* { box-sizing: border-box; }

body {
    margin: 0;
    padding: 24px;
    background: transparent;
}

#export-root {
    display: inline-block;
    background: transparent;
}

.stop-label-3d {
    display: inline-block;
    font-family: var(--font-hero);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    transform: rotate(-2deg) skewX(-5deg);
    text-shadow:
        1px 1px 0px #0F1626,
        2px 2px 0px var(--accent),
        3px 3px 0px var(--accent),
        4px 4px 0px var(--brand-red),
        5px 5px 8px rgba(0,0,0,0.4);
    letter-spacing: 1px;
    margin: 0;
}

.stop-avatar {
    width: 95px;
    height: 95px;
    border-radius: 50%;
    object-fit: cover;
    box-sizing: border-box;
    border: 3px solid transparent;
    background: conic-gradient(from -45deg, var(--text-primary), var(--accent), var(--brand-red), var(--text-primary)) border-box;
    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.2rem;
    color: var(--accent);
    flex-shrink: 0;
}

.winner-card-crown {
    width: 95px;
    height: 95px;
    font-size: 2.8rem;
    background:
        linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
        conic-gradient(from -45deg, var(--text-primary), var(--accent), var(--brand-red), var(--text-primary)) border-box;
}

.stop-title {
    margin: 0;
    font-size: 1.7rem;
    line-height: 1.2;
    font-family: var(--font-header);
    text-transform: uppercase;
    color: var(--text-primary);
}

.reveal-business-name {
    margin: 0;
    padding: 6px 10px;
    font-size: 2.2rem;
    font-family: var(--font-hero);
    color: var(--accent);
    text-transform: uppercase;
    text-align: left;
    background: var(--text-primary);
    border-radius: 4px;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    width: fit-content;
    max-width: 100%;
    line-height: 1.1;
    display: inline-block;
}

.reveal-card-media {
    display: block;
    width: 430px;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
}

.winner-photo {
    width: 780px;
    height: 250px;
}

.reveal-body {
    margin: 0;
    max-width: 430px;
    font-size: var(--body-text-size);
    line-height: var(--body-line-height);
    color: var(--text-secondary);
    font-family: var(--font-main);
}

.reveal-card-footer {
    max-width: 430px;
    padding-top: 14px;
    border-top: 1px solid rgba(203, 160, 82, 0.3);
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: var(--font-main);
}

.reveal-business-address {
    font-size: var(--body-text-size);
    color: var(--text-secondary);
    line-height: 1.3;
    margin: 0;
}

.stop-host-link {
    font-size: var(--body-text-size);
    font-weight: 600;
    color: var(--brand-red);
    text-decoration: none;
}

.proc-card {
    background: linear-gradient(165deg, rgba(15, 22, 38, 0.95) 0%, rgba(15, 22, 38, 0.8) 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    box-shadow: 0 12px 30px rgba(0,0,0,0.6);
}

.runoff-frame {
    width: 500px;
    height: 520px;
    padding: 35px;
}

.winner-frame {
    width: 850px;
    height: 760px;
    padding: 28px 35px 35px;
    border: 2px solid var(--text-primary);
    box-shadow: 0 0 45px rgba(203, 160, 82, 0.85);
}

.winner-summary {
    margin: 0;
    max-width: 780px;
    font-size: var(--body-text-size);
    line-height: var(--body-line-height);
    color: var(--text-secondary);
    font-family: var(--font-main);
}

.winner-summary strong {
    font-weight: 700;
}

.hero-meetup-highlight {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    font-family: var(--font-main);
    font-size: var(--body-text-size);
}

.winner-card-host {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
}

.winner-card-host-role {
    display: block;
    font-size: 0.85rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-family: var(--font-main);
}

.winner-card-host-name {
    display: block;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    font-family: var(--font-main);
}
`;

function wrapExportHtml(innerHtml, width = 900) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${SHARED_STYLES}</style>
</head>
<body>
<div id="export-root" style="max-width:${width}px;">
${innerHtml}
</div>
</body>
</html>`;
}

function buildRunoffExports(prefix, stop, vars, host) {
    const title = interpolate(stop.title, vars);
    const body = interpolate(stop.runoffBody || stop.body, vars);
    const address = formatStreetAddress(stop.address);
    const websiteText = stop.businessName ? `${stop.businessName} on the web` : 'Visit Website';
    const stopLabel = stop.number === '01' ? 'FIRST STOP' : 'SECOND STOP';

    return [
        {
            file: `${prefix}-frame.png`,
            width: 560,
            height: 620,
            html: `<div class="proc-card runoff-frame"></div>`
        },
        {
            file: `${prefix}-stop-label-3d.png`,
            width: 260,
            height: 80,
            html: `<div class="stop-label-3d">${stopLabel}</div>`
        },
        {
            file: `${prefix}-avatar.png`,
            width: 130,
            height: 130,
            html: `<img src="${assetUrl(host.img)}" class="stop-avatar" alt="${escapeHtml(host.name)}">`
        },
        {
            file: `${prefix}-stop-title.png`,
            width: 520,
            height: 120,
            html: `<h3 class="stop-title">${escapeHtml(title)}</h3>`
        },
        {
            file: `${prefix}-business-photo.png`,
            width: 460,
            height: 240,
            html: stop.image
                ? `<img src="${imageSrc(stop.image)}" class="reveal-card-media" alt="${escapeHtml(stop.businessName)}">`
                : `<div class="reveal-card-media" style="background:rgba(255,255,255,0.08);"></div>`
        },
        {
            file: `${prefix}-business-name.png`,
            width: 520,
            height: 100,
            html: `<h4 class="reveal-business-name">${escapeHtml(stop.businessName || 'To Be Revealed')}</h4>`
        },
        {
            file: `${prefix}-body.png`,
            width: 520,
            height: 220,
            html: `<p class="reveal-body">${escapeHtml(body)}</p>`
        },
        {
            file: `${prefix}-footer.png`,
            width: 520,
            height: 160,
            html: `<div class="reveal-card-footer">
                <div class="reveal-business-address">${escapeHtml(address)}</div>
                ${host.link ? `<span class="stop-host-link">${escapeHtml(host.linkLabel)}</span>` : ''}
                ${stop.website ? `<span class="stop-host-link">${escapeHtml(websiteText)}</span>` : ''}
            </div>`
        }
    ];
}

function buildWinnerBusinessNameHtml(winner, lines) {
    const nameLines = lines?.filter(Boolean);
    if (nameLines?.length) {
        return `<h4 class="reveal-business-name">${nameLines.map((line) => escapeHtml(line)).join('<br>')}</h4>`;
    }
    return `<h4 class="reveal-business-name">${escapeHtml(winner.businessName || 'TBA')}</h4>`;
}

function buildWinnerMeetupHighlightHtml(meetupHighlight, lines) {
    const highlightLines = lines?.filter(Boolean);
    if (highlightLines?.length) {
        return `<span class="hero-meetup-highlight">${highlightLines.map((line) => escapeHtml(line)).join('<br>')}</span>`;
    }
    return `<span class="hero-meetup-highlight">${escapeHtml(meetupHighlight)}</span>`;
}

function buildWinnerExports(districtCopy, vars) {
    const winner = districtCopy.winner || {};
    const meetupHighlight = `Meet us there ${districtCopy.date} at ${winner.meetupTime || '8:30pm'}!`;
    const voteCount = winner.voteCount ?? '—';
    const summaryLead = winner.summaryBody || winner.body || (
        `With ${voteCount} votes, ${winner.businessName || 'TBA'} has been elected to host the last stop of District ${districtCopy.district} After Dark!`
    );

    const exports = [
        {
            file: 'winner-frame.png',
            width: 920,
            height: 820,
            html: `<div class="proc-card winner-frame"></div>`
        },
        {
            file: 'winner-crown-avatar.png',
            width: 130,
            height: 130,
            html: `<div class="stop-avatar winner-card-crown">👑</div>`
        },
        {
            file: 'winner-stop-label-3d.png',
            width: 260,
            height: 80,
            html: `<div class="stop-label-3d">FINAL STOP</div>`
        },
        {
            file: 'winner-header-title.png',
            width: 520,
            height: 80,
            html: `<h3 class="stop-title">The People's Choice</h3>`
        },
        {
            file: 'winner-business-photo.png',
            width: 820,
            height: 290,
            html: winner.image
                ? `<img src="${imageSrc(winner.image)}" class="reveal-card-media winner-photo" alt="${escapeHtml(winner.businessName)}">`
                : `<div class="reveal-card-media winner-photo" style="background:rgba(255,255,255,0.08);"></div>`
        },
        {
            file: 'winner-business-name.png',
            width: 620,
            height: 100,
            html: buildWinnerBusinessNameHtml(winner)
        },
        {
            file: 'winner-summary-body.png',
            width: 820,
            height: 220,
            html: `<p class="winner-summary">${escapeHtml(summaryLead)}</p>`
        },
        {
            file: 'winner-meetup-highlight.png',
            width: 620,
            height: 80,
            html: buildWinnerMeetupHighlightHtml(meetupHighlight)
        },
        {
            file: 'winner-host-council.png',
            width: 340,
            height: 120,
            html: `<div class="winner-card-host">
                <img src="${assetUrl(districtCopy.councilImg)}" class="stop-avatar" alt="${escapeHtml(districtCopy.councilName)}">
                <div>
                    <span class="winner-card-host-role">Councilmember</span>
                    <span class="winner-card-host-name">${escapeHtml(districtCopy.councilName)}</span>
                </div>
            </div>`
        },
        {
            file: 'winner-host-influencer.png',
            width: 340,
            height: 120,
            html: `<div class="winner-card-host">
                <img src="${assetUrl(districtCopy.influencerImg)}" class="stop-avatar" alt="${escapeHtml(districtCopy.influencerName)}">
                <div>
                    <span class="winner-card-host-role">${escapeHtml(vars.influencerRole)}</span>
                    <span class="winner-card-host-name">${escapeHtml(districtCopy.influencerName)}</span>
                </div>
            </div>`
        }
    ];

    if (winner.businessNameLines?.length >= 2) {
        exports.splice(exports.findIndex((layer) => layer.file === 'winner-business-name.png') + 1, 0, {
            file: 'winner-business-name-2line.png',
            width: 620,
            height: 130,
            html: buildWinnerBusinessNameHtml(winner, winner.businessNameLines)
        });
    }

    if (winner.meetupHighlightLines?.length >= 2) {
        exports.splice(exports.findIndex((layer) => layer.file === 'winner-meetup-highlight.png') + 1, 0, {
            file: 'winner-meetup-highlight-2line.png',
            width: 620,
            height: 110,
            html: buildWinnerMeetupHighlightHtml(meetupHighlight, winner.meetupHighlightLines)
        });
    }

    return exports;
}

function socialHandleFromUrl(url) {
    try {
        const segment = new URL(url).pathname.replace(/\/+$/, '').split('/').pop();
        return segment ? `@${segment}` : 'Profile';
    } catch {
        return 'Profile';
    }
}

async function exportLayer(page, htmlPath, exportDef, outputPath) {
    fs.writeFileSync(htmlPath, wrapExportHtml(exportDef.html, exportDef.width));
    await page.setViewport({
        width: exportDef.width + 48,
        height: exportDef.height + 48,
        deviceScaleFactor: 2
    });
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    await new Promise((resolve) => setTimeout(resolve, 800));

    const element = await page.$('#export-root');
    if (!element) {
        throw new Error(`Export root missing for ${exportDef.file}`);
    }

    await element.screenshot({
        path: outputPath,
        omitBackground: true
    });
}

function resolveChromePath() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return null;
}

async function launchBrowser() {
    const executablePath = resolveChromePath();
    const launchOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    return puppeteer.launch(launchOptions);
}

(async () => {
    const districtId = DEFAULT_DISTRICT;
    const districtCopy = loadDistrictData(districtId);
    const vars = buildVars(districtCopy);
    const stops = districtCopy.itinerary?.stops || [];

    const getHost = (role) => {
        if (role === 'council') {
            return {
                name: districtCopy.councilName,
                img: districtCopy.councilImg,
                link: districtCopy.councilBioUrl,
                linkLabel: `View ${districtCopy.councilName}'s bio`
            };
        }
        return {
            name: districtCopy.influencerName,
            img: districtCopy.influencerImg,
            link: districtCopy.influencerSocialUrl,
            linkLabel: `Follow ${socialHandleFromUrl(districtCopy.influencerSocialUrl)}`
        };
    };

    const stop1 = stops[0];
    const stop2 = stops[1];
    const stop1Role = getStopHostRole(stop1, 0);
    const stop2Role = getStopHostRole(stop2, 1);

    const exports = [
        ...buildRunoffExports('runoff-01', stop1, vars, getHost(stop1Role)),
        ...buildRunoffExports('runoff-02', stop2, vars, getHost(stop2Role)),
        ...buildWinnerExports(districtCopy, vars)
    ];

    const outputDir = path.join(ROOT, 'assets', 'congrats-post', `district-${districtId}`);
    fs.mkdirSync(outputDir, { recursive: true });

    const browser = await launchBrowser();
    const page = await browser.newPage();
    const tempHtml = path.join(__dirname, `_temp_reveal_export_${districtId}.html`);
    const manifest = {
        district: districtCopy.district,
        generatedAt: new Date().toISOString(),
        outputDir: `assets/congrats-post/district-${districtId}`,
        layers: []
    };

    for (const exportDef of exports) {
        const outputPath = path.join(outputDir, exportDef.file);
        await exportLayer(page, tempHtml, exportDef, outputPath);
        manifest.layers.push({
            file: exportDef.file,
            suggestedStackOrder: manifest.layers.length + 1,
            width: exportDef.width,
            height: exportDef.height
        });
        console.log(`Saved ${outputPath}`);
    }

    fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    await browser.close();
    if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);

    console.log(`\nExported ${exports.length} transparent PNG layers to ${outputDir}`);
})();
