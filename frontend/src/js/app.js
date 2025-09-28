class Router {
    constructor() {
        this.routes = {
            '/': 'home',
            '/login': 'login',
            '/dashboard': 'dashboard',
            '/inventario': 'inventario',
            '/reportes': 'reportes'
        };
        this.init();
    }

    init() {
        // Manejar cambios de URL
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Manejar clics en links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-link]')) {
                e.preventDefault();
                this.navigateTo(e.target.href);
            }
        });

        this.handleRoute();
    }

    navigateTo(path) {
        history.pushState(null, null, path);
        this.handleRoute();
    }

    async handleRoute() {
        const path = window.location.pathname;
        const route = this.routes[path] || 'notFound';
        
        await this.loadPage(route);
    }

    async loadPage(pageName) {
        const main = document.getElementById('main-content');
        
        try {
            const response = await fetch(`/pages/${pageName}.html`);
            const html = await response.text();
            main.innerHTML = html;
            
            // Cargar JavaScript específico de la página
            this.loadPageScript(pageName);
        } catch (error) {
            main.innerHTML = '<h1>Página no encontrada</h1>';
        }
    }

    loadPageScript(pageName) {
        // Limpiar script anterior
        const oldScript = document.getElementById('page-script');
        if (oldScript) oldScript.remove();

        // Cargar nuevo script
        const script = document.createElement('script');
        script.id = 'page-script';
        script.src = `/js/${pageName}.js`;
        document.body.appendChild(script);
    }
}