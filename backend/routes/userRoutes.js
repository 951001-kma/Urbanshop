import express from 'express';
import User from '../models/User.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - Listar todos los usuarios (sin el /users extra)
router.get('/', authenticateToken, async (req, res) => {
    try {
        console.log('📥 Solicitud GET /api/users recibida');
        
        const users = await User.find().select('-password -loginAttempts -lockUntil');
        
        console.log(`📊 Usuarios encontrados: ${users.length}`);
        
        res.json({
            success: true,
            users,
            count: users.length
        });
    } catch (error) {
        console.error('❌ Error en GET /api/users:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener usuarios: ' + error.message
        });
    }
});

// GET /api/users/:id - Obtener un usuario específico (RUTA FALTANTE)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        console.log('📥 Solicitud GET /api/users/' + req.params.id);
        
        const user = await User.findById(req.params.id)
            .select('-password -loginAttempts -lockUntil');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('❌ Error en GET /api/users/:id:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario inválido'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Error al obtener el usuario: ' + error.message
        });
    }
});

// POST /api/users - Crear nuevo usuario
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('📥 Solicitud POST /api/users:', req.body);
        
        const user = new User(req.body);
        await user.save();
        
        // Excluir password de la respuesta
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            user: userResponse
        });
    } catch (error) {
        console.error('❌ Error en POST /api/users:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'El email ya está registrado'
            });
        }
        
        res.status(400).json({
            success: false,
            error: 'Error al crear usuario: ' + error.message
        });
    }
});

// PUT /api/users/:id - Actualizar usuario (RUTA FALTANTE)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        console.log('📥 Solicitud PUT /api/users/' + req.params.id, req.body);
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { 
                new: true, 
                runValidators: true 
            }
        ).select('-password -loginAttempts -lockUntil');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            user: updatedUser
        });
    } catch (error) {
        console.error('❌ Error en PUT /api/users/:id:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario inválido'
            });
        }
        
        res.status(400).json({
            success: false,
            error: 'Error al actualizar usuario: ' + error.message
        });
    }
});

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        console.log('📥 Solicitud DELETE /api/users/' + req.params.id);
        
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        console.error('❌ Error en DELETE /api/users/:id:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario inválido'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Error al eliminar usuario: ' + error.message
        });
    }
});

export default router;