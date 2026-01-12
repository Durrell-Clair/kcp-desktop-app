-- Migration initiale : Création de toutes les tables
-- Basé sur le schéma Prisma

-- Table Companies
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  logo TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME
);

CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_deletedAt ON companies(deletedAt);

-- Table Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'CAISSIER',
  isActive INTEGER NOT NULL DEFAULT 1,
  companyId TEXT NOT NULL,
  refreshToken TEXT,
  refreshTokenExpiresAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_companyId ON users(companyId);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_deletedAt ON users(deletedAt);

-- Table ProductCategories
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  companyId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(companyId, name)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_companyId ON product_categories(companyId);
CREATE INDEX IF NOT EXISTS idx_product_categories_deletedAt ON product_categories(deletedAt);

-- Table Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reference TEXT,
  barcode TEXT,
  description TEXT,
  purchasePrice DECIMAL(10, 2) NOT NULL,
  salePrice DECIMAL(10, 2) NOT NULL,
  categoryId TEXT,
  supplier TEXT,
  imageUrl TEXT,
  stockMin INTEGER NOT NULL DEFAULT 0,
  stockMax INTEGER,
  companyId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_products_companyId ON products(companyId);
CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_deletedAt ON products(deletedAt);

-- Table Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  creditLimit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reliabilityScore INTEGER DEFAULT 100,
  companyId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(companyId, phone)
);

CREATE INDEX IF NOT EXISTS idx_clients_companyId ON clients(companyId);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_deletedAt ON clients(deletedAt);

-- Table Sales
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  saleNumber TEXT NOT NULL,
  totalAmount DECIMAL(10, 2) NOT NULL,
  paymentMethod TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  notes TEXT,
  companyId TEXT NOT NULL,
  clientId TEXT,
  createdById TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (createdById) REFERENCES users(id),
  UNIQUE(companyId, saleNumber)
);

CREATE INDEX IF NOT EXISTS idx_sales_companyId ON sales(companyId);
CREATE INDEX IF NOT EXISTS idx_sales_clientId ON sales(clientId);
CREATE INDEX IF NOT EXISTS idx_sales_createdById ON sales(createdById);
CREATE INDEX IF NOT EXISTS idx_sales_paymentMethod ON sales(paymentMethod);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_createdAt ON sales(createdAt);
CREATE INDEX IF NOT EXISTS idx_sales_deletedAt ON sales(deletedAt);

-- Table SaleItems
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL,
  unitPrice DECIMAL(10, 2) NOT NULL,
  totalPrice DECIMAL(10, 2) NOT NULL,
  saleId TEXT NOT NULL,
  productId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_saleId ON sale_items(saleId);
CREATE INDEX IF NOT EXISTS idx_sale_items_productId ON sale_items(productId);

-- Table Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  paymentMethod TEXT NOT NULL,
  notes TEXT,
  companyId TEXT NOT NULL,
  clientId TEXT,
  saleId TEXT,
  receivedById TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (receivedById) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_companyId ON payments(companyId);
CREATE INDEX IF NOT EXISTS idx_payments_clientId ON payments(clientId);
CREATE INDEX IF NOT EXISTS idx_payments_saleId ON payments(saleId);
CREATE INDEX IF NOT EXISTS idx_payments_receivedById ON payments(receivedById);
CREATE INDEX IF NOT EXISTS idx_payments_createdAt ON payments(createdAt);
CREATE INDEX IF NOT EXISTS idx_payments_deletedAt ON payments(deletedAt);

-- Table ExpenseCategories
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parentId TEXT,
  companyId TEXT NOT NULL,
  isSystem INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES expense_categories(id) ON DELETE SET NULL,
  UNIQUE(companyId, name, parentId)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_companyId ON expense_categories(companyId);
CREATE INDEX IF NOT EXISTS idx_expense_categories_parentId ON expense_categories(parentId);
CREATE INDEX IF NOT EXISTS idx_expense_categories_deletedAt ON expense_categories(deletedAt);

-- Table Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  receiptUrl TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  expenseDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  companyId TEXT NOT NULL,
  categoryId TEXT NOT NULL,
  createdById TEXT NOT NULL,
  approvedById TEXT,
  approvedAt DATETIME,
  rejectedReason TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES expense_categories(id),
  FOREIGN KEY (createdById) REFERENCES users(id),
  FOREIGN KEY (approvedById) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_companyId ON expenses(companyId);
CREATE INDEX IF NOT EXISTS idx_expenses_categoryId ON expenses(categoryId);
CREATE INDEX IF NOT EXISTS idx_expenses_createdById ON expenses(createdById);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_expenseDate ON expenses(expenseDate);
CREATE INDEX IF NOT EXISTS idx_expenses_deletedAt ON expenses(deletedAt);

-- Table StockMovements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference TEXT,
  companyId TEXT NOT NULL,
  productId TEXT NOT NULL,
  userId TEXT NOT NULL,
  saleId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_companyId ON stock_movements(companyId);
CREATE INDEX IF NOT EXISTS idx_stock_movements_productId ON stock_movements(productId);
CREATE INDEX IF NOT EXISTS idx_stock_movements_userId ON stock_movements(userId);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_createdAt ON stock_movements(createdAt);

-- Table AuditLogs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entityId TEXT,
  details TEXT, -- JSON stored as TEXT
  ipAddress TEXT,
  userAgent TEXT,
  companyId TEXT NOT NULL,
  userId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_companyId ON audit_logs(companyId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_entityId ON audit_logs(entity, entityId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs(createdAt);

-- Table Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  priority TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON stored as TEXT
  isRead INTEGER NOT NULL DEFAULT 0,
  readAt DATETIME,
  readById TEXT,
  companyId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (readById) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_companyId ON alerts(companyId);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_entityType_entityId ON alerts(entityType, entityId);
CREATE INDEX IF NOT EXISTS idx_alerts_isRead ON alerts(isRead);
CREATE INDEX IF NOT EXISTS idx_alerts_createdAt ON alerts(createdAt);
