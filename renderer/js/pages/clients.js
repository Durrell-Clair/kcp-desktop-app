// Page de gestion des clients

import { clientsApi } from '../api.js';
import { formatCurrency, formatPhone, formatDateShort } from '../utils.js';
import { createTable, createBadge } from '../components/table.js';
import { createModal, confirmModal } from '../components/modal.js';
import { createFormField, createButton } from '../components/form.js';

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

export async function loadClientsPage() {
    await initUser();
    
    updatePageContent('Clients', `
        <div style="padding: 24px;">
            <div class="card" style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">Clients</h2>
                        <p style="color: #6b7280; margin: 0;">Gérez votre base de clients</p>
                    </div>
                    ${canEdit() ? `
                        <button class="btn btn-primary" onclick="showCreateClientModal()" style="padding: 10px 20px;">
                            + Nouveau client
                        </button>
                    ` : ''}
                </div>

                <!-- Filtres -->
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <input type="text" id="clientSearch" placeholder="Rechercher un client..." 
                        style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <button class="btn btn-primary" onclick="filterClients()" style="padding: 10px 20px;">
                        Filtrer
                    </button>
                </div>

                <!-- Tableau des clients -->
                <div id="clientsTableContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement des clients...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadClients();

    const searchInput = document.getElementById('clientSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterClients();
            }, 500);
        };
    }
}

async function loadClients(filters = {}) {
    const container = document.getElementById('clientsTableContainer');
    if (!container) return;

    try {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <div class="spinner" style="margin: 0 auto 20px;"></div>
                <p>Chargement...</p>
            </div>
        `;

        const clients = await clientsApi.getClients(filters);

        if (clients.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucun client trouvé</p>
                </div>
            `;
            return;
        }

        const columns = [
            { 
                key: 'name', 
                label: 'Nom', 
                sortable: true,
                render: (value, row) => {
                    // Si l'API retourne firstName et lastName, les concaténer
                    if (row.firstName && row.lastName) {
                        return `${row.firstName} ${row.lastName}`;
                    }
                    // Sinon utiliser la valeur name si elle existe
                    return value || '';
                }
            },
            { 
                key: 'phone', 
                label: 'Téléphone',
                render: (value) => formatPhone(value)
            },
            { key: 'email', label: 'Email' },
            { 
                key: 'balance', 
                label: 'Solde dû',
                align: 'right',
                render: (value) => {
                    const amount = value || 0;
                    const color = amount > 0 ? '#ef4444' : '#10b981';
                    return `<span style="color: ${color}; font-weight: 600;">${formatCurrency(amount)}</span>`;
                }
            },
            { 
                key: 'creditLimit', 
                label: 'Limite crédit',
                align: 'right',
                render: (value) => formatCurrency(value || 0)
            }
        ];

        const actions = [];
        if (canEdit()) {
            actions.push(
                { label: 'Voir', variant: 'btn-secondary', onClick: (client) => showClientDetail(client) },
                { label: 'Modifier', variant: 'btn-secondary', onClick: (client) => showEditClientModal(client) },
                { label: 'Supprimer', variant: 'btn-danger', onClick: (client) => handleDeleteClient(client) }
            );
        } else {
            actions.push(
                { label: 'Voir', variant: 'btn-secondary', onClick: (client) => showClientDetail(client) }
            );
        }

        const table = createTable({
            columns,
            data: clients,
            actions,
            onRowClick: (client) => showClientDetail(client)
        });

        container.innerHTML = '';
        container.appendChild(table);

    } catch (error) {
        console.error('Erreur chargement clients:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement des clients</p>
                <p style="font-size: 14px; margin-top: 8px;">${error.message}</p>
            </div>
        `;
    }
}

window.filterClients = async function() {
    const search = document.getElementById('clientSearch')?.value || '';
    const filters = {};
    if (search) filters.search = search;
    await loadClients(filters);
};

window.showCreateClientModal = function() {
    showClientFormModal();
};

function showEditClientModal(client) {
    showClientFormModal(client);
}

function showClientFormModal(client = null) {
    const isEdit = !!client;
    
    const formContent = document.createElement('form');
    formContent.id = 'clientForm';
    formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';
    
    // Prénom
    const firstNameField = createFormField({
        label: 'Prénom',
        name: 'firstName',
        value: client?.firstName || '',
        required: true,
        placeholder: 'Prénom du client'
    });
    formContent.appendChild(firstNameField);
    
    // Nom
    const lastNameField = createFormField({
        label: 'Nom',
        name: 'lastName',
        value: client?.lastName || '',
        required: true,
        placeholder: 'Nom du client'
    });
    formContent.appendChild(lastNameField);
    
    const phoneField = createFormField({
        label: 'Téléphone',
        name: 'phone',
        value: client?.phone || '',
        placeholder: '6XX XXX XXX'
    });
    formContent.appendChild(phoneField);
    
    const emailField = createFormField({
        label: 'Email',
        name: 'email',
        type: 'email',
        value: client?.email || ''
    });
    formContent.appendChild(emailField);
    
    const addressField = createFormField({
        label: 'Adresse',
        name: 'address',
        type: 'textarea',
        value: client?.address || '',
        rows: 3
    });
    formContent.appendChild(addressField);
    
    const creditLimitField = createFormField({
        label: 'Limite de crédit (FCFA)',
        name: 'creditLimit',
        type: 'number',
        value: client?.creditLimit || 0,
        helpText: 'Montant maximum de crédit autorisé'
    });
    formContent.appendChild(creditLimitField);

    createModal({
        title: isEdit ? 'Modifier le client' : 'Nouveau client',
        content: formContent,
        size: 'medium',
        buttons: [
            { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
            {
                label: isEdit ? 'Enregistrer' : 'Créer',
                variant: 'btn-primary',
                onClick: () => handleSubmitClient(client?.id),
                closeOnClick: false
            }
        ]
    });
}

async function handleSubmitClient(clientId = null) {
    const form = document.getElementById('clientForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone') || undefined,
        email: formData.get('email') || undefined,
        address: formData.get('address') || undefined,
        creditLimit: parseFloat(formData.get('creditLimit')) || 0
    };

    if (!data.firstName || !data.lastName) {
        showToast('Le prénom et le nom sont obligatoires', 'error');
        return;
    }

    try {
        if (clientId) {
            await clientsApi.updateClient(clientId, data);
            showToast('Client modifié avec succès', 'success');
        } else {
            await clientsApi.createClient(data);
            showToast('Client créé avec succès', 'success');
        }
        
        document.querySelector('.modal-overlay')?.remove();
        await loadClients();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function handleDeleteClient(client) {
    confirmModal(
        `Supprimer le client "${client.name}" ?`,
        async () => {
            try {
                await clientsApi.deleteClient(client.id);
                showToast('Client supprimé avec succès', 'success');
                await loadClients();
            } catch (error) {
                showToast(error.message || 'Erreur lors de la suppression', 'error');
            }
        }
    );
}

async function showClientDetail(client) {
    try {
        const [clientDetail, receivables] = await Promise.all([
            clientsApi.getClient(client.id),
            clientsApi.getReceivables(client.id).catch(() => [])
        ]);

        const content = `
            <div style="display: grid; gap: 24px;">
                <div>
                    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">${clientDetail.name}</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                        ${clientDetail.phone ? `
                            <div>
                                <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Téléphone</div>
                                <div style="font-weight: 600;">${formatPhone(clientDetail.phone)}</div>
                            </div>
                        ` : ''}
                        ${clientDetail.email ? `
                            <div>
                                <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Email</div>
                                <div style="font-weight: 600;">${clientDetail.email}</div>
                            </div>
                        ` : ''}
                        <div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Solde dû</div>
                            <div style="font-weight: 600; color: ${(clientDetail.balance || 0) > 0 ? '#ef4444' : '#10b981'};">
                                ${formatCurrency(clientDetail.balance || 0)}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Limite de crédit</div>
                            <div style="font-weight: 600;">${formatCurrency(clientDetail.creditLimit || 0)}</div>
                        </div>
                    </div>
                </div>
                ${receivables.length > 0 ? `
                    <div>
                        <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Créances par ancienneté</h4>
                        <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                            ${receivables.map(r => `
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                    <span style="color: #6b7280;">${r.age}</span>
                                    <span style="font-weight: 600;">${formatCurrency(r.amount)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        const buttons = [];
        if (canEdit()) {
            buttons.push({
                label: 'Modifier',
                variant: 'btn-primary',
                onClick: () => {
                    document.querySelector('.modal-overlay')?.remove();
                    showEditClientModal(clientDetail);
                }
            });
        }

        createModal({
            title: 'Détails du client',
            content,
            size: 'large',
            buttons
        });
    } catch (error) {
        showToast('Erreur lors du chargement des détails', 'error');
        console.error('Erreur:', error);
    }
}
