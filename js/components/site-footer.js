class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.render();
        this.loadPhotoCreditFromPage();
    }

    async loadPhotoCreditFromPage() {
        const district = document.querySelector('event-layout')?.getAttribute('district');
        if (!district) return;

        try {
            const response = await fetch(`data/event-pages/district-${district.toLowerCase()}.json`);
            if (!response.ok) return;
            const data = await response.json();
            if (data.photoCredit) this.setPhotoCredit(data.photoCredit);
        } catch (error) {
            console.error('Error loading footer photo credit:', error);
        }
    }

    setPhotoCredit(credit) {
        this._photoCredit = credit || null;
        this.render();
    }

    renderPhotoCreditSection() {
        const credit = this._photoCredit;
        if (!credit?.name || !credit?.url) return '';

        return `
                                <span class="site-footer-meta-sep" aria-hidden="true">·</span>
                                <span class="site-footer-photo-credit-label">Photo Credit:</span>
                                <a href="${credit.url}" target="_blank" rel="noopener noreferrer">
                                    <span>${credit.name}</span>
                                </a>`;
    }

    render() {
        this.innerHTML = `
            <footer class="site-footer" role="contentinfo">
                <div class="site-footer-inner">
                    <ul class="site-footer-links">
                        <li>
                            <a href="https://nola.gov/night" target="_blank" rel="noopener noreferrer">
                                <img src="assets/primary%20logo%20white%20on%20navy.png" alt="Mayor’s Office of Nighttime Economy Seal" class="footer-seal footer-seal-nighttime">
                                <span>Mayor’s Office of Nighttime Economy</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://council.nola.gov/" target="_blank" rel="noopener noreferrer">
                                <img src="assets/CitySeal_Council.png" alt="New Orleans City Council Seal" class="footer-seal">
                                <span>New Orleans City Council</span>
                            </a>
                        </li>
                        <li class="site-footer-meta">
                            <span class="site-footer-contact-spacer" aria-hidden="true"></span>
                            <div class="site-footer-meta-row">
                                <span class="site-footer-contact-label">Questions / Comments:</span>
                                <a href="mailto:nighttime@nola.gov">
                                    <span>nighttime@nola.gov</span>
                                </a>
                                ${this.renderPhotoCreditSection()}
                            </div>
                        </li>
                    </ul>
                </div>
            </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);
