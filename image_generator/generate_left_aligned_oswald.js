const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const htmlContent = `<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-primary: #0F1626;
    --text-primary: #CBA052;
    --accent: #8A2F25;
    --brand-red: #4C835C;
  }

  body {
    margin: 0;
    background: transparent;
  }

  .container {
    width: 1400px;
    min-height: 650px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    background: transparent;
    text-align: left;
    padding: 40px 80px;
    box-sizing: border-box;
  }

  .title-3d {
    display: inline-block;
    font-family: 'Oswald', sans-serif;
    font-size: 150px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-primary);
    transform: rotate(-5deg) skewX(-5deg);
    transform-origin: left center;
    text-shadow:
      1px 1px 0px var(--bg-primary),
      2px 2px 0px var(--accent),
      4px 4px 0px var(--accent),
      6px 6px 0px var(--accent),
      8px 8px 0px var(--accent),
      10px 10px 0px var(--brand-red),
      12px 12px 0px var(--brand-red),
      14px 14px 0px var(--brand-red),
      20px 22px 24px rgba(0,0,0,0.45);
    margin-bottom: 20px;
    line-height: 1.1;
    letter-spacing: 4px;
  }

  .subtitle {
    font-family: 'EB Garamond', serif;
    font-style: italic;
    font-size: 38px;
    color: var(--text-primary);
    margin-top: 20px;
    margin-bottom: 25px;
    display: block;
    text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
    max-width: 1200px;
    line-height: 1.4;
  }

  .subtitle-follow {
    display: block;
    margin-top: 15px;
  }
</style>
</head>
<body>
  <div class="container" id="asset">
    <div class="title-3d">DISTRICTS<br>AFTER DARK</div>
    <span class="subtitle">
      <strong>New Orleans City Councilmembers</strong> and <strong>special guests</strong> are teaming up to support our local nightlife and culture.
      <span class="subtitle-follow">Pick where they'll go, participate in a nightlife townhall and make sure you support local nightlife this summer!</span>
    </span>
  </div>
</body>
</html>`;

(async () => {
  const dir = __dirname;
  const htmlPath = path.join(dir, 'temp_left_aligned_oswald.html');
  const outputPath = path.join(dir, '..', 'social_media_assets', 'Social_Asset_Transparent_1_Refined_Oswald_EBGaramond_LeftAligned.png');

  fs.writeFileSync(htmlPath, htmlContent);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 650, deviceScaleFactor: 1 });
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const element = await page.$('#asset');
  await element.screenshot({
    path: outputPath,
    omitBackground: true
  });

  await browser.close();
  fs.unlinkSync(htmlPath);
  console.log('Saved', outputPath);
})();
