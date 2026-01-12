import { getDatabase } from '../database';
import { randomUUID } from 'crypto';
import { StockMovementsService } from './stock-movements.service';

type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'CREDIT';
type SaleStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface CreateSaleData {
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  clientId?: string;
  notes?: string;
}

/**
 * Calcule le stock actuel d'un produit
 */
function calculateStock(productId: string, companyId: string): number {
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
 * Génère un numéro de vente unique
 */
function generateSaleNumber(companyId: string): string {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `VENTE-${today}`;

  const count = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM sales
       WHERE companyId = ? AND saleNumber LIKE ? AND deletedAt IS NULL`
    )
    .get(companyId, `${prefix}%`) as { count: number };

  const sequence = String(count.count + 1).padStart(3, '0');
  return `${prefix}-${sequence}`;
}

/**
 * Calcule le total d'une vente
 */
function calculateTotal(items: SaleItem[]): number {
  return items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );
}

export class SalesService {
  private stockMovementsService: StockMovementsService;

  constructor() {
    this.stockMovementsService = new StockMovementsService();
  }

  /**
   * Trouve toutes les ventes
   */
  findAll(
    companyId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      clientId?: string;
      paymentMethod?: string;
    },
  ) {
    const db = getDatabase();

    let query = `
      SELECT s.*, 
             c.firstName || ' ' || c.lastName as clientName,
             u.firstName || ' ' || u.lastName as userName
      FROM sales s
      LEFT JOIN clients c ON s.clientId = c.id
      LEFT JOIN users u ON s.createdById = u.id
      WHERE s.companyId = ? AND s.deletedAt IS NULL
    `;
    const params: any[] = [companyId];

    if (filters?.startDate) {
      query += ' AND s.createdAt >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query += ' AND s.createdAt <= ?';
      params.push(endDate.toISOString());
    }

    if (filters?.clientId) {
      query += ' AND s.clientId = ?';
      params.push(filters.clientId);
    }

    if (filters?.paymentMethod) {
      query += ' AND s.paymentMethod = ?';
      params.push(filters.paymentMethod);
    }

    query += ' ORDER BY s.createdAt DESC';

    const sales = db.prepare(query).all(...params) as any[];

    // Récupérer les items pour chaque vente
    return sales.map((sale) => {
      const items = db
        .prepare(
          `SELECT si.*, p.name as productName
           FROM sale_items si
           LEFT JOIN products p ON si.productId = p.id
           WHERE si.saleId = ?
           ORDER BY si.createdAt ASC`
        )
        .all(sale.id) as any[];

      return {
        id: sale.id,
        saleNumber: sale.saleNumber,
        status: sale.status,
        totalAmount: Number(sale.totalAmount),
        paymentMethod: sale.paymentMethod,
        clientId: sale.clientId || undefined,
        clientName: sale.clientName || undefined,
        userId: sale.createdById,
        userName: sale.userName,
        notes: sale.notes || undefined,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
        companyId: sale.companyId,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
      };
    });
  }

  /**
   * Trouve une vente par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();

    const sale = db
      .prepare(
        `SELECT s.*, 
                c.firstName || ' ' || c.lastName as clientName,
                u.firstName || ' ' || u.lastName as userName
         FROM sales s
         LEFT JOIN clients c ON s.clientId = c.id
         LEFT JOIN users u ON s.createdById = u.id
         WHERE s.id = ? AND s.companyId = ? AND s.deletedAt IS NULL`
      )
      .get(id, companyId) as any;

    if (!sale) {
      throw new Error('Vente non trouvée');
    }

    const items = db
      .prepare(
        `SELECT si.*, p.name as productName
         FROM sale_items si
         LEFT JOIN products p ON si.productId = p.id
         WHERE si.saleId = ?
         ORDER BY si.createdAt ASC`
      )
      .all(id) as any[];

    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      status: sale.status,
      totalAmount: Number(sale.totalAmount),
      paymentMethod: sale.paymentMethod,
      clientId: sale.clientId || undefined,
      clientName: sale.clientName || undefined,
      userId: sale.createdById,
      userName: sale.userName,
      notes: sale.notes || undefined,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      companyId: sale.companyId,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };
  }

  /**
   * Crée une vente
   */
  create(data: CreateSaleData, userId: string, companyId: string) {
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

    // Vérifier le stock disponible pour tous les produits
    for (const item of data.items) {
      const currentStock = calculateStock(item.productId, companyId);
      if (currentStock < item.quantity) {
        const product = db
          .prepare('SELECT name FROM products WHERE id = ?')
          .get(item.productId) as any;
        throw new Error(`Stock insuffisant pour ${product?.name || 'le produit'}`);
      }

      // Vérifier que le produit existe
      const product = db
        .prepare('SELECT id FROM products WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
        .get(item.productId, companyId);

      if (!product) {
        throw new Error('Produit non trouvé');
      }
    }

    const id = randomUUID();
    const saleNumber = generateSaleNumber(companyId);
    const totalAmount = calculateTotal(data.items);
    const now = new Date().toISOString();

    // Créer la vente
    db.prepare(
      `INSERT INTO sales (
        id, saleNumber, status, totalAmount, paymentMethod, clientId, createdById, notes, companyId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      saleNumber,
      'COMPLETED',
      totalAmount,
      data.paymentMethod,
      data.clientId || null,
      userId,
      data.notes || null,
      companyId,
      now,
      now,
    );

    // Créer les items de vente
    for (const item of data.items) {
      const itemId = randomUUID();
      const totalPrice = item.quantity * item.unitPrice;
      db.prepare(
        `INSERT INTO sale_items (
          id, saleId, productId, quantity, unitPrice, totalPrice, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(itemId, id, item.productId, item.quantity, item.unitPrice, totalPrice, now);

      // Créer le mouvement de stock (sortie)
      this.stockMovementsService.create(
        {
          type: 'OUT',
          quantity: item.quantity,
          reason: 'Vente',
          reference: saleNumber,
          productId: item.productId,
          userId,
          saleId: id,
        },
        companyId,
      );
    }

    return this.findOne(id, companyId);
  }

  /**
   * Annule une vente
   */
  cancel(id: string, userId: string, companyId: string) {
    const db = getDatabase();

    const sale = db
      .prepare('SELECT * FROM sales WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!sale) {
      throw new Error('Vente non trouvée');
    }

    if (sale.status === 'CANCELLED') {
      throw new Error('La vente est déjà annulée');
    }

    // Annuler la vente
    db.prepare(
      'UPDATE sales SET status = ?, updatedAt = ? WHERE id = ? AND companyId = ?'
    ).run('CANCELLED', new Date().toISOString(), id, companyId);

    // Rétablir le stock pour chaque item
    const items = db
      .prepare('SELECT * FROM sale_items WHERE saleId = ?')
      .all(id) as any[];

    for (const item of items) {
      // Créer un mouvement de stock (entrée) pour rétablir le stock
      this.stockMovementsService.create(
        {
          type: 'IN',
          quantity: item.quantity,
          reason: 'Annulation de vente',
          reference: sale.saleNumber,
          productId: item.productId,
          userId,
          saleId: id,
        },
        companyId,
      );
    }

    return this.findOne(id, companyId);
  }
}
