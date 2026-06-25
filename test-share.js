const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:8000/district-b.html', { waitUntil: 'networkidle2' });
    
    console.log("Page loaded. Triggering showShareScreen...");
    
    await page.evaluate(() => {
        const layout = document.querySelector('event-layout');
        // Mock the modal dataset
        const modal = layout.querySelector('#vote-modal');
        modal.dataset.venueName = "TEST VENUE";
        modal.dataset.venueId = "test_123";
        
        // Call showShareScreen
        layout.querySelector('#share-modal').style.display = 'flex';
        window.showShareScreen();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const isVisible = await page.evaluate(() => {
        const shareModal = document.querySelector('event-layout').querySelector('#share-modal');
        return shareModal.style.display !== 'none';
    });
    
    console.log("Share modal visible:", isVisible);
    
    await browser.close();
})();
