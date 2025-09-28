import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true,
        minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
        maxlength: [100, 'El nombre no puede exceder los 100 caracteres']
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingresa un email válido']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    role: {
        type: String,
        required: [true, 'El rol es requerido'],
        enum: {
            values: ['Admin', 'Supervisor', 'Vendedor', 'Usuario'],
            message: 'El rol debe ser: Admin, Supervisor, Vendedor o Usuario'
        },
        default: 'Usuario'
    },
    status: {
        type: String,
        required: [true, 'El estado es requerido'],
        enum: {
            values: ['Activo', 'Inactivo', 'Suspendido'],
            message: 'El estado debe ser: Activo, Inactivo o Suspendido'
        },
        default: 'Activo'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0,
        min: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    profile: {
        phone: {
            type: String,
            trim: true,
            match: [/^[0-9+\-\s()]{10,}$/, 'Por favor ingresa un número de teléfono válido']
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: {
                type: String,
                default: 'Perú'
            }
        },
        avatar: {
            type: String,
            default: null
        }
    },
    preferences: {
        language: {
            type: String,
            default: 'es',
            enum: ['es', 'en']
        },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        },
        theme: {
            type: String,
            default: 'light',
            enum: ['light', 'dark', 'auto']
        }
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            // Excluir password y datos sensibles en las respuestas
            delete ret.password;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    },
    toObject: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.loginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    }
});

// Índices para mejor rendimiento
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'profile.city': 1 });

// Middleware para hash de password
userSchema.pre('save', async function(next) {
    // Solo hashear si el password fue modificado (o es nuevo)
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        // Verificar si la cuenta está bloqueada temporalmente
        if (this.isLocked()) {
            throw new Error('La cuenta está temporalmente bloqueada. Intenta más tarde.');
        }
        
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        
        if (isMatch) {
            // Login exitoso - resetear intentos y actualizar lastLogin
            if (this.loginAttempts > 0 || this.lockUntil) {
                this.loginAttempts = 0;
                this.lockUntil = null;
            }
            this.lastLogin = new Date();
            await this.save();
            return true;
        } else {
            // Login fallido - incrementar intentos
            this.loginAttempts += 1;
            
            // Bloquear después de 5 intentos fallidos por 30 minutos
            if (this.loginAttempts >= 5) {
                this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
            }
            
            await this.save();
            return false;
        }
    } catch (error) {
        throw error;
    }
};

// Verificar si la cuenta está bloqueada
userSchema.methods.isLocked = function() {
    return this.lockUntil && this.lockUntil > new Date();
};

// Método para obtener tiempo restante de bloqueo
userSchema.methods.getLockRemaining = function() {
    if (!this.lockUntil) return 0;
    return Math.round((this.lockUntil - new Date()) / 1000); // segundos
};

// Método para desbloquear cuenta manualmente
userSchema.methods.unlockAccount = function() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    return this.save();
};

// Método estático para buscar por email (case insensitive)
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase().trim() });
};

// Método estático para obtener usuarios por rol
userSchema.statics.findByRole = function(role) {
    return this.find({ role: role, status: 'Activo' });
};

// Método estático para obtener estadísticas
userSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: { 
                    $sum: { $cond: [{ $eq: ['$status', 'Activo'] }, 1, 0] } 
                },
                inactiveUsers: { 
                    $sum: { $cond: [{ $eq: ['$status', 'Inactivo'] }, 1, 0] } 
                },
                suspendedUsers: { 
                    $sum: { $cond: [{ $eq: ['$status', 'Suspendido'] }, 1, 0] } 
                },
                byRole: {
                    $push: {
                        role: '$role',
                        status: '$status'
                    }
                }
            }
        },
        {
            $project: {
                totalUsers: 1,
                activeUsers: 1,
                inactiveUsers: 1,
                suspendedUsers: 1,
                roleDistribution: {
                    $arrayToObject: {
                        $map: {
                            input: ['Admin', 'Supervisor', 'Vendedor', 'Usuario'],
                            as: 'role',
                            in: {
                                k: '$$role',
                                v: {
                                    $size: {
                                        $filter: {
                                            input: '$byRole',
                                            as: 'user',
                                            cond: { $and: [
                                                { $eq: ['$$user.role', '$$role'] },
                                                { $eq: ['$$user.status', 'Activo'] }
                                            ]}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        suspendedUsers: 0,
        roleDistribution: {}
    };
};

// Virtual para nombre completo (si se divide en nombre y apellido)
userSchema.virtual('fullName').get(function() {
    return this.name;
});

// Virtual para verificar si el usuario es administrador
userSchema.virtual('isAdmin').get(function() {
    return this.role === 'Admin';
});

// Virtual para verificar si el usuario está activo
userSchema.virtual('isActive').get(function() {
    return this.status === 'Activo';
});

// Método para obtener información pública del usuario
userSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role,
        status: this.status,
        lastLogin: this.lastLogin,
        profile: this.profile,
        preferences: this.preferences,
        createdAt: this.createdAt,
        isAdmin: this.isAdmin,
        isActive: this.isActive
    };
};

// Middleware para validar que solo los admins pueden crear otros admins
userSchema.pre('save', function(next) {
    // Esta validación debería hacerse a nivel de controlador, pero por seguridad añadimos aquí también
    if (this.role === 'Admin' && this.isModified('role')) {
        // En un escenario real, aquí verificaríamos el usuario que está haciendo la modificación
        // Por ahora, solo registramos para debugging
        console.log(`Usuario ${this.email} asignado como Admin`);
    }
    next();
});

// Método para cambiar contraseña con validación
userSchema.methods.changePassword = async function(oldPassword, newPassword) {
    // Verificar contraseña actual
    const isCurrentPasswordValid = await this.comparePassword(oldPassword);
    if (!isCurrentPasswordValid) {
        throw new Error('La contraseña actual es incorrecta');
    }
    
    // Validar nueva contraseña
    if (newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }
    
    // Cambiar contraseña
    this.password = newPassword;
    return this.save();
};

export default mongoose.model('User', userSchema);