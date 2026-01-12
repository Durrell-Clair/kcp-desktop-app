// Page de gestion des dépenses

import { expensesApi } from '../api.js';
import { formatCurrency, formatDateShort } from '../utils.js';
import { createTable, createBadge } from '../components/table.js';
import { createModal, confirmModal } from '../components/modal.js';
import { createFormField } from '../components/form.js';

let currentUser = null;

async function initUser() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUser = payload;
        } catch (error) {
            console.error('Erreur décodage token:', error);
        }
    }
}

function canApprove() {
    if (!currentUser) return false;
    return ['PROPRIETAIRE', 'MANAGER'].includes(currentUser.role);
}

function canEdit() {
    if (!currentUser) return false;
    return ['PROPRIETAIRE', 'MANAGER', 'MAGASINIER'].includes(currentUser.role);
}

export async function loadExpensesPage() {
    await initUser();
    
    updatePageContent('Dépenses', `
        <div style="padding: 24px;">
            <div class="card" style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">Dépenses</h2>
                        <p style="color: #6b7280; margin: 0;">Gérez les dépenses de l'entreprise</p>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        ${canEdit() ? `
                            <button class="btn btn-secondary" onclick="loadExpenseCategoriesPage()" style="padding: 10px 20px;">
                                Catégories
                            </button>
                            <button class="btn btn-primary" onclick="showCreateExpenseModal()" style="padding: 10px 20px;">
                                + Nouvelle dépense
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Filtres -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <input type="date" id="expenseDateFrom" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <input type="date" id="expenseDateTo" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <select id="expenseStatusFilter" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                        <option value="">Tous les statuts</option>
                        <option value="PENDING">En attente</option>
                        <option value="APPROVED">Approuvé</option>
                        <option value="REJECTED">Rejeté</option>
                    </select>
                    <button class="btn btn-primary" onclick="filterExpenses()" style="padding: 10px 20px;">Filtrer</button>
                </div>

                <!-- Tableau des dépenses -->
                <div id="expensesTableContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement des dépenses...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadExpenses();
    await loadExpenseCategories();
}

async function loadExpenses(filters = {}) {
    const container = document.getElementById('expensesTableContainer');
    if (!container) return;

    try {
        const expenses = await expensesApi.getExpenses(filters);

        if (expenses.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucune dépense trouvée</p>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'date', label: 'Date', render: (value) => formatDateShort(value) },
            { key: 'categoryName', label: 'Catégorie' },
            { key: 'description', label: 'Description' },
            { 
                key: 'amount', 
                label: 'Montant',
                align: 'right',
                render: (value) => formatCurrency(value)
            },
            { 
                key: 'status', 
                label: 'Statut',
                render: (value) => {
                    const statuses = {
                        'PENDING': { label: 'En attente', color: '#f59e0b' },
                        'APPROVED': { label: 'Approuvé', color: '#10b981' },
                        'REJECTED': { label: 'Rejeté', color: '#ef4444' }
                    };
                    const status = statuses[value] || { label: value, color: '#6b7280' };
                    return createBadge(status.label, status.color).outerHTML;
                }
            }
        ];

        const actions = [];
        if (canApprove()) {
            actions.push(
                { label: 'Approuver', variant: 'btn-secondary', onClick: (expense) => handleApproveExpense(expense), 
                    visible: (expense) => expense.status === 'PENDING' },
                { label: 'Rejeter', variant: 'btn-danger', onClick: (expense) => handleRejectExpense(expense),
                    visible: (expense) => expense.status === 'PENDING' }
            );
        }
        if (canEdit()) {
            actions.push(
                { label: 'Modifier', variant: 'btn-secondary', onClick: (expense) => showEditExpenseModal(expense),
                    visible: (expense) => expense.status === 'PENDING' },
                { label: 'Supprimer', variant: 'btn-danger', onClick: (expense) => handleDeleteExpense(expense) }
            );
        }

        // Filtrer les actions selon la visibilité
        const filteredActions = actions.map(action => ({
            ...action,
            onClick: action.onClick
        })).filter((action, index) => {
            // Pour simplifier, on affiche toutes les actions mais on peut filtrer ici
            return true;
        });

        const table = createTable({
            columns,
            data: expenses,
            actions: filteredActions
        });

        container.innerHTML = '';
        container.appendChild(table);

    } catch (error) {
        console.error('Erreur chargement dépenses:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement des dépenses</p>
            </div>
        `;
    }
}

async function loadExpenseCategories() {
    try {
        const categories = await expensesApi.getCategories();
        const select = document.getElementById('expenseCategoryFilter');
        if (select) {
            select.innerHTML = '<option value="">Toutes les catégories</option>' +
                categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Erreur chargement catégories:', error);
    }
}

window.filterExpenses = async function() {
    const dateFrom = document.getElementById('expenseDateFrom')?.value || '';
    const dateTo = document.getElementById('expenseDateTo')?.value || '';
    const status = document.getElementById('expenseStatusFilter')?.value || '';
    const categoryId = document.getElementById('expenseCategoryFilter')?.value || '';
    
    const filters = {};
    if (dateFrom) filters.startDate = dateFrom;
    if (dateTo) filters.endDate = dateTo;
    if (status) filters.status = status;
    if (categoryId) filters.categoryId = categoryId;
    
    await loadExpenses(filters);
};

window.showCreateExpenseModal = async function() {
    try {
        let categories;
        try {
            categories = await expensesApi.getCategories();
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
            showToast('Erreur lors du chargement des catégories. Le formulaire sera affiché sans catégories.', 'error');
            categories = [];
        }
        
        const formContent = document.createElement('form');
        formContent.id = 'expenseForm';
        formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

        const categoryOptions = [
            { value: '', label: 'Sélectionner une catégorie' },
            ...categories.map(cat => ({ value: cat.id, label: cat.name }))
        ];
        const categoryField = createFormField({
            label: 'Catégorie',
            name: 'categoryId',
            type: 'select',
            value: '',
            required: true,
            options: categoryOptions
        });
        formContent.appendChild(categoryField);

        const amountField = createFormField({
            label: 'Montant (FCFA)',
            name: 'amount',
            type: 'number',
            value: '',
            required: true
        });
        formContent.appendChild(amountField);

        const descField = createFormField({
            label: 'Description',
            name: 'description',
            type: 'textarea',
            value: '',
            rows: 4,
            required: true
        });
        formContent.appendChild(descField);

        createModal({
            title: 'Nouvelle dépense',
            content: formContent,
            size: 'medium',
            buttons: [
                { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
                {
                    label: 'Enregistrer',
                    variant: 'btn-primary',
                    onClick: () => handleSubmitExpense(),
                    closeOnClick: false
                }
            ]
        });

    } catch (error) {
        console.error('Erreur lors de la création du formulaire dépense:', error);
        showToast('Erreur lors du chargement du formulaire. Veuillez réessayer.', 'error');
    }
};

function showEditExpenseModal(expense) {
    showExpenseFormModal(expense);
}

async function showExpenseFormModal(expense = null) {
    const isEdit = !!expense;
    try {
        let categories;
        try {
            categories = await expensesApi.getCategories();
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
            showToast('Erreur lors du chargement des catégories. Le formulaire sera affiché sans catégories.', 'error');
            categories = [];
        }
        
        const formContent = document.createElement('form');
        formContent.id = 'expenseForm';
        formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

        const categoryOptions = [
            { value: '', label: 'Sélectionner une catégorie' },
            ...categories.map(cat => ({ value: cat.id, label: cat.name }))
        ];
        const categoryField = createFormField({
            label: 'Catégorie',
            name: 'categoryId',
            type: 'select',
            value: expense?.categoryId || '',
            required: true,
            options: categoryOptions
        });
        formContent.appendChild(categoryField);

        const amountField = createFormField({
            label: 'Montant (FCFA)',
            name: 'amount',
            type: 'number',
            value: expense?.amount || '',
            required: true
        });
        formContent.appendChild(amountField);

        const descField = createFormField({
            label: 'Description',
            name: 'description',
            type: 'textarea',
            value: expense?.description || '',
            rows: 4,
            required: true
        });
        formContent.appendChild(descField);

        createModal({
            title: isEdit ? 'Modifier la dépense' : 'Nouvelle dépense',
            content: formContent,
            size: 'medium',
            buttons: [
                { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
                {
                    label: isEdit ? 'Enregistrer' : 'Créer',
                    variant: 'btn-primary',
                    onClick: () => handleSubmitExpense(expense?.id),
                    closeOnClick: false
                }
            ]
        });

    } catch (error) {
        console.error('Erreur lors de la création du formulaire dépense:', error);
        showToast('Erreur lors du chargement du formulaire. Veuillez réessayer.', 'error');
    }
}

async function handleSubmitExpense(expenseId = null) {
    const form = document.getElementById('expenseForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        categoryId: formData.get('categoryId'),
        amount: parseFloat(formData.get('amount')) || 0,
        description: formData.get('description')
    };

    if (!data.categoryId || !data.amount || !data.description) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    try {
        if (expenseId) {
            await expensesApi.updateExpense(expenseId, data);
            showToast('Dépense modifiée avec succès', 'success');
        } else {
            await expensesApi.createExpense(data);
            showToast('Dépense créée avec succès', 'success');
        }
        
        document.querySelector('.modal-overlay')?.remove();
        await loadExpenses();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
}

async function handleApproveExpense(expense) {
    try {
        await expensesApi.approveExpense(expense.id);
        showToast('Dépense approuvée', 'success');
        await loadExpenses();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
}

async function handleRejectExpense(expense) {
    const reason = prompt('Raison du rejet (optionnel):');
    try {
        await expensesApi.rejectExpense(expense.id, reason || '');
        showToast('Dépense rejetée', 'success');
        await loadExpenses();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
}

async function handleDeleteExpense(expense) {
    confirmModal(
        `Supprimer cette dépense ?`,
        async () => {
            try {
                await expensesApi.deleteExpense(expense.id);
                showToast('Dépense supprimée', 'success');
                await loadExpenses();
            } catch (error) {
                showToast(error.message || 'Erreur', 'error');
            }
        }
    );
}

export async function loadExpenseCategoriesPage() {
    updatePageContent('Catégories Dépenses', `
        <div style="padding: 24px;">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button class="btn btn-secondary" onclick="loadExpensesPage()" style="padding: 8px 16px; display: flex; align-items: center; gap: 8px;">
                            ← Retour aux Dépenses
                        </button>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0;">Catégories de dépenses</h2>
                    </div>
                    ${canEdit() ? `
                        <button class="btn btn-primary" onclick="showCreateExpenseCategoryModal()" style="padding: 10px 20px;">
                            + Nouvelle catégorie
                        </button>
                    ` : ''}
                </div>
                <div id="expenseCategoriesContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadExpenseCategoriesList();
}

async function loadExpenseCategoriesList() {
    const container = document.getElementById('expenseCategoriesContainer');
    if (!container) return;

    try {
        const categories = await expensesApi.getCategories();

        if (categories.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucune catégorie</p>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'name', label: 'Nom' },
            { key: 'description', label: 'Description' }
        ];

        const actions = [];
        if (canEdit()) {
            actions.push(
                { label: 'Modifier', variant: 'btn-secondary', onClick: (cat) => showEditExpenseCategoryModal(cat) },
                { label: 'Supprimer', variant: 'btn-danger', onClick: (cat) => handleDeleteExpenseCategory(cat) }
            );
        }

        const table = createTable({
            columns,
            data: categories,
            actions
        });

        container.innerHTML = '';
        container.appendChild(table);
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p style="font-weight: 600; margin-bottom: 8px;">Erreur lors du chargement des catégories</p>
                <p style="font-size: 14px; color: #6b7280;">${error.message || 'Une erreur est survenue'}</p>
                <button class="btn btn-primary" onclick="loadExpenseCategoriesList()" style="margin-top: 16px; padding: 8px 16px;">
                    Réessayer
                </button>
            </div>
        `;
    }
}

window.showCreateExpenseCategoryModal = function() {
    showExpenseCategoryFormModal();
};

function showEditExpenseCategoryModal(category) {
    showExpenseCategoryFormModal(category);
}

function showExpenseCategoryFormModal(category = null) {
    const isEdit = !!category;
    
    const formContent = document.createElement('form');
    formContent.id = 'expenseCategoryForm';
    formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';
    
    const nameField = createFormField({
        label: 'Nom de la catégorie',
        name: 'name',
        value: category?.name || '',
        required: true
    });
    formContent.appendChild(nameField);
    
    const descField = createFormField({
        label: 'Description',
        name: 'description',
        type: 'textarea',
        value: category?.description || '',
        rows: 3
    });
    formContent.appendChild(descField);

    createModal({
        title: isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie',
        content: formContent,
        size: 'medium',
        buttons: [
            { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
            {
                label: isEdit ? 'Enregistrer' : 'Créer',
                variant: 'btn-primary',
                onClick: () => handleSubmitExpenseCategory(category?.id),
                closeOnClick: false
            }
        ]
    });
}

async function handleSubmitExpenseCategory(categoryId = null) {
    const form = document.getElementById('expenseCategoryForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        description: formData.get('description') || undefined
    };

    if (!data.name) {
        showToast('Le nom est obligatoire', 'error');
        return;
    }

    try {
        if (categoryId) {
            await expensesApi.updateCategory(categoryId, data);
            showToast('Catégorie modifiée', 'success');
        } else {
            await expensesApi.createCategory(data);
            showToast('Catégorie créée', 'success');
        }
        
        // Fermer le modal
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.remove();
        }
        
        // Recharger la liste avec gestion d'erreur
        try {
            await loadExpenseCategoriesList();
        } catch (reloadError) {
            console.error('Erreur lors du rechargement des catégories:', reloadError);
            showToast('Catégorie enregistrée mais erreur lors du rechargement. Veuillez actualiser la page.', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la catégorie:', error);
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function handleDeleteExpenseCategory(category) {
    confirmModal(
        `Supprimer la catégorie "${category.name}" ?`,
        async () => {
            try {
                await expensesApi.deleteCategory(category.id);
                showToast('Catégorie supprimée', 'success');
                await loadExpenseCategoriesList();
            } catch (error) {
                showToast(error.message || 'Erreur', 'error');
            }
        }
    );
}

// Exposer les fonctions globalement pour les boutons onclick
window.loadExpenseCategoriesPage = loadExpenseCategoriesPage;
window.loadExpensesPage = loadExpensesPage;