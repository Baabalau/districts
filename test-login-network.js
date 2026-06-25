const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('response', response => {
        if (response.status() === 404) {
            console.log('404:', response.url());
        }
    });
    
    await page.goto('http://localhost:8000/login.html', { waitUntil: 'networkidle2' });
    
    await browser.close();
})();
