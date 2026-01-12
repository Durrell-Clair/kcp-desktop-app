import { getDatabase } from '../database';
import { randomUUID } from 'crypto';

type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'CREDIT';

interface CreatePaymentData {
  amount: number;
  paymentMethod: PaymentMethod;
  clientId?: string;
  saleId?: string;
  notes?: string;
}

export class PaymentsService {
  /**
   * Trouve tous les paiements
   */
  findAll(
    companyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      clientId?: string;
      saleId?: string;
    },
  ) {
    const db = getDatabase();

    let query = `
      SELECT p.*,
             c.firstName || ' ' || c.lastName as clientName,
             s.saleNumber,
             u.firstName || ' ' || u.lastName as receivedByName
      FROM payments p
      LEFT JOIN clients c ON p.clientId = c.id
      LEFT JOIN sales s ON p.saleId = s.id
      LEFT JOIN users u ON p.receivedById = u.id
      WHERE p.companyId = ? AND p.deletedAt IS NULL
    `;
    const params: any[] = [companyId];

    if (filters?.startDate) {
      query += ' AND p.createdAt >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query += ' AND p.createdAt <= ?';
      params.push(endDate.toISOString());
    }

    if (filters?.clientId) {
      query += ' AND p.clientId = ?';
      params.push(filters.clientId);
    }

    if (filters?.saleId) {
      query += ' AND p.saleId = ?';
      params.push(filters.saleId);
    }

    query += ' ORDER BY p.createdAt DESC';

    const payments = db.prepare(query).all(...params) as any[];

    return payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || undefined,
      companyId: payment.companyId,
      clientId: payment.clientId || undefined,
      clientName: payment.clientName || undefined,
      saleId: payment.saleId || undefined,
      saleNumber: payment.saleNumber || undefined,
      receivedById: payment.receivedById,
      receivedByName: payment.receivedByName,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));
  }

  /**
   * Trouve un paiement par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();

    const payment = db
      .prepare(
        `SELECT p.*,
                c.firstName || ' ' || c.lastName as clientName,
                s.saleNumber,
                u.firstName || ' ' || u.lastName as receivedByName
         FROM payments p
         LEFT JOIN clients c ON p.clientId = c.id
         LEFT JOIN sales s ON p.saleId = s.id
         LEFT JOIN users u ON p.receivedById = u.id
         WHERE p.id = ? AND p.companyId = ? AND p.deletedAt IS NULL`
      )
      .get(id, companyId) as any;

    if (!payment) {
      throw new Error('Paiement non trouvé');
    }

    return {
      id: payment.id,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || undefined,
      companyId: payment.companyId,
      clientId: payment.clientId || undefined,
      clientName: payment.clientName || undefined,
      saleId: payment.saleId || undefined,
      saleNumber: payment.saleNumber || undefined,
      receivedById: payment.receivedById,
      receivedByName: payment.receivedByName,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Crée un paiement
   */
  create(data: CreatePaymentData, companyId: string, userId: string) {
    const db = getDatabase();

    // Vérifier que l'utilisateur existe
    const user = db
      .prepare('SELECT id FROM users WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(userId, companyId);

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier que le client existe si fourni
    if (data.clientId) {
      const client = db
        .prepare('SELECT id FROM clients WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
        .get(data.clientId, companyId);

      if (!client) {
        throw new Error('Client non trouvé');
      }
    }

    // Vérifier que la vente existe si fournie
    if (data.saleId) {
      const sale = db
        .prepare('SELECT id FROM sales WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
        .get(data.saleId, companyId);

      if (!sale) {
        throw new Error('Vente non trouvée');
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO payments (
        id, amount, paymentMethod, notes, clientId, saleId, receivedById, companyId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.amount,
      data.paymentMethod,
      data.notes || null,
      data.clientId || null,
      data.saleId || null,
      userId,
      companyId,
      now,
      now,
    );

    return this.findOne(id, companyId);
  }

  /**
   * Supprime un paiement (soft delete)
   */
  remove(id: string, companyId: string): void {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT id FROM payments WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId);

    if (!existing) {
      throw new Error('Paiement non trouvé');
    }

    db.prepare(
      'UPDATE payments SET deletedAt = ? WHERE id = ? AND companyId = ?'
    ).run(new Date().toISOString(), id, companyId);
  }
}
