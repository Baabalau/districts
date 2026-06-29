class SiteFooter extends HTMLElement {
    connectedCallback() {
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
                        <li>
                            <span style="margin-right: 8px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-secondary, #DEBA84);">Questions / Comments:</span>
                            <a href="mailto:nighttime@nola.gov">
                                <span>nighttime@nola.gov</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);
