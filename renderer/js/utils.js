// Utilitaires pour l'application

/**
 * Formate un montant en monnaie XAF
 */
export function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0 FCFA';
    }
    return new Intl.NumberFormat('fr-CM', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Formate une date au format français
 */
export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

/**
 * Formate une date courte (JJ/MM/AAAA)
 */
export function formatDateShort(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

/**
 * Formate un numéro de téléphone
 */
export function formatPhone(phone) {
    if (!phone) return '';
    // Format camerounais : +237 6XX XXX XXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9 && cleaned.startsWith('6')) {
        return `+237 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
}

/**
 * Détermine le statut du stock
 */
export function getStockStatus(stock, stockMin, stockMax) {
    if (stock === 0) return 'RUPTURE';
    if (stock < stockMin) return 'FAIBLE';
    if (stockMax && stock > stockMax) return 'SUR_STOCK';
    return 'NORMAL';
}

/**
 * Obtient la couleur du statut stock
 */
export function getStockStatusColor(status) {
    const colors = {
        'RUPTURE': '#ef4444',
        'FAIBLE': '#f59e0b',
        'NORMAL': '#10b981',
        'SUR_STOCK': '#eab308'
    };
    return colors[status] || '#6b7280';
}

/**
 * Obtient le label du statut stock
 */
export function getStockStatusLabel(status) {
    const labels = {
        'RUPTURE': 'Rupture',
        'FAIBLE': 'Faible',
        'NORMAL': 'Normal',
        'SUR_STOCK': 'Sur-stock'
    };
    return labels[status] || status;
}

/**
 * Débounce une fonction
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Valide un email
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Valide un numéro de téléphone camerounais
 */
export function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 9 && cleaned.startsWith('6');
}

/**
 * Génère un ID unique
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
