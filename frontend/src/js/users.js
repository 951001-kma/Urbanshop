// Users Manager para MongoDB
class UsersManager {
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
        this.loadUsers();
        this.setupEventListeners();
        this.setupModal();
    }

    async loadUsers(page = 1, search = '') {
        try {
            this.currentPage = page;
            this.currentFilter = search;
            
            const tbody = document.getElementById('users-tbody');
            tbody.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center; color:#6b7280;">Cargando usuarios...</td></tr>';

            const params = new URLSearchParams({
                page: page.toString(),
                limit: this.itemsPerPage.toString(),
                search: search
            });

            const response = await this.fetchData(`/users?${params}`);
            
            this.renderUsers(response.users);
            this.updateKPIs(response.users);
            this.updatePagination(response.total, response.pages);

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Error al cargar los usuarios');
            this.renderUsers([]);
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('users-tbody');
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center; color:#6b7280;">No se encontraron usuarios</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr style="${user.status === 'Inactivo' ? 'background:#fef2f2;' : ''}">
                <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
                    <div style="font-weight:600;">${user.name}</div>
                    <div style="font-size:0.8rem; color:#6b7280;">ID: ${user._id}</div>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
                    <div style="color:#6b7280;">${user.email}</div>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb;">
                    <span style="padding:4px 8px; background:#f1f5f9; border-radius:12px; font-size:0.8rem;">
                        ${user.role}
                    </span>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
                    ${this.getStatusBadge(user.status)}
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
                    <div style="font-size:0.8rem; color:#6b7280;">
                        ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                    </div>
                </td>
                <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
                    <button class="edit-btn" data-id="${user._id}" 
                            style="padding:6px 12px; margin:2px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                        ✏️ Editar
                    </button>
                    <button class="delete-btn" data-id="${user._id}" 
                            style="padding:6px 12px; margin:2px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">
                        🗑️ Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getStatusBadge(status) {
        if (status === 'Activo') {
            return '<span style="padding:4px 8px; background:#10b981; color:white; border-radius:12px; font-size:0.8rem; font-weight:600;">ACTIVO</span>';
        } else {
            return '<span style="padding:4px 8px; background:#6b7280; color:white; border-radius:12px; font-size:0.8rem; font-weight:600;">INACTIVO</span>';
        }
    }

    updateKPIs(users) {
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.status === 'Activo').length;
        const inactiveUsers = totalUsers - activeUsers;

        document.getElementById('kpi-total-users').textContent = totalUsers;
        document.getElementById('kpi-active-users').textContent = activeUsers;
        document.getElementById('kpi-inactive-users').textContent = inactiveUsers;
    }

    updatePagination(total, totalPages) {
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        const startItem = ((this.currentPage - 1) * this.itemsPerPage) + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, total);

        pageInfo.textContent = `Mostrando ${startItem}-${endItem} de ${total} usuarios`;
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
    }

    setupEventListeners() {
        // Botones de paginación
        document.getElementById('prev-page').addEventListener('click', () => {
            this.loadUsers(this.currentPage - 1, this.currentFilter);
        });

        document.getElementById('next-page').addEventListener('click', () => {
            this.loadUsers(this.currentPage + 1, this.currentFilter);
        });

        // Búsqueda en tiempo real
        let searchTimeout;
        document.getElementById('user-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.loadUsers(1, e.target.value);
            }, 500);
        });

        // Botón nuevo usuario
        document.getElementById('btn-new-user').addEventListener('click', () => {
            this.openModal();
        });

        // Botón exportar
        document.getElementById('export-users').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Botón actualizar lista
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshUsers();
        });

        // Botón logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Delegación de eventos para botones dinámicos
        document.getElementById('users-tbody').addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-id');
            if (!userId) return;

            if (e.target.classList.contains('edit-btn')) {
                this.editUser(userId);
            } else if (e.target.classList.contains('delete-btn')) {
                this.deleteUser(userId);
            }
        });
    }

    // Actualizar lista de usuarios
    refreshUsers() {
        const searchInput = document.getElementById('user-search');
        searchInput.value = '';
        
        // Mostrar estado de carga
        const refreshBtn = document.getElementById('refreshBtn');
        const originalText = refreshBtn.textContent;
        refreshBtn.textContent = '🔄 Actualizando...';
        refreshBtn.disabled = true;

        this.loadUsers(1, '').finally(() => {
            // Restaurar botón después de 1 segundo
            setTimeout(() => {
                refreshBtn.textContent = originalText;
                refreshBtn.disabled = false;
            }, 1000);
        });
    }

    setupModal() {
        // Cerrar modal haciendo click fuera
        document.getElementById('modal-user').addEventListener('click', (e) => {
            if (e.target.id === 'modal-user') {
                this.closeModal();
            }
        });

        // Formulario usuario
        document.getElementById('form-user').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // Mostrar/ocultar campos de contraseña según el modo
        this.togglePasswordFields(true);
    }

    openModal(user = null) {
        const modal = document.getElementById('modal-user');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('form-user');

        if (user) {
            title.textContent = '✏️ Editar Usuario';
            this.populateForm(user);
            
            // En edición, la contraseña no es obligatoria
            this.togglePasswordFields(false);
        } else {
            title.textContent = '➕ Agregar Usuario';
            this.clearForm();
            
            // En creación, la contraseña es obligatoria
            this.togglePasswordFields(true);
        }

        modal.style.display = 'flex';
    }

    // Llenar formulario con datos del usuario
    populateForm(user) {
        const form = document.getElementById('form-user');
        
        form.querySelector('[name="id"]').value = user._id || '';
        form.querySelector('[name="name"]').value = user.name || '';
        form.querySelector('[name="email"]').value = user.email || '';
        form.querySelector('[name="role"]').value = user.role || 'Usuario';
        form.querySelector('[name="status"]').value = user.status || 'Activo';
        
        // Limpiar campos de contraseña en edición
        form.querySelector('[name="password"]').value = '';
        form.querySelector('[name="confirmPassword"]').value = '';

        console.log('📝 Formulario poblado con datos del usuario:', {
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        });
    }

    // Limpiar formulario
    clearForm() {
        const form = document.getElementById('form-user');
        form.reset();
        form.querySelector('[name="status"]').value = 'Activo';
        form.querySelector('[name="role"]').value = '';
    }

    togglePasswordFields(required) {
        const passwordFields = document.getElementById('password-fields');
        const passwordNote = document.getElementById('password-note');
        const passwordInputs = passwordFields.querySelectorAll('input[type="password"]');

        if (required) {
            passwordFields.style.display = 'block';
            passwordNote.style.display = 'none';
            passwordInputs.forEach(input => {
                input.required = true;
                input.disabled = false;
                input.placeholder = 'Mínimo 6 caracteres';
            });
        } else {
            passwordFields.style.display = 'none';
            passwordNote.style.display = 'block';
            passwordInputs.forEach(input => {
                input.required = false;
                input.disabled = true;
                input.placeholder = '';
                input.value = '';
            });
        }
    }

    closeModal() {
        document.getElementById('modal-user').style.display = 'none';
    }

    async editUser(userId) {
        try {
            console.log('🔄 Cargando datos del usuario ID:', userId);
            
            // Mostrar loading en el modal
            this.openModal({ 
                _id: userId, 
                name: 'Cargando...', 
                email: 'cargando@example.com',
                role: 'Usuario',
                status: 'Activo'
            });

            const user = await this.fetchData(`/users/${userId}`);
            console.log('✅ Datos del usuario cargados:', user);
            
            // Cerrar y reabrir el modal con los datos reales
            this.closeModal();
            setTimeout(() => {
                this.openModal(user.user || user);
            }, 100);
            
        } catch (error) {
            console.error('❌ Error al cargar el usuario:', error);
            this.showError('Error al cargar los datos del usuario: ' + error.message);
            
            // Cerrar modal en caso de error
            this.closeModal();
        }
    }

    async saveUser() {
        try {
            const form = document.getElementById('form-user');
            const formData = new FormData(form);
            
            const userData = {
                name: formData.get('name').trim(),
                email: formData.get('email').trim(),
                role: formData.get('role'),
                status: formData.get('status')
            };

            // Validaciones básicas
            if (!userData.name || !userData.email || !userData.role) {
                throw new Error('Todos los campos marcados con * son obligatorios');
            }

            // Solo incluir password si se está creando o cambiando
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            
            if (password && password.length > 0) {
                if (password !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden');
                }
                if (password.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres');
                }
                userData.password = password;
            }

            const userId = formData.get('id');
            const url = userId ? `/users/${userId}` : '/users';
            const method = userId ? 'PUT' : 'POST';

            console.log('💾 Guardando usuario:', { userId, method, userData });

            const response = await fetch(`${this.apiBaseUrl}${url}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar el usuario');
            }

            this.closeModal();
            this.refreshUsers(); // Usar el nuevo método de actualización
            this.showMessage('✅ Usuario guardado correctamente');

        } catch (error) {
            console.error('❌ Error al guardar usuario:', error);
            this.showError(error.message);
        }
    }

    async deleteUser(userId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al eliminar el usuario');
            }

            this.refreshUsers(); // Usar el nuevo método de actualización
            this.showMessage('✅ Usuario eliminado correctamente');

        } catch (error) {
            this.showError('Error al eliminar el usuario: ' + error.message);
        }
    }

    async exportToCSV() {
        try {
            const response = await this.fetchData('/users?limit=1000');
            const users = response.users || [];
            
            const headers = ['Nombre', 'Email', 'Rol', 'Estado', 'Fecha Registro'];
            const csvRows = [headers.join(',')];
            
            users.forEach(user => {
                const row = [
                    `"${user.name || ''}"`,
                    `"${user.email || ''}"`,
                    `"${user.role || ''}"`,
                    `"${user.status || ''}"`,
                    user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : ''
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `usuarios-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('📊 Lista de usuarios exportada correctamente');
            
        } catch (error) {
            this.showError('Error al exportar la lista de usuarios');
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
    window.usersManager = new UsersManager();
});