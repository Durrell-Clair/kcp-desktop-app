import { getDatabase } from '../database';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { UserRole } from '../../shared/types';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
}

interface UpdateUserData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

export class UsersService {
  /**
   * Trouve tous les utilisateurs
   */
  findAll(companyId: string) {
    const db = getDatabase();

    const users = db
      .prepare(
        `SELECT id, email, firstName, lastName, phone, role, isActive, companyId, createdAt, updatedAt
         FROM users
         WHERE companyId = ? AND deletedAt IS NULL
         ORDER BY createdAt DESC`
      )
      .all(companyId) as any[];

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: Boolean(user.isActive),
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  /**
   * Trouve un utilisateur par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();

    const user = db
      .prepare(
        `SELECT id, email, firstName, lastName, phone, role, isActive, companyId, createdAt, updatedAt
         FROM users
         WHERE id = ? AND companyId = ? AND deletedAt IS NULL`
      )
      .get(id, companyId) as any;

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: Boolean(user.isActive),
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Crée un utilisateur
   */
  async create(
    data: CreateUserData,
    companyId: string,
    currentUserRole: UserRole,
  ) {
    const db = getDatabase();

    // Vérifier permissions
    if (
      currentUserRole !== UserRole.PROPRIETAIRE &&
      currentUserRole !== UserRole.MANAGER
    ) {
      throw new Error(
        'Vous n\'avez pas les permissions nécessaires pour créer un utilisateur',
      );
    }

    // Ne pas permettre création de PROPRIETAIRE
    if (data.role === UserRole.PROPRIETAIRE) {
      throw new Error(
        'Impossible de créer un utilisateur avec le rôle PROPRIETAIRE',
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(data.email);

    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (
        id, email, password, firstName, lastName, phone, role, isActive, companyId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.email,
      hashedPassword,
      data.firstName,
      data.lastName,
      data.phone || null,
      data.role,
      true,
      companyId,
      now,
      now,
    );

    return this.findOne(id, companyId);
  }

  /**
   * Met à jour un utilisateur
   */
  async update(
    id: string,
    data: UpdateUserData,
    companyId: string,
    currentUserRole: UserRole,
  ) {
    const db = getDatabase();

    // Vérifier permissions
    if (
      currentUserRole !== UserRole.PROPRIETAIRE &&
      currentUserRole !== UserRole.MANAGER
    ) {
      throw new Error(
        'Vous n\'avez pas les permissions nécessaires pour modifier un utilisateur',
      );
    }

    // Vérifier que l'utilisateur existe
    const existing = db
      .prepare('SELECT id, role FROM users WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Utilisateur non trouvé');
    }

    // Ne pas permettre modification du rôle PROPRIETAIRE
    if (existing.role === UserRole.PROPRIETAIRE && data.role) {
      throw new Error('Impossible de modifier le rôle d\'un propriétaire');
    }

    // Ne pas permettre de changer le rôle en PROPRIETAIRE
    if (data.role === UserRole.PROPRIETAIRE) {
      throw new Error('Impossible de définir le rôle PROPRIETAIRE');
    }

    // Vérifier unicité de l'email si modifié
    if (data.email && data.email !== existing.email) {
      const emailExists = db
        .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
        .get(data.email, id);

      if (emailExists) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }
    }

    // Construire la requête de mise à jour
    const updates: string[] = [];
    const values: any[] = [];

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.password !== undefined) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }
    if (data.firstName !== undefined) {
      updates.push('firstName = ?');
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push('lastName = ?');
      values.push(data.lastName);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone || null);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.isActive !== undefined) {
      updates.push('isActive = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.findOne(id, companyId);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, companyId);

    db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`
    ).run(...values);

    return this.findOne(id, companyId);
  }

  /**
   * Supprime un utilisateur (soft delete)
   */
  remove(id: string, companyId: string, currentUserRole: UserRole, currentUserId: string): void {
    const db = getDatabase();

    // Vérifier permissions
    if (
      currentUserRole !== UserRole.PROPRIETAIRE &&
      currentUserRole !== UserRole.MANAGER
    ) {
      throw new Error(
        'Vous n\'avez pas les permissions nécessaires pour supprimer un utilisateur',
      );
    }

    // Vérifier que l'utilisateur existe
    const existing = db
      .prepare('SELECT id, role FROM users WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Utilisateur non trouvé');
    }

    // Ne pas permettre suppression du propriétaire
    if (existing.role === UserRole.PROPRIETAIRE) {
      throw new Error('Impossible de supprimer le propriétaire de l\'entreprise');
    }

    // Ne pas permettre auto-suppression
    if (id === currentUserId) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte');
    }

    db.prepare(
      'UPDATE users SET deletedAt = ? WHERE id = ? AND companyId = ?'
    ).run(new Date().toISOString(), id, companyId);
  }
}
