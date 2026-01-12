import { getDatabase } from '../database';
import {
  PeriodMetricsDto,
  RevenueMetricsDto,
  DashboardResponseDto,
  TopClientDto,
  AtRiskClientDto,
  OutOfStockProductDto,
  LowRotationProductDto,
  EvolutionDataPointDto,
  RevenueEvolutionDto,
  ExpensesEvolutionDto,
  ProfitEvolutionDto,
  PaymentMethodDistributionDto,
  PaymentMethodsDistributionDto,
  TopProductDto,
  TopProductsDto,
} from '../../shared/types/dashboard.types';

export class DashboardService {
  /**
   * Calcule le stock actuel d'un produit
   */
  private calculateStock(productId: string, companyId: string): number {
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

  /**
   * Calcule le solde dû d'un client
   */
  private calculateClientBalance(clientId: string, companyId: string): number {
    const db = getDatabase();

    // Total des ventes complétées
    const salesResult = db
      .prepare(
        `SELECT SUM(totalAmount) as total
         FROM sales
         WHERE clientId = ? AND companyId = ? AND status = 'COMPLETED' AND deletedAt IS NULL`
      )
      .get(clientId, companyId) as { total: number | null };

    const totalSales = Number(salesResult.total || 0);

    // Total des paiements
    const paymentsResult = db
      .prepare(
        `SELECT SUM(amount) as total
         FROM payments
         WHERE clientId = ? AND companyId = ? AND deletedAt IS NULL`
      )
      .get(clientId, companyId) as { total: number | null };

    const totalPayments = Number(paymentsResult.total || 0);

    return totalSales - totalPayments;
  }

  /**
   * Calcule le CA (Chiffre d'Affaires) sur une période
   */
  private calculateRevenue(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): number {
    const db = getDatabase();

    const result = db
      .prepare(
        `SELECT SUM(totalAmount) as total
         FROM sales
         WHERE companyId = ? AND status = 'COMPLETED'
         AND createdAt >= ? AND createdAt <= ? AND deletedAt IS NULL`
      )
      .get(companyId, startDate.toISOString(), endDate.toISOString()) as {
        total: number | null;
      };

    return Number(result.total || 0);
  }

  /**
   * Calcule les dépenses sur une période
   */
  private calculateExpenses(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): number {
    const db = getDatabase();

    const result = db
      .prepare(
        `SELECT SUM(amount) as total
         FROM expenses
         WHERE companyId = ? AND status = 'APPROVED'
         AND expenseDate >= ? AND expenseDate <= ? AND deletedAt IS NULL`
      )
      .get(companyId, startDate.toISOString(), endDate.toISOString()) as {
        total: number | null;
      };

    return Number(result.total || 0);
  }

  /**
   * Calcule les métriques pour une période avec comparaison
   */
  private calculatePeriodMetrics(
    companyId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
    type: 'revenue' | 'expenses',
  ): PeriodMetricsDto {
    const currentAmount =
      type === 'revenue'
        ? this.calculateRevenue(companyId, currentStart, currentEnd)
        : this.calculateExpenses(companyId, currentStart, currentEnd);

    const previousAmount =
      type === 'revenue'
        ? this.calculateRevenue(companyId, previousStart, previousEnd)
        : this.calculateExpenses(companyId, previousStart, previousEnd);

    const changePercent =
      previousAmount === 0
        ? currentAmount > 0
          ? 100
          : 0
        : ((currentAmount - previousAmount) / previousAmount) * 100;

    return {
      amount: currentAmount,
      previousAmount,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  }

  /**
   * Récupère le top 5 des clients par volume de ventes
   */
  private getTopClients(companyId: string, limit: number = 5): TopClientDto[] {
    const db = getDatabase();

    const topClients = db
      .prepare(
        `SELECT clientId, SUM(totalAmount) as total, COUNT(*) as count
         FROM sales
         WHERE companyId = ? AND status = 'COMPLETED' AND clientId IS NOT NULL AND deletedAt IS NULL
         GROUP BY clientId
         ORDER BY total DESC
         LIMIT ?`
      )
      .all(companyId, limit) as Array<{
        clientId: string;
        total: number;
        count: number;
      }>;

    if (topClients.length === 0) {
      return [];
    }

    // Récupérer les informations des clients
    const clientIds = topClients.map((c) => c.clientId);

    if (clientIds.length === 0) {
      return [];
    }

    const placeholders = clientIds.map(() => '?').join(',');
    const clients = db
      .prepare(
        `SELECT id, firstName, lastName
         FROM clients
         WHERE id IN (${placeholders}) AND companyId = ? AND deletedAt IS NULL`
      )
      .all(...clientIds, companyId) as Array<{
        id: string;
        firstName: string;
        lastName: string;
      }>;

    const clientMap = new Map(
      clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]),
    );

    return topClients
      .filter((c) => clientMap.has(c.clientId))
      .map((c) => ({
        clientId: c.clientId,
        clientName: clientMap.get(c.clientId)!,
        totalAmount: Number(c.total),
        saleCount: c.count,
      }));
  }

  /**
   * Récupère les clients à risque (créances > 30 jours)
   */
  private getAtRiskClients(companyId: string): AtRiskClientDto[] {
    const db = getDatabase();

    const clients = db
      .prepare(
        `SELECT id, firstName, lastName
         FROM clients
         WHERE companyId = ? AND deletedAt IS NULL`
      )
      .all(companyId) as Array<{
        id: string;
        firstName: string;
        lastName: string;
      }>;

    const atRiskClients: AtRiskClientDto[] = [];
    const now = Date.now();

    for (const client of clients) {
      const balance = this.calculateClientBalance(client.id, companyId);

      if (balance > 0) {
        // Récupérer la dernière vente
        const lastSale = db
          .prepare(
            `SELECT createdAt
             FROM sales
             WHERE clientId = ? AND companyId = ? AND status = 'COMPLETED' AND deletedAt IS NULL
             ORDER BY createdAt DESC
             LIMIT 1`
          )
          .get(client.id, companyId) as { createdAt: string } | undefined;

        if (lastSale) {
          const lastSaleDate = new Date(lastSale.createdAt);
          const daysSinceLastSale = Math.floor(
            (now - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysSinceLastSale > 30) {
            atRiskClients.push({
              clientId: client.id,
              clientName: `${client.firstName} ${client.lastName}`,
              balance,
              lastSaleDate: lastSale.createdAt,
              daysOverdue: daysSinceLastSale,
            });
          }
        }
      }
    }

    // Trier par solde décroissant
    return atRiskClients.sort((a, b) => b.balance - a.balance);
  }

  /**
   * Récupère les produits en rupture de stock
   */
  private getOutOfStockProducts(companyId: string): OutOfStockProductDto[] {
    const db = getDatabase();

    const products = db
      .prepare(
        `SELECT id, name, stockMin
         FROM products
         WHERE companyId = ? AND deletedAt IS NULL`
      )
      .all(companyId) as Array<{
        id: string;
        name: string;
        stockMin: number;
      }>;

    const outOfStock: OutOfStockProductDto[] = [];

    for (const product of products) {
      const currentStock = this.calculateStock(product.id, companyId);
      if (currentStock < product.stockMin) {
        outOfStock.push({
          productId: product.id,
          productName: product.name,
          currentStock,
          stockMin: product.stockMin,
        });
      }
    }

    return outOfStock;
  }

  /**
   * Récupère les produits à faible rotation (moins de 3 ventes sur 30 derniers jours)
   */
  private getLowRotationProducts(companyId: string): LowRotationProductDto[] {
    const db = getDatabase();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer les IDs des ventes complétées dans les 30 derniers jours
    const sales = db
      .prepare(
        `SELECT id
         FROM sales
         WHERE companyId = ? AND status = 'COMPLETED'
         AND createdAt >= ? AND deletedAt IS NULL`
      )
      .all(companyId, thirtyDaysAgo.toISOString()) as Array<{ id: string }>;

    if (sales.length === 0) {
      return [];
    }

    const saleIds = sales.map((s) => s.id);

    // Récupérer les dates des ventes
    const salesWithDates = db
      .prepare(
        `SELECT id, createdAt
         FROM sales
         WHERE id IN (${saleIds.map(() => '?').join(',')})`
      )
      .all(...saleIds) as Array<{ id: string; createdAt: string }>;

    const saleDateMap = new Map(
      salesWithDates.map((s) => [s.id, s.createdAt]),
    );

    // Grouper les items de vente par produit
    const productSalesMap = new Map<
      string,
      { count: number; lastSale: string }
    >();

    for (const saleId of saleIds) {
      const saleDate = saleDateMap.get(saleId) || '';
      const items = db
        .prepare('SELECT productId FROM sale_items WHERE saleId = ?')
        .all(saleId) as Array<{ productId: string }>;

      for (const item of items) {
        const existing = productSalesMap.get(item.productId) || {
          count: 0,
          lastSale: saleDate,
        };
        productSalesMap.set(item.productId, {
          count: existing.count + 1,
          lastSale: saleDate > existing.lastSale ? saleDate : existing.lastSale,
        });
      }
    }

    // Filtrer ceux avec moins de 3 ventes
    const lowRotationProductIds = Array.from(productSalesMap.entries())
      .filter(([, stats]) => stats.count < 3)
      .map(([productId]) => productId);

    if (lowRotationProductIds.length === 0) {
      return [];
    }

    // Récupérer les informations des produits
    const placeholders = lowRotationProductIds.map(() => '?').join(',');
    const products = db
      .prepare(
        `SELECT id, name
         FROM products
         WHERE id IN (${placeholders}) AND companyId = ? AND deletedAt IS NULL`
      )
      .all(...lowRotationProductIds, companyId) as Array<{
        id: string;
        name: string;
      }>;

    return products
      .filter((p) => productSalesMap.has(p.id))
      .map((p) => {
        const stats = productSalesMap.get(p.id)!;
        return {
          productId: p.id,
          productName: p.name,
          saleCount: stats.count,
          lastSaleDate: stats.lastSale,
        };
      });
  }

  /**
   * Récupère le dashboard principal avec toutes les métriques
   */
  getDashboard(companyId: string): DashboardResponseDto {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    // Calculer les métriques de CA
    const revenueToday = this.calculatePeriodMetrics(
      companyId,
      today,
      now,
      yesterday,
      yesterdayEnd,
      'revenue',
    );

    const revenueYesterday = this.calculatePeriodMetrics(
      companyId,
      yesterday,
      yesterdayEnd,
      new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
      new Date(yesterdayEnd.getTime() - 24 * 60 * 60 * 1000),
      'revenue',
    );

    const revenueWeek = this.calculatePeriodMetrics(
      companyId,
      weekAgo,
      now,
      new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
      weekAgo,
      'revenue',
    );

    const revenueMonth = this.calculatePeriodMetrics(
      companyId,
      monthStart,
      now,
      lastMonthStart,
      lastMonthEnd,
      'revenue',
    );

    // Calculer les métriques de dépenses
    const expensesToday = this.calculatePeriodMetrics(
      companyId,
      today,
      now,
      yesterday,
      yesterdayEnd,
      'expenses',
    );

    const expensesYesterday = this.calculatePeriodMetrics(
      companyId,
      yesterday,
      yesterdayEnd,
      new Date(yesterday.getTime() - 24 * 60 * 60 * 1000),
      new Date(yesterdayEnd.getTime() - 24 * 60 * 60 * 1000),
      'expenses',
    );

    const expensesWeek = this.calculatePeriodMetrics(
      companyId,
      weekAgo,
      now,
      new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
      weekAgo,
      'expenses',
    );

    const expensesMonth = this.calculatePeriodMetrics(
      companyId,
      monthStart,
      now,
      lastMonthStart,
      lastMonthEnd,
      'expenses',
    );

    // Calculer le bénéfice (CA - Dépenses)
    const profitToday: PeriodMetricsDto = {
      amount: revenueToday.amount - expensesToday.amount,
      previousAmount: revenueToday.previousAmount - expensesYesterday.amount,
      changePercent:
        revenueToday.previousAmount - expensesYesterday.amount === 0
          ? 0
          : ((revenueToday.amount -
              expensesToday.amount -
              (revenueToday.previousAmount - expensesYesterday.amount)) /
              (revenueToday.previousAmount - expensesYesterday.amount)) *
            100,
    };

    // Pour hier, comparer avec avant-hier
    const dayBeforeYesterday = new Date(yesterday);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
    const dayBeforeYesterdayEnd = new Date(dayBeforeYesterday);
    dayBeforeYesterdayEnd.setHours(23, 59, 59, 999);

    const revenueDayBefore = this.calculateRevenue(
      companyId,
      dayBeforeYesterday,
      dayBeforeYesterdayEnd,
    );
    const expensesDayBefore = this.calculateExpenses(
      companyId,
      dayBeforeYesterday,
      dayBeforeYesterdayEnd,
    );

    const profitYesterday: PeriodMetricsDto = {
      amount: revenueYesterday.amount - expensesYesterday.amount,
      previousAmount: revenueDayBefore - expensesDayBefore,
      changePercent:
        revenueDayBefore - expensesDayBefore === 0
          ? 0
          : ((revenueYesterday.amount -
              expensesYesterday.amount -
              (revenueDayBefore - expensesDayBefore)) /
              (revenueDayBefore - expensesDayBefore)) *
            100,
    };

    // Pour la semaine, calculer la semaine précédente
    const previousWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousWeekEnd = weekAgo;
    const revenuePreviousWeek = this.calculateRevenue(
      companyId,
      previousWeekStart,
      previousWeekEnd,
    );
    const expensesPreviousWeek = this.calculateExpenses(
      companyId,
      previousWeekStart,
      previousWeekEnd,
    );

    const profitWeek: PeriodMetricsDto = {
      amount: revenueWeek.amount - expensesWeek.amount,
      previousAmount: revenuePreviousWeek - expensesPreviousWeek,
      changePercent:
        revenuePreviousWeek - expensesPreviousWeek === 0
          ? 0
          : ((revenueWeek.amount -
              expensesWeek.amount -
              (revenuePreviousWeek - expensesPreviousWeek)) /
              (revenuePreviousWeek - expensesPreviousWeek)) *
            100,
    };

    // Pour le mois, calculer le mois précédent
    const revenuePreviousMonth = this.calculateRevenue(
      companyId,
      lastMonthStart,
      lastMonthEnd,
    );
    const expensesPreviousMonth = this.calculateExpenses(
      companyId,
      lastMonthStart,
      lastMonthEnd,
    );

    const profitMonth: PeriodMetricsDto = {
      amount: revenueMonth.amount - expensesMonth.amount,
      previousAmount: revenuePreviousMonth - expensesPreviousMonth,
      changePercent:
        revenuePreviousMonth - expensesPreviousMonth === 0
          ? 0
          : ((revenueMonth.amount -
              expensesMonth.amount -
              (revenuePreviousMonth - expensesPreviousMonth)) /
              (revenuePreviousMonth - expensesPreviousMonth)) *
            100,
    };

    // Calculer la trésorerie (CA total - Dépenses totales)
    const cashFlow = revenueMonth.amount - expensesMonth.amount;

    // Récupérer les autres métriques
    const topClients = this.getTopClients(companyId, 5);
    const atRiskClients = this.getAtRiskClients(companyId);
    const outOfStockProducts = this.getOutOfStockProducts(companyId);
    const lowRotationProducts = this.getLowRotationProducts(companyId);

    return {
      revenue: {
        today: revenueToday,
        yesterday: revenueYesterday,
        week: revenueWeek,
        month: revenueMonth,
      },
      expenses: {
        today: expensesToday,
        yesterday: expensesYesterday,
        week: expensesWeek,
        month: expensesMonth,
      },
      profit: {
        today: profitToday,
        yesterday: profitYesterday,
        week: profitWeek,
        month: profitMonth,
      },
      cashFlow,
      topClients,
      atRiskClients,
      outOfStockProducts,
      lowRotationProducts,
    };
  }

  /**
   * Récupère l'évolution du CA sur N jours avec comparaison période précédente
   */
  getRevenueEvolution(
    companyId: string,
    days: number = 7,
  ): RevenueEvolutionDto {
    const data: EvolutionDataPointDto[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // CA du jour
      const revenue = this.calculateRevenue(companyId, startOfDay, endOfDay);

      // CA de la période précédente (même jour de la semaine précédente)
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 7);
      const previousStartOfDay = new Date(previousDate);
      previousStartOfDay.setHours(0, 0, 0, 0);
      const previousEndOfDay = new Date(previousDate);
      previousEndOfDay.setHours(23, 59, 59, 999);

      const previousRevenue = this.calculateRevenue(
        companyId,
        previousStartOfDay,
        previousEndOfDay,
      );

      data.push({
        date: date.toISOString().split('T')[0], // Format YYYY-MM-DD
        value: revenue,
        previousValue: previousRevenue,
      });
    }

    return { data };
  }

  /**
   * Récupère l'évolution des dépenses sur N jours avec comparaison période précédente
   */
  getExpensesEvolution(
    companyId: string,
    days: number = 7,
  ): ExpensesEvolutionDto {
    const data: EvolutionDataPointDto[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Dépenses du jour
      const expenses = this.calculateExpenses(companyId, startOfDay, endOfDay);

      // Dépenses de la période précédente
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 7);
      const previousStartOfDay = new Date(previousDate);
      previousStartOfDay.setHours(0, 0, 0, 0);
      const previousEndOfDay = new Date(previousDate);
      previousEndOfDay.setHours(23, 59, 59, 999);

      const previousExpenses = this.calculateExpenses(
        companyId,
        previousStartOfDay,
        previousEndOfDay,
      );

      data.push({
        date: date.toISOString().split('T')[0],
        value: expenses,
        previousValue: previousExpenses,
      });
    }

    return { data };
  }

  /**
   * Récupère l'évolution du bénéfice sur N jours
   */
  getProfitEvolution(companyId: string, days: number = 7): ProfitEvolutionDto {
    const data: EvolutionDataPointDto[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // CA et dépenses du jour
      const revenue = this.calculateRevenue(companyId, startOfDay, endOfDay);
      const expenses = this.calculateExpenses(companyId, startOfDay, endOfDay);
      const profit = revenue - expenses;

      // Bénéfice de la période précédente
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 7);
      const previousStartOfDay = new Date(previousDate);
      previousStartOfDay.setHours(0, 0, 0, 0);
      const previousEndOfDay = new Date(previousDate);
      previousEndOfDay.setHours(23, 59, 59, 999);

      const previousRevenue = this.calculateRevenue(
        companyId,
        previousStartOfDay,
        previousEndOfDay,
      );
      const previousExpenses = this.calculateExpenses(
        companyId,
        previousStartOfDay,
        previousEndOfDay,
      );
      const previousProfit = previousRevenue - previousExpenses;

      data.push({
        date: date.toISOString().split('T')[0],
        value: profit,
        previousValue: previousProfit,
      });
    }

    return { data };
  }

  /**
   * Récupère la répartition des méthodes de paiement
   */
  getPaymentMethodsDistribution(
    companyId: string,
    period: 'today' | 'week' | 'month' = 'week',
  ): PaymentMethodsDistributionDto {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const db = getDatabase();

    const sales = db
      .prepare(
        `SELECT paymentMethod, totalAmount
         FROM sales
         WHERE companyId = ? AND status = 'COMPLETED'
         AND createdAt >= ? AND deletedAt IS NULL`
      )
      .all(companyId, startDate.toISOString()) as Array<{
        paymentMethod: string;
        totalAmount: number;
      }>;

    // Grouper par méthode de paiement
    const distribution = new Map<
      string,
      { count: number; totalAmount: number }
    >();

    sales.forEach((sale) => {
      const method = sale.paymentMethod || 'CASH';
      const current = distribution.get(method) || { count: 0, totalAmount: 0 };
      distribution.set(method, {
        count: current.count + 1,
        totalAmount: current.totalAmount + Number(sale.totalAmount),
      });
    });

    // Calculer le total
    const totalAmount = Array.from(distribution.values()).reduce(
      (sum, item) => sum + item.totalAmount,
      0,
    );
    const totalCount = Array.from(distribution.values()).reduce(
      (sum, item) => sum + item.count,
      0,
    );

    // Convertir en array avec pourcentages
    const data: PaymentMethodDistributionDto[] = Array.from(
      distribution.entries(),
    ).map(([method, stats]) => ({
      method,
      count: stats.count,
      totalAmount: stats.totalAmount,
      percentage: totalAmount === 0 ? 0 : (stats.totalAmount / totalAmount) * 100,
    }));

    // Trier par montant décroissant
    data.sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      data,
      totalAmount,
      totalCount,
    };
  }

  /**
   * Récupère les top produits vendus
   */
  getTopProducts(
    companyId: string,
    limit: number = 10,
    period: 'week' | 'month' = 'month',
  ): TopProductsDto {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const db = getDatabase();

    // Récupérer d'abord les IDs des ventes qui correspondent aux critères
    const sales = db
      .prepare(
        `SELECT id
         FROM sales
         WHERE companyId = ? AND status = 'COMPLETED'
         AND createdAt >= ? AND deletedAt IS NULL`
      )
      .all(companyId, startDate.toISOString()) as Array<{ id: string }>;

    if (sales.length === 0) {
      return {
        data: [],
        period,
      };
    }

    const saleIds = sales.map((s) => s.id);

    // Récupérer les SaleItems pour ces ventes
    const salePlaceholders = saleIds.map(() => '?').join(',');
    const saleItems = db
      .prepare(
        `SELECT productId, quantity, unitPrice
         FROM sale_items
         WHERE saleId IN (${salePlaceholders})`
      )
      .all(...saleIds) as Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
      }>;

    // Grouper manuellement par productId
    const productSalesMap = new Map<string, { quantity: number; amount: number }>();
    for (const item of saleItems) {
      const existing = productSalesMap.get(item.productId) || {
        quantity: 0,
        amount: 0,
      };
      productSalesMap.set(item.productId, {
        quantity: existing.quantity + item.quantity,
        amount: existing.amount + item.quantity * Number(item.unitPrice),
      });
    }

    // Trier par quantité et prendre les N premiers
    const sortedProducts = Array.from(productSalesMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, limit);

    // Récupérer les informations des produits
    const productIds = sortedProducts.map(([productId]) => productId);

    if (productIds.length === 0) {
      return {
        data: [],
        period,
      };
    }

    const productPlaceholders = productIds.map(() => '?').join(',');
    const products = db
      .prepare(
        `SELECT id, name
         FROM products
         WHERE id IN (${productPlaceholders}) AND companyId = ? AND deletedAt IS NULL`
      )
      .all(...productIds, companyId) as Array<{ id: string; name: string }>;

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const data: TopProductDto[] = sortedProducts.map(([productId, stats]) => {
      const productName = productMap.get(productId) || 'Produit inconnu';
      return {
        productId,
        productName,
        quantitySold: stats.quantity,
        totalAmount: stats.amount,
      };
    });

    return {
      data,
      period,
    };
  }
}
