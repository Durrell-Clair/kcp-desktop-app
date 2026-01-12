// Composant Table réutilisable

/**
 * Crée un tableau avec données
 */
export function createTable(options = {}) {
    const {
        columns = [],
        data = [],
        actions = [],
        emptyMessage = 'Aucune donnée',
        onRowClick = null,
        sortable = true
    } = options;

    const table = document.createElement('div');
    table.className = 'table-container';
    table.style.cssText = `
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    if (data.length === 0) {
        table.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6b7280;">
                ${emptyMessage}
            </div>
        `;
        return table;
    }

    const tableEl = document.createElement('table');
    tableEl.className = 'table';
    tableEl.style.cssText = `
        width: 100%;
        border-collapse: collapse;
    `;

    // Header
    const thead = document.createElement('thead');
    thead.style.cssText = 'background: #f9fafb;';
    
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.style.cssText = `
            padding: 12px 16px;
            text-align: ${col.align || 'left'};
            font-weight: 600;
            font-size: 14px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #e5e7eb;
        `;
        
        if (sortable && col.sortable !== false) {
            th.style.cursor = 'pointer';
            th.onclick = () => {
                // TODO: Implémenter le tri
                console.log('Sort by', col.key);
            };
        }
        
        headerRow.appendChild(th);
    });
    
    if (actions.length > 0) {
        const th = document.createElement('th');
        th.textContent = 'Actions';
        th.style.cssText = `
            padding: 12px 16px;
            text-align: right;
            font-weight: 600;
            font-size: 14px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 2px solid #e5e7eb;
        `;
        headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    tableEl.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.cssText = `
            border-bottom: 1px solid #e5e7eb;
            transition: background 0.2s;
        `;
        
        if (onRowClick) {
            tr.style.cursor = 'pointer';
            tr.onclick = () => onRowClick(row);
            tr.onmouseover = () => {
                tr.style.background = '#f9fafb';
            };
            tr.onmouseout = () => {
                tr.style.background = 'transparent';
            };
        }

        columns.forEach(col => {
            const td = document.createElement('td');
            td.style.cssText = `
                padding: 12px 16px;
                text-align: ${col.align || 'left'};
                color: #1f2937;
            `;
            
            let content = '';
            if (col.render) {
                content = col.render(row[col.key], row);
            } else {
                content = row[col.key] || '';
            }
            
            if (typeof content === 'string') {
                td.innerHTML = content;
            } else {
                td.appendChild(content);
            }
            
            tr.appendChild(td);
        });

        // Actions column
        if (actions.length > 0) {
            const td = document.createElement('td');
            td.style.cssText = `
                padding: 12px 16px;
                text-align: right;
            `;
            
            const actionsContainer = document.createElement('div');
            actionsContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end;';
            
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.textContent = action.label;
                btn.className = `btn ${action.variant || 'btn-secondary'}`;
                btn.style.cssText = 'padding: 6px 12px; font-size: 13px;';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    action.onClick(row);
                };
                actionsContainer.appendChild(btn);
            });
            
            td.appendChild(actionsContainer);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    tableEl.appendChild(tbody);
    table.appendChild(tableEl);

    return table;
}

/**
 * Crée un badge de statut
 */
export function createBadge(text, color = '#6b7280') {
    const badge = document.createElement('span');
    badge.textContent = text;
    badge.style.cssText = `
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        background: ${color}20;
        color: ${color};
    `;
    return badge;
}
