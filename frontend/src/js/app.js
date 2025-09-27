class UserManager {
    constructor() {
        this.apiBaseUrl = '/api';
        this.init();
    }

    init() {
        this.loadUsers();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('userForm');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validación básica del password
        if (!userData.password || userData.password.length < 6) {
            this.showError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            await this.createUser(userData);
            e.target.reset();
            this.loadUsers();
        } catch (error) {
            this.showError('Error al crear usuario: ' + error.message);
        }
    }

    async createUser(userData) {
        const response = await fetch(`${this.apiBaseUrl}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error('Error en la creación del usuario');
        }

        return await response.json();
    }

    async loadUsers() {
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '<div class="loading">Cargando usuarios...</div>';

        try {
            const response = await fetch(`${this.apiBaseUrl}/users`);
            if (!response.ok) {
                throw new Error('Error al cargar usuarios');
            }

            const users = await response.json();
            this.renderUsers(users);
        } catch (error) {
            this.showError('Error al cargar usuarios: ' + error.message);
        }
    }

    renderUsers(users) {
        const usersList = document.getElementById('usersList');
        
        if (users.length === 0) {
            usersList.innerHTML = '<div class="loading">No hay usuarios registrados</div>';
            return;
        }

        usersList.innerHTML = users.map(user => `
            <div class="user-card" data-user-id="${user._id}">
                <h3>${user.name}</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Registrado:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                <div class="user-actions">
                    <button class="btn-edit" onclick="userManager.editUser('${user._id}')">Editar</button>
                    <button class="btn-delete" onclick="userManager.deleteUser('${user._id}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    async deleteUser(userId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/users/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar usuario');
            }

            this.loadUsers();
        } catch (error) {
            this.showError('Error al eliminar usuario: ' + error.message);
        }
    }

    async editUser(userId) {
        // Implementar lógica de edición
        alert(`Editar usuario ${userId} - Esta funcionalidad se implementará después`);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        document.querySelector('.container').prepend(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.userManager = new UserManager();
});