// Page de gestion des ventes

import { salesApi, productsApi, clientsApi } from '../api.js';
import { formatCurrency, formatDateShort } from '../utils.js';
import { createTable } from '../components/table.js';
import { createModal, confirmModal } from '../components/modal.js';
import { createFormField } from '../components/form.js';

let currentUser = null;
let cart = [];

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

export async function loadSalesPage() {
    await initUser();
    
    updatePageContent('Ventes', `
        <div style="padding: 24px;">
            <div class="card" style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">Ventes</h2>
                        <p style="color: #6b7280; margin: 0;">Gérez vos ventes et transactions</p>
                    </div>
                    ${canEdit() ? `
                        <button class="btn btn-primary" onclick="showCreateSaleModal()" style="padding: 10px 20px;">
                            + Nouvelle vente
                        </button>
                    ` : ''}
                </div>

                <!-- Filtres -->
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <input type="date" id="saleDateFrom" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <input type="date" id="saleDateTo" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <input type="text" id="saleSearch" placeholder="Rechercher..." style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <button class="btn btn-primary" onclick="filterSales()" style="padding: 10px 20px;">Filtrer</button>
                </div>

                <!-- Tableau des ventes -->
                <div id="salesTableContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement des ventes...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadSales();
}

async function loadSales(filters = {}) {
    const container = document.getElementById('salesTableContainer');
    if (!container) return;

    try {
        const sales = await salesApi.getSales(filters);

        if (sales.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucune vente trouvée</p>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'saleNumber', label: 'N° Vente' },
            { key: 'createdAt', label: 'Date', render: (value) => formatDateShort(value) },
            { key: 'clientName', label: 'Client' },
            { 
                key: 'totalAmount', 
                label: 'Total',
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
                        'MOBILE': 'Mobile Money',
                        'CREDIT': 'Crédit'
                    };
                    return methods[value] || value;
                }
            }
        ];

        const actions = [
            { label: 'Voir', variant: 'btn-secondary', onClick: (sale) => showSaleDetail(sale) }
        ];

        if (canEdit()) {
            actions.push(
                { label: 'Annuler', variant: 'btn-danger', onClick: (sale) => handleCancelSale(sale) }
            );
        }

        const table = createTable({
            columns,
            data: sales,
            actions,
            onRowClick: (sale) => showSaleDetail(sale)
        });

        container.innerHTML = '';
        container.appendChild(table);

    } catch (error) {
        console.error('Erreur chargement ventes:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p style="font-weight: 600; margin-bottom: 8px;">Erreur lors du chargement des ventes</p>
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">${error.message || 'Une erreur est survenue'}</p>
                <button class="btn btn-primary" onclick="loadSales()" style="padding: 8px 16px;">
                    Réessayer
                </button>
            </div>
        `;
    }
}

window.filterSales = async function() {
    const dateFrom = document.getElementById('saleDateFrom')?.value || '';
    const dateTo = document.getElementById('saleDateTo')?.value || '';
    const search = document.getElementById('saleSearch')?.value || '';
    
    const filters = {};
    if (dateFrom) filters.startDate = dateFrom;
    if (dateTo) filters.endDate = dateTo;
    if (search) filters.search = search;
    
    await loadSales(filters);
};

window.showCreateSaleModal = async function() {
    cart = [];
    await showSaleFormModal();
};

async function showSaleFormModal() {
    try {
        const [products, clients] = await Promise.all([
            productsApi.getProducts(),
            clientsApi.getClients()
        ]);

        const formContent = document.createElement('div');
        formContent.id = 'saleForm';
        formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

        // Client (optionnel)
        const clientOptions = [
            { value: '', label: 'Vente au comptant (sans client)' },
            ...clients.map(c => ({ 
                value: c.id, 
                label: `${c.firstName} ${c.lastName}` 
            }))
        ];
        const clientField = createFormField({
            label: 'Client (optionnel)',
            name: 'clientId',
            type: 'select',
            value: '',
            options: clientOptions
        });
        formContent.appendChild(clientField);

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
                { value: 'MOBILE', label: 'Mobile Money' },
                { value: 'CREDIT', label: 'Crédit' }
            ]
        });
        formContent.appendChild(paymentMethodField);

        // Ajouter produit
        const addProductDiv = document.createElement('div');
        addProductDiv.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: end;';
        
        const productSelect = document.createElement('select');
        productSelect.id = 'productSelect';
        productSelect.style.cssText = 'padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;';
        productSelect.innerHTML = '<option value="">Sélectionner un produit</option>' + 
            products.map(p => `<option value="${p.id}" data-price="${p.salePrice}" data-stock="${p.stock || 0}">${p.name} - ${formatCurrency(p.salePrice)} (Stock: ${p.stock || 0})</option>`).join('');
        
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.id = 'productQuantity';
        quantityInput.value = '1';
        quantityInput.min = '1';
        quantityInput.style.cssText = 'padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;';
        
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = 'Ajouter';
        addBtn.className = 'btn btn-primary';
        addBtn.onclick = () => addProductToCart();
        
        addProductDiv.appendChild(productSelect);
        addProductDiv.appendChild(quantityInput);
        addProductDiv.appendChild(addBtn);
        
        const addProductLabel = document.createElement('label');
        addProductLabel.textContent = 'Ajouter un produit';
        addProductLabel.style.cssText = 'font-weight: 600; font-size: 14px; color: #1f2937; margin-bottom: 8px;';
        
        const addProductContainer = document.createElement('div');
        addProductContainer.appendChild(addProductLabel);
        addProductContainer.appendChild(addProductDiv);
        formContent.appendChild(addProductContainer);

        // Panier
        const cartDiv = document.createElement('div');
        cartDiv.id = 'saleCart';
        cartDiv.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f9fafb;';
        formContent.appendChild(cartDiv);
        
        updateCartDisplay();

        createModal({
            title: 'Nouvelle vente',
            content: formContent,
            size: 'large',
            buttons: [
                { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
                {
                    label: 'Enregistrer la vente',
                    variant: 'btn-primary',
                    onClick: () => handleSubmitSale(),
                    closeOnClick: false
                }
            ]
        });

    } catch (error) {
        showToast('Erreur lors du chargement', 'error');
        console.error('Erreur:', error);
    }
}

function addProductToCart() {
    const productSelect = document.getElementById('productSelect');
    const quantityInput = document.getElementById('productQuantity');
    
    if (!productSelect || !quantityInput) return;
    
    const productId = productSelect.value;
    const quantity = parseInt(quantityInput.value) || 1;
    
    if (!productId) {
        showToast('Veuillez sélectionner un produit', 'error');
        return;
    }

    const option = productSelect.options[productSelect.selectedIndex];
    const productName = option.text.split(' - ')[0];
    const price = parseFloat(option.dataset.price);
    const stock = parseInt(option.dataset.stock) || 0;

    if (quantity > stock) {
        showToast(`Stock insuffisant. Stock disponible: ${stock}`, 'error');
        return;
    }

    // Vérifier si le produit est déjà dans le panier
    const existingIndex = cart.findIndex(item => item.productId === productId);
    if (existingIndex >= 0) {
        const newQuantity = cart[existingIndex].quantity + quantity;
        if (newQuantity > stock) {
            showToast(`Stock insuffisant. Stock disponible: ${stock}`, 'error');
            return;
        }
        cart[existingIndex].quantity = newQuantity;
        cart[existingIndex].subtotal = cart[existingIndex].quantity * price;
    } else {
        cart.push({
            productId,
            productName,
            price,
            quantity,
            subtotal: price * quantity
        });
    }

    quantityInput.value = '1';
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartDiv = document.getElementById('saleCart');
    if (!cartDiv) return;

    if (cart.length === 0) {
        cartDiv.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">Le panier est vide</p>';
        return;
    }

    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

    cartDiv.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Panier (${cart.length} article${cart.length > 1 ? 's' : ''})</h4>
            <div style="display: grid; gap: 8px;">
                ${cart.map((item, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${item.productName}</div>
                            <div style="font-size: 14px; color: #6b7280;">${item.quantity} × ${formatCurrency(item.price)}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-weight: 600;">${formatCurrency(item.subtotal)}</span>
                            <button onclick="removeFromCart(${index})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Supprimer</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div style="border-top: 2px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 18px; font-weight: 700;">Total:</span>
            <span style="font-size: 24px; font-weight: 700; color: #10b981;">${formatCurrency(total)}</span>
        </div>
    `;
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartDisplay();
};

async function handleSubmitSale() {
    const form = document.getElementById('saleForm');
    if (!form) return;

    if (cart.length === 0) {
        showToast('Le panier est vide', 'error');
        return;
    }

    const clientId = document.querySelector('#saleForm select[name="clientId"]')?.value || undefined;
    const paymentMethod = document.querySelector('#saleForm select[name="paymentMethod"]')?.value;

    if (!paymentMethod) {
        showToast('Veuillez sélectionner une méthode de paiement', 'error');
        return;
    }

    const data = {
        clientId,
        paymentMethod,
        items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price
        }))
    };

    try {
        await salesApi.createSale(data);
        showToast('Vente enregistrée avec succès', 'success');
        document.querySelector('.modal-overlay')?.remove();
        await loadSales();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function showSaleDetail(sale) {
    try {
        const saleDetail = await salesApi.getSale(sale.id);

        const content = `
            <div style="display: grid; gap: 24px;">
                <div>
                    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Vente #${saleDetail.saleNumber}</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                        <div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Date</div>
                            <div style="font-weight: 600;">${formatDateShort(saleDetail.createdAt || saleDetail.date)}</div>
                        </div>
                        ${saleDetail.clientName ? `
                            <div>
                                <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Client</div>
                                <div style="font-weight: 600;">${saleDetail.clientName}</div>
                            </div>
                        ` : ''}
                        <div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Méthode de paiement</div>
                            <div style="font-weight: 600;">${saleDetail.paymentMethod === 'CASH' ? 'Espèces' : saleDetail.paymentMethod === 'CARD' ? 'Carte' : saleDetail.paymentMethod === 'MOBILE' ? 'Mobile Money' : 'Crédit'}</div>
                        </div>
                        <div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Total</div>
                            <div style="font-weight: 600; font-size: 20px; color: #10b981;">${formatCurrency(saleDetail.totalAmount || saleDetail.total)}</div>
                        </div>
                    </div>
                </div>
                ${saleDetail.items && saleDetail.items.length > 0 ? `
                    <div>
                        <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Articles</h4>
                        <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                            ${saleDetail.items.map(item => `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                    <div>
                                        <div style="font-weight: 600;">${item.productName}</div>
                                        <div style="font-size: 14px; color: #6b7280;">${item.quantity} × ${formatCurrency(item.unitPrice)}</div>
                                    </div>
                                    <div style="font-weight: 600;">${formatCurrency(item.subtotal)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        createModal({
            title: 'Détails de la vente',
            content,
            size: 'medium',
            buttons: []
        });
    } catch (error) {
        showToast('Erreur lors du chargement', 'error');
    }
}

async function handleCancelSale(sale) {
    confirmModal(
        `Annuler la vente #${sale.saleNumber} ?`,
        async () => {
            try {
                await salesApi.cancelSale(sale.id);
                showToast('Vente annulée avec succès', 'success');
                await loadSales();
            } catch (error) {
                showToast(error.message || 'Erreur', 'error');
            }
        }
    );
}

// Exposer les fonctions globalement
window.loadSales = loadSales;
