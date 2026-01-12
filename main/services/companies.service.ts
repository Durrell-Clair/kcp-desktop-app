import { getDatabase } from '../database';
import { randomUUID } from 'crypto';

export class CompaniesService {
  /**
   * Trouve une entreprise par ID
   */
  findOne(id: string, companyId: string) {
    const db = getDatabase();
    
    const company = db
      .prepare('SELECT * FROM companies WHERE id = ? AND id = ? AND deletedAt IS NULL')
      .get(id, companyId) as any;

    if (!company) {
      throw new Error('Entreprise non trouvée');
    }

    return {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      logo: company.logo,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  /**
   * Met à jour une entreprise
   */
  update(id: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    logo: string;
  }>, companyId: string) {
    const db = getDatabase();

    // Vérifier que l'entreprise existe
    const existing = db
      .prepare('SELECT id FROM companies WHERE id = ? AND deletedAt IS NULL')
      .get(id);

    if (!existing) {
      throw new Error('Entreprise non trouvée');
    }

    // Construire la requête de mise à jour
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address);
    }
    if (data.logo !== undefined) {
      updates.push('logo = ?');
      values.push(data.logo);
    }

    if (updates.length === 0) {
      return this.findOne(id, companyId);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`
    ).run(...values);

    return this.findOne(id, companyId);
  }
}
