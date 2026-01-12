import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

interface License {
  companyId: string;
  plan: 'START' | 'PLUS' | 'PRO';
  expiresAt: Date;
  activatedAt: Date;
  licenseKey: string;
  lastCheck: Date;
  isMultiUser: boolean;
}

let license: License | null = null;
const LICENSE_FILE = 'license.json';
const ENCRYPTION_KEY = process.env.LICENSE_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Initialise le système de licence
 */
export async function initLicense(): Promise<void> {
  const licensePath = getLicensePath();
  
  if (fs.existsSync(licensePath)) {
    try {
      const encryptedData = fs.readFileSync(licensePath, 'utf8');
      const decryptedData = decrypt(encryptedData);
      const parsedLicense = JSON.parse(decryptedData);
      
      // Convertir les dates string en Date
      parsedLicense.expiresAt = new Date(parsedLicense.expiresAt);
      parsedLicense.activatedAt = new Date(parsedLicense.activatedAt);
      parsedLicense.lastCheck = new Date(parsedLicense.lastCheck);
      
      license = parsedLicense;
      console.log('Licence chargée depuis le fichier local');
    } catch (error) {
      console.error('Erreur lors du chargement de la licence:', error);
      license = null;
    }
  }
}

/**
 * Vérifie si la licence est valide
 */
export async function checkLicense(): Promise<boolean> {
  if (!license) {
    return false;
  }

  const now = new Date();
  
  // Vérifier si la licence n'a pas expiré
  if (license.expiresAt < now) {
    // Grace period de 15 jours
    const gracePeriodEnd = new Date(license.expiresAt);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15);
    
    if (now > gracePeriodEnd) {
      console.log('Licence expirée (dépassement de la période de grâce)');
      return false;
    }
    
    console.log('Licence expirée mais dans la période de grâce');
    return true; // Toujours valide pendant la grace period
  }

  return true;
}

/**
 * Sauvegarde la licence localement
 */
export function saveLicense(newLicense: License): void {
  license = newLicense;
  const licensePath = getLicensePath();
  
  try {
    const encryptedData = encrypt(JSON.stringify(license));
    fs.writeFileSync(licensePath, encryptedData, 'utf8');
    console.log('Licence sauvegardée localement');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la licence:', error);
    throw error;
  }
}

/**
 * Obtient la licence actuelle
 */
export function getLicense(): License | null {
  return license;
}

// Exporter le type License pour utilisation externe
export type { License };

/**
 * Obtient le chemin du fichier de licence
 */
function getLicensePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, LICENSE_FILE);
}

/**
 * Chiffre les données
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Déchiffre les données
 */
function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
