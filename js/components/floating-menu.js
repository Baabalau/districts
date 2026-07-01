class FloatingMenu extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <button type="button" class="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="floatingMenuOverlay">MENU</button>
            <div class="menu-overlay" id="floatingMenuOverlay" role="dialog" aria-modal="true" aria-label="Site navigation">
                <button type="button" class="menu-close" aria-label="Close menu">
                    <svg class="menu-close-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                </button>
                <nav class="menu-links" aria-label="Site navigation">
                    <a href="index.html">Home</a>
                    <a href="index.html#events">Events</a>
                    <a href="promote.html">Your Business</a>
                    <a href="login.html" id="floatingAuthLink">Log In / Sign Up</a>
                </nav>
            </div>
        `;

        this.initMenu();

        if (this.hasAttribute('scroll-trigger')) {
            this.initScrollTrigger();
        } else {
            this.classList.add('is-visible');
        }
    }

    initMenu() {
        const menuToggle = this.querySelector('.menu-toggle');
        const menuClose = this.querySelector('.menu-close');
        const menuOverlay = this.querySelector('.menu-overlay');

        const openMenu = () => {
            menuOverlay.classList.add('active');
            menuToggle.setAttribute('aria-expanded', 'true');
            document.body.classList.add('menu-open');
        };

        const closeMenu = () => {
            menuOverlay.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        };

        menuToggle.addEventListener('click', openMenu);
        menuClose.addEventListener('click', closeMenu);

        // Inject a static hamburger menu for mobile top nav on district pages
        const staticNav = document.querySelector('body > nav');
        if (staticNav && !staticNav.querySelector('.mobile-nav-btn')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mobile-nav-btn';
            btn.setAttribute('aria-label', 'Open menu');
            btn.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--text-primary)" stroke-width="2.5" stroke-linecap="round" fill="none" aria-hidden="true"><path d="M4 12h16M4 6h16M4 18h16"/></svg>';

            const updateBtnVisibility = () => {
                btn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
            };
            window.addEventListener('resize', updateBtnVisibility);
            updateBtnVisibility();

            btn.addEventListener('click', openMenu);
            staticNav.insertBefore(btn, staticNav.firstChild);
        }

        menuOverlay.addEventListener('click', (event) => {
            if (!event.target.closest('.menu-links') && !event.target.closest('.menu-close')) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && menuOverlay.classList.contains('active')) {
                closeMenu();
            }
        });

        this.querySelectorAll('.menu-links a').forEach((link) => {
            link.addEventListener('click', closeMenu);
        });

        this.closeMenu = closeMenu;
    }

    initScrollTrigger() {
        const nav = document.querySelector('body > nav');
        if (!nav) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                this.classList.remove('is-visible');
                this.closeMenu?.();
            } else {
                this.classList.add('is-visible');
            }
        }, { threshold: 0 });

        observer.observe(nav);
    }
}

customElements.define('floating-menu', FloatingMenu);
