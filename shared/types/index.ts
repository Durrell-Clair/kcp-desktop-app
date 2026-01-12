// Types partagés entre main et renderer

export enum UserRole {
  PROPRIETAIRE = 'PROPRIETAIRE',
  MANAGER = 'MANAGER',
  MAGASINIER = 'MAGASINIER',
  CAISSIER = 'CAISSIER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
}

export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum StockMovementType {
  IN = 'IN',
  OUT_SALE = 'OUT_SALE',
  OUT_LOSS = 'OUT_LOSS',
  OUT_THEFT = 'OUT_THEFT',
}

export interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role: UserRole;
}
