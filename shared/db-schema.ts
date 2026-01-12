// Schéma de base de données partagé
// Types TypeScript pour les entités SQLite

export interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: number; // SQLite boolean as integer
  companyId: string;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Product {
  id: string;
  name: string;
  reference: string | null;
  barcode: string | null;
  description: string | null;
  purchasePrice: number;
  salePrice: number;
  categoryId: string | null;
  supplier: string | null;
  imageUrl: string | null;
  stockMin: number;
  stockMax: number | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  creditLimit: number;
  reliabilityScore: number | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Sale {
  id: string;
  saleNumber: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  notes: string | null;
  companyId: string;
  clientId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  saleId: string;
  productId: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  companyId: string;
  clientId: string | null;
  saleId: string | null;
  receivedById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  receiptUrl: string | null;
  status: string;
  expenseDate: string;
  companyId: string;
  categoryId: string;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  reference: string | null;
  companyId: string;
  productId: string;
  userId: string;
  saleId: string | null;
  createdAt: string;
}
