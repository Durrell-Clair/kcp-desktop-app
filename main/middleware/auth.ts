import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware d'authentification JWT
 */
export function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Token d\'authentification manquant' });
      return;
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      
      // Ajouter les informations utilisateur à la requête
      (req as any).user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Token invalide ou expiré' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la vérification du token' });
  }
}

/**
 * Middleware de vérification des rôles
 */
export function rolesMiddleware(allowedRoles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JwtPayload;

    if (!user) {
      res.status(401).json({ message: 'Utilisateur non authentifié' });
      return;
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!rolesArray.includes(user.role)) {
      res.status(403).json({ message: 'Accès refusé : permissions insuffisantes' });
      return;
    }

    next();
  };
}
