import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'Token de autenticación requerido' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu-clave-secreta-desarrollo', (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: 'Token inválido o expirado' 
            });
        }
        req.user = user;
        next();
    });
};

export default authenticateToken;