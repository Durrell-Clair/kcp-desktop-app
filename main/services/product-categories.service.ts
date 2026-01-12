import { getDatabase } from '../database';
import { randomUUID } from 'crypto';

interface CreateCategoryData {
  name: string;
  description?: string;
}

interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export class ProductCategoriesService {
  /**
   * Trouve toutes les catégories
   */
  findAll(companyId: string) {
    const db = getDatabase();

    const categories = db
      .prepare(
        `SELECT id, name, description, companyId, createdAt, updatedAt
         FROM product_categories
         WHERE companyId = ? AND deletedAt IS NULL
         ORDER BY name ASC`
      )
      .all(companyId) as any[];

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      companyId: category.companyId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  /**
   * Trouve une catégorie par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();

    const category = db
      .prepare(
        'SELECT id, name, description, companyId, createdAt, updatedAt FROM product_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL'
      )
      .get(id, companyId) as any;

    if (!category) {
      throw new Error('Catégorie non trouvée');
    }

    return {
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      companyId: category.companyId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Crée une catégorie
   */
  create(data: CreateCategoryData, companyId: string) {
    const db = getDatabase();

    // Vérifier unicité du nom
    const existing = db
      .prepare(
        'SELECT id FROM product_categories WHERE name = ? AND companyId = ? AND deletedAt IS NULL'
      )
      .get(data.name, companyId);

    if (existing) {
      throw new Error('Une catégorie avec ce nom existe déjà');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO product_categories (id, name, description, companyId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.name, data.description || null, companyId, now, now);

    return this.findOne(id, companyId);
  }

  /**
   * Met à jour une catégorie
   */
  update(id: string, data: UpdateCategoryData, companyId: string) {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT id, name FROM product_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as { id: string; name: string } | undefined;

    if (!existing) {
      throw new Error('Catégorie non trouvée');
    }

    // Vérifier unicité du nom si modifié
    if (data.name && data.name !== existing.name) {
      const nameExists = db
        .prepare(
          'SELECT id FROM product_categories WHERE name = ? AND companyId = ? AND id != ? AND deletedAt IS NULL'
        )
        .get(data.name, companyId, id);

      if (nameExists) {
        throw new Error('Une catégorie avec ce nom existe déjà');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description || null);
    }

    if (updates.length === 0) {
      return this.findOne(id, companyId);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, companyId);

    db.prepare(
      `UPDATE product_categories SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`
    ).run(...values);

    return this.findOne(id, companyId);
  }

  /**
   * Supprime une catégorie (soft delete)
   */
  remove(id: string, companyId: string): void {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT id FROM product_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId);

    if (!existing) {
      throw new Error('Catégorie non trouvée');
    }

    // Vérifier qu'aucun produit n'utilise cette catégorie
    const productsCount = db
      .prepare('SELECT COUNT(*) as count FROM products WHERE categoryId = ? AND deletedAt IS NULL')
      .get(id) as { count: number };

    if (productsCount.count > 0) {
      throw new Error('Impossible de supprimer une catégorie utilisée par des produits');
    }

    db.prepare(
      'UPDATE product_categories SET deletedAt = ? WHERE id = ? AND companyId = ?'
    ).run(new Date().toISOString(), id, companyId);
  }
}
