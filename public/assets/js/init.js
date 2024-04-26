/* ---------------------------------
 * Initiator helpers
 * --------------------------------- */

const initiators = {
    'rich-editor': initRichEditor,
    'date-picker': initDatePicker,
    'icon-picker': initIconPicker,
    'select-box': initSelectBox,
    repeater: initRepeater,
};

/**
 * Initialize the given initiators.
 *
 * @param {string} selector
 */
function init(selector = 'body') {
    const $selector = $(selector).attr('init') ? $(selector).parent() : $(selector);

    // Initialize non-initialized initiators.
    $selector.find('[init]:not([initialized])').each(function () {
        let inits = $(this).attr('init').split(' ');

        for (const init of inits) {
            if (!initiators[init]) {
                console.error(`Initiator "${init}" is not defined.`);
                continue;
            }

            const options = this.hasAttribute(init) ? stringToPrimitive($(this).attr(init)) : {};
            initiators[init](this, options); // Call the initiator with the given options.
        }

        $(this).attr('initialized', true);
    });

    // Watch for visibility changes.
    if (RedotVisibility.instance) RedotVisibility.instance.watch();
}

/**
 * Get the options from the given selector.
 *
 * @param {string} selector
 * @param {string} prefix
 * @param {boolean} camelCase
 * @returns {object}
 */
function getOptionsFromSelector(selector, prefix, camelCase = true) {
    const attributes = $(selector).get(0).attributes;
    const options = {};

    for (const attribute of attributes) {
        if (!attribute.name.startsWith(prefix)) {
            continue;
        }

        let key = attribute.name.replace(prefix, '');
        let value = stringToPrimitive(attribute.value);

        // Convert the key to camel case if needed.
        if (camelCase) key = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

        _.set(options, key, value);
    }

    return options;
}

/* ---------------------------------
 * Plugins initialization
 * --------------------------------- */

/**
 * Initialize the tinyMCE editor.
 *
 * @param {string} selector
 * @param {object} options
 * @returns {object}
 * @see https://www.tiny.cloud/docs/
 */
async function initRichEditor(selector, options = {}) {
    if (typeof tinyMCE === 'undefined') {
        console.error('TinyMCE is not loaded.');
        return;
    }

    const theme = localStorage.getItem(window.themerKey) || 'light';

    options = Object.assign({}, options, {
        selector: '#' + $(selector).attr('id'),
        language: document.documentElement.lang,
        directionality: document.documentElement.dir,
        height: 300,
        menubar: false,
        branding: false,
        skin: theme === 'dark' ? 'oxide-dark' : 'oxide',
        content_css: theme === 'dark' ? 'dark' : 'default',
        plugins: 'advlist autolink code directionality link lists table image',
        toolbar:
            'undo redo | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify outdent indent ltr rtl | bullist numlist | table image',
        toolbar_mode: 'sliding',
        image_title: true,
        automatic_uploads: true,
        images_upload_url: '/tinymce/upload',
        file_picker_types: 'image',
        file_picker_callback: (cb, value, meta) => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');

            input.onchange = () => {
                const file = input.files[0];
                const reader = new FileReader();

                reader.onload = () => {
                    const id = 'blobid' + new Date().getTime();
                    const blobCache = tinyMCE.activeEditor.editorUpload.blobCache;
                    const base64 = reader.result.split(',')[1];
                    const blobInfo = blobCache.create(id, file, base64);
                    blobCache.add(blobInfo);

                    cb(blobInfo.blobUri(), { title: file.name });
                };

                reader.readAsDataURL(file);
            };

            input.click();
        },
    });

    const [instance] = await tinyMCE.init(options);

    document.addEventListener(
        'theme:changed',
        () => {
            instance?.destroy();
            initRichEditor(selector, options);
        },
        { once: true },
    );
}

/**
 * Initialize the litepicker date picker.
 *
 * @param {string} selector
 * @param {object} options
 * @returns {object}
 * @see https://litepicker.com/
 */
function initDatePicker(selector, options = {}) {
    const defaultOptions = {
        element: $(selector).get(0),
        showTooltip: true,
        autoApply: true,
        allowRepick: true,
        lang: document.documentElement.lang,
        buttonText: {
            previousMonth: '<i class="fa fa-angle-left"></i>',
            nextMonth: '<i class="fa fa-angle-right"></i>',
        },
    };

    const selectorOptions = getOptionsFromSelector(selector, 'date-');
    options = _.merge(defaultOptions, selectorOptions, options);

    const picker = new Litepicker(options);
    $(selector).data('litepicker', picker);
}

/**
 * Initialize the icon picker input.
 *
 * @param {string} selector
 * @see https://fontawesome.com
 */
function initIconPicker(selector) {
    const $input = $(selector);
    const $wrapper = $input.closest('[data-wrapper]');
    const $preview = $wrapper.find('[data-preview]');
    const $picker = $wrapper.find('[data-picker]');

    $input.on('change input', function () {
        $preview.attr('class', `icon icon-sm ${this.value}`);
    });

    $picker.on('click', function () {
        $.confirm({
            icon: 'far fa-font-awesome me-2',
            title: __('Select an icon'),
            content: $('[for="icon-picker"]').html(),
            onContentReady: function () {
                bindIconPickerEvents(this.$content);
            },
            buttons: {
                cancel: {
                    text: __('Cancel'),
                },
                confirm: {
                    text: __('Select'),
                    action: function () {
                        saveIconPickerSelection(this.$content);
                    },
                },
            },
        });
    });

    const bindIconPickerEvents = ($content) => {
        $content.find('[data-search]').on(
            'keyup',
            _.debounce(function () {
                const term = this.value.trim();

                // Early exit if the search term is empty.
                if (term.length === 0) {
                    populateIconPicker($content, []);
                    return;
                }

                const endpoint = 'https://api.fontawesome.com';
                const query = `query {
                    search(version: "6.4.2", query: "${this.value}", first: 100) {
                        id,
                        familyStylesByLicense {
                            free {
                                family,
                                style
                            }
                        }
                    }
                }`;

                fetch(`${endpoint}/?query=${query}`)
                    .then((response) => response.json())
                    .then((response) => populateIconPicker($content, response.data.search));
            }, 100),
        );

        $content.on('click', '[data-icon]', function () {
            $content.find('[data-list] [data-icon]').removeClass('selected');
            $(this).addClass('selected');
        });
    };

    const populateIconPicker = ($content, icons) => {
        $content.find('[data-list] [data-icon]').remove();

        for (const icon of icons) {
            // Skip if the icon has no free styles.
            if (icon.familyStylesByLicense.free.length === 0) {
                continue;
            }

            const style = icon.familyStylesByLicense.free[0].style;
            const cls = `fa-${style} fa-${icon.id}`;

            $content.find('[data-list]').append(`<div data-icon="${cls}"><i class="${cls}"></i></div>`);
        }

        $content.find('.empty').toggle($content.find('[data-list] [data-icon]').length === 0);
    };

    const saveIconPickerSelection = ($content) => {
        const $selected = $content.find('[data-list] [data-icon].selected');

        if ($selected.length === 0) {
            return;
        }

        $input.val($selected.attr('data-icon')).trigger('change');
    };

    $input.trigger('change');
}

/**
 * Initialize the tom select input.
 *
 * @param {string} selector
 * @param {object} options
 * @see https://tom-select.js.org/
 */
function initSelectBox(selector, options = {}) {
    const defaultOptions = {
        create: false,
        dropdownParent: 'body',
        copyClassesToDropdown: false,
        placeholder: __('Select an option'),
    };

    const selectorOptions = getOptionsFromSelector(selector, 'select-');
    options = _.merge(defaultOptions, selectorOptions, options);

    const instance = new TomSelect(selector, options);

    // Set the instance on the input element.
    $(selector).data('tomselect', instance);
}

/**
 * Initialize the repeater input.
 *
 * @param {string} selector
 * @param {object} options
 */
function initRepeater(selector, options = {}) {
    const defaultOptions = {
        sortable: true,
        scrollable: true,
        confirmable: true,
    };

    const selectorOptions = getOptionsFromSelector(selector, 'repeater-');
    options = _.merge(defaultOptions, selectorOptions, options);

    const repeater = new RedotRepeater(selector, options);

    // Set the instance on the input element.
    $(selector).data('repeater', repeater);
}
