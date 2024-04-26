class RedotValidator {
    /**
     * Rules registered on the validator.
     */
    static rules = {};

    /**
     * Attribute name to be used in the DOM.
     */
    static attribute = 'validation';

    /**
     * Disable validation attribute name to be used in the DOM.
     */
    static disableAttribute = 'disable-validation';

    /**
     * Add a rule to the validator.
     */
    static addRule(name, callback) {
        this.rules[name] = callback;
    }

    /**
     * Validate the given wrapper.
     */
    static valid(wrapper) {
        return Object.keys(this.errors(wrapper)).length === 0;
    }

    /**
     * Get the errors for the given wrapper.
     */
    static errors(wrapper) {
        const errors = {};
        const selector = `[${this.attribute}]:not([${this.disableAttribute}])`;

        $(wrapper)
            .find(selector)
            .each((_index, field) => {
                const $field = $(field);
                const value = getFieldValue($field, wrapper);
                const rules = this.getRules($field);

                // If the field is nullable and the value is empty, skip it
                if (rules.nullable && Boolean(value) === false) return;

                // If the field is nullable, remove the rule
                rules.nullable && delete rules.nullable;

                for (const [rule, params] of Object.entries(rules)) {
                    // If the field has the skip attribute, skip it
                    if ($field.attr('skip')) return $field.removeAttr('skip');

                    const record = this.rules[rule];

                    // If the rule doesn't exist, skip it
                    if (!record || !record.callback) {
                        continue;
                    }

                    const callback = this.rules[rule].callback;
                    const message = this.rules[rule].message;

                    // Try to get the label from the field
                    const attributes = ['label', 'title', 'aria-label'];
                    const label = attributes.reduce((label, attribute) => $field.attr(attribute) || label, '');

                    // Prepare the arguments for the callback
                    const name = $field.attr('name');
                    const args = { value, params, rules, name, label, field: $field };

                    // If the rule doesn't pass, add the error
                    if (callback(_.cloneDeep(args)) === false) {
                        // If the field doesn't have any errors yet, add it
                        if (!errors[name]) errors[name] = {};

                        // Add the error message to the field
                        errors[name][rule] = message(_.cloneDeep(args));
                    }
                }
            });

        return errors;
    }

    /**
     * Get the rules for the given field.
     */
    static getRules(field) {
        let rules = this.safeSplit($(field).attr(this.attribute), '|');

        return rules.reduce((rules, rule) => {
            let [name, params] = rule.split(/:(.+)/);

            name = name.trim();
            params = this.safeSplit(params, ',').map((param) => stringToPrimitive(param.trim()));

            return { ...rules, [name]: params };
        }, {});
    }

    /**
     * Safe split a string.
     */
    static safeSplit(str, delimiter = ',') {
        if (typeof str !== 'string' || str === '') {
            return [];
        }

        const placeholder = _.uniqueId('%placeholder') + '%';
        const regex = /(\/.*?\/) ?(?:\||\,|$)/g;

        str = str.replace(regex, function (str, match) {
            return str.trim().replace(match, match.replaceAll(delimiter, placeholder));
        });

        return str.split(delimiter).map(function (str) {
            return str.trim().replaceAll(placeholder, delimiter);
        });
    }
}
