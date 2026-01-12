import { getDatabase } from '../database';
import { randomUUID } from 'crypto';

interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: string;
}

interface UpdateCategoryData {
  name?: string;
  description?: string;
  parentId?: string;
}

export class ExpenseCategoriesService {
  /**
   * Trouve toutes les catégories
   */
  findAll(companyId: string, parentId?: string | null) {
    const db = getDatabase();

    let query = `
      SELECT ec.*, 
             parent.name as parentName,
             (SELECT COUNT(*) FROM expense_categories WHERE parentId = ec.id AND deletedAt IS NULL) as subCategoriesCount
      FROM expense_categories ec
      LEFT JOIN expense_categories parent ON ec.parentId = parent.id
      WHERE ec.companyId = ? AND ec.deletedAt IS NULL
    `;
    const params: any[] = [companyId];

    if (parentId === undefined) {
      // Par défaut, seulement les catégories racines
      query += ' AND ec.parentId IS NULL';
    } else if (parentId !== null) {
      query += ' AND ec.parentId = ?';
      params.push(parentId);
    }

    query += ' ORDER BY ec.name ASC';

    const categories = db.prepare(query).all(...params) as any[];

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      parentId: category.parentId || undefined,
      parentName: category.parentName || undefined,
      companyId: category.companyId,
      isSystem: Boolean(category.isSystem),
      subCategoriesCount: category.subCategoriesCount || 0,
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
        `SELECT ec.*, parent.name as parentName
         FROM expense_categories ec
         LEFT JOIN expense_categories parent ON ec.parentId = parent.id
         WHERE ec.id = ? AND ec.companyId = ? AND ec.deletedAt IS NULL`
      )
      .get(id, companyId) as any;

    if (!category) {
      throw new Error('Catégorie non trouvée');
    }

    // Récupérer les sous-catégories
    const subCategories = db
      .prepare(
        `SELECT id, name, description, parentId, companyId, isSystem, createdAt, updatedAt
         FROM expense_categories
         WHERE parentId = ? AND companyId = ? AND deletedAt IS NULL
         ORDER BY name ASC`
      )
      .all(id, companyId) as any[];

    return {
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      parentId: category.parentId || undefined,
      parentName: category.parentName || undefined,
      companyId: category.companyId,
      isSystem: Boolean(category.isSystem),
      subCategories: subCategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        description: sub.description || undefined,
        parentId: sub.parentId || undefined,
        companyId: sub.companyId,
        isSystem: Boolean(sub.isSystem),
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Crée une catégorie
   */
  create(data: CreateCategoryData, companyId: string) {
    const db = getDatabase();

    // Vérifier que le parent existe si fourni
    if (data.parentId) {
      const parent = db
        .prepare('SELECT id FROM expense_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
        .get(data.parentId, companyId);

      if (!parent) {
        throw new Error('Catégorie parente non trouvée');
      }
    }

    // Vérifier unicité du nom dans le même niveau
    let existing;
    if (data.parentId) {
      existing = db
        .prepare(
          `SELECT id FROM expense_categories 
           WHERE name = ? AND companyId = ? AND parentId = ? AND deletedAt IS NULL`
        )
        .get(data.name, companyId, data.parentId);
    } else {
      existing = db
        .prepare(
          `SELECT id FROM expense_categories 
           WHERE name = ? AND companyId = ? AND parentId IS NULL AND deletedAt IS NULL`
        )
        .get(data.name, companyId);
    }

    if (existing) {
      throw new Error('Une catégorie avec ce nom existe déjà à ce niveau');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO expense_categories (id, name, description, parentId, companyId, isSystem, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.name,
      data.description || null,
      data.parentId || null,
      companyId,
      false,
      now,
      now,
    );

    return this.findOne(id, companyId);
  }

  /**
   * Met à jour une catégorie
   */
  update(id: string, data: UpdateCategoryData, companyId: string) {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT * FROM expense_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Catégorie non trouvée');
    }

    // Ne pas permettre modification des catégories système
    if (existing.isSystem) {
      throw new Error('Impossible de modifier une catégorie système');
    }

    // Vérifier que le parent existe si modifié
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      if (data.parentId) {
        const parent = db
          .prepare('SELECT id FROM expense_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
          .get(data.parentId, companyId);

        if (!parent) {
          throw new Error('Catégorie parente non trouvée');
        }

        // Éviter les références circulaires
        if (data.parentId === id) {
          throw new Error('Une catégorie ne peut pas être son propre parent');
        }
      }
    }

    // Vérifier unicité du nom si modifié
    if (data.name && data.name !== existing.name) {
      const parentIdToCheck = data.parentId !== undefined ? data.parentId : existing.parentId;
      let nameExists;
      if (parentIdToCheck) {
        nameExists = db
          .prepare(
            `SELECT id FROM expense_categories 
             WHERE name = ? AND companyId = ? AND parentId = ? AND id != ? AND deletedAt IS NULL`
          )
          .get(data.name, companyId, parentIdToCheck, id);
      } else {
        nameExists = db
          .prepare(
            `SELECT id FROM expense_categories 
             WHERE name = ? AND companyId = ? AND parentId IS NULL AND id != ? AND deletedAt IS NULL`
          )
          .get(data.name, companyId, id);
      }

      if (nameExists) {
        throw new Error('Une catégorie avec ce nom existe déjà à ce niveau');
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
    if (data.parentId !== undefined) {
      updates.push('parentId = ?');
      values.push(data.parentId || null);
    }

    if (updates.length === 0) {
      return this.findOne(id, companyId);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id, companyId);

    db.prepare(
      `UPDATE expense_categories SET ${updates.join(', ')} WHERE id = ? AND companyId = ?`
    ).run(...values);

    return this.findOne(id, companyId);
  }

  /**
   * Supprime une catégorie (soft delete)
   */
  remove(id: string, companyId: string): void {
    const db = getDatabase();

    const existing = db
      .prepare('SELECT * FROM expense_categories WHERE id = ? AND companyId = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!existing) {
      throw new Error('Catégorie non trouvée');
    }

    // Ne pas permettre suppression des catégories système
    if (existing.isSystem) {
      throw new Error('Impossible de supprimer une catégorie système');
    }

    // Vérifier qu'aucune dépense n'utilise cette catégorie
    const expensesCount = db
      .prepare('SELECT COUNT(*) as count FROM expenses WHERE categoryId = ? AND deletedAt IS NULL')
      .get(id) as { count: number };

    if (expensesCount.count > 0) {
      throw new Error('Impossible de supprimer une catégorie utilisée par des dépenses');
    }

    // Vérifier qu'aucune sous-catégorie n'existe
    const subCategoriesCount = db
      .prepare('SELECT COUNT(*) as count FROM expense_categories WHERE parentId = ? AND deletedAt IS NULL')
      .get(id) as { count: number };

    if (subCategoriesCount.count > 0) {
      throw new Error('Impossible de supprimer une catégorie ayant des sous-catégories');
    }

    db.prepare(
      'UPDATE expense_categories SET deletedAt = ? WHERE id = ? AND companyId = ?'
    ).run(new Date().toISOString(), id, companyId);
  }
}
