import { getDatabase } from '../database';
import { randomUUID } from 'crypto';

type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';

interface CreateStockMovementData {
  type: StockMovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  productId: string;
  userId: string;
  saleId?: string;
}

export class StockMovementsService {
  /**
   * Calcule le stock actuel d'un produit
   */
  calculateStock(productId: string, companyId: string): number {
    const db = getDatabase();

    const result = db
      .prepare(
        `SELECT SUM(quantity) as total
         FROM stock_movements
         WHERE productId = ? AND companyId = ?`
      )
      .get(productId, companyId) as { total: number | null };

    return result.total || 0;
  }

  /**
   * Trouve tous les mouvements de stock
   */
  findAll(
    companyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      productId?: string;
      type?: string;
      userId?: string;
    },
  ) {
    const db = getDatabase();

    let query = `
      SELECT sm.*, 
             p.name as productName,
             u.firstName || ' ' || u.lastName as userName,
             s.saleNumber
      FROM stock_movements sm
      LEFT JOIN products p ON sm.productId = p.id
      LEFT JOIN users u ON sm.userId = u.id
      LEFT JOIN sales s ON sm.saleId = s.id
      WHERE sm.companyId = ?
    `;
    const params: any[] = [companyId];

    if (filters?.startDate) {
      query += ' AND sm.createdAt >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query += ' AND sm.createdAt <= ?';
      params.push(endDate.toISOString());
    }

    if (filters?.productId) {
      query += ' AND sm.productId = ?';
      params.push(filters.productId);
    }

    if (filters?.type) {
      query += ' AND sm.type = ?';
      params.push(filters.type);
    }

    if (filters?.userId) {
      query += ' AND sm.userId = ?';
      params.push(filters.userId);
    }

    query += ' ORDER BY sm.createdAt DESC';

    const movements = db.prepare(query).all(...params) as any[];

    return movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason || undefined,
      reference: movement.reference || undefined,
      companyId: movement.companyId,
      productId: movement.productId,
      productName: movement.productName,
      userId: movement.userId,
      userName: movement.userName,
      saleId: movement.saleId || undefined,
      saleNumber: movement.saleNumber || undefined,
      createdAt: movement.createdAt,
    }));
  }

  /**
   * Trouve un mouvement de stock par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();

    const movement = db
      .prepare(
        `SELECT sm.*, 
                p.name as productName,
                u.firstName || ' ' || u.lastName as userName,
                s.saleNumber
         FROM stock_movements sm
         LEFT JOIN products p ON sm.productId = p.id
         LEFT JOIN users u ON sm.userId = u.id
         LEFT JOIN sales s ON sm.saleId = s.id
         WHERE sm.id = ? AND sm.companyId = ?`
      )
      .get(id, companyId) as any;

    if (!movement) {
      throw new Error('Mouvement de stock non trouvé');
    }

    return {
      id: movement.id,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason || undefined,
      reference: movement.reference || undefined,
      companyId: movement.companyId,
      productId: movement.productId,
      productName: movement.productName,
      userId: movement.userId,
      userName: movement.userName,
      saleId: movement.saleId || undefined,
      saleNumber: movement.saleNumber || undefined,
      createdAt: movement.createdAt,
    };
  }

  /**
   * Crée un mouvement de stock
   */
  create(data: CreateStockMovementData, companyId: string) {
    const db = getDatabase();

    // Vérifier que le produit existe
    const product = db
      .prepare('SELECT id FROM products WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(data.productId, companyId);

    if (!product) {
      throw new Error('Produit non trouvé');
    }

    // Vérifier que l'utilisateur existe
    const user = db
      .prepare('SELECT id FROM users WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(data.userId, companyId);

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier le stock disponible pour les sorties
    if (data.type === 'OUT') {
      const currentStock = this.calculateStock(data.productId, companyId);
      if (currentStock < data.quantity) {
        throw new Error('Stock insuffisant');
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO stock_movements (
        id, type, quantity, reason, reference, productId, userId, saleId, companyId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.type,
      data.quantity,
      data.reason || null,
      data.reference || null,
      data.productId,
      data.userId,
      data.saleId || null,
      companyId,
      now,
    );

    return this.findOne(id, companyId);
  }
}
