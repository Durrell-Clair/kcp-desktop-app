import { getDatabase } from '../database';
import { randomUUID } from 'crypto';
import { UserRole } from '../../shared/types';

type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface CreateExpenseData {
  amount: number;
  description: string;
  categoryId: string;
  expenseDate?: string;
  receiptUrl?: string;
}

interface UpdateExpenseData {
  amount?: number;
  description?: string;
  categoryId?: string;
  expenseDate?: string;
  receiptUrl?: string;
}

export class ExpensesService {
  /**
   * Trouve toutes les dépenses
   */
  findAll(
    companyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      status?: string;
      createdById?: string;
    },
  ) {
    const db = getDatabase();

    let query = `
      SELECT e.*,
             ec.name as categoryName,
             u1.firstName || ' ' || u1.lastName as createdByName,
             u2.firstName || ' ' || u2.lastName as approvedByName
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.categoryId = ec.id
      LEFT JOIN users u1 ON e.createdById = u1.id
      LEFT JOIN users u2 ON e.approvedById = u2.id
      WHERE e.companyId = ? AND e.deletedAt IS NULL
    `;
    const params: any[] = [companyId];

    if (filters?.startDate) {
      query += ' AND e.expenseDate >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query += ' AND e.expenseDate <= ?';
      params.push(endDate.toISOString());
    }

    if (filters?.categoryId) {
      query += ' AND e.categoryId = ?';
      params.push(filters.categoryId);
    }

    if (filters?.status) {
      query += ' AND e.status = ?';
      params.push(filters.status);
    }

    if (filters?.createdById) {
      query += ' AND e.createdById = ?';
      params.push(filters.createdById);
    }

    query += ' ORDER BY e.expenseDate DESC';

    const expenses = db.prepare(query).all(...params) as any[];

    return expenses.map((expense) => ({
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      receiptUrl: expense.receiptUrl || undefined,
      status: expense.status,
      expenseDate: expense.expenseDate,
      companyId: expense.companyId,
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      createdById: expense.createdById,
      createdByName: expense.createdByName,
      approvedById: expense.approvedById || undefined,
      approvedByName: expense.approvedByName || undefined,
      approvedAt: expense.approvedAt || undefined,
      rejectedReason: expense.rejectedReason || undefined,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    }));
  }

  /**
   * Trouve une dépense par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();

    const expense = db
      .prepare(
        `SELECT e.*,
                ec.name as categoryName,
                u1.firstName || ' ' || u1.lastName as createdByName,
                u2.firstName || ' ' || u2.lastName as approvedByName
         FROM expenses e
         LEFT JOIN expense_categories ec ON e.categoryId = ec.id
         LEFT JOIN users u1 ON e.createdById = u1.id
         LEFT JOIN users u2 ON e.approvedById = u2.id
         WHERE e.id = ? AND e.companyId = ? AND e.deletedAt IS NULL`
      )
      .get(id, companyId) as any;

    if (!expense) {
      throw new Error('Dépense non trouvée');
    }

    return {
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      receiptUrl: expense.receiptUrl || undefined,
      status: expense.status,
      expenseDate: expense.expenseDate,
      companyId: expense.companyId,
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      createdById: expense.createdById,
      createdByName: expense.createdByName,
      approvedById: expense.approvedById || undefined,
      approvedByName: expense.approvedByName || undefined,
      approvedAt: expense.approvedAt || undefined,
      rejectedReason: expense.rejectedReason || undefined,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  /**
   * Crée une dépense
   */
  create(data: CreateExpenseData, companyId: string, userId: string) {
    const db = getDatabase();

    // Vérifier que la catégorie existe
    const category = db
      .prepare('SELECT id FROM expense_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(data.categoryId, companyId);

    if (!category) {
      throw new Error('Catégorie non trouvée');
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const expenseDate = data.expenseDate ? new Date(data.expenseDate).toISOString() : now;

    db.prepare(
      `INSERT INTO expenses (
        id, amount, description, receiptUrl, expenseDate, status, categoryId, createdById, companyId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.amount,
      data.description,
      data.receiptUrl || null,
      expenseDate,
      'PENDING',
      data.categoryId,
      userId,
      companyId,
      now,
      now,
    );

    return this.findOne(id, companyId);
  }

  /**
   * Met à jour une dépense
   */
  update(
    id: string,
    data: UpdateExpenseData,
    companyId: string,
    userId: string,
    userRole: UserRole,
  ) {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Dépense non trouvée');
    }

    // Seul le créateur peut modifier une dépense en attente
    if (existing.status === 'PENDING' && existing.createdById !== userId) {
      throw new Error('Vous ne pouvez modifier que vos propres dépenses en attente');
    }

    // Si la dépense est approuvée, seul PROPRIETAIRE/MANAGER peut modifier
    if (existing.status === 'APPROVED') {
      if (userRole !== UserRole.PROPRIETAIRE && userRole !== UserRole.MANAGER) {
        throw new Error('Impossible de modifier une dépense approuvée');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.amount !== undefined) {
      updates.push('amount = ?');
      values.push(data.amount);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.categoryId !== undefined) {
      // Vérifier que la catégorie existe
      const category = db
        .prepare('SELECT id FROM expense_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
        .get(data.categoryId, companyId);
      if (!category) {
        throw new Error('Catégorie non trouvée');
      }
      updates.push('categoryId = ?');
      values.push(data.categoryId);
    }
    if (data.expenseDate !== undefined) {
      updates.push('expenseDate = ?');
      values.push(new Date(data.expenseDate).toISOString());
    }
    if (data.receiptUrl !== undefined) {
      updates.push('receiptUrl = ?');
      values.push(data.receiptUrl || null);
    }

    if (updates.length === 0) {
      return this.findOne(id, companyId);
    }

    // Si la dépense était approuvée et qu'on la modifie, repasser en PENDING
    if (existing.status === 'APPROVED') {
      updates.push('status = ?');
      values.push('PENDING');
      updates.push('approvedById = ?');
      values.push(null);
      updates.push('approvedAt = ?');
      values.push(null);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, companyId);

    db.prepare(
      `UPDATE expenses SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`
    ).run(...values);

    return this.findOne(id, companyId);
  }

  /**
   * Approuve une dépense
   */
  approve(id: string, companyId: string, userId: string, userRole: UserRole) {
    const db = getDatabase();

    // Vérifier permissions
    if (userRole !== UserRole.PROPRIETAIRE && userRole !== UserRole.MANAGER) {
      throw new Error('Vous n\'avez pas les permissions nécessaires pour approuver une dépense');
    }

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Dépense non trouvée');
    }

    if (existing.status !== 'PENDING') {
      throw new Error('Seules les dépenses en attente peuvent être approuvées');
    }

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE expenses 
       SET status = ?, approvedById = ?, approvedAt = ?, updatedAt = ?
       WHERE id = ? AND companyId = ?`
    ).run('APPROVED', userId, now, now, id, companyId);

    return this.findOne(id, companyId);
  }

  /**
   * Rejette une dépense
   */
  reject(
    id: string,
    companyId: string,
    userId: string,
    userRole: UserRole,
    reason: string,
  ) {
    const db = getDatabase();

    // Vérifier permissions
    if (userRole !== UserRole.PROPRIETAIRE && userRole !== UserRole.MANAGER) {
      throw new Error('Vous n\'avez pas les permissions nécessaires pour rejeter une dépense');
    }

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Dépense non trouvée');
    }

    if (existing.status !== 'PENDING') {
      throw new Error('Seules les dépenses en attente peuvent être rejetées');
    }

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE expenses 
       SET status = ?, rejectedReason = ?, updatedAt = ?
       WHERE id = ? AND companyId = ?`
    ).run('REJECTED', reason, now, id, companyId);

    return this.findOne(id, companyId);
  }

  /**
   * Supprime une dépense (soft delete)
   */
  remove(id: string, companyId: string, userId: string): void {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Dépense non trouvée');
    }

    // Seul le créateur peut supprimer
    if (existing.createdById !== userId) {
      throw new Error('Vous ne pouvez supprimer que vos propres dépenses');
    }

    // Ne pas permettre suppression si approuvée
    if (existing.status === 'APPROVED') {
      throw new Error('Impossible de supprimer une dépense approuvée');
    }

    db.prepare(
      'UPDATE expenses SET deletedAt = ? WHERE id = ? AND companyId = ?'
    ).run(new Date().toISOString(), id, companyId);
  }
}
