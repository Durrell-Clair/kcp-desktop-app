// Composant Modal réutilisable

/**
 * Crée et affiche un modal
 */
export function createModal(options = {}) {
    const {
        title = '',
        content = '',
        size = 'medium', // small, medium, large
        showCloseButton = true,
        onClose = null,
        buttons = []
    } = options;

    // Créer le modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const sizeClasses = {
        small: 'max-width: 400px;',
        medium: 'max-width: 600px;',
        large: 'max-width: 900px;'
    };

    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        width: 90%;
        ${sizeClasses[size] || sizeClasses.medium}
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease-out;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = `
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        font-size: 20px;
        font-weight: 700;
        color: #1f2937;
        margin: 0;
    `;

    header.appendChild(titleEl);

    if (showCloseButton) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.className = 'modal-close';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            color: #6b7280;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.background = '#f3f4f6';
            closeBtn.style.color = '#1f2937';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = '#6b7280';
        };
        closeBtn.onclick = () => closeModal();
        header.appendChild(closeBtn);
    }

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.cssText = `
        padding: 24px;
        overflow-y: auto;
        flex: 1;
    `;
    
    if (typeof content === 'string') {
        body.innerHTML = content;
    } else {
        body.appendChild(content);
    }

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.cssText = `
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    `;

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.label;
        button.className = `btn ${btn.variant || 'btn-primary'}`;
        button.onclick = () => {
            if (btn.onClick) {
                btn.onClick();
            }
            if (btn.closeOnClick !== false) {
                closeModal();
            }
        };
        footer.appendChild(button);
    });

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    modalOverlay.appendChild(modal);

    // Fonction de fermeture
    function closeModal() {
        modalOverlay.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => {
            document.body.removeChild(modalOverlay);
            if (onClose) onClose();
        }, 200);
    }

    // Fermer en cliquant sur l'overlay
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    };

    // Ajouter les animations CSS si pas déjà présentes
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modalOverlay);
    
    return {
        close: closeModal,
        updateContent: (newContent) => {
            body.innerHTML = '';
            if (typeof newContent === 'string') {
                body.innerHTML = newContent;
            } else {
                body.appendChild(newContent);
            }
        }
    };
}

/**
 * Modal de confirmation
 */
export function confirmModal(message, onConfirm, onCancel = null) {
    return createModal({
        title: 'Confirmation',
        content: `<p style="color: #6b7280; margin: 0;">${message}</p>`,
        size: 'small',
        buttons: [
            {
                label: 'Annuler',
                variant: 'btn-secondary',
                onClick: onCancel,
                closeOnClick: true
            },
            {
                label: 'Confirmer',
                variant: 'btn-primary',
                onClick: onConfirm,
                closeOnClick: true
            }
        ]
    });
}
