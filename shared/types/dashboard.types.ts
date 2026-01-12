export interface PeriodMetricsDto {
  amount: number;
  previousAmount: number;
  changePercent: number; // Pourcentage de variation
}

export interface RevenueMetricsDto {
  today: PeriodMetricsDto;
  yesterday: PeriodMetricsDto;
  week: PeriodMetricsDto;
  month: PeriodMetricsDto;
}

export interface TopClientDto {
  clientId: string;
  clientName: string;
  totalAmount: number;
  saleCount: number;
}

export interface AtRiskClientDto {
  clientId: string;
  clientName: string;
  balance: number;
  lastSaleDate: string; // ISO date string
  daysOverdue: number;
}

export interface OutOfStockProductDto {
  productId: string;
  productName: string;
  currentStock: number;
  stockMin: number;
}

export interface LowRotationProductDto {
  productId: string;
  productName: string;
  saleCount: number;
  lastSaleDate?: string; // ISO date string
}

export interface DashboardResponseDto {
  revenue: RevenueMetricsDto;
  expenses: RevenueMetricsDto; // Même structure que revenue
  profit: RevenueMetricsDto; // Bénéfice (CA - Dépenses)
  cashFlow: number; // Trésorerie estimée (CA total - Dépenses totales)
  topClients: TopClientDto[];
  atRiskClients: AtRiskClientDto[];
  outOfStockProducts: OutOfStockProductDto[];
  lowRotationProducts: LowRotationProductDto[];
}

export interface EvolutionDataPointDto {
  date: string; // Format ISO ou YYYY-MM-DD
  value: number; // Valeur du jour
  previousValue?: number; // Valeur de la période précédente (pour comparaison)
}

export interface RevenueEvolutionDto {
  data: EvolutionDataPointDto[];
}

export interface ExpensesEvolutionDto {
  data: EvolutionDataPointDto[];
}

export interface ProfitEvolutionDto {
  data: EvolutionDataPointDto[];
}

export interface PaymentMethodDistributionDto {
  method: string; // CASH, MOBILE_MONEY, BANK_TRANSFER, CHECK
  count: number; // Nombre de transactions
  totalAmount: number; // Montant total
  percentage: number; // Pourcentage du total
}

export interface PaymentMethodsDistributionDto {
  data: PaymentMethodDistributionDto[];
  totalAmount: number;
  totalCount: number;
}

export interface TopProductDto {
  productId: string;
  productName: string;
  quantitySold: number;
  totalAmount: number;
}

export interface TopProductsDto {
  data: TopProductDto[];
  period: 'week' | 'month';
}
