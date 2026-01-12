import { getDatabase } from '../database';
import { randomUUID } from 'crypto';

interface CreateProductData {
  name: string;
  reference?: string;
  barcode?: string;
  description?: string;
  purchasePrice: number;
  salePrice: number;
  categoryId?: string;
  supplier?: string;
  imageUrl?: string;
  stockMin?: number;
  stockMax?: number;
}

interface UpdateProductData {
  name?: string;
  reference?: string;
  barcode?: string;
  description?: string;
  purchasePrice?: number;
  salePrice?: number;
  categoryId?: string;
  supplier?: string;
  imageUrl?: string;
  stockMin?: number;
  stockMax?: number;
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

export class ProductsService {
  /**
   * Trouve tous les produits
   */
  findAll(companyId: string, filters?: { categoryId?: string; search?: string }) {
    const db = getDatabase();
    
    let query = `
      SELECT p.*, pc.name as categoryName
      FROM products p
      LEFT JOIN product_categories pc ON p.categoryId = pc.id
      WHERE p.companyId = ? AND p.deletedAt IS NULL
    `;
    const params: any[] = [companyId];

    if (filters?.categoryId) {
      query += ' AND p.categoryId = ?';
      params.push(filters.categoryId);
    }

    if (filters?.search) {
      query += ' AND (p.name LIKE ? OR p.reference LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY p.name ASC';

    const products = db.prepare(query).all(...params) as any[];

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      reference: product.reference || undefined,
      barcode: product.barcode || undefined,
      description: product.description || undefined,
      purchasePrice: Number(product.purchasePrice),
      salePrice: Number(product.salePrice),
      categoryId: product.categoryId || undefined,
      categoryName: product.categoryName || undefined,
      supplier: product.supplier || undefined,
      imageUrl: product.imageUrl || undefined,
      stockMin: product.stockMin,
      stockMax: product.stockMax || undefined,
      stock: calculateStock(product.id, companyId),
      companyId: product.companyId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }

  /**
   * Trouve un produit par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();
    
    const product = db
      .prepare(
        `SELECT p.*, pc.name as categoryName
         FROM products p
         LEFT JOIN product_categories pc ON p.categoryId = pc.id
         WHERE p.id = ? AND p.companyId = ? AND p.deletedAt IS NULL`
      )
      .get(id, companyId) as any;

    if (!product) {
      throw new Error('Produit non trouvé');
    }

    return {
      id: product.id,
      name: product.name,
      reference: product.reference || undefined,
      barcode: product.barcode || undefined,
      description: product.description || undefined,
      purchasePrice: Number(product.purchasePrice),
      salePrice: Number(product.salePrice),
      categoryId: product.categoryId || undefined,
      categoryName: product.categoryName || undefined,
      supplier: product.supplier || undefined,
      imageUrl: product.imageUrl || undefined,
      stockMin: product.stockMin,
      stockMax: product.stockMax || undefined,
      stock: calculateStock(product.id, companyId),
      companyId: product.companyId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Crée un produit
   */
  create(data: CreateProductData, companyId: string) {
    const db = getDatabase();

    // Vérifier unicité du barcode (si fourni)
    if (data.barcode) {
      const existing = db
        .prepare(
          'SELECT id FROM products WHERE barcode = ? AND companyId = ? AND deletedAt IS NULL'
        )
        .get(data.barcode, companyId);

      if (existing) {
        throw new Error('Un produit avec ce code-barres existe déjà');
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO products (
        id, name, reference, barcode, description, purchasePrice, salePrice,
        categoryId, supplier, imageUrl, stockMin, stockMax, companyId,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.name,
      data.reference || null,
      data.barcode || null,
      data.description || null,
      data.purchasePrice,
      data.salePrice,
      data.categoryId || null,
      data.supplier || null,
      data.imageUrl || null,
      data.stockMin || 0,
      data.stockMax || null,
      companyId,
      now,
      now,
    );

    return this.findOne(id, companyId);
  }

  /**
   * Met à jour un produit
   */
  update(id: string, data: UpdateProductData, companyId: string) {
    const db = getDatabase();

    // Vérifier que le produit existe
    const existing = db
      .prepare('SELECT id FROM products WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId);

    if (!existing) {
      throw new Error('Produit non trouvé');
    }

    // Vérifier unicité du barcode si modifié
    if (data.barcode) {
      const existingBarcode = db
        .prepare(
          'SELECT id FROM products WHERE barcode = ? AND companyId = ? AND id != ? AND deletedAt IS NULL'
        )
        .get(data.barcode, companyId, id);

      if (existingBarcode) {
        throw new Error('Un produit avec ce code-barres existe déjà');
      }
    }

    // Construire la requête de mise à jour
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.reference !== undefined) {
      updates.push('reference = ?');
      values.push(data.reference || null);
    }
    if (data.barcode !== undefined) {
      updates.push('barcode = ?');
      values.push(data.barcode || null);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description || null);
    }
    if (data.purchasePrice !== undefined) {
      updates.push('purchasePrice = ?');
      values.push(data.purchasePrice);
    }
    if (data.salePrice !== undefined) {
      updates.push('salePrice = ?');
      values.push(data.salePrice);
    }
    if (data.categoryId !== undefined) {
      updates.push('categoryId = ?');
      values.push(data.categoryId || null);
    }
    if (data.supplier !== undefined) {
      updates.push('supplier = ?');
      values.push(data.supplier || null);
    }
    if (data.imageUrl !== undefined) {
      updates.push('imageUrl = ?');
      values.push(data.imageUrl || null);
    }
    if (data.stockMin !== undefined) {
      updates.push('stockMin = ?');
      values.push(data.stockMin);
    }
    if (data.stockMax !== undefined) {
      updates.push('stockMax = ?');
      values.push(data.stockMax || null);
    }

    if (updates.length === 0) {
      return this.findOne(id, companyId);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, companyId);

    db.prepare(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`
    ).run(...values);

    return this.findOne(id, companyId);
  }

  /**
   * Supprime un produit (soft delete)
   */
  remove(id: string, companyId: string): void {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT id FROM products WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId);

    if (!existing) {
      throw new Error('Produit non trouvé');
    }

    db.prepare(
      'UPDATE products SET deletedAt = ? WHERE id = ? AND companyId = ?'
    ).run(new Date().toISOString(), id, companyId);
  }
}
