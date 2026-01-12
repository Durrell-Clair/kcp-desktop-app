import { getDatabase } from '../database';
import { randomUUID } from 'crypto';

interface CreateClientData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  reliabilityScore?: number;
}

interface UpdateClientData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  reliabilityScore?: number;
}

/**
 * Calcule le solde dû (créances) d'un client
 */
function calculateBalance(clientId: string, companyId: string): number {
  const db = getDatabase();

  // Total des ventes complétées
  const salesResult = db
    .prepare(
      `SELECT SUM(totalAmount) as total
       FROM sales
       WHERE clientId = ? AND companyId = ? AND status = 'COMPLETED' AND deletedAt IS NULL`
    )
    .get(clientId, companyId) as { total: number | null };

  const totalSales = Number(salesResult.total || 0);

  // Total des paiements
  const paymentsResult = db
    .prepare(
      `SELECT SUM(amount) as total
       FROM payments
       WHERE clientId = ? AND companyId = ? AND deletedAt IS NULL`
    )
    .get(clientId, companyId) as { total: number | null };

  const totalPayments = Number(paymentsResult.total || 0);

  return totalSales - totalPayments;
}

/**
 * Calcule le score de fiabilité d'un client
 */
function calculateReliabilityScore(
  clientId: string,
  companyId: string,
  creditLimit: number,
): number {
  let score = 100;

  const balance = calculateBalance(clientId, companyId);

  // Vérifier dépassement limite crédit
  if (balance > creditLimit) {
    score -= 5;
  }

  // Limiter le score entre 0 et 100
  return Math.max(0, Math.min(100, score));
}

export class ClientsService {
  /**
   * Trouve tous les clients
   */
  findAll(companyId: string, filters?: { search?: string }) {
    const db = getDatabase();

    let query = `
      SELECT *
      FROM clients
      WHERE companyId = ? AND deletedAt IS NULL
    `;
    const params: any[] = [companyId];

    if (filters?.search) {
      query += ' AND (firstName LIKE ? OR lastName LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY lastName ASC, firstName ASC';

    const clients = db.prepare(query).all(...params) as any[];

    return clients.map((client) => {
      const balance = calculateBalance(client.id, companyId);
      const reliabilityScore = calculateReliabilityScore(
        client.id,
        companyId,
        Number(client.creditLimit),
      );

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        email: client.email || undefined,
        address: client.address || undefined,
        creditLimit: Number(client.creditLimit),
        reliabilityScore,
        balance,
        companyId: client.companyId,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      };
    });
  }

  /**
   * Trouve un client par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();

    const client = db
      .prepare(
        'SELECT * FROM clients WHERE id = ? AND companyId = ? AND deletedAt IS NULL'
      )
      .get(id, companyId) as any;

    if (!client) {
      throw new Error('Client non trouvé');
    }

    const balance = calculateBalance(id, companyId);
    const reliabilityScore = calculateReliabilityScore(
      id,
      companyId,
      Number(client.creditLimit),
    );

    return {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email || undefined,
      address: client.address || undefined,
      creditLimit: Number(client.creditLimit),
      reliabilityScore,
      balance,
      companyId: client.companyId,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  /**
   * Crée un client
   */
  create(data: CreateClientData, companyId: string) {
    const db = getDatabase();

    // Vérifier unicité du téléphone dans la company
    const existing = db
      .prepare(
        'SELECT id FROM clients WHERE phone = ? AND companyId = ? AND deletedAt IS NULL'
      )
      .get(data.phone, companyId);

    if (existing) {
      throw new Error('Un client avec ce numéro de téléphone existe déjà');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO clients (
        id, firstName, lastName, phone, email, address,
        creditLimit, reliabilityScore, companyId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.firstName,
      data.lastName,
      data.phone,
      data.email || null,
      data.address || null,
      data.creditLimit || 0,
      data.reliabilityScore || 100,
      companyId,
      now,
      now,
    );

    return this.findOne(id, companyId);
  }

  /**
   * Met à jour un client
   */
  update(id: string, data: UpdateClientData, companyId: string) {
    const db = getDatabase();

    // Vérifier que le client existe
    const existing = db
      .prepare('SELECT id FROM clients WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId);

    if (!existing) {
      throw new Error('Client non trouvé');
    }

    // Vérifier unicité du téléphone si modifié
    if (data.phone) {
      const existingPhone = db
        .prepare(
          'SELECT id FROM clients WHERE phone = ? AND companyId = ? AND id != ? AND deletedAt IS NULL'
        )
        .get(data.phone, companyId, id);

      if (existingPhone) {
        throw new Error('Un client avec ce numéro de téléphone existe déjà');
      }
    }

    // Construire la requête de mise à jour
    const updates: string[] = [];
    const values: any[] = [];

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
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email || null);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address || null);
    }
    if (data.creditLimit !== undefined) {
      updates.push('creditLimit = ?');
      values.push(data.creditLimit);
    }
    if (data.reliabilityScore !== undefined) {
      updates.push('reliabilityScore = ?');
      values.push(data.reliabilityScore);
    }

    if (updates.length === 0) {
      return this.findOne(id, companyId);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, companyId);

    db.prepare(
      `UPDATE clients SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`
    ).run(...values);

    return this.findOne(id, companyId);
  }

  /**
   * Supprime un client (soft delete)
   */
  remove(id: string, companyId: string): void {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT id FROM clients WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId);

    if (!existing) {
      throw new Error('Client non trouvé');
    }

    db.prepare(
      'UPDATE clients SET deletedAt = ? WHERE id = ? AND companyId = ?'
    ).run(new Date().toISOString(), id, companyId);
  }

  /**
   * Obtient l'ancienneté des créances par tranches
   */
  getReceivablesByAge(clientId: string, companyId: string) {
    const db = getDatabase();

    // Vérifier que le client existe
    const client = db
      .prepare('SELECT id FROM clients WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(clientId, companyId);

    if (!client) {
      throw new Error('Client non trouvé');
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Récupérer toutes les ventes complétées avec leurs paiements
    const sales = db
      .prepare(
        `SELECT s.id, s.totalAmount, s.createdAt,
         (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE saleId = s.id AND deletedAt IS NULL) as totalPaid
         FROM sales s
         WHERE s.clientId = ? AND s.companyId = ? AND s.status = 'COMPLETED' AND s.deletedAt IS NULL
         ORDER BY s.createdAt DESC`
      )
      .all(clientId, companyId) as any[];

    const result = {
      '0-30': { amount: 0, count: 0 },
      '30-60': { amount: 0, count: 0 },
      '60-90': { amount: 0, count: 0 },
      '90+': { amount: 0, count: 0 },
      total: { amount: 0, count: 0 },
    };

    for (const sale of sales) {
      const totalPaid = Number(sale.totalPaid || 0);
      const remainingAmount = Number(sale.totalAmount) - totalPaid;

      if (remainingAmount <= 0) continue;

      const saleDate = new Date(sale.createdAt);
      const daysOld = Math.floor((now.getTime() - saleDate.getTime()) / (24 * 60 * 60 * 1000));

      if (daysOld <= 30) {
        result['0-30'].amount += remainingAmount;
        result['0-30'].count += 1;
      } else if (daysOld <= 60) {
        result['30-60'].amount += remainingAmount;
        result['30-60'].count += 1;
      } else if (daysOld <= 90) {
        result['60-90'].amount += remainingAmount;
        result['60-90'].count += 1;
      } else {
        result['90+'].amount += remainingAmount;
        result['90+'].count += 1;
      }

      result.total.amount += remainingAmount;
      result.total.count += 1;
    }

    return result;
  }
}
