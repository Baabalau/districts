const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:8000/district-b.html', { waitUntil: 'networkidle2' });
    
    console.log("Page loaded. Clicking a vote button...");
    
    // Find a vote button and click it
    await page.evaluate(() => {
        const btn = document.querySelector('.vote-btn-small');
        if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Modal should be open. Clicking submit...");
    
    await page.evaluate(() => {
        const submitBtn = document.querySelector('event-layout').shadowRoot ? 
            document.querySelector('event-layout').shadowRoot.querySelector('#submit-vote-btn') :
            document.querySelector('#submit-vote-btn');
            
        if (submitBtn) {
            submitBtn.click();
        } else {
            console.log("Submit button not found. User might not be logged in.");
            const loginBtn = document.querySelector('event-layout').querySelector('.auth-btn.email');
            console.log("Login btn text:", loginBtn ? loginBtn.innerText : "Not found");
        }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
})();
