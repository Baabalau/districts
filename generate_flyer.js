const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

(async () => {
    const mockQrUrl = 'https://districtsafterdark.com/district-d.html?vote=Sample%20Business';
    const qrImageBase64 = await QRCode.toDataURL(mockQrUrl, {
        color: { dark: '#0F1626', light: '#CBA052' },
        margin: 2, width: 600
    });

    const bgUrl = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2550&q=80';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Montserrat:wght@700;900&display=swap');
            body { margin: 0; padding: 0; background: #0F1626; }
            :root {
                --bg-primary: #0F1626;
                --text-primary: #CBA052;
                --text-secondary: #DEBA84;
                --accent: #8A2F25;
                --brand-red: #4C835C;
                --font-main: 'Inter', sans-serif;
                --font-header: 'Montserrat', sans-serif;
            }
            .flyer-container {
                width: 2550px; height: 3300px;
                background: linear-gradient(rgba(15, 22, 38, 0.85), rgba(15, 22, 38, 0.95)), url('${bgUrl}') center/cover;
                font-family: var(--font-main); color: white;
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                padding: 120px;
                box-sizing: border-box;
                gap: 80px;
            }
            .flyer-container::after {
                content: ''; position: absolute;
                top: 60px; left: 60px; right: 60px; bottom: 60px;
                border: 15px solid var(--text-primary); border-radius: 60px;
                pointer-events: none; z-index: 1;
            }
            .quadrant {
                background: rgba(15, 22, 38, 0.7);
                border: 10px solid var(--accent);
                border-radius: 50px;
                padding: 80px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                box-shadow: 0 40px 80px rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
                z-index: 5;
            }
            /* Top Left: Title */
            .q1 { border-color: var(--text-primary); }
            .title-3d {
                font-family: var(--font-header); font-size: 150px; font-weight: 900;
                text-transform: uppercase; color: var(--text-primary);
                transform: rotate(-3deg) skewX(-3deg);
                text-shadow: 6px 6px 0px #0F1626, 12px 12px 0px var(--accent), 24px 24px 0px var(--accent), 36px 36px 0px var(--brand-red);
                line-height: 1.1; margin-bottom: 60px;
            }
            .subtitle {
                font-size: 48px; color: var(--text-secondary); font-weight: 600; line-height: 1.5;
            }
            /* Top Right: Support */
            .q2 { border-color: var(--brand-red); background: rgba(76, 131, 92, 0.3); }
            .support-header {
                font-family: var(--font-header); font-size: 90px; color: white;
                font-weight: 900; text-transform: uppercase; margin-bottom: 60px;
                text-shadow: 4px 4px 0 var(--accent);
            }
            .business-name-box {
                background: var(--text-primary); color: var(--bg-primary);
                font-family: var(--font-header); font-size: 110px; font-weight: 900;
                text-transform: uppercase; padding: 60px 40px; border-radius: 40px;
                border: 12px solid white; width: 100%; box-sizing: border-box;
                box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            }
            /* Bottom Left: Incentive */
            .q3 { border-color: var(--accent); background: rgba(138, 47, 37, 0.5); }
            .incentive-text {
                font-size: 65px; font-weight: 800; margin: 0 0 50px 0; line-height: 1.4;
                text-shadow: 2px 2px 0 rgba(0,0,0,0.5);
            }
            .incentive-highlight {
                color: var(--text-primary); font-size: 85px; font-family: var(--font-header);
                text-transform: uppercase; font-weight: 900;
                text-shadow: 4px 4px 0 #0F1626;
            }
            /* Bottom Right: QR */
            .q4 { border-color: var(--text-secondary); }
            .qr-code {
                width: 650px; height: 650px; background: white; border-radius: 40px;
                padding: 40px; margin-bottom: 60px; box-shadow: 0 30px 60px rgba(0,0,0,0.6);
            }
            .qr-code img { width: 100%; height: 100%; object-fit: contain; }
            .qr-text {
                font-family: var(--font-header); font-size: 100px; color: var(--text-primary);
                text-transform: uppercase; font-weight: 900; margin: 0;
                text-shadow: 4px 4px 0 rgba(0,0,0,0.6);
            }
        </style>
    </head>
    <body>
        <div class="flyer-container" id="flyer">
            <div class="quadrant q1">
                <div class="title-3d">Districts<br>After Dark</div>
                <div class="subtitle">A city-wide initiative uniting City Councilmembers and local influencers to support the nightlife and culture that makes New Orleans unique.</div>
            </div>
            <div class="quadrant q2">
                <div class="support-header">Support Our Business</div>
                <div class="business-name-box">[ BUSINESS NAME ]</div>
            </div>
            <div class="quadrant q3">
                <p class="incentive-text">Champion this business or become a local legend by competing to support the most District D businesses!</p>
                <div class="incentive-highlight">Win VIP Access to the Final Stop</div>
            </div>
            <div class="quadrant q4">
                <div class="qr-code"><img src="${qrImageBase64}" alt="QR Code"></div>
                <h3 class="qr-text">Scan to Vote</h3>
            </div>
        </div>
    </body>
    </html>
    `;
    fs.writeFileSync('temp_flyer.html', htmlContent);
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 2550, height: 3300, deviceScaleFactor: 1 });
    await page.goto('file://' + path.resolve(__dirname, 'temp_flyer.html'), { waitUntil: 'networkidle0' });
    const element = await page.$('#flyer');
    await element.screenshot({ path: path.join(__dirname, 'assets', 'flyer_draft.png') });
    await browser.close();
    fs.unlinkSync('temp_flyer.html');
})();