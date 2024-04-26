class RedotVisibility {
    /**
     * The instance of the plugin.
     */
    static instance = null;

    /**
     * The selector to use to find the elements to toggle.
     */
    selector = 'visible-when';

    /**
     * The pattern to use to find the selectors in the statements.
     */
    selectorPattern = /[\w\[#.]\s*[^&|!(){}]+->\w+/;

    /**
     * Custom operators to use in the statements.
     */
    operators = {
        between: {
            params: /(\d+) and (\d+)/,
            replace: `{value} >= $1 && {value} <= $2`,
        },
        in: {
            params: /(\[[^\]]+\])/,
            replace: `$1.some(e => e == {value})`,
        },
        includes: {
            params: /([^\s]+)/,
            replace: `{value}.some(e => e == $1)`,
        },
    };

    /**
     * Custom attributes to use in the statements.
     */
    attributes = {
        checked: (selector) => {
            const values = $(selector)
                .filter(':checked')
                .map((_, element) => $(element).val())
                .get();

            return $(selector).is(':checkbox') ? values : values[0];
        },
        value: (selector) => $(selector).val(),
    };

    /**
     * Selectors to watch for changes.
     */
    selectors = new Set();

    /**
     * Create a new instance.
     */
    constructor() {
        if (RedotVisibility.instance !== null) {
            return RedotVisibility.instance;
        }

        RedotVisibility.instance = this;

        this.watch();
    }

    /**
     * Update the visibility of the elements.
     */
    update() {
        $(`[${this.selector}]`).each((_, element) => {
            const statement = $(element).attr(this.selector);
            const visibility = Boolean(this.evaluate(statement));

            $(element).toggle(visibility).trigger('visibility:updated', visibility);
        });
    }

    /**
     * Evaluate the statement.
     */
    evaluate(statement) {
        const pattern = this.selectorPattern;

        // Replace operators and move the value to the correct place
        for (const [operator, definition] of Object.entries(this.operators)) {
            const { params, replace } = definition;
            const regex = new RegExp(`(${pattern.source}) ${operator} ${params.source}`, 'g');

            statement = statement.replace(regex, (_, selector, ...params) =>
                replace.replaceAll('{value}', selector).replace(/\$(\d+)/g, (_, index) => params[index - 1]),
            );
        }

        // Replace `selector->attribute` with the actual value
        statement = statement.replace(new RegExp(pattern.source, 'g'), (match) => {
            let value;
            const [selector, attribute] = match.split('->');

            if (this.attributes[attribute]) {
                value = this.attributes[attribute](selector);
            } else {
                value = $(selector).attr(attribute);
            }

            return this.prepareValue(value);
        });

        try {
            return eval(statement);
        } catch (error) {
            return false;
        }
    }

    /**
     * Prepare the value for the statement.
     */
    prepareValue(value) {
        if (typeof value === 'string') {
            return `'${value.replaceAll("'", "\\'")}'`;
        }

        if (Array.isArray(value)) {
            return `[${value.map((value) => this.prepareValue(value)).join(', ')}]`;
        }

        return value;
    }

    /**
     * Watch for changes on the selectors.
     */
    watch() {
        const pattern = this.selectorPattern;

        $(`[${this.selector}]`).each((_, element) => {
            const statement = $(element).attr(this.selector);
            const selectors = statement.match(new RegExp(pattern.source, 'g')) || [];

            selectors.forEach((selector) => {
                [selector, _] = selector.split('->');

                // Early return if the selector is already being watched
                if (this.selectors.has(selector)) return;

                this.selectors.add(selector);
                $(selector).on('change input', () => this.update());
            });
        });

        this.update();
    }
}
