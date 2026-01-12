// Page de gestion des stocks

import { stockMovementsApi, productsApi } from '../api.js';
import { formatCurrency, formatDateShort } from '../utils.js';
import { createTable } from '../components/table.js';
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

function canEdit() {
    if (!currentUser) return false;
    return ['PROPRIETAIRE', 'MANAGER', 'MAGASINIER'].includes(currentUser.role);
}

export async function loadStockPage() {
    await initUser();
    
    updatePageContent('Stocks', `
        <div style="padding: 24px;">
            <div class="card" style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">Mouvements de stock</h2>
                        <p style="color: #6b7280; margin: 0;">Suivez les entrées et sorties de stock</p>
                    </div>
                    ${canEdit() ? `
                        <button class="btn btn-primary" onclick="showCreateStockMovementModal()" style="padding: 10px 20px;">
                            + Nouveau mouvement
                        </button>
                    ` : ''}
                </div>

                <!-- Filtres -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <input type="date" id="stockDateFrom" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <input type="date" id="stockDateTo" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <select id="stockTypeFilter" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                        <option value="">Tous les types</option>
                        <option value="ENTRY">Entrée</option>
                        <option value="SALE">Vente</option>
                        <option value="LOSS">Perte</option>
                        <option value="THEFT">Vol</option>
                    </select>
                    <button class="btn btn-primary" onclick="filterStockMovements()" style="padding: 10px 20px;">Filtrer</button>
                </div>

                <!-- Tableau des mouvements -->
                <div id="stockMovementsTableContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement des mouvements...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadStockMovements();
}

async function loadStockMovements(filters = {}) {
    const container = document.getElementById('stockMovementsTableContainer');
    if (!container) return;

    try {
        const movements = await stockMovementsApi.getStockMovements(filters);

        if (movements.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucun mouvement trouvé</p>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'createdAt', label: 'Date', render: (value) => formatDateShort(value) },
            { key: 'productName', label: 'Produit' },
            { 
                key: 'type', 
                label: 'Type',
                render: (value) => {
                    const types = {
                        'IN': { label: 'Entrée', color: '#10b981' },
                        'OUT': { label: 'Sortie', color: '#3b82f6' },
                        'ADJUSTMENT': { label: 'Ajustement', color: '#f59e0b' },
                        'TRANSFER': { label: 'Transfert', color: '#8b5cf6' }
                    };
                    const type = types[value] || { label: value, color: '#6b7280' };
                    return `<span style="color: ${type.color}; font-weight: 600;">${type.label}</span>`;
                }
            },
            { 
                key: 'quantity', 
                label: 'Quantité',
                align: 'right'
            },
            { key: 'reason', label: 'Raison' }
        ];

        const actions = [];
        if (canEdit()) {
            actions.push(
                { label: 'Supprimer', variant: 'btn-danger', onClick: (movement) => handleDeleteStockMovement(movement) }
            );
        }

        const table = createTable({
            columns,
            data: movements,
            actions
        });

        container.innerHTML = '';
        container.appendChild(table);

    } catch (error) {
        console.error('Erreur chargement mouvements:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement des mouvements</p>
            </div>
        `;
    }
}

window.filterStockMovements = async function() {
    const dateFrom = document.getElementById('stockDateFrom')?.value || '';
    const dateTo = document.getElementById('stockDateTo')?.value || '';
    const type = document.getElementById('stockTypeFilter')?.value || '';
    
    const filters = {};
    if (dateFrom) filters.startDate = dateFrom;
    if (dateTo) filters.endDate = dateTo;
    if (type) filters.type = type;
    
    await loadStockMovements(filters);
};

window.showCreateStockMovementModal = async function() {
    try {
        const products = await productsApi.getProducts();
        
        const formContent = document.createElement('form');
        formContent.id = 'stockMovementForm';
        formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

        const productOptions = [
            { value: '', label: 'Sélectionner un produit' },
            ...products.map(p => ({ value: p.id, label: `${p.name} (Stock: ${p.stock || 0})` }))
        ];
        const productField = createFormField({
            label: 'Produit',
            name: 'productId',
            type: 'select',
            value: '',
            required: true,
            options: productOptions
        });
        formContent.appendChild(productField);

        const typeField = createFormField({
            label: 'Type de mouvement',
            name: 'type',
            type: 'select',
            value: 'ENTRY',
            required: true,
            options: [
                { value: 'ENTRY', label: 'Entrée' },
                { value: 'SALE', label: 'Vente' },
                { value: 'LOSS', label: 'Perte' },
                { value: 'THEFT', label: 'Vol' }
            ]
        });
        formContent.appendChild(typeField);

        const quantityField = createFormField({
            label: 'Quantité',
            name: 'quantity',
            type: 'number',
            value: '',
            required: true,
            placeholder: '0'
        });
        formContent.appendChild(quantityField);

        const reasonField = createFormField({
            label: 'Raison',
            name: 'reason',
            type: 'textarea',
            value: '',
            rows: 3,
            placeholder: 'Raison du mouvement (optionnel)'
        });
        formContent.appendChild(reasonField);

        createModal({
            title: 'Nouveau mouvement de stock',
            content: formContent,
            size: 'medium',
            buttons: [
                { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
                {
                    label: 'Enregistrer',
                    variant: 'btn-primary',
                    onClick: () => handleSubmitStockMovement(),
                    closeOnClick: false
                }
            ]
        });

    } catch (error) {
        showToast('Erreur lors du chargement', 'error');
    }
};

async function handleSubmitStockMovement() {
    const form = document.getElementById('stockMovementForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        productId: formData.get('productId'),
        type: formData.get('type'),
        quantity: parseInt(formData.get('quantity')) || 0,
        reason: formData.get('reason') || undefined
    };

    if (!data.productId || !data.quantity || data.quantity <= 0) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    try {
        await stockMovementsApi.createStockMovement(data);
        showToast('Mouvement enregistré avec succès', 'success');
        document.querySelector('.modal-overlay')?.remove();
        await loadStockMovements();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function handleDeleteStockMovement(movement) {
    confirmModal(
        `Supprimer ce mouvement de stock ?`,
        async () => {
            try {
                await stockMovementsApi.deleteStockMovement(movement.id);
                showToast('Mouvement supprimé avec succès', 'success');
                await loadStockMovements();
            } catch (error) {
                showToast(error.message || 'Erreur', 'error');
            }
        }
    );
}
