// Client API centralisé pour toutes les requêtes

let apiBaseUrl = 'http://localhost:3000/api';

// Initialiser l'URL de base
async function initApiUrl() {
    if (typeof window !== 'undefined' && window.electronAPI) {
        try {
            const port = await window.electronAPI.getLocalServerPort();
            apiBaseUrl = `http://localhost:${port}/api`;
        } catch (error) {
            console.error('Erreur lors de la récupération du port:', error);
        }
    }
}

// Initialiser au chargement
if (typeof window !== 'undefined') {
    initApiUrl();
}

/**
 * Effectue une requête API avec authentification
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token expiré, rediriger vers login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined' && window.navigateTo) {
            window.navigateTo('login');
        }
        throw new Error('Session expirée');
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erreur serveur' }));
        throw new Error(error.message || `Erreur ${response.status}`);
    }
    
    return response.json();
}

// API Auth
export const authApi = {
    register: (data) => apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    login: (data) => apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    refresh: (refreshToken) => apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
    }),
    logout: () => apiRequest('/auth/logout', { method: 'POST' })
};

// API Products
export const productsApi = {
    getProducts: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return apiRequest(`/products?${params}`);
    },
    getProduct: (id) => apiRequest(`/products/${id}`),
    createProduct: (data) => apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateProduct: (id, data) => apiRequest(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteProduct: (id) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
    getCategories: () => apiRequest('/products/categories'),
    createCategory: (data) => apiRequest('/products/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateCategory: (id, data) => apiRequest(`/products/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteCategory: (id) => apiRequest(`/products/categories/${id}`, { method: 'DELETE' })
};

// API Clients
export const clientsApi = {
    getClients: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return apiRequest(`/clients?${params}`);
    },
    getClient: (id) => apiRequest(`/clients/${id}`),
    createClient: (data) => apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateClient: (id, data) => apiRequest(`/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteClient: (id) => apiRequest(`/clients/${id}`, { method: 'DELETE' }),
    getReceivables: (id) => apiRequest(`/clients/${id}/receivables`)
};

// API Sales
export const salesApi = {
    getSales: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return apiRequest(`/sales?${params}`);
    },
    getSale: (id) => apiRequest(`/sales/${id}`),
    createSale: (data) => apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    cancelSale: (id) => apiRequest(`/sales/${id}/cancel`, { method: 'POST' }),
    deleteSale: (id) => apiRequest(`/sales/${id}`, { method: 'DELETE' })
};

// API Payments
export const paymentsApi = {
    getPayments: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return apiRequest(`/payments?${params}`);
    },
    getPayment: (id) => apiRequest(`/payments/${id}`),
    createPayment: (data) => apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deletePayment: (id) => apiRequest(`/payments/${id}`, { method: 'DELETE' })
};

// API Expenses
export const expensesApi = {
    getExpenses: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return apiRequest(`/expenses?${params}`);
    },
    getExpense: (id) => apiRequest(`/expenses/${id}`),
    createExpense: (data) => apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateExpense: (id, data) => apiRequest(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    approveExpense: (id) => apiRequest(`/expenses/${id}/approve`, { method: 'POST' }),
    rejectExpense: (id, reason) => apiRequest(`/expenses/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
    }),
    deleteExpense: (id) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
    getCategories: () => apiRequest('/expenses/categories'),
    createCategory: (data) => apiRequest('/expenses/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateCategory: (id, data) => apiRequest(`/expenses/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteCategory: (id) => apiRequest(`/expenses/categories/${id}`, { method: 'DELETE' })
};

// API Stock Movements
export const stockMovementsApi = {
    getStockMovements: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return apiRequest(`/stock-movements?${params}`);
    },
    getStockMovement: (id) => apiRequest(`/stock-movements/${id}`),
    createStockMovement: (data) => apiRequest('/stock-movements', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteStockMovement: (id) => apiRequest(`/stock-movements/${id}`, { method: 'DELETE' })
};

// API Users
export const usersApi = {
    getUsers: () => apiRequest('/users'),
    getUser: (id) => apiRequest(`/users/${id}`),
    createUser: (data) => apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateUser: (id, data) => apiRequest(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteUser: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' })
};

// API Companies
export const companiesApi = {
    getCompany: () => apiRequest('/companies'),
    updateCompany: (data) => apiRequest('/companies', {
        method: 'PATCH',
        body: JSON.stringify(data)
    })
};

// API Dashboard
export const dashboardApi = {
    getDashboard: () => apiRequest('/dashboard'),
    getRevenueEvolution: (days = 30) => apiRequest(`/dashboard/revenue-evolution?days=${days}`),
    getExpensesEvolution: (days = 30) => apiRequest(`/dashboard/expenses-evolution?days=${days}`),
    getProfitEvolution: (days = 30) => apiRequest(`/dashboard/profit-evolution?days=${days}`),
    getPaymentMethodsDistribution: (startDate, endDate) => {
        const params = new URLSearchParams({ startDate, endDate });
        return apiRequest(`/dashboard/payment-methods?${params}`);
    },
    getTopProducts: (limit = 10, period = 'month') => {
        return apiRequest(`/dashboard/top-products?limit=${limit}&period=${period}`);
    }
};
