// Inventory Manager para MongoDB
class InventoryManager {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = '';

        // Obtener authManager de forma segura - AGREGAR ESTAS LÍNEAS
        this.authManager = window.authManager;
        if (!this.authManager) {
            // Si no existe, crear instancia
            this.authManager = new AuthManager();
            window.authManager = this.authManager;
        }

        this.init();
    }

    init() {

        // 1. Verificar acceso usando el AuthManager
        if (this.authManager && !this.authManager.validatePageAccess()) {
            return;
        }

        // 2. Filtrar menú según rol
        if (this.authManager) {
            this.authManager.filterMenuByRole();
        } else {
            // Verificación de respaldo por si authManager no está disponible
            if (!this.authManager.isLoggedIn()) {
                window.location.href = 'index.html';
                return;
            }
        }

        // 3. Si pasó todas las validaciones, cargar la página
        this.loadUserInfo();
        this.loadProducts();
        this.setupEventListeners();
        this.setupModal();
    }

    async loadProducts(page = 1, search = '') {
        try {
            this.currentPage = page;
            this.currentFilter = search;
            
            const tbody = document.getElementById('inv-tbody');
            tbody.innerHTML = '<tr><td colspan="7" style="padding:20px; text-align:center; color:#6b7280;">Cargando productos...</td></tr>';

            // Usar la ruta correcta para productos
            const params = new URLSearchParams({
                page: page.toString(),
                limit: this.itemsPerPage.toString(),
                search: search
            });

            const response = await this.fetchData(`/products?${params}`);
            
            this.renderProducts(response.products);
            this.updatePagination(response.total, response.pages);

        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Error al cargar los productos');
            this.renderProducts([]);
        }
    }

    renderProducts(products) {
        const tbody = document.getElementById('inv-tbody');
        
        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding:20px; text-align:center; color:#6b7280;">No se encontraron productos</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr style="${product.stock <= 3 ? 'background:#fef2f2;' : product.stock <= 5 ? 'background:#fffbeb;' : ''}">
                <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
                    <strong style="font-family:monospace; color:#374151;">${product.sku || 'N/A'}</strong>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
                    <div style="font-weight:600;">${product.name}</div>
                    ${product.lowStockAlert ? `<div style="font-size:0.8rem; color:#6b7280;">Alerta: ≤ ${product.lowStockAlert}</div>` : ''}
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
                    <span style="padding:4px 8px; background:#f1f5f9; border-radius:12px; font-size:0.8rem;">
                        ${product.category}
                    </span>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">
                    <strong>S/ ${product.price ? product.price.toFixed(2) : '0.00'}</strong>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
                    <span style="padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:600; 
                        ${product.stock === 0 ? 'background:#ef4444; color:white;' : 
                          product.stock <= 3 ? 'background:#f59e0b; color:white;' : 
                          'background:#10b981; color:white;'}">
                        ${product.stock || 0}
                    </span>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
                    ${this.getStockStatus(product.stock, product.lowStockAlert)}
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
                    <button class="edit-btn" data-id="${product._id}" style="padding:6px 12px; margin:2px; background:#fbbf24; border:none; border-radius:4px; cursor:pointer;">✏️ Editar</button>
                    <button class="delete-btn" data-id="${product._id}" style="padding:6px 12px; margin:2px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">🗑️ Eliminar</button>
                </td>
            </tr>
        `).join('');
    }

    getStockStatus(stock, lowStockAlert = 5) {
        if (stock === 0 || stock === undefined) {
            return '<span style="color:#ef4444; font-weight:600;">AGOTADO</span>';
        } else if (stock <= (lowStockAlert || 5)) {
            return '<span style="color:#f59e0b; font-weight:600;">BAJO STOCK</span>';
        } else {
            return '<span style="color:#10b981; font-weight:600;">DISPONIBLE</span>';
        }
    }

    updatePagination(total, totalPages) {
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        const startItem = ((this.currentPage - 1) * this.itemsPerPage) + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, total);

        pageInfo.textContent = `Mostrando ${startItem}-${endItem} de ${total} productos`;
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
    }

    setupEventListeners() {
        // Botones de paginación
        document.getElementById('prev-page').addEventListener('click', () => {
            this.loadProducts(this.currentPage - 1, this.currentFilter);
        });

        document.getElementById('next-page').addEventListener('click', () => {
            this.loadProducts(this.currentPage + 1, this.currentFilter);
        });

        // Búsqueda en tiempo real
        let searchTimeout;
        document.getElementById('inv-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.loadProducts(1, e.target.value);
            }, 500);
        });

        // Botón nuevo producto
        document.getElementById('btn-new-product').addEventListener('click', () => {
            this.openModal();
        });

        // Botón bajo stock
        document.getElementById('btn-low-stock').addEventListener('click', () => {
            const searchInput = document.getElementById('inv-search');
            searchInput.value = 'low-stock';
            this.loadProducts(1, 'low-stock');
        });

        // Botón exportar
        document.getElementById('export-inventory').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Botón actualizar
        document.getElementById('refreshBtn').addEventListener('click', () => {
            const searchInput = document.getElementById('inv-search');
            searchInput.value = '';
            this.loadProducts(1, '');
        });

        // Botón logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Delegación de eventos para botones dinámicos
        document.getElementById('inv-tbody').addEventListener('click', (e) => {
            const productId = e.target.getAttribute('data-id');
            if (!productId) return;

            if (e.target.classList.contains('edit-btn')) {
                this.editProduct(productId);
            } else if (e.target.classList.contains('delete-btn')) {
                this.deleteProduct(productId);
            }
        });
    }

    setupModal() {
        // Cerrar modal haciendo click fuera
        document.getElementById('modal-product').addEventListener('click', (e) => {
            if (e.target.id === 'modal-product') {
                this.closeModal();
            }
        });

        // Formulario producto
        document.getElementById('form-product').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });
    }

    openModal(product = null) {
        const modal = document.getElementById('modal-product');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('form-product');

        if (product) {
            title.textContent = '✏️ Editar Producto';
            form.querySelector('[name="id"]').value = product._id;
            form.querySelector('[name="sku"]').value = product.sku || '';
            form.querySelector('[name="name"]').value = product.name || '';
            form.querySelector('[name="category"]').value = product.category || '';
            form.querySelector('[name="price"]').value = product.price || '';
            form.querySelector('[name="stock"]').value = product.stock || '';
            form.querySelector('[name="lowStockAlert"]').value = product.lowStockAlert || 5;
        } else {
            title.textContent = '➕ Agregar Producto';
            form.reset();
            form.querySelector('[name="lowStockAlert"]').value = 5;
        }

        modal.style.display = 'flex';
    }

    closeModal() {
        document.getElementById('modal-product').style.display = 'none';
    }

    async editProduct(productId) {
        try {
            const product = await this.fetchData(`/products/${productId}`);
            this.openModal(product);
        } catch (error) {
            this.showError('Error al cargar el producto');
        }
    }

    async saveProduct() {
        try {
            const form = document.getElementById('form-product');
            const formData = new FormData(form);
            
            const productData = {
                sku: formData.get('sku').toUpperCase().trim(),
                name: formData.get('name').trim(),
                category: formData.get('category'),
                price: parseFloat(formData.get('price')) || 0,
                stock: parseInt(formData.get('stock')) || 0,
                lowStockAlert: parseInt(formData.get('lowStockAlert')) || 5
            };

            // Validaciones básicas
            if (!productData.sku || !productData.name || !productData.category) {
                throw new Error('Todos los campos marcados con * son obligatorios');
            }

            const productId = formData.get('id');
            const url = productId ? `/products/${productId}` : '/products';
            const method = productId ? 'PUT' : 'POST';

            const response = await fetch(`${this.apiBaseUrl}${url}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar el producto');
            }

            this.closeModal();
            this.loadProducts(this.currentPage, this.currentFilter);
            this.showMessage('✅ Producto guardado correctamente');

        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al eliminar el producto');
            }

            this.loadProducts(this.currentPage, this.currentFilter);
            this.showMessage('✅ Producto eliminado correctamente');

        } catch (error) {
            this.showError('Error al eliminar el producto: ' + error.message);
        }
    }

    async exportToCSV() {
        try {
            // Implementación básica de exportación
            const response = await this.fetchData('/products?limit=1000');
            const products = response.products || [];
            
            const headers = ['SKU', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado'];
            const csvRows = [headers.join(',')];
            
            products.forEach(product => {
                const row = [
                    `"${product.sku || ''}"`,
                    `"${product.name || ''}"`,
                    `"${product.category || ''}"`,
                    product.price || 0,
                    product.stock || 0,
                    `"${this.getStockStatus(product.stock, product.lowStockAlert).replace(/<[^>]*>/g, '')}"`
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `inventario-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('📊 Inventario exportado correctamente');
            
        } catch (error) {
            this.showError('Error al exportar el inventario');
        }
    }

    // Métodos de utilidad
    async fetchData(endpoint) {
        const token = this.getToken();
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
    }

    getToken() {
        return localStorage.getItem('token') || '';
    }

    loadUserInfo() {
        try {
            if (!this.authManager) return;
            
            const user = this.authManager.getCurrentUser();
            const sessionInfo = document.getElementById('session-info');
            
            if (sessionInfo && user?.user?.email) {
                const userInfo = user.user;
                sessionInfo.innerHTML = `👤 <strong>${userInfo.name || userInfo.email}</strong> 
                    <span style="color:#6b7280">(${userInfo.role || 'Usuario'})</span>`;
            }
        } catch (error) {
            console.error('Error en loadUserInfo:', error);
        }
    }

    handleLogout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('user');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        }
    }

    showMessage(message) {
        // Notificación simple (puedes mejorar con toast)
        alert(message);
    }

    showError(message) {
        this.showMessage('❌ ' + message);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryManager = new InventoryManager();
});