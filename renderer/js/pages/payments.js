// Page de gestion des paiements

import { paymentsApi, clientsApi, salesApi } from '../api.js';
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
    const allowedRoles = ['PROPRIETAIRE', 'MANAGER', 'CAISSIER'];
    return allowedRoles.includes(currentUser.role);
}

export async function loadPaymentsPage() {
    await initUser();
    
    updatePageContent('Paiements', `
        <div style="padding: 24px;">
            <div class="card" style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">Paiements</h2>
                        <p style="color: #6b7280; margin: 0;">Gérez les paiements clients</p>
                    </div>
                    ${canEdit() ? `
                        <button class="btn btn-primary" onclick="showCreatePaymentModal()" style="padding: 10px 20px;">
                            + Nouveau paiement
                        </button>
                    ` : ''}
                </div>

                <!-- Filtres -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <input type="date" id="paymentDateFrom" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <input type="date" id="paymentDateTo" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <input type="text" id="paymentSearch" placeholder="Rechercher..." style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <button class="btn btn-primary" onclick="filterPayments()" style="padding: 10px 20px;">Filtrer</button>
                </div>

                <!-- Tableau des paiements -->
                <div id="paymentsTableContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement des paiements...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadPayments();
}

async function loadPayments(filters = {}) {
    const container = document.getElementById('paymentsTableContainer');
    if (!container) return;

    try {
        const payments = await paymentsApi.getPayments(filters);

        if (payments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucun paiement trouvé</p>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'date', label: 'Date', render: (value) => formatDateShort(value) },
            { key: 'clientName', label: 'Client' },
            { key: 'saleNumber', label: 'Vente #' },
            { 
                key: 'amount', 
                label: 'Montant',
                align: 'right',
                render: (value) => formatCurrency(value)
            },
            { 
                key: 'paymentMethod', 
                label: 'Méthode',
                render: (value) => {
                    const methods = {
                        'CASH': 'Espèces',
                        'CARD': 'Carte',
                        'MOBILE': 'Mobile Money'
                    };
                    return methods[value] || value;
                }
            }
        ];

        const actions = [];
        if (canEdit()) {
            actions.push(
                { label: 'Supprimer', variant: 'btn-danger', onClick: (payment) => handleDeletePayment(payment) }
            );
        }

        const table = createTable({
            columns,
            data: payments,
            actions
        });

        container.innerHTML = '';
        container.appendChild(table);

    } catch (error) {
        console.error('Erreur chargement paiements:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement des paiements</p>
            </div>
        `;
    }
}

window.filterPayments = async function() {
    const dateFrom = document.getElementById('paymentDateFrom')?.value || '';
    const dateTo = document.getElementById('paymentDateTo')?.value || '';
    const search = document.getElementById('paymentSearch')?.value || '';
    
    const filters = {};
    if (dateFrom) filters.startDate = dateFrom;
    if (dateTo) filters.endDate = dateTo;
    if (search) filters.search = search;
    
    await loadPayments(filters);
};

window.showCreatePaymentModal = async function() {
    try {
        const clients = await clientsApi.getClients();
        const clientsWithCredit = clients.filter(c => (c.balance || 0) > 0);

        if (clientsWithCredit.length === 0) {
            showToast('Aucun client avec un solde dû', 'info');
            return;
        }

        const formContent = document.createElement('form');
        formContent.id = 'paymentForm';
        formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

        // Client
        const clientOptions = [
            { value: '', label: 'Sélectionner un client' },
            ...clientsWithCredit.map(c => ({ 
                value: c.id, 
                label: `${c.name} (Dû: ${formatCurrency(c.balance || 0)})` 
            }))
        ];
        const clientField = createFormField({
            label: 'Client',
            name: 'clientId',
            type: 'select',
            value: '',
            required: true,
            options: clientOptions
        });
        formContent.appendChild(clientField);

        // Vente (chargée dynamiquement)
        const saleField = createFormField({
            label: 'Vente',
            name: 'saleId',
            type: 'select',
            value: '',
            required: true,
            options: [{ value: '', label: 'Sélectionner d\'abord un client' }]
        });
        formContent.appendChild(saleField);

        // Montant
        const amountField = createFormField({
            label: 'Montant (FCFA)',
            name: 'amount',
            type: 'number',
            value: '',
            required: true,
            placeholder: '0'
        });
        formContent.appendChild(amountField);

        // Méthode de paiement
        const paymentMethodField = createFormField({
            label: 'Méthode de paiement',
            name: 'paymentMethod',
            type: 'select',
            value: 'CASH',
            required: true,
            options: [
                { value: 'CASH', label: 'Espèces' },
                { value: 'CARD', label: 'Carte' },
                { value: 'MOBILE', label: 'Mobile Money' }
            ]
        });
        formContent.appendChild(paymentMethodField);

        // Charger les ventes quand le client change
        const clientSelect = formContent.querySelector('select[name="clientId"]');
        const saleSelect = formContent.querySelector('select[name="saleId"]');
        const amountInput = formContent.querySelector('input[name="amount"]');

        clientSelect.onchange = async () => {
            const clientId = clientSelect.value;
            if (!clientId) {
                saleSelect.innerHTML = '<option value="">Sélectionner d\'abord un client</option>';
                return;
            }

            try {
                const sales = await salesApi.getSales({ clientId, paymentMethod: 'CREDIT' });
                saleSelect.innerHTML = '<option value="">Sélectionner une vente</option>' +
                    sales.map(s => `<option value="${s.id}" data-remaining="${s.total - (s.paidAmount || 0)}">Vente #${s.saleNumber} - Reste: ${formatCurrency(s.total - (s.paidAmount || 0))}</option>`).join('');
            } catch (error) {
                showToast('Erreur lors du chargement des ventes', 'error');
            }
        };

        saleSelect.onchange = () => {
            const option = saleSelect.options[saleSelect.selectedIndex];
            const remaining = parseFloat(option.dataset.remaining) || 0;
            amountInput.value = remaining;
        };

        createModal({
            title: 'Nouveau paiement',
            content: formContent,
            size: 'medium',
            buttons: [
                { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
                {
                    label: 'Enregistrer',
                    variant: 'btn-primary',
                    onClick: () => handleSubmitPayment(),
                    closeOnClick: false
                }
            ]
        });

    } catch (error) {
        showToast('Erreur lors du chargement', 'error');
    }
};

async function handleSubmitPayment() {
    const form = document.getElementById('paymentForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        clientId: formData.get('clientId'),
        saleId: formData.get('saleId') || undefined,
        amount: parseFloat(formData.get('amount')) || 0,
        paymentMethod: formData.get('paymentMethod')
    };

    if (!data.clientId || !data.amount || data.amount <= 0) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    try {
        await paymentsApi.createPayment(data);
        showToast('Paiement enregistré avec succès', 'success');
        document.querySelector('.modal-overlay')?.remove();
        await loadPayments();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function handleDeletePayment(payment) {
    confirmModal(
        `Supprimer ce paiement ?`,
        async () => {
            try {
                await paymentsApi.deletePayment(payment.id);
                showToast('Paiement supprimé avec succès', 'success');
                await loadPayments();
            } catch (error) {
                showToast(error.message || 'Erreur', 'error');
            }
        }
    );
}
