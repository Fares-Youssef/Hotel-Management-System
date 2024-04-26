class RedotRepeater {
    /**
     * The hidden input element that binds the repeater data.
     */
    $input;

    /**
     * The repeater identifier, used to fetch other repeater elements.
     */
    identifier;

    /**
     * The repeater name, used as a prefix for the repeater items.
     */
    name;

    /**
     * The template element that will be cloned to create new repeater items.
     */
    $template;

    /**
     * The container element that contains the repeater items.
     */
    $container;

    /**
     * The wrapper element that contains the repeater items.
     */
    $wrapper;

    /**
     * The list of repeater items.
     */
    $list;

    /**
     * Default options for the repeater.
     */
    options = {
        sortable: true,
        scrollable: true,
        confirmable: true,

        actions: {
            insert: '[action="insert"]',
            remove: '[action="remove"]',
            clear: '[action="clear"]',
        },

        attributes: {
            template: 'repeater-template',
            container: 'repeater-container',
            wrapper: 'repeater-wrapper',
            list: 'repeater-list',
            item: 'repeater-item',
        },
    };

    /**
     * Create a new instance.
     */
    constructor(selector, options) {
        this.options = _.merge(this.options, options);
        const { attributes } = this.options;

        this.$input = $(selector);
        this.$input.wrap(`<div ${attributes.container}></div>`);

        this.identifier = this.$input.attr('id');
        this.name = this.$input.attr('name');

        // Find the template element for the repeater.
        this.$template = $(`[${attributes.template}="${this.identifier}"]`);

        // Get the container element for the repeater.
        this.$container = this.$input.parent(`[${attributes.container}]`);
        this.$container.attr(attributes.container, this.identifier);

        // Create a wrapper element for the repeater.
        this.$wrapper = $(`<div>`).html($(`[${attributes.wrapper}="${this.identifier}"]`).html());
        this.$list = this.$wrapper.find(`[${attributes.list}]`);

        // Append the wrapper to the container.
        this.$container.append(this.$wrapper);

        // Initialize the repeater.
        this.init();

        // Restore the repeater data.
        $(document).ready(() => this.set(this.$input.val()));
    }

    /**
     * Initialize the repeater.
     */
    init() {
        // Bind the actions.
        const { actions, attributes } = this.options;

        this.$wrapper.on('click', actions.insert, ({ currentTarget }) => {
            const after = $(currentTarget).closest(`[${attributes.item}]`);

            this.insert({}, after.length === 0 ? null : after);
        });

        this.$wrapper.on('click', actions.remove, ({ currentTarget }) => {
            this.remove($(currentTarget).closest(`[${attributes.item}]`));
        });

        this.$wrapper.on('click', actions.clear, () => {
            this.clear();
        });

        // Make the repeater sortable.
        if (this.options.sortable) {
            const defaultSortableOptions = {
                animation: 150,
            };

            const requiredSortableOptions = {
                onEnd: () => this.reorder(),
            };

            new Sortable(
                this.$list.get(0),
                _.merge(
                    _.isPlainObject(this.options.sortable) ? this.options.sortable : {},
                    defaultSortableOptions,
                    requiredSortableOptions,
                ),
            );
        }

        // Bind the form submit event to serialize the repeater data.
        this.$container.closest('form').on('submit', () => {
            // Clear the input value before serializing the repeater data.
            this.$input.val(null);

            // Get the repeater items and serialize them.
            const items = this.get();

            // Early return if the items are empty.
            if (items.length === 0) return;

            this.$input.val(JSON.stringify(items));
        });
    }

    /**
     * Insert a new repeater item.
     */
    insert(data = {}, after = null) {
        const $item = $('<div></div>').html(this.$template.html());
        const uniqueId = _.uniqueId(this.options.attributes.item + '-');

        // Assign the `options.attributes.item` attribute to the new item.
        $item.attr(this.options.attributes.item, uniqueId);

        // Handle the visibility plugin to read the correct selector.
        this.handleVisibility($item);

        // Replace the `id` attribute and `for` attribute of the labels.
        this.handleDuplicateIds($item, uniqueId);

        // Rewrite the field names of the repeater item.
        this.rewriteFieldNames($item);

        // Append the new item to the wrapper.
        if (after === null) {
            this.$list.append($item);
        } else {
            $(after).closest(`[${this.options.attributes.item}]`).after($item);
        }

        // Reorder the repeater items after inserting a new item.
        this.reorder();

        // Set the repeater item fields.
        deserializeFields($item, data, 'initial-name');

        // Scroll to the newly inserted item.
        if (this.options.scrollable) {
            $item.get(0).scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Handle the visibility of the repeater items.
     */
    handleVisibility($item) {
        if (!RedotVisibility.instance) return;

        const instance = RedotVisibility.instance;
        const regex = new RegExp(instance.selectorPattern.source, 'g');

        $item.find(`[${instance.selector}]`).each((i, el) => {
            const $el = $(el);
            let statement = $el.attr(instance.selector);

            statement.match(regex).forEach((match) => {
                const [selector] = match.split('->');

                $item.find(selector).each((i, el) => {
                    // Early return if the element already has a visibility key.
                    if ($(el).attr('visibility-key')) return;

                    // Generate a unique visibility key.
                    const key = _.uniqueId('visibility-');

                    // Append the visibility key to the element.
                    $(el).attr('visibility-key', key);

                    // Use the visibility key as the selector.
                    statement = statement.replaceAll(selector, `[visibility-key="${key}"]`);
                });
            });

            $el.attr(instance.selector, statement);
        });
    }

    /**
     * Rewrite the field names of the repeater items.
     */
    rewriteFieldNames($item) {
        $item.find('[name]').each((i, el) => {
            const $el = $(el);
            const initial = $el.attr('name');

            // Store the initial name of the field.
            $el.attr('initial-name', initial);

            const pos = initial.indexOf('[');
            const [first, rest = ''] = pos === -1 ? [initial] : [initial.substring(0, pos), initial.substring(pos)];

            const rewritten = `${this.name}[__index__][${first}]${rest}`;

            // Rewrite the field name with the rewritten one.
            $el.attr('name', rewritten);
        });
    }

    /**
     * Handle the duplicate IDs of the repeater items.
     */
    handleDuplicateIds($item, uniqueId) {
        $item.find('[id]').each((i, el) => {
            const $el = $(el);
            const id = $el.attr('id');

            // Replace the `id` attribute of the element.
            $el.attr('id', `${uniqueId}-${id}`);

            // Attributes that may contain the `id` of the element.
            const attributes = [
                'for',
                'href',
                'aria-controls',
                'aria-labelledby',
                'aria-describedby',
                'data-target',
                'data-bs-target',

                // Repeater specific attributes. (for nested repeaters)
                ...Object.values(this.options.attributes),
            ];

            attributes.forEach((attr) => {
                const selector = `[${attr}="${id}"], [${attr}="#${id}"]`;
                const $items = $item.find(selector).add(selector);

                $items.each((i, el) => {
                    const $el = $(el);
                    const value = $el.attr(attr);

                    $el.attr(attr, value.replace(id, `${uniqueId}-${id}`));
                });
            });
        });
    }

    /**
     * Remove a repeater item.
     */
    remove(item, force = false) {
        if (force || this.options.confirmable === false) {
            $(item).remove();

            // Reorder the repeater items after removing an item.
            return this.reorder();
        }

        // Show a confirmation dialog before removing the item.
        warnBeforeAction(
            () => this.remove(item, true),
            _.isPlainObject(this.options.confirmable) ? this.options.confirmable : {},
        );
    }

    /**
     * Clear all repeater items.
     */
    clear(force = false) {
        if (this.$list.find(`[${this.options.attributes.item}]`).length === 0) {
            return;
        }

        if (force || this.options.confirmable === false) {
            return this.$list.find(`[${this.options.attributes.item}]`).remove();
        }

        // Show a confirmation dialog before clearing all items.
        warnBeforeAction(
            () => this.clear(true),
            _.isPlainObject(this.options.confirmable) ? this.options.confirmable : {},
        );
    }

    /**
     * Reorder the repeater items.
     */
    reorder() {
        const $items = this.$list.find(`[${this.options.attributes.item}]`).get();

        $items.reverse().forEach((el) => {
            const $el = $(el);
            const index = $el.index();

            $el.find('[name]').each((i, field) => {
                const $field = $(field);
                const name = $field.attr('name');
                const regex = new RegExp(`^${this.name}\\[(\\d+|__index__)\\]`, 'g');

                $field.attr('name', name.replace(regex, `${this.name}[${index}]`));
            });
        });
    }

    /**
     * Get the repeater data.
     */
    get() {
        const items = this.$list.find(`[${this.options.attributes.item}]`).get();

        return items.map((item) => serializeFields($(item), 'initial-name'));
    }

    /**
     * Set the repeater data.
     */
    set(items) {
        // Early return if the items are empty.
        if (!items || items.length === 0) return;

        if (typeof items === 'string') {
            items = JSON.parse(items);
        }

        items.forEach((item) => this.insert(item));
    }
}
