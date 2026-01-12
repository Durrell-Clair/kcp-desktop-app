// Application principale
let currentPage = 'login';
let apiBaseUrl = 'http://localhost:3000/api';

// Initialiser l'application
document.addEventListener('DOMContentLoaded', async () => {
    // Récupérer le port du serveur Electron si disponible
    if (window.electronAPI) {
        try {
            const port = await window.electronAPI.getLocalServerPort();
            apiBaseUrl = `http://localhost:${port}/api`;
        } catch (error) {
            console.error('Erreur lors de la récupération du port:', error);
        }
    }

    // Vérifier si l'utilisateur est déjà connecté
    const token = localStorage.getItem('accessToken');
    if (token) {
        // Vérifier si le token est valide
        try {
            const response = await fetch(`${apiBaseUrl}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                navigateTo('dashboard');
                return;
            }
        } catch (error) {
            console.error('Erreur de vérification du token:', error);
        }
    }

    // Afficher la page de connexion
    navigateTo('login');
});

// Navigation entre les pages
function navigateTo(page) {
    currentPage = page;
    
    // Charger la page correspondante
    if (page === 'login') {
        loadLoginPage();
    } else if (page === 'dashboard') {
        loadDashboardPage();
    } else {
        loadPage(page);
    }
}

// Charger la page de connexion
function loadLoginPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-wrapper">
            <div class="form-container">
                <h2 class="text-center mb-20">Connexion à votre compte</h2>
                <p class="text-center mb-30" style="color: #666;">Accédez à votre tableau de bord KAMER KASH PME</p>
                <form id="loginForm">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required placeholder="votre@email.com">
                    </div>
                    <div class="form-group">
                        <label for="password">Mot de passe</label>
                        <input type="password" id="password" name="password" required placeholder="Votre mot de passe">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        <span class="btn-text">Se connecter</span>
                        <span class="btn-loader hidden"></span>
                    </button>
                </form>
                <p class="text-center mt-20" style="color: #666; font-size: 14px;">
                    Pas encore de compte ? <a href="#" id="registerLink" class="link-primary">Créer un compte</a>
                </p>
            </div>
        </div>
    `;

    // Gérer la soumission du formulaire
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        loadRegisterPage();
    });
}

// Charger la page d'inscription
function loadRegisterPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-wrapper">
            <div class="form-container">
                <h2 class="text-center mb-20">Créer un compte</h2>
                <p class="text-center mb-30" style="color: #666;">Créez votre compte pour commencer</p>
                <form id="registerForm">
                    <div class="form-group">
                        <label for="reg-email">Email</label>
                        <input type="email" id="reg-email" name="email" required placeholder="votre@email.com">
                    </div>
                    <div class="form-group">
                        <label for="reg-password">Mot de passe</label>
                        <input type="password" id="reg-password" name="password" required minlength="6" placeholder="Minimum 6 caractères">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="reg-firstname">Prénom</label>
                            <input type="text" id="reg-firstname" name="firstName" required placeholder="Votre prénom">
                        </div>
                        <div class="form-group">
                            <label for="reg-lastname">Nom</label>
                            <input type="text" id="reg-lastname" name="lastName" required placeholder="Votre nom">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="reg-company">Nom de l'entreprise</label>
                        <input type="text" id="reg-company" name="companyName" required placeholder="Nom de votre entreprise">
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">
                        <span class="btn-text">Créer le compte</span>
                        <span class="btn-loader hidden"></span>
                    </button>
                </form>
                <p class="text-center mt-20" style="color: #666; font-size: 14px;">
                    Déjà un compte ? <a href="#" id="loginLink" class="link-primary">Se connecter</a>
                </p>
            </div>
        </div>
    `;

    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('loginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        loadLoginPage();
    });
}

// Gérer la connexion
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Désactiver le bouton et afficher le loader
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');

    try {
        const response = await fetch(`${apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            showToast('Connexion réussie !', 'success');
            navigateTo('dashboard');
        } else {
            showToast(data.message || 'Erreur de connexion', 'error');
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showToast('Erreur de connexion. Vérifiez que le serveur est démarré.', 'error');
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

// Gérer l'inscription
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Désactiver le bouton et afficher le loader
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    const data = {
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        companyName: formData.get('companyName')
    };

    try {
        const response = await fetch(`${apiBaseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Compte créé avec succès ! Vous pouvez maintenant vous connecter.', 'success');
            setTimeout(() => {
                loadLoginPage();
            }, 1500);
        } else {
            showToast(result.message || 'Erreur lors de la création du compte', 'error');
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        showToast('Erreur lors de la création du compte. Vérifiez que le serveur est démarré.', 'error');
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}

// Charger la page dashboard
async function loadDashboardPage() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        navigateTo('login');
        return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h1>KAMER KASH PME</h1>
                </div>
                <nav class="sidebar-nav">
                    <div class="nav-item active" data-page="dashboard">
                        📊 Tableau de bord
                    </div>
                    <div class="nav-item" data-page="products">
                        📦 Produits
                    </div>
                    <div class="nav-item" data-page="clients">
                        👥 Clients
                    </div>
                    <div class="nav-item" data-page="sales">
                        💰 Ventes
                    </div>
                    <div class="nav-item" data-page="expenses">
                        💸 Dépenses
                    </div>
                    <div class="nav-item" data-page="stock">
                        📋 Stock
                    </div>
                    <div class="nav-item" data-page="settings">
                        ⚙️ Paramètres
                    </div>
                    <div class="nav-item" data-page="logout" style="margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        🚪 Déconnexion
                    </div>
                </nav>
            </div>
            <div class="main-content">
                <div class="header">
                    <h2>Tableau de bord</h2>
                    <div id="userInfo"></div>
                </div>
                <div class="content" id="dashboardContent">
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <p>Chargement des données...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Gérer la navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page === 'logout') {
                handleLogout();
            } else {
                // Mettre à jour l'état actif
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Charger la page correspondante
                switch(page) {
                    case 'dashboard':
                        loadDashboardContent();
                        break;
                    case 'products':
                        // Charger dynamiquement le module products
                        import('./pages/products.js').then(module => {
                            module.loadProductsPage();
                        });
                        break;
                    case 'clients':
                        import('./pages/clients.js').then(module => {
                            module.loadClientsPage();
                        });
                        break;
                    case 'sales':
                        import('./pages/sales.js').then(module => {
                            module.loadSalesPage();
                        });
                        break;
                    case 'expenses':
                        import('./pages/expenses.js').then(module => {
                            module.loadExpensesPage();
                        });
                        break;
                    case 'stock':
                        import('./pages/stock.js').then(module => {
                            module.loadStockPage();
                        });
                        break;
                    case 'settings':
                        import('./pages/settings.js').then(module => {
                            module.loadSettingsPage();
                        });
                        break;
                    default:
                        console.warn('Page inconnue:', page);
                }
            }
        });
    });

    // Charger le contenu du dashboard
    await loadDashboardContent();
}

// Charger le contenu du dashboard
async function loadDashboardContent() {
    const token = localStorage.getItem('accessToken');
    const content = document.getElementById('dashboardContent');

    try {
        const response = await fetch(`${apiBaseUrl}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            navigateTo('login');
            return;
        }

        const data = await response.json();

        // Extraire les valeurs correctement
        const revenueAmount = data.revenue?.month?.amount || 0;
        const expensesAmount = data.expenses?.month?.amount || 0;
        const profitAmount = revenueAmount - expensesAmount;
        const cashFlowAmount = data.cashFlow || 0;

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="card">
                    <div class="card-header">Revenus (Mois)</div>
                    <div style="font-size: 32px; font-weight: bold; color: #10b981;">
                        ${formatCurrency(revenueAmount)}
                    </div>
                    ${data.revenue?.month?.changePercent !== undefined ? `
                        <div style="margin-top: 8px; font-size: 14px; color: ${data.revenue.month.changePercent >= 0 ? '#10b981' : '#ef4444'};">
                            ${data.revenue.month.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(data.revenue.month.changePercent).toFixed(1)}% vs mois précédent
                        </div>
                    ` : ''}
                </div>
                <div class="card">
                    <div class="card-header">Dépenses (Mois)</div>
                    <div style="font-size: 32px; font-weight: bold; color: #ef4444;">
                        ${formatCurrency(expensesAmount)}
                    </div>
                    ${data.expenses?.month?.changePercent !== undefined ? `
                        <div style="margin-top: 8px; font-size: 14px; color: ${data.expenses.month.changePercent >= 0 ? '#ef4444' : '#10b981'};">
                            ${data.expenses.month.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(data.expenses.month.changePercent).toFixed(1)}% vs mois précédent
                        </div>
                    ` : ''}
                </div>
                <div class="card">
                    <div class="card-header">Bénéfice (Mois)</div>
                    <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">
                        ${formatCurrency(profitAmount)}
                    </div>
                    ${data.profit?.month?.changePercent !== undefined ? `
                        <div style="margin-top: 8px; font-size: 14px; color: ${data.profit.month.changePercent >= 0 ? '#10b981' : '#ef4444'};">
                            ${data.profit.month.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(data.profit.month.changePercent).toFixed(1)}% vs mois précédent
                        </div>
                    ` : ''}
                </div>
                <div class="card">
                    <div class="card-header">Trésorerie</div>
                    <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">
                        ${formatCurrency(cashFlowAmount)}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">Aperçu rapide</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    ${data.topClients && data.topClients.length > 0 ? `
                        <div>
                            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #6b7280;">Top Clients</h3>
                            <ul style="list-style: none; padding: 0;">
                                ${data.topClients.slice(0, 3).map(client => `
                                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                        <div style="font-weight: 500;">${client.clientName}</div>
                                        <div style="font-size: 14px; color: #6b7280;">${formatCurrency(client.totalAmount)}</div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${data.outOfStockProducts && data.outOfStockProducts.length > 0 ? `
                        <div>
                            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #ef4444;">Produits en rupture</h3>
                            <ul style="list-style: none; padding: 0;">
                                ${data.outOfStockProducts.slice(0, 3).map(product => `
                                    <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                        <div style="font-weight: 500;">${product.productName}</div>
                                        <div style="font-size: 14px; color: #6b7280;">Stock: ${product.currentStock}</div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
        content.innerHTML = `
            <div class="card">
                <div class="card-header">Erreur</div>
                <p>Impossible de charger les données du tableau de bord.</p>
                <p style="margin-top: 10px; color: #666;">Vérifiez que le serveur est démarré.</p>
            </div>
        `;
    }
}

// Déconnexion
function handleLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigateTo('login');
}

// Formater la monnaie
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-CM', {
        style: 'currency',
        currency: 'XAF'
    }).format(amount);
}

// Système de notifications toast (exporté globalement)
function showToast(message, type = 'info') {
    // Créer le conteneur toast s'il n'existe pas
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Créer le toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animation d'entrée
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Exporter les fonctions globalement pour utilisation dans les modules
window.showToast = showToast;
window.updatePageContent = updatePageContent;

// Fonction pour mettre à jour le contenu de la page sans recharger la sidebar (exportée globalement)
function updatePageContent(title, contentHTML) {
    const header = document.querySelector('.header h2');
    const content = document.getElementById('dashboardContent') || document.querySelector('.content') || document.querySelector('.main-content .content');
    
    if (header) {
        header.textContent = title;
    }
    
    if (content) {
        content.innerHTML = contentHTML;
    } else {
        console.error('Impossible de trouver le conteneur de contenu');
    }
}

// Charger la page produits
async function loadProductsPage() {
    const token = localStorage.getItem('accessToken');
    updatePageContent('Produits', `
        <div class="card">
            <div class="card-header">Gestion des Produits</div>
            <p>Cette page est en cours de développement.</p>
            <p style="margin-top: 10px; color: #6b7280;">Vous pourrez bientôt gérer votre catalogue de produits ici.</p>
        </div>
    `);
}

// Charger la page clients
async function loadClientsPage() {
    const token = localStorage.getItem('accessToken');
    updatePageContent('Clients', `
        <div class="card">
            <div class="card-header">Gestion des Clients</div>
            <p>Cette page est en cours de développement.</p>
            <p style="margin-top: 10px; color: #6b7280;">Vous pourrez bientôt gérer vos clients ici.</p>
        </div>
    `);
}

// Charger la page ventes
async function loadSalesPage() {
    const token = localStorage.getItem('accessToken');
    updatePageContent('Ventes', `
        <div class="card">
            <div class="card-header">Gestion des Ventes</div>
            <p>Cette page est en cours de développement.</p>
            <p style="margin-top: 10px; color: #6b7280;">Vous pourrez bientôt enregistrer et gérer vos ventes ici.</p>
        </div>
    `);
}

// Charger la page dépenses
async function loadExpensesPage() {
    const token = localStorage.getItem('accessToken');
    updatePageContent('Dépenses', `
        <div class="card">
            <div class="card-header">Gestion des Dépenses</div>
            <p>Cette page est en cours de développement.</p>
            <p style="margin-top: 10px; color: #6b7280;">Vous pourrez bientôt enregistrer et suivre vos dépenses ici.</p>
        </div>
    `);
}

// Charger la page stock
async function loadStockPage() {
    const token = localStorage.getItem('accessToken');
    updatePageContent('Stock', `
        <div class="card">
            <div class="card-header">Gestion du Stock</div>
            <p>Cette page est en cours de développement.</p>
            <p style="margin-top: 10px; color: #6b7280;">Vous pourrez bientôt gérer votre inventaire ici.</p>
        </div>
    `);
}

// Charger la page paramètres
async function loadSettingsPage() {
    const token = localStorage.getItem('accessToken');
    updatePageContent('Paramètres', `
        <div class="card">
            <div class="card-header">Paramètres</div>
            <p>Cette page est en cours de développement.</p>
            <p style="margin-top: 10px; color: #6b7280;">Vous pourrez bientôt configurer votre application ici.</p>
        </div>
    `);
}

// Charger une page générique
function loadPage(page) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="card">
            <div class="card-header">${page}</div>
            <p>Page ${page} - En cours de développement</p>
        </div>
    `;
}
