// Page de paramètres

import { companiesApi, usersApi } from '../api.js';
import { createModal, confirmModal } from '../components/modal.js';
import { createFormField } from '../components/form.js';
import { createTable } from '../components/table.js';

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

function canManageUsers() {
    if (!currentUser) return false;
    return ['PROPRIETAIRE', 'MANAGER'].includes(currentUser.role);
}

function canManageCompany() {
    if (!currentUser) return false;
    return ['PROPRIETAIRE'].includes(currentUser.role);
}

export async function loadSettingsPage() {
    await initUser();
    
    updatePageContent('Paramètres', `
        <div style="padding: 24px;">
            <div style="display: grid; gap: 24px;">
                <!-- Section Entreprise -->
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h2 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 4px 0;">Entreprise</h2>
                            <p style="color: #6b7280; margin: 0; font-size: 14px;">Informations de votre entreprise</p>
                        </div>
                        ${canManageCompany() ? `
                            <button class="btn btn-primary" onclick="showEditCompanyModal()" style="padding: 10px 20px;">
                                Modifier
                            </button>
                        ` : ''}
                    </div>
                    <div id="companyInfo">
                        <div style="text-align: center; padding: 40px; color: #6b7280;">
                            <div class="spinner" style="margin: 0 auto 20px;"></div>
                            <p>Chargement...</p>
                        </div>
                    </div>
                </div>

                <!-- Section Utilisateurs -->
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h2 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 4px 0;">Utilisateurs</h2>
                            <p style="color: #6b7280; margin: 0; font-size: 14px;">Gérez les utilisateurs de l'application</p>
                        </div>
                        ${canManageUsers() ? `
                            <button class="btn btn-primary" onclick="showCreateUserModal()" style="padding: 10px 20px;">
                                + Nouvel utilisateur
                            </button>
                        ` : ''}
                    </div>
                    <div id="usersContainer">
                        <div style="text-align: center; padding: 40px; color: #6b7280;">
                            <div class="spinner" style="margin: 0 auto 20px;"></div>
                            <p>Chargement...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadCompanyInfo();
    if (canManageUsers()) {
        await loadUsers();
    }
}

async function loadCompanyInfo() {
    const container = document.getElementById('companyInfo');
    if (!container) return;

    try {
        const company = await companiesApi.getCompany();
        
        container.innerHTML = `
            <div style="display: grid; gap: 16px;">
                <div>
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Nom de l'entreprise</div>
                    <div style="font-weight: 600; font-size: 16px;">${company.name || 'N/A'}</div>
                </div>
                ${company.email ? `
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Email</div>
                        <div style="font-weight: 600;">${company.email}</div>
                    </div>
                ` : ''}
                ${company.address ? `
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Adresse</div>
                        <div style="font-weight: 600;">${company.address}</div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Erreur chargement entreprise:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement</p>
            </div>
        `;
    }
}

window.showEditCompanyModal = async function() {
    try {
        const company = await companiesApi.getCompany();
        
        const formContent = document.createElement('form');
        formContent.id = 'companyForm';
        formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

        const nameField = createFormField({
            label: 'Nom de l\'entreprise',
            name: 'name',
            value: company.name || '',
            required: true
        });
        formContent.appendChild(nameField);

        const emailField = createFormField({
            label: 'Email',
            name: 'email',
            type: 'email',
            value: company.email || ''
        });
        formContent.appendChild(emailField);

        const addressField = createFormField({
            label: 'Adresse',
            name: 'address',
            type: 'textarea',
            value: company.address || '',
            rows: 3
        });
        formContent.appendChild(addressField);

        createModal({
            title: 'Modifier l\'entreprise',
            content: formContent,
            size: 'medium',
            buttons: [
                { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
                {
                    label: 'Enregistrer',
                    variant: 'btn-primary',
                    onClick: () => handleSubmitCompany(),
                    closeOnClick: false
                }
            ]
        });

    } catch (error) {
        showToast('Erreur lors du chargement', 'error');
    }
};

async function handleSubmitCompany() {
    const form = document.getElementById('companyForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        email: formData.get('email') || undefined,
        address: formData.get('address') || undefined
    };

    if (!data.name) {
        showToast('Le nom est obligatoire', 'error');
        return;
    }

    try {
        await companiesApi.updateCompany(data);
        showToast('Entreprise modifiée avec succès', 'success');
        document.querySelector('.modal-overlay')?.remove();
        await loadCompanyInfo();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
}

async function loadUsers() {
    const container = document.getElementById('usersContainer');
    if (!container) return;

    try {
        const users = await usersApi.getUsers();

        if (users.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucun utilisateur</p>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'firstName', label: 'Prénom' },
            { key: 'lastName', label: 'Nom' },
            { key: 'email', label: 'Email' },
            { 
                key: 'role', 
                label: 'Rôle',
                render: (value) => {
                    const roles = {
                        'PROPRIETAIRE': 'Propriétaire',
                        'MANAGER': 'Manager',
                        'MAGASINIER': 'Magasinier',
                        'CAISSIER': 'Caissier'
                    };
                    return roles[value] || value;
                }
            }
        ];

        const actions = [];
        if (canManageUsers()) {
            actions.push(
                { label: 'Modifier', variant: 'btn-secondary', onClick: (user) => showEditUserModal(user) },
                { label: 'Supprimer', variant: 'btn-danger', onClick: (user) => handleDeleteUser(user) }
            );
        }

        const table = createTable({
            columns,
            data: users,
            actions
        });

        container.innerHTML = '';
        container.appendChild(table);

    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement</p>
            </div>
        `;
    }
}

window.showCreateUserModal = function() {
    showUserFormModal();
};

function showEditUserModal(user) {
    showUserFormModal(user);
}

function showUserFormModal(user = null) {
    const isEdit = !!user;
    
    const formContent = document.createElement('form');
    formContent.id = 'userForm';
    formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';

    const firstNameField = createFormField({
        label: 'Prénom',
        name: 'firstName',
        value: user?.firstName || '',
        required: true
    });
    formContent.appendChild(firstNameField);

    const lastNameField = createFormField({
        label: 'Nom',
        name: 'lastName',
        value: user?.lastName || '',
        required: true
    });
    formContent.appendChild(lastNameField);

    const emailField = createFormField({
        label: 'Email',
        name: 'email',
        type: 'email',
        value: user?.email || '',
        required: true
    });
    formContent.appendChild(emailField);

    if (!isEdit) {
        const passwordField = createFormField({
            label: 'Mot de passe',
            name: 'password',
            type: 'password',
            value: '',
            required: true,
            helpText: 'Minimum 6 caractères'
        });
        formContent.appendChild(passwordField);
    }

    const roleField = createFormField({
        label: 'Rôle',
        name: 'role',
        type: 'select',
        value: user?.role || 'CAISSIER',
        required: true,
        options: [
            { value: 'PROPRIETAIRE', label: 'Propriétaire' },
            { value: 'MANAGER', label: 'Manager' },
            { value: 'MAGASINIER', label: 'Magasinier' },
            { value: 'CAISSIER', label: 'Caissier' }
        ]
    });
    formContent.appendChild(roleField);

    createModal({
        title: isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur',
        content: formContent,
        size: 'medium',
        buttons: [
            { label: 'Annuler', variant: 'btn-secondary', closeOnClick: true },
            {
                label: isEdit ? 'Enregistrer' : 'Créer',
                variant: 'btn-primary',
                onClick: () => handleSubmitUser(user?.id),
                closeOnClick: false
            }
        ]
    });
}

async function handleSubmitUser(userId = null) {
    const form = document.getElementById('userForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        role: formData.get('role')
    };

    if (!userId) {
        data.password = formData.get('password');
    }

    if (!data.firstName || !data.lastName || !data.email || (!userId && !data.password)) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    if (!userId && data.password.length < 6) {
        showToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }

    try {
        if (userId) {
            await usersApi.updateUser(userId, data);
            showToast('Utilisateur modifié avec succès', 'success');
        } else {
            await usersApi.createUser(data);
            showToast('Utilisateur créé avec succès', 'success');
        }
        
        document.querySelector('.modal-overlay')?.remove();
        await loadUsers();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
}

async function handleDeleteUser(user) {
    if (user.id === currentUser.id) {
        showToast('Vous ne pouvez pas supprimer votre propre compte', 'error');
        return;
    }

    confirmModal(
        `Supprimer l'utilisateur "${user.firstName} ${user.lastName}" ?`,
        async () => {
            try {
                await usersApi.deleteUser(user.id);
                showToast('Utilisateur supprimé', 'success');
                await loadUsers();
            } catch (error) {
                showToast(error.message || 'Erreur', 'error');
            }
        }
    );
}
