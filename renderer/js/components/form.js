// Composants de formulaire réutilisables

/**
 * Crée un champ de formulaire
 */
export function createFormField(options = {}) {
    const {
        label = '',
        name = '',
        type = 'text',
        value = '',
        placeholder = '',
        required = false,
        error = '',
        helpText = '',
        options: selectOptions = [],
        onChange = null
    } = options;

    const field = document.createElement('div');
    field.className = 'form-group';

    if (label) {
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.setAttribute('for', name);
        labelEl.style.cssText = `
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 14px;
            color: #1f2937;
        `;
        if (required) {
            labelEl.innerHTML += ' <span style="color: #ef4444;">*</span>';
        }
        field.appendChild(labelEl);
    }

    let input;
    if (type === 'select') {
        input = document.createElement('select');
        selectOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === value) {
                option.selected = true;
            }
            input.appendChild(option);
        });
    } else if (type === 'textarea') {
        input = document.createElement('textarea');
        input.value = value;
        input.rows = options.rows || 4;
    } else {
        input = document.createElement('input');
        input.type = type;
        input.value = value;
    }

    input.id = name;
    input.name = name;
    input.placeholder = placeholder;
    input.required = required;
    
    input.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        border: 2px solid ${error ? '#ef4444' : '#e5e7eb'};
        border-radius: 8px;
        font-size: 15px;
        font-family: inherit;
        background: white;
        color: #1f2937;
        transition: all 0.2s;
        outline: none;
    `;

    input.onfocus = () => {
        input.style.borderColor = '#4f46e5';
        input.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
    };

    input.onblur = () => {
        input.style.borderColor = error ? '#ef4444' : '#e5e7eb';
        input.style.boxShadow = 'none';
    };

    if (onChange) {
        input.oninput = (e) => onChange(e.target.value);
    }

    field.appendChild(input);

    if (error) {
        const errorEl = document.createElement('div');
        errorEl.textContent = error;
        errorEl.style.cssText = `
            margin-top: 6px;
            font-size: 13px;
            color: #ef4444;
        `;
        field.appendChild(errorEl);
    }

    if (helpText) {
        const helpEl = document.createElement('div');
        helpEl.textContent = helpText;
        helpEl.style.cssText = `
            margin-top: 6px;
            font-size: 13px;
            color: #6b7280;
        `;
        field.appendChild(helpEl);
    }

    return field;
}

/**
 * Crée un bouton de formulaire
 */
export function createButton(options = {}) {
    const {
        label = '',
        type = 'button',
        variant = 'primary',
        loading = false,
        disabled = false,
        onClick = null
    } = options;

    const button = document.createElement('button');
    button.type = type;
    button.textContent = label;
    button.disabled = disabled || loading;
    
    const variants = {
        primary: {
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: 'white',
            hover: 'linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)'
        },
        secondary: {
            background: '#f3f4f6',
            color: '#1f2937',
            hover: '#e5e7eb'
        },
        danger: {
            background: '#ef4444',
            color: 'white',
            hover: '#dc2626'
        }
    };

    const variantStyle = variants[variant] || variants.primary;
    
    button.style.cssText = `
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: ${disabled || loading ? 'not-allowed' : 'pointer'};
        transition: all 0.2s;
        background: ${variantStyle.background};
        color: ${variantStyle.color};
        opacity: ${disabled || loading ? 0.7 : 1};
    `;

    if (!disabled && !loading) {
        button.onmouseover = () => {
            button.style.background = variantStyle.hover;
            button.style.transform = 'translateY(-1px)';
        };
        button.onmouseout = () => {
            button.style.background = variantStyle.background;
            button.style.transform = 'translateY(0)';
        };
    }

    if (onClick) {
        button.onclick = onClick;
    }

    if (loading) {
        button.innerHTML = `
            <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px;"></span>
            ${label}
        `;
    }

    return button;
}
