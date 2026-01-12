import { getLicense, saveLicense, checkLicense as checkLicenseFile } from '../license';
import { License } from '../license';

export interface LicenseActivationData {
  companyId: string;
  plan: 'START' | 'PLUS' | 'PRO';
  licenseKey: string;
  expiresAt: string;
  isMultiUser: boolean;
}

export interface CloudLicenseActivationRequest {
  companyId: string;
  plan: 'START' | 'PLUS' | 'PRO';
  paymentMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER';
  paymentReference?: string;
  isMultiUser: boolean;
}

export interface CloudLicenseActivationResponse {
  success: boolean;
  license?: {
    licenseKey: string;
    expiresAt: string;
    plan: 'START' | 'PLUS' | 'PRO';
  };
  error?: string;
}

// URL de l'API cloud (à configurer selon l'environnement)
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://api.kamerkash.com';

/**
 * Service de gestion de licence
 */
export class LicenseService {
  /**
   * Active une licence via l'API cloud
   */
  async activateLicenseFromCloud(
    data: CloudLicenseActivationRequest,
  ): Promise<CloudLicenseActivationResponse> {
    try {
      const http = require('http');
      const https = require('https');
      const url = require('url');

      const apiUrl = new URL(`${CLOUD_API_URL}/api/licenses/activate`);
      const isHttps = apiUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
          hostname: apiUrl.hostname,
          port: apiUrl.port || (isHttps ? 443 : 80),
          path: apiUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 10000, // 10 secondes
        };

        const req = httpModule.request(options, (res: any) => {
          let responseData = '';

          res.on('data', (chunk: Buffer) => {
            responseData += chunk.toString();
          });

          res.on('end', () => {
            try {
              const response: CloudLicenseActivationResponse = JSON.parse(responseData);

              if (response.success && response.license) {
                // Sauvegarder la licence localement
                const license: License = {
                  companyId: data.companyId,
                  plan: response.license.plan,
                  expiresAt: new Date(response.license.expiresAt),
                  activatedAt: new Date(),
                  licenseKey: response.license.licenseKey,
                  lastCheck: new Date(),
                  isMultiUser: data.isMultiUser,
                };

                saveLicense(license);
                console.log('Licence activée avec succès');
              }

              resolve(response);
            } catch (error: any) {
              reject(new Error(`Erreur lors du parsing de la réponse: ${error.message}`));
            }
          });
        });

        req.on('error', (error: Error) => {
          reject(new Error(`Erreur de connexion à l'API cloud: ${error.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout lors de la connexion à l\'API cloud'));
        });

        req.write(postData);
        req.end();
      });
    } catch (error: any) {
      throw new Error(`Erreur lors de l'activation de la licence: ${error.message}`);
    }
  }

  /**
   * Vérifie la licence auprès de l'API cloud
   */
  async verifyLicenseWithCloud(): Promise<{
    valid: boolean;
    needsUpdate: boolean;
    updatedLicense?: License;
  }> {
    const license = getLicense();
    if (!license) {
      return { valid: false, needsUpdate: false };
    }

    try {
      const http = require('http');
      const https = require('https');
      const url = require('url');

      const apiUrl = new URL(`${CLOUD_API_URL}/api/licenses/verify`);
      const isHttps = apiUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      return new Promise((resolve) => {
        const postData = JSON.stringify({
          licenseKey: license.licenseKey,
          companyId: license.companyId,
        });

        const options = {
          hostname: apiUrl.hostname,
          port: apiUrl.port || (isHttps ? 443 : 80),
          path: apiUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 5000, // 5 secondes
        };

        const req = httpModule.request(options, (res: any) => {
          let responseData = '';

          res.on('data', (chunk: Buffer) => {
            responseData += chunk.toString();
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(responseData);

              if (response.valid) {
                // Mettre à jour la licence si nécessaire
                if (response.updatedLicense) {
                  const updatedLicense: License = {
                    ...license,
                    expiresAt: new Date(response.updatedLicense.expiresAt),
                    lastCheck: new Date(),
                  };
                  saveLicense(updatedLicense);
                  resolve({
                    valid: true,
                    needsUpdate: true,
                    updatedLicense,
                  });
                } else {
                  // Mettre à jour seulement lastCheck
                  license.lastCheck = new Date();
                  saveLicense(license);
                  resolve({ valid: true, needsUpdate: false });
                }
              } else {
                resolve({ valid: false, needsUpdate: false });
              }
            } catch (error) {
              // En cas d'erreur, considérer la licence comme valide (mode offline)
              console.warn('Erreur lors de la vérification cloud, mode offline activé');
              resolve({ valid: true, needsUpdate: false });
            }
          });
        });

        req.on('error', () => {
          // En cas d'erreur réseau, considérer la licence comme valide (mode offline)
          console.warn('Erreur réseau lors de la vérification cloud, mode offline activé');
          resolve({ valid: true, needsUpdate: false });
        });

        req.on('timeout', () => {
          req.destroy();
          console.warn('Timeout lors de la vérification cloud, mode offline activé');
          resolve({ valid: true, needsUpdate: false });
        });

        req.write(postData);
        req.end();
      });
    } catch (error: any) {
      // En cas d'erreur, considérer la licence comme valide (mode offline)
      console.warn(`Erreur lors de la vérification cloud: ${error.message}, mode offline activé`);
      return { valid: true, needsUpdate: false };
    }
  }

  /**
   * Active une licence (méthode locale, pour tests ou activation manuelle)
   */
  async activateLicense(data: LicenseActivationData): Promise<void> {
    const license: License = {
      companyId: data.companyId,
      plan: data.plan,
      expiresAt: new Date(data.expiresAt),
      activatedAt: new Date(),
      licenseKey: data.licenseKey,
      lastCheck: new Date(),
      isMultiUser: data.isMultiUser,
    };

    saveLicense(license);
  }

  /**
   * Vérifie la validité de la licence
   */
  async verifyLicense(): Promise<boolean> {
    return await checkLicenseFile();
  }

  /**
   * Obtient les informations de la licence
   */
  getLicense(): License | null {
    return getLicense();
  }

  /**
   * Vérifie si la licence nécessite un renouvellement
   */
  needsRenewal(): boolean {
    const license = getLicense();
    if (!license) return false;

    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const daysUntilExpiry = Math.floor(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Notifier si expiration dans moins de 7 jours
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  }

  /**
   * Vérifie si la licence est expirée (hors grace period)
   */
  isExpired(): boolean {
    const license = getLicense();
    if (!license) return true;

    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const gracePeriodEnd = new Date(expiresAt);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15); // Grace period de 15 jours

    return now > gracePeriodEnd;
  }
}
