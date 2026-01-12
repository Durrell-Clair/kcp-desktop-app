// Page de gestion des produits

import { productsApi } from '../api.js';
import { formatCurrency, getStockStatus, getStockStatusColor, getStockStatusLabel } from '../utils.js';
import { createTable, createBadge } from '../components/table.js';
import { createModal, confirmModal } from '../components/modal.js';
import { createFormField, createButton } from '../components/form.js';
// showToast est disponible globalement via window

let currentUser = null;

// Initialiser les informations utilisateur
async function initUser() {
    const token = localStorage.getItem('accessToken');
    if (token) {
        try {
            // Décoder le token pour obtenir les infos utilisateur
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUser = payload;
        } catch (error) {
            console.error('Erreur décodage token:', error);
        }
    }
}

// Vérifier les permissions
function canEdit() {
    if (!currentUser) return false;
    const allowedRoles = ['PROPRIETAIRE', 'MANAGER', 'MAGASINIER'];
    return allowedRoles.includes(currentUser.role);
}

// Charger la page principale des produits
export async function loadProductsPage() {
    await initUser();
    
    updatePageContent('Produits', `
        <div style="padding: 24px;">
            <div class="card" style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0;">Produits</h2>
                        <p style="color: #6b7280; margin: 0;">Gérez votre catalogue de produits</p>
                    </div>
                    ${canEdit() ? `
                        <div style="display: flex; gap: 12px;">
                            <button class="btn btn-secondary" onclick="loadProductCategoriesPage()" style="padding: 10px 20px;">
                                Catégories
                            </button>
                            <button class="btn btn-primary" onclick="showCreateProductModal()" style="padding: 10px 20px;">
                                + Nouveau produit
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- Filtres -->
                <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                    <input type="text" id="productSearch" placeholder="Rechercher un produit..." 
                        style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                    <select id="productCategoryFilter" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                        <option value="">Toutes les catégories</option>
                    </select>
                    <button class="btn btn-primary" onclick="filterProducts()" style="padding: 10px 20px;">
                        Filtrer
                    </button>
                </div>

                <!-- Tableau des produits -->
                <div id="productsTableContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement des produits...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Charger les données
    await loadProducts();
    await loadCategories();

    // Écouter la recherche
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterProducts();
            }, 500);
        };
    }
}

// Charger les produits
async function loadProducts(filters = {}) {
    const container = document.getElementById('productsTableContainer');
    if (!container) return;

    try {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <div class="spinner" style="margin: 0 auto 20px;"></div>
                <p>Chargement...</p>
            </div>
        `;

        const products = await productsApi.getProducts(filters);

        if (products.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Aucun produit trouvé</p>
                </div>
            `;
            return;
        }

        const columns = [
            { key: 'name', label: 'Nom', sortable: true },
            { key: 'reference', label: 'Référence', sortable: true },
            { 
                key: 'salePrice', 
                label: 'Prix de vente',
                align: 'right',
                render: (value) => formatCurrency(value)
            },
            { 
                key: 'stock', 
                label: 'Stock',
                align: 'right',
                render: (value, row) => {
                    const status = getStockStatus(value, row.stockMin || 0, row.stockMax);
                    const color = getStockStatusColor(status);
                    const badge = createBadge(`${value} - ${getStockStatusLabel(status)}`, color);
                    return badge.outerHTML;
                }
            },
            { 
                key: 'category', 
                label: 'Catégorie',
                render: (value, row) => row.categoryName || 'Sans catégorie'
            }
        ];

        const actions = [];
        if (canEdit()) {
            actions.push(
                {
                    label: 'Modifier',
                    variant: 'btn-secondary',
                    onClick: (product) => showEditProductModal(product)
                },
                {
                    label: 'Supprimer',
                    variant: 'btn-danger',
                    onClick: (product) => handleDeleteProduct(product)
                }
            );
        }

        const table = createTable({
            columns,
            data: products,
            actions,
            onRowClick: (product) => showProductDetail(product)
        });

        container.innerHTML = '';
        container.appendChild(table);

    } catch (error) {
        console.error('Erreur chargement produits:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement des produits</p>
                <p style="font-size: 14px; margin-top: 8px;">${error.message}</p>
            </div>
        `;
    }
}

// Charger les catégories pour le filtre
async function loadCategories() {
    try {
        const categories = await productsApi.getCategories();
        const select = document.getElementById('productCategoryFilter');
        if (select) {
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur chargement catégories:', error);
    }
}

// Filtrer les produits
window.filterProducts = async function() {
    const search = document.getElementById('productSearch')?.value || '';
    const categoryId = document.getElementById('productCategoryFilter')?.value || '';
    
    const filters = {};
    if (search) filters.search = search;
    if (categoryId) filters.categoryId = categoryId;
    
    await loadProducts(filters);
};

// Afficher le modal de création
window.showCreateProductModal = function() {
    showProductFormModal();
};

// Afficher le modal d'édition
function showEditProductModal(product) {
    showProductFormModal(product);
}

// Modal de formulaire produit
async function showProductFormModal(product = null) {
    const isEdit = !!product;
    
    try {
        let categories;
        try {
            categories = await productsApi.getCategories();
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
            showToast('Erreur lors du chargement des catégories. Le formulaire sera affiché sans catégories.', 'error');
            categories = [];
        }
        
        const formContent = document.createElement('form');
        formContent.id = 'productForm';
        formContent.style.cssText = 'display: flex; flex-direction: column; gap: 20px;';
        
        // Nom
        const nameField = createFormField({
            label: 'Nom du produit',
            name: 'name',
            value: product?.name || '',
            placeholder: 'Ex: Riz 25kg',
            required: true
        });
        formContent.appendChild(nameField);
        
        // Référence
        const refField = createFormField({
            label: 'Référence',
            name: 'reference',
            value: product?.reference || '',
            placeholder: 'Référence unique'
        });
        formContent.appendChild(refField);
        
        // Code-barres
        const barcodeField = createFormField({
            label: 'Code-barres',
            name: 'barcode',
            value: product?.barcode || '',
            placeholder: 'Code-barres (optionnel)'
        });
        formContent.appendChild(barcodeField);
        
        // Catégorie
        const categoryOptions = [
            { value: '', label: 'Sélectionner une catégorie' },
            ...categories.map(cat => ({ value: cat.id, label: cat.name }))
        ];
        const categoryField = createFormField({
            label: 'Catégorie',
            name: 'categoryId',
            type: 'select',
            value: product?.categoryId || '',
            options: categoryOptions
        });
        formContent.appendChild(categoryField);
        
        // Prix d'achat
        const purchasePriceField = createFormField({
            label: 'Prix d\'achat',
            name: 'purchasePrice',
            type: 'number',
            value: product?.purchasePrice || 0,
            required: true
        });
        formContent.appendChild(purchasePriceField);
        
        // Prix de vente
        const salePriceField = createFormField({
            label: 'Prix de vente',
            name: 'salePrice',
            type: 'number',
            value: product?.salePrice || 0,
            required: true
        });
        formContent.appendChild(salePriceField);
        
        // Stock minimum
        const stockMinField = createFormField({
            label: 'Stock minimum',
            name: 'stockMin',
            type: 'number',
            value: product?.stockMin || 0,
            helpText: 'Alerte lorsque le stock est en dessous de ce seuil'
        });
        formContent.appendChild(stockMinField);
        
        // Stock maximum
        const stockMaxField = createFormField({
            label: 'Stock maximum',
            name: 'stockMax',
            type: 'number',
            value: product?.stockMax || '',
            helpText: 'Optionnel - Alerte lorsque le stock dépasse ce seuil'
        });
        formContent.appendChild(stockMaxField);
        
        // Description
        const descField = createFormField({
            label: 'Description',
            name: 'description',
            type: 'textarea',
            value: product?.description || '',
            rows: 3
        });
        formContent.appendChild(descField);
        
        // Fournisseur
        const supplierField = createFormField({
            label: 'Fournisseur',
            name: 'supplier',
            value: product?.supplier || '',
            placeholder: 'Nom du fournisseur'
        });
        formContent.appendChild(supplierField);

        const modal = createModal({
            title: isEdit ? 'Modifier le produit' : 'Nouveau produit',
            content: formContent,
            size: 'large',
            buttons: [
                {
                    label: 'Annuler',
                    variant: 'btn-secondary',
                    closeOnClick: true
                },
                {
                    label: isEdit ? 'Enregistrer' : 'Créer',
                    variant: 'btn-primary',
                    onClick: () => handleSubmitProduct(product?.id),
                    closeOnClick: false
                }
            ]
        });
        
    } catch (error) {
        console.error('Erreur lors de la création du formulaire produit:', error);
        showToast('Erreur lors du chargement du formulaire. Veuillez réessayer.', 'error');
    }
}

// Soumettre le formulaire produit
async function handleSubmitProduct(productId = null) {
    const form = document.getElementById('productForm');
    if (!form) return;

    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        reference: formData.get('reference') || undefined,
        barcode: formData.get('barcode') || undefined,
        categoryId: formData.get('categoryId') || undefined,
        purchasePrice: parseFloat(formData.get('purchasePrice')) || 0,
        salePrice: parseFloat(formData.get('salePrice')) || 0,
        stockMin: parseInt(formData.get('stockMin')) || 0,
        stockMax: formData.get('stockMax') ? parseInt(formData.get('stockMax')) : undefined,
        description: formData.get('description') || undefined,
        supplier: formData.get('supplier') || undefined
    };

    // Validation
    if (!data.name || data.salePrice <= 0) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    try {
        if (productId) {
            await productsApi.updateProduct(productId, data);
            showToast('Produit modifié avec succès', 'success');
        } else {
            await productsApi.createProduct(data);
            showToast('Produit créé avec succès', 'success');
        }
        
        // Fermer le modal
        document.querySelector('.modal-overlay')?.remove();
        
        // Recharger la liste
        await loadProducts();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

// Supprimer un produit
async function handleDeleteProduct(product) {
    confirmModal(
        `Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?`,
        async () => {
            try {
                await productsApi.deleteProduct(product.id);
                showToast('Produit supprimé avec succès', 'success');
                await loadProducts();
            } catch (error) {
                showToast(error.message || 'Erreur lors de la suppression', 'error');
            }
        }
    );
}

// Afficher les détails d'un produit
function showProductDetail(product) {
    const status = getStockStatus(product.stock || 0, product.stockMin || 0, product.stockMax);
    const statusColor = getStockStatusColor(status);
    
    const content = `
        <div style="display: grid; gap: 24px;">
            <div>
                <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">${product.name}</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Référence</div>
                        <div style="font-weight: 600;">${product.reference || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Code-barres</div>
                        <div style="font-weight: 600;">${product.barcode || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Prix d'achat</div>
                        <div style="font-weight: 600;">${formatCurrency(product.purchasePrice || 0)}</div>
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Prix de vente</div>
                        <div style="font-weight: 600; color: #10b981;">${formatCurrency(product.salePrice || 0)}</div>
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Stock actuel</div>
                        <div style="font-weight: 600;">${product.stock || 0}</div>
                    </div>
                    <div>
                        <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Statut</div>
                        <div>${createBadge(getStockStatusLabel(status), statusColor).outerHTML}</div>
                    </div>
                </div>
            </div>
            ${product.description ? `
                <div>
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">Description</div>
                    <div style="color: #1f2937;">${product.description}</div>
                </div>
            ` : ''}
        </div>
    `;

    const buttons = [];
    if (canEdit()) {
        buttons.push(
            {
                label: 'Modifier',
                variant: 'btn-primary',
                onClick: () => {
                    document.querySelector('.modal-overlay')?.remove();
                    showEditProductModal(product);
                }
            }
        );
    }

    createModal({
        title: 'Détails du produit',
        content,
        size: 'medium',
        buttons
    });
}

// Page de gestion des catégories
export async function loadProductCategoriesPage() {
    updatePageContent('Catégories Produits', `
        <div style="padding: 24px;">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button class="btn btn-secondary" onclick="loadProductsPage()" style="padding: 8px 16px; display: flex; align-items: center; gap: 8px;">
                            ← Retour aux Produits
                        </button>
                        <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0;">Catégories de produits</h2>
                    </div>
                    ${canEdit() ? `
                        <button class="btn btn-primary" onclick="showCreateCategoryModal()" style="padding: 10px 20px;">
                            + Nouvelle catégorie
                        </button>
                    ` : ''}
                </div>
                <div id="categoriesContainer">
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div class="spinner" style="margin: 0 auto 20px;"></div>
                        <p>Chargement...</p>
                    </div>
                </div>
            </div>
        </div>
    `);

    await loadCategoriesList();
}

// Charger la liste des catégories
async function loadCategoriesList() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    try {
        const categories = await productsApi.getCategories();

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
                { label: 'Modifier', variant: 'btn-secondary', onClick: (cat) => showEditCategoryModal(cat) },
                { label: 'Supprimer', variant: 'btn-danger', onClick: (cat) => handleDeleteCategory(cat) }
            );
        }

        const table = createTable({
            columns,
            data: categories,
            actions,
            emptyMessage: 'Aucune catégorie'
        });

        container.innerHTML = '';
        container.appendChild(table);
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <p>Erreur lors du chargement</p>
            </div>
        `;
    }
}

// Modal création/édition catégorie
window.showCreateCategoryModal = function() {
    showCategoryFormModal();
};

function showEditCategoryModal(category) {
    showCategoryFormModal(category);
}

function showCategoryFormModal(category = null) {
    const isEdit = !!category;
    
    const formContent = document.createElement('form');
    formContent.id = 'categoryForm';
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
                onClick: () => handleSubmitCategory(category?.id),
                closeOnClick: false
            }
        ]
    });
}

async function handleSubmitCategory(categoryId = null) {
    const form = document.getElementById('categoryForm');
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
            await productsApi.updateCategory(categoryId, data);
            showToast('Catégorie modifiée avec succès', 'success');
        } else {
            await productsApi.createCategory(data);
            showToast('Catégorie créée avec succès', 'success');
        }
        
        // Fermer le modal
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.remove();
        }
        
        // Recharger la liste avec gestion d'erreur
        try {
            await loadCategoriesList();
        } catch (reloadError) {
            console.error('Erreur lors du rechargement des catégories:', reloadError);
            showToast('Catégorie enregistrée mais erreur lors du rechargement. Veuillez actualiser la page.', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la catégorie:', error);
        showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    }
}

async function handleDeleteCategory(category) {
    confirmModal(
        `Supprimer la catégorie "${category.name}" ?`,
        async () => {
            try {
                await productsApi.deleteCategory(category.id);
                showToast('Catégorie supprimée', 'success');
                await loadCategoriesList();
            } catch (error) {
                showToast(error.message || 'Erreur', 'error');
            }
        }
    );
}

// Exposer les fonctions globalement pour les boutons onclick
window.loadProductCategoriesPage = loadProductCategoriesPage;
window.loadProductsPage = loadProductsPage;