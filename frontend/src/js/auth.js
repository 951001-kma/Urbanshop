class AuthManager {
    constructor() {
        this.apiBaseUrl = '/api';
        this.init();
    }

    init() {
        if (this.isLoggedIn()) {
            if (this.isLoginPage()) {
                this.redirectToDashboard();
            }
            return;
        }

        if (this.isProtectedPage() && !this.isLoginPage()) {
            this.redirectToLogin();
            return;
        }

        this.setupEventListeners();
    }

    isLoginPage() {
        return window.location.pathname.includes('index.html') || 
               window.location.pathname === '/' ||
               window.location.pathname.endsWith('/');
    }

    isProtectedPage() {
        const protectedPages = [
            'dashboard.html',
            'inventory.html', 
            'users.html',
            'reports.html'
        ];
        
        return protectedPages.some(page => 
            window.location.pathname.includes(page)
        );
    }

    redirectToLogin() {
        if (this.isLoginPage()) return;
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 100);
    }

    redirectToDashboard() {
        if (window.location.pathname.includes('dashboard.html')) return;
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 100);
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        this.setupLogoutListener();
    }

    setupLogoutListener() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        const logoutLink = document.querySelector('a[onclick*="logout"]');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    async handleLogin(e) {
        if (e) e.preventDefault();
        
        if (this.isLoggedIn()) {
            this.redirectToDashboard();
            return;
        }

        const formData = new FormData(e.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        if (!loginData.email || !loginData.password) {
            this.showMessage('Por favor, completa todos los campos', 'error');
            return;
        }

        try {
            this.showMessage('Iniciando sesión...', 'info');
            const user = await this.authenticate(loginData);
            this.setSession(user);
            this.showMessage('¡Login exitoso! Redirigiendo...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            this.showMessage('Error de autenticación: ' + error.message, 'error');
        }
    }

    async authenticate(loginData) {
        const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Credenciales incorrectas');
            } else if (response.status === 404) {
                throw new Error('Servicio no disponible');
            } else {
                throw new Error('Error del servidor: ' + response.status);
            }
        }

        return await response.json();
    }

    setSession(user) {
        if (!user || !user.token) {
            throw new Error('Datos de usuario incompletos');
        }

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', user.token);
    }

    isLoggedIn() {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const token = localStorage.getItem('token');
        const hasValidToken = token && token.length > 10;
        
        return loggedIn && hasValidToken;
    }

    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : {};
        } catch (error) {
            console.error('Error parseando usuario:', error);
            return {};
        }
    }

    getToken() {
        const token = localStorage.getItem('token');
        return token || '';
    }

    requireAuth() {
        if (!this.isLoggedIn()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    handleLogout() {
        if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            return;
        }
        
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('token');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('loginMessage');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }, 5000);
        }
    }

    checkPageAccess(allowedRoles = []) {
        if (!this.isLoggedIn()) {
            this.redirectToLogin();
            return false;
        }

        const user = this.getCurrentUser();
        
        if (!user) {
            this.redirectToLogin();
            return false;
        }

        const userRole = (user.role || user.user?.role || 'usuario').toLowerCase();
        
        if (!allowedRoles || allowedRoles.length === 0) {
            return true;
        }

        const allowedRolesLower = allowedRoles.map(role => role.toLowerCase());
        
        if (!allowedRolesLower.includes(userRole)) {
            this.showMessage('No tienes permisos para acceder a esta página', 'error');
            this.redirectToDashboard();
            return false;
        }

        return true;
    }

    getAllowedRolesForPage(page) {
        const rolePermissions = {
            'dashboard.html': ['admin', 'supervisor', 'vendedor', 'usuario'],
            'inventory.html': ['admin', 'supervisor', 'vendedor'],
            'users.html': ['admin'],
            'reports.html': ['admin', 'supervisor'],
            'index.html': ['admin', 'supervisor', 'vendedor', 'usuario']
        };

        return rolePermissions[page] || ['admin'];
    }

    validatePageAccess() {
        const currentPage = this.getCurrentPage();
        const allowedRoles = this.getAllowedRolesForPage(currentPage);
        return this.checkPageAccess(allowedRoles);
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf('/') + 1);
        return page || 'index.html';
    }

    filterMenuByRole() {
        try {
            const user = this.getCurrentUser();
            if (!user) return;

            const userRole = (user.role || user.user?.role || 'usuario').toLowerCase();
            const menuItems = document.querySelectorAll('.menu-item');
            let hasVisibleItems = false;
            
            menuItems.forEach(item => {
                const requiredRolesAttr = item.getAttribute('data-required-role');
                
                if (!requiredRolesAttr) {
                    item.style.display = 'block';
                    hasVisibleItems = true;
                    return;
                }
                
                const requiredRoles = requiredRolesAttr.split(',').map(role => role.trim().toLowerCase());
                
                if (!requiredRoles.includes(userRole)) {
                    item.style.display = 'none';
                    
                    if (item.classList.contains('active')) {
                        item.classList.remove('active');
                    }
                } else {
                    item.style.display = 'block';
                    hasVisibleItems = true;
                }
            });

            if (!hasVisibleItems) {
                const dashboardItem = document.querySelector('a[href="dashboard.html"]');
                if (dashboardItem) {
                    dashboardItem.style.display = 'block';
                    dashboardItem.classList.add('active');
                }
            }

        } catch (error) {
            console.error('Error en filterMenuByRole:', error);
        }
    }

    initializePageSecurity() {
        const hasAccess = this.validatePageAccess();
        
        if (hasAccess) {
            this.filterMenuByRole();
        }
        
        return hasAccess;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});