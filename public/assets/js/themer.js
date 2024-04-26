(() => {
    'use strict';

    // The key to use when storing the theme in localStorage
    window.themerKey = window.themerKey || 'theme';

    const params = new URLSearchParams(window.location.search);
    const proxy = new Proxy(params, { get: (params, prop) => params.get(prop) });
    let currentTheme;

    if (proxy.theme) {
        localStorage.setItem(themerKey, proxy.theme);
        currentTheme = proxy.theme;
    } else {
        let defaultTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        currentTheme = localStorage.getItem(themerKey) || defaultTheme;
    }

    // Set the theme on the body element
    document.body.setAttribute('data-bs-theme', currentTheme);

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-theme]').forEach((element) => {
            element.addEventListener('click', (event) => {
                event.preventDefault();

                let theme = element.dataset.theme;

                document.body.setAttribute('data-bs-theme', theme);
                localStorage.setItem(themerKey, theme);

                // Dispatch a custom event to let other scripts know the theme has changed
                document.dispatchEvent(new CustomEvent('theme:changed'));
            });
        });
    });
})();
