import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database';
import { JwtPayload, UserRole } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;

interface RegisterData {
  companyName: string;
  companyEmail?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    companyId: string;
  };
}

/**
 * Service d'authentification pour le serveur local
 */
export class AuthService {
  /**
   * Génère les tokens JWT
   */
  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const payload: JwtPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: `${REFRESH_TOKEN_EXPIRES_IN_DAYS}d`,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Obtient la date d'expiration du refresh token
   */
  private getRefreshTokenExpiration(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);
    return expiration;
  }

  /**
   * Enregistre un nouvel utilisateur (propriétaire)
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const db = getDatabase();

    // Vérifier si l'email existe déjà
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ? AND deletedAt IS NULL')
      .get(data.email);

    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    // Hasher le password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Créer Company et User dans une transaction
    const companyId = randomUUID();
    const userId = randomUUID();
    const now = new Date().toISOString();

    db.transaction(() => {
      // Créer la Company
      db.prepare(
        `INSERT INTO companies (id, name, email, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(companyId, data.companyName, data.companyEmail || null, now, now);

      // Créer l'utilisateur avec role PROPRIETAIRE
      db.prepare(
        `INSERT INTO users (id, email, password, firstName, lastName, phone, role, isActive, companyId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        userId,
        data.email,
        hashedPassword,
        data.firstName,
        data.lastName,
        data.phone || null,
        UserRole.PROPRIETAIRE,
        1,
        companyId,
        now,
        now,
      );
    })();

    // Récupérer l'utilisateur créé
    const user = db
      .prepare('SELECT id, email, firstName, lastName, role, companyId FROM users WHERE id = ?')
      .get(userId) as any;

    // Générer les tokens
    const tokens = this.generateTokens(user);

    // Sauvegarder le refresh token
    const refreshTokenExpiresAt = this.getRefreshTokenExpiration().toISOString();
    db.prepare(
      `UPDATE users SET refreshToken = ?, refreshTokenExpiresAt = ? WHERE id = ?`,
    ).run(tokens.refreshToken, refreshTokenExpiresAt, userId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  /**
   * Connecte un utilisateur
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const db = getDatabase();

    // Trouver l'utilisateur
    const user = db
      .prepare(
        `SELECT id, email, password, firstName, lastName, role, companyId, isActive 
         FROM users 
         WHERE email = ? AND deletedAt IS NULL`,
      )
      .get(data.email) as any;

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new Error('Compte utilisateur désactivé');
    }

    // Vérifier le password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Générer les tokens
    const tokens = this.generateTokens(user);

    // Sauvegarder le refresh token
    const refreshTokenExpiresAt = this.getRefreshTokenExpiration().toISOString();
    db.prepare(
      `UPDATE users SET refreshToken = ?, refreshTokenExpiresAt = ? WHERE id = ?`,
    ).run(tokens.refreshToken, refreshTokenExpiresAt, user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  /**
   * Rafraîchit le token d'accès
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const db = getDatabase();

    try {
      // Vérifier le refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as JwtPayload;

      // Vérifier que le refresh token existe en base
      const user = db
        .prepare(
          `SELECT id, refreshToken, refreshTokenExpiresAt 
           FROM users 
           WHERE id = ? AND refreshToken = ? AND deletedAt IS NULL`,
        )
        .get(decoded.userId, refreshToken) as any;

      if (!user) {
        throw new Error('Refresh token invalide');
      }

      // Vérifier l'expiration
      const expiresAt = new Date(user.refreshTokenExpiresAt);
      if (expiresAt < new Date()) {
        throw new Error('Refresh token expiré');
      }

      // Générer un nouveau access token
      const payload: JwtPayload = {
        userId: decoded.userId,
        companyId: decoded.companyId,
        email: decoded.email,
        role: decoded.role,
      };

      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      return { accessToken };
    } catch (error) {
      throw new Error('Refresh token invalide ou expiré');
    }
  }

  /**
   * Déconnecte un utilisateur
   */
  async logout(userId: string): Promise<void> {
    const db = getDatabase();

    // Supprimer le refresh token
    db.prepare(
      `UPDATE users SET refreshToken = NULL, refreshTokenExpiresAt = NULL WHERE id = ?`,
    ).run(userId);
  }
}
