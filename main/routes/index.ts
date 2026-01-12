import { Express, Router } from 'express';
import { jwtAuthMiddleware, rolesMiddleware } from '../middleware/auth';
import { AuthService } from '../services/auth.service';
import { CompaniesService } from '../services/companies.service';
import { ProductsService } from '../services/products.service';
import { ProductCategoriesService } from '../services/product-categories.service';
import { ClientsService } from '../services/clients.service';
import { SalesService } from '../services/sales.service';
import { StockMovementsService } from '../services/stock-movements.service';
import { UsersService } from '../services/users.service';
import { PaymentsService } from '../services/payments.service';
import { ExpensesService } from '../services/expenses.service';
import { ExpenseCategoriesService } from '../services/expense-categories.service';
import { DashboardService } from '../services/dashboard.service';
import { UserRole } from '../../shared/types';

const authService = new AuthService();
const companiesService = new CompaniesService();
const productsService = new ProductsService();
const productCategoriesService = new ProductCategoriesService();
const clientsService = new ClientsService();
const salesService = new SalesService();
const stockMovementsService = new StockMovementsService();
const usersService = new UsersService();
const paymentsService = new PaymentsService();
const expensesService = new ExpensesService();
const expenseCategoriesService = new ExpenseCategoriesService();
const dashboardService = new DashboardService();

/**
 * Configure toutes les routes API
 */
export function setupRoutes(app: Express): void {
  const apiRouter = Router();

  // Routes d'authentification (publiques)
  apiRouter.post('/auth/register', async (req, res) => {
    try {
      const result = await authService.register(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.post('/auth/login', async (req, res) => {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  });

  apiRouter.post('/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token requis' });
      }
      const result = await authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  });

  apiRouter.post('/auth/logout', jwtAuthMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      await authService.logout(user.userId);
      res.json({ message: 'Déconnexion réussie' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Routes protégées
  apiRouter.use(jwtAuthMiddleware);

  // Routes Companies
  apiRouter.get('/companies', async (req, res) => {
    try {
      const user = (req as any).user;
      const company = companiesService.findOne(user.companyId, user.companyId);
      res.json(company);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.patch('/companies/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const company = companiesService.update(req.params.id, req.body, user.companyId);
      res.json(company);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Routes Products
  apiRouter.get('/products', async (req, res) => {
    try {
      const user = (req as any).user;
      const filters = {
        categoryId: req.query.categoryId as string | undefined,
        search: req.query.search as string | undefined,
      };
      const products = productsService.findAll(user.companyId, filters);
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Routes Product Categories (DOIT être avant /products/:id)
  apiRouter.get('/products/categories', async (req, res) => {
    try {
      const user = (req as any).user;
      const categories = productCategoriesService.findAll(user.companyId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/products/categories/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const category = productCategoriesService.findOne(req.params.id, user.companyId);
      res.json(category);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/products/categories', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const category = productCategoriesService.create(req.body, user.companyId);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.patch('/products/categories/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const category = productCategoriesService.update(req.params.id, req.body, user.companyId);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.delete('/products/categories/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      productCategoriesService.remove(req.params.id, user.companyId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.get('/products/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const product = productsService.findOne(req.params.id, user.companyId);
      res.json(product);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/products', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const product = productsService.create(req.body, user.companyId);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.patch('/products/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const product = productsService.update(req.params.id, req.body, user.companyId);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.delete('/products/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      productsService.remove(req.params.id, user.companyId);
      res.json({ message: 'Produit supprimé' });
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  // Routes Clients
  apiRouter.get('/clients', async (req, res) => {
    try {
      const user = (req as any).user;
      const filters = {
        search: req.query.search as string | undefined,
      };
      const clients = clientsService.findAll(user.companyId, filters);
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/clients/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const client = clientsService.findOne(req.params.id, user.companyId);
      res.json(client);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.get('/clients/:id/receivables', async (req, res) => {
    try {
      const user = (req as any).user;
      const receivables = clientsService.getReceivablesByAge(req.params.id, user.companyId);
      res.json(receivables);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/clients', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.CAISSIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const client = clientsService.create(req.body, user.companyId);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.patch('/clients/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.CAISSIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const client = clientsService.update(req.params.id, req.body, user.companyId);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.delete('/clients/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      clientsService.remove(req.params.id, user.companyId);
      res.json({ message: 'Client supprimé' });
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  // Routes Sales
  apiRouter.get('/sales', async (req, res) => {
    try {
      const user = (req as any).user;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        clientId: req.query.clientId as string | undefined,
        paymentMethod: req.query.paymentMethod as string | undefined,
      };
      const sales = salesService.findAll(user.companyId, filters);
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/sales/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const sale = salesService.findOne(req.params.id, user.companyId);
      res.json(sale);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/sales', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.CAISSIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const sale = salesService.create(req.body, user.userId, user.companyId);
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.post('/sales/:id/cancel', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const sale = salesService.cancel(req.params.id, user.userId, user.companyId);
      res.json(sale);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Routes Stock Movements
  apiRouter.get('/stock-movements', async (req, res) => {
    try {
      const user = (req as any).user;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        productId: req.query.productId as string | undefined,
        type: req.query.type as string | undefined,
        userId: req.query.userId as string | undefined,
      };
      const movements = stockMovementsService.findAll(user.companyId, filters);
      res.json(movements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/stock-movements/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const movement = stockMovementsService.findOne(req.params.id, user.companyId);
      res.json(movement);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/stock-movements', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const movement = stockMovementsService.create(
        { ...req.body, userId: req.body.userId || user.userId },
        user.companyId
      );
      res.status(201).json(movement);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Routes Users
  apiRouter.get('/users', async (req, res) => {
    try {
      const user = (req as any).user;
      const users = usersService.findAll(user.companyId);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/users/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const foundUser = usersService.findOne(req.params.id, user.companyId);
      res.json(foundUser);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/users', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const newUser = await usersService.create(req.body, user.companyId, user.role);
      res.status(201).json(newUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.patch('/users/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const updatedUser = await usersService.update(req.params.id, req.body, user.companyId, user.role);
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.delete('/users/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      usersService.remove(req.params.id, user.companyId, user.role, user.userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });


  // Routes Payments
  apiRouter.get('/payments', async (req, res) => {
    try {
      const user = (req as any).user;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        clientId: req.query.clientId as string | undefined,
        saleId: req.query.saleId as string | undefined,
      };
      const payments = paymentsService.findAll(user.companyId, filters);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/payments/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const payment = paymentsService.findOne(req.params.id, user.companyId);
      res.json(payment);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/payments', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER, UserRole.CAISSIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const payment = paymentsService.create(req.body, user.companyId, user.userId);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.delete('/payments/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER, UserRole.MAGASINIER, UserRole.CAISSIER]), async (req, res) => {
    try {
      const user = (req as any).user;
      paymentsService.remove(req.params.id, user.companyId);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  // Routes Expenses
  apiRouter.get('/expenses', async (req, res) => {
    try {
      const user = (req as any).user;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        status: req.query.status as string | undefined,
        createdById: req.query.createdById as string | undefined,
      };
      const expenses = expensesService.findAll(user.companyId, filters);
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Routes Expense Categories (DOIT être avant /expenses/:id)
  apiRouter.get('/expenses/categories', async (req, res) => {
    try {
      const user = (req as any).user;
      const parentId = req.query.parentId === 'null' ? null : (req.query.parentId as string | undefined);
      const categories = expenseCategoriesService.findAll(user.companyId, parentId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/expenses/categories/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const category = expenseCategoriesService.findOne(req.params.id, user.companyId);
      res.json(category);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/expenses/categories', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const category = expenseCategoriesService.create(req.body, user.companyId);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.patch('/expenses/categories/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const category = expenseCategoriesService.update(req.params.id, req.body, user.companyId);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.delete('/expenses/categories/:id', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      expenseCategoriesService.remove(req.params.id, user.companyId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.get('/expenses/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const expense = expensesService.findOne(req.params.id, user.companyId);
      res.json(expense);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  apiRouter.post('/expenses', async (req, res) => {
    try {
      const user = (req as any).user;
      const expense = expensesService.create(req.body, user.companyId, user.userId);
      res.status(201).json(expense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.patch('/expenses/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      const expense = expensesService.update(req.params.id, req.body, user.companyId, user.userId, user.role);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.post('/expenses/:id/approve', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const expense = expensesService.approve(req.params.id, user.companyId, user.userId, user.role);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.post('/expenses/:id/reject', rolesMiddleware([UserRole.PROPRIETAIRE, UserRole.MANAGER]), async (req, res) => {
    try {
      const user = (req as any).user;
      const expense = expensesService.reject(req.params.id, user.companyId, user.userId, user.role, req.body.reason || '');
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  apiRouter.delete('/expenses/:id', async (req, res) => {
    try {
      const user = (req as any).user;
      expensesService.remove(req.params.id, user.companyId, user.userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });


  // Routes Dashboard
  apiRouter.get('/dashboard', async (req, res) => {
    try {
      const user = (req as any).user;
      const dashboard = dashboardService.getDashboard(user.companyId);
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/dashboard/revenue-evolution', async (req, res) => {
    try {
      const user = (req as any).user;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const evolution = dashboardService.getRevenueEvolution(user.companyId, days);
      res.json(evolution);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/dashboard/expenses-evolution', async (req, res) => {
    try {
      const user = (req as any).user;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const evolution = dashboardService.getExpensesEvolution(user.companyId, days);
      res.json(evolution);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/dashboard/profit-evolution', async (req, res) => {
    try {
      const user = (req as any).user;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const evolution = dashboardService.getProfitEvolution(user.companyId, days);
      res.json(evolution);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/dashboard/payment-methods', async (req, res) => {
    try {
      const user = (req as any).user;
      const period = (req.query.period as 'today' | 'week' | 'month') || 'week';
      const distribution = dashboardService.getPaymentMethodsDistribution(
        user.companyId,
        period,
      );
      res.json(distribution);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  apiRouter.get('/dashboard/top-products', async (req, res) => {
    try {
      const user = (req as any).user;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const period = (req.query.period as 'week' | 'month') || 'month';
      const topProducts = dashboardService.getTopProducts(
        user.companyId,
        limit,
        period,
      );
      res.json(topProducts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Monter le router sur /api
  app.use('/api', apiRouter);
}
