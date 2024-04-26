/**
 * The following props are passed to the callback and message functions:
 *
 * - value: The value of the field
 * - params: The parameters passed to the rule
 * - rules: The rules tree that applied to the field
 * - name: The name attribute of the field
 * - label: Safe name to display in the error message
 * - field: The jQuery field object
 */

RedotValidator.addRule('required', {
    callback: function ({ value }) {
        if (typeof value === 'string') {
            return value.trim() !== '';
        }

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        if (typeof value === 'object' && value !== null) {
            return Object.keys(value).length > 0;
        }

        return Boolean(value);
    },
    message: function ({ label }) {
        console.log(label);
        return __('validation.required', { attribute: label });
    },
});

RedotValidator.addRule('required_visible', {
    callback: function ({ value, field }) {
        if (field.is(':visible') === false) {
            // Add a skip attribute to the field to prevent it from being validated
            field.attr('skip', true);

            return true;
        }

        return RedotValidator.rules.required.callback({ value });
    },
    message: function ({ label }) {
        return __('validation.required', { attribute: label });
    },
});

RedotValidator.addRule('required_if', {
    callback: function ({ value, params, field }) {
        const $form = field.closest('form');
        const [other, otherValue] = params;

        if (field.closest('[repeater-item]').length) {
            const item = field.closest('[repeater-item]');

            if (item.find(`[initial-name^="${other}"]`).val() == otherValue) {
                return RedotValidator.rules.required.callback({ value });
            }
        }

        if ($form.find(`[name^="${other}"]`).val() == otherValue) {
            return RedotValidator.rules.required.callback({ value });
        }

        return true;
    },
    message: function ({ label, params }) {
        const [other, otherValue] = params;

        return __('validation.required_if', { attribute: label, other, otherValue });
    },
});

RedotValidator.addRule('min', {
    callback: function ({ value, params, name, field }) {
        const [min] = params;

        // If the field is a toggle, value should be the checked values
        if (['checkbox', 'radio'].includes(field.attr('type'))) {
            value = field.closest('form').find(`[name="${name}"]:checked`);
            value = value.get().map((el) => $(el).val());
        }

        if (Array.isArray(value)) {
            return value.length >= min;
        }

        if (typeof value === 'number') {
            return value >= min;
        }

        return Boolean(value) && value.trim().length >= min;
    },
    message: function ({ value, params, label, field }) {
        const [min] = params;

        if (['checkbox', 'radio'].includes(field.attr('type')) || Array.isArray(value)) {
            return __('validation.min.array', { attribute: label, min });
        }

        if (typeof value === 'number') {
            return __('validation.min.numeric', { attribute: label, min });
        }

        return __('validation.min.string', { attribute: label, min });
    },
});

RedotValidator.addRule('max', {
    callback: function ({ value, params, name, field }) {
        const [max] = params;

        // If the field is a toggle, value should be the checked values
        if (['checkbox', 'radio'].includes(field.attr('type'))) {
            value = field.closest('form').find(`[name="${name}"]:checked`);
            value = value.get().map((el) => $(el).val());
        }

        if (Array.isArray(value)) {
            return value.length <= max;
        }

        if (typeof value === 'number') {
            return value <= max;
        }

        return Boolean(value) && value.trim().length <= max;
    },
    message: function ({ value, params, label, field }) {
        const [max] = params;

        if (['checkbox', 'radio'].includes(field.attr('type')) || Array.isArray(value)) {
            return __('validation.max.array', { attribute: label, max });
        }

        if (typeof value === 'number') {
            return __('validation.max.numeric', { attribute: label, max });
        }

        return __('validation.max.string', { attribute: label, max });
    },
});

RedotValidator.addRule('between', {
    callback: function (args) {
        return RedotValidator.rules.min.callback(args) && RedotValidator.rules.max.callback(args);
    },
    message: function ({ value, params, label, field }) {
        const [min, max] = params;

        if (Array.isArray(value) || ['checkbox', 'radio'].includes(field.attr('type'))) {
            return __('validation.between.array', { attribute: label, min, max });
        }

        if (typeof value === 'number' || field.attr('type') === 'number') {
            return __('validation.between.numeric', { attribute: label, min, max });
        }

        return __('validation.between.string', { attribute: label, min, max });
    },
});

RedotValidator.addRule('email', {
    callback: function ({ value }) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g.test(value);
    },
    message: function ({ label }) {
        return __('validation.email', { attribute: label });
    },
});

RedotValidator.addRule('url', {
    callback: function ({ value }) {
        return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,4}(\/[\w-\.]*)*\/?$/g.test(value);
    },
    message: function ({ label }) {
        return __('validation.url', { attribute: label });
    },
});

RedotValidator.addRule('alpha', {
    callback: function ({ value }) {
        return /^[a-zA-Z]+$/g.test(value);
    },
    message: function ({ label }) {
        return __('validation.alpha', { attribute: label });
    },
});

RedotValidator.addRule('alpha_num', {
    callback: function ({ value }) {
        return /^[a-zA-Z0-9]+$/g.test(value);
    },
    message: function ({ label }) {
        return __('validation.alpha_num', { attribute: label });
    },
});

RedotValidator.addRule('alpha_dash', {
    callback: function ({ value }) {
        return /^[a-zA-Z0-9_-]+$/g.test(value);
    },
    message: function ({ label }) {
        return __('validation.alpha_dash', { attribute: label });
    },
});

RedotValidator.addRule('starts_with', {
    callback: function ({ value, params }) {
        return params.some((param) => value.startsWith(param));
    },
    message: function ({ label, params }) {
        return __('validation.starts_with', { attribute: label, values: params.join(', ') });
    },
});

RedotValidator.addRule('ends_with', {
    callback: function ({ value, params }) {
        return params.some((param) => value.endsWith(param));
    },
    message: function ({ label, params }) {
        return __('validation.ends_with', { attribute: label, values: params.join(', ') });
    },
});

RedotValidator.addRule('enum', {
    callback: function ({ value, params }) {
        return params.some((param) => param == value);
    },
    message: function ({ label, params }) {
        return __('validation.enum', { attribute: label, values: params.join(', ') });
    },
});

RedotValidator.addRule('lowercase', {
    callback: function ({ value }) {
        return value.toLowerCase() === value;
    },
    message: function ({ label }) {
        return __('validation.lowercase', { attribute: label });
    },
});

RedotValidator.addRule('uppercase', {
    callback: function ({ value }) {
        return value.toUpperCase() === value;
    },
    message: function ({ label }) {
        return __('validation.uppercase', { attribute: label });
    },
});

RedotValidator.addRule('numeric', {
    callback: function ({ value }) {
        return /^[0-9]+$/g.test(value);
    },
    message: function ({ label }) {
        return __('validation.numeric', { attribute: label });
    },
});

RedotValidator.addRule('integer', {
    callback: function ({ value }) {
        return value % 1 === 0;
    },
    message: function ({ label }) {
        return __('validation.integer', { attribute: label });
    },
});

RedotValidator.addRule('decimal', {
    callback: function ({ value }) {
        return value % 1 !== 0;
    },
    message: function ({ label }) {
        return __('validation.decimal', { attribute: label });
    },
});

RedotValidator.addRule('in', {
    callback: function ({ value, params }) {
        return params.some((param) => param == value);
    },
    message: function ({ label, params }) {
        return __('validation.in', { attribute: label, values: params.join(', ') });
    },
});

RedotValidator.addRule('not_in', {
    callback: function ({ value, params }) {
        return !params.some((param) => param == value);
    },
    message: function ({ label, params }) {
        return __('validation.not_in', { attribute: label, values: params.join(', ') });
    },
});

RedotValidator.addRule('confirmed', {
    callback: function ({ value, name, field }) {
        const confirmation = field.closest('form').find(`[name="${name}_confirmation"]`).val();

        return value === confirmation;
    },
    message: function ({ label }) {
        return __('validation.confirmed', { attribute: label });
    },
});

RedotValidator.addRule('regex', {
    callback: function ({ value, params }) {
        let [regex] = params;
        regex = regex.replace(/^\/|\/$/g, '');

        return new RegExp(regex).test(value);
    },
    message: function ({ label }) {
        return __('validation.regex', { attribute: label });
    },
});
