const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:8000/district-b.html', { waitUntil: 'networkidle2' });
    
    console.log("Page loaded. Executing openVoteModal...");
    
    await page.evaluate(() => {
        try {
            window.openVoteModal('test_id', 'Test Venue');
            console.log("openVoteModal executed successfully");
        } catch (e) {
            console.log("Error executing openVoteModal:", e.message);
        }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    const isVisible = await page.evaluate(() => {
        const modal = document.querySelector('event-layout').querySelector('#vote-modal');
        return modal.style.display !== 'none';
    });
    
    console.log("Vote modal visible:", isVisible);
    
    await browser.close();
})();
