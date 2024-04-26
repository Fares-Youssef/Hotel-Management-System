/* ---------------------------------
 * Utilities
 * --------------------------------- */

/**
 * Show a confirmation dialog before executing the given action.
 *
 * @param {function} action
 * @param {object} options
 */
function warnBeforeAction(action, options = {}) {
    const defaultOptions = {
        type: 'red',
        title: __('Are you sure?'),
        content: __('This action cannot be undone.'),
        escapeKey: true,
        backgroundDismiss: true,
        buttons: {
            confirm: {
                text: __('Yes'),
                action: () => {
                    action();
                },
            },
            cancel: {
                text: __('No'),
            },
        },
    };

    $.confirm(_.merge(defaultOptions, options));
}

/**
 * Check if the given value is JSON.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isJson(value) {
    try {
        JSON.parse(value);
    } catch (error) {
        return false;
    }

    return true;
}

/**
 * Translate the given key with the given parameters.
 *
 * @param {string} key
 * @param {object} params
 * @returns {string}
 */
function __(key, params = {}) {
    if (typeof window.__translations === 'undefined') {
        return key;
    }

    let translation = window.__translations[key] || key;

    for (const [param, value] of Object.entries(params)) {
        translation = translation.replaceAll(`:${param}`, value);
    }

    return translation;
}

/**
 * Append the given errors to the given form.
 *
 * @param {object} $form
 * @param {object} errors
 * @returns {void}
 */
function appendErrorsToForm($form, errors = {}) {
    $form.find('.invalid-feedback').remove();
    $form.find('.is-invalid').removeClass('is-invalid');
    $form.find('.has-invalid-feedback').removeClass('has-invalid-feedback');

    for (const [key, value] of Object.entries(errors)) {
        const normalizedKey = key.replace(/\.([^\.]+)/g, '[$1]');
        const possibleKeys = [key, `${key}[]`, normalizedKey, `${normalizedKey}[]`];

        let $input = $form.find(possibleKeys.map((key) => `[name="${key}"]`).join(', '));

        // If the input is not found, try to find it by the validation key.
        if ($input.length === 0) {
            $form.find(`[validation-key]`).each(function () {
                const key = $(this).attr('validation-key');

                if (possibleKeys.includes($(this).attr(key))) {
                    $input = $(this);
                }
            });
        }

        const $feedback = $(`<div class="invalid-feedback"></div>`);
        const $container = $input.attr('validation-container')
            ? $form.find($input.attr('validation-container'))
            : $input.parent();

        $input.addClass('is-invalid');
        $container.addClass('has-invalid-feedback').append($feedback);

        let messages = Object.values(value);
        let message = messages.shift();

        if (messages.length) {
            // If there are more than one error, add a counter for the remaining errors
            message += ' ' + __('(and :count more error)', { count: messages.length });
        }

        $feedback.html(`<strong>${message}</strong>`);

        if ($input.closest('.input-group').length) {
            $input.closest('.input-group').addClass('has-invalid-feedback');
        }

        $input.parents('.tab-pane').each(function () {
            const tabpane = $(this).attr('id');
            $(`[href="#${tabpane}"]`).addClass('has-invalid-feedback');
        });
    }
}

/**
 * Serialize the given fields.
 *
 * @param {object} $fields
 * @returns {object}
 */
function serializeFields($fields, key = 'name') {
    const data = {};

    $fields.find(`[${key}]`).each(function () {
        const identifier = $(this).attr(key).replace(/\[\]$/, '');

        // Set the field value to the data object.
        _.set(data, identifier, getFieldValue($(this), $fields, key));
    });

    return data;
}

/**
 * Get the value of the given field.
 *
 * @param {object} $field
 * @param {object} form
 * @param {string} key
 * @returns any
 */
function getFieldValue($field, form = 'body', key = 'name') {
    const type = $field.attr('type');
    const identifier = $field.attr(key);

    if (type === 'checkbox' && $field.closest('.form-switch').length) {
        return $field.is(':checked');
    }

    if (type === 'checkbox') {
        const checked = $(form).find(`[${key}="${identifier}"]:checked`);
        return checked.map((i, el) => $(el).val()).get();
    }

    if (type === 'radio') {
        return $(form).find(`[${key}="${identifier}"]:checked`).val();
    }

    if (type === 'number') {
        return +$field.val();
    }

    if (window.tinymce && tinymce.get($field.attr('id'))) {
        return tinymce.get($field.attr('id')).getContent();
    }

    return $field.val();
}

/**
 * Deserialize the given data to the given fields.
 *
 * @param {object} $fields
 * @param {object} data
 * @returns {void}
 */
function deserializeFields($fields, data = {}, key = 'name') {
    $fields.find(`[${key}]`).each(function () {
        const $field = $(this);
        const identifier = $(this).attr(key).replace(/\[\]$/, '');
        const value = _.get(data, identifier);

        setFieldValue($field, value, $fields, key);

        // Trigger the change event after setting the value.
        $field.trigger('change');
    });
}

/**
 * Set the value of the given field.
 *
 * @param {object} $field
 * @param {any} value
 * @param {object} form
 * @param {string} key
 * @returns {void}
 */
function setFieldValue($field, value, form = 'body', key = 'name') {
    const type = $field.attr('type');
    const identifier = $field.attr(key);

    if (type === 'checkbox' && $field.closest('.form-switch').length) {
        return $field.prop('checked', value);
    }

    if (type === 'checkbox') {
        const checked = _.castArray(value);
        const checkboxes = $(form).find(`[${key}="${identifier}"]`);

        // Uncheck all checkboxes before checking the selected ones.
        checkboxes.prop('checked', false);

        return checkboxes.filter((i, el) => checked.includes($(el).val())).prop('checked', true);
    }

    if (type === 'radio') {
        return $(form).find(`[${key}="${identifier}"][value="${value}"]`).prop('checked', true);
    }

    if (type === 'number') {
        return $field.val(+value);
    }

    if (window.tinymce && tinymce.get($field.attr('id'))) {
        return tinymce.get($field.attr('id')).setContent(value);
    }

    return $field.val(value);
}

/**
 * Convert the given string to a primitive value.
 *
 * @param {string} string
 * @returns any
 */
function stringToPrimitive(string) {
    const primitives = {
        true: true,
        false: false,
        null: null,
        undefined: undefined,
    };

    // If the value is a primitive, return it.
    if (string in primitives) return primitives[string];

    // If the value is a property of the window object, return it.
    if (string.startsWith('window.')) return _.get(window, string.replace('window.', ''), string);

    // If the value is a numeric string, return it.
    if (string.match(/^-?\d+$/)) return Number(string);

    // If the value is array-like, return it as an array.
    if (string.startsWith('[') && string.endsWith(']')) return JSON.parse(string.replace(/'/g, '"'));

    // If the value starts with `return`, evaluate it and return the result.
    if (string.startsWith('return ')) return new Function(string)();

    // Try to parse the value as JSON and return it.
    return isJson(string) ? JSON.parse(string) : string;
}
