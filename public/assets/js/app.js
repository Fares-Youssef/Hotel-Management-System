/* ---------------------------------
 * Observe initiators
 * --------------------------------- */

$(document).ready(() => {
    // Call the init function on page load.
    window.init();

    // Watch for DOM changes and call the init function.
    const observer = new MutationObserver(() => window.init());

    // Listen for DOM changes and call the init function.
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
});

/* ---------------------------------
 * JQuery Confirm
 * --------------------------------- */

jconfirm.defaults = {
    ...jconfirm.defaults,

    icon: 'fa fa-info-circle',
    type: 'dark',
    theme: 'material',
    animateFromElement: false,

    buttons: {
        confirm: {
            btnClass: 'btn-primary',
        },
    },

    // ...
};

/* ---------------------------------
 * Redot Livewire Datatables
 * --------------------------------- */

$(document).on('submit', '.livewire-datatable [datatable-action="delete"]', (event) => {
    event.preventDefault();

    warnBeforeAction(() => {
        event.target.submit();
    });
});

/* ---------------------------------
 * Redot Visibility
 * --------------------------------- */

// Initialize the RedotVisibility instance
$(document).ready(() => new RedotVisibility());

// Disable validation on hidden elements
$(document).on('visibility:updated', '[visible-when]', (event, visible) => {
    const $container = $(event.target);
    const $targets = $container.is('[validation]') ? $container : $container.find('[validation]');

    if (visible) {
        $targets.removeAttr('disable-validation');
    } else {
        $targets.attr('disable-validation', true);
    }
});

/* ---------------------------------
 * Redot Validator
 * --------------------------------- */

// Disable HTML5 validation
$('form').attr('novalidate', true);

$(document).on('submit', 'form:not([disable-validation]):not([datatable-action])', (event) => {
    event.preventDefault();

    const $form = $(event.target);
    const errors = RedotValidator.errors($form);

    // No errors, submit the form
    if (Object.keys(errors).length === 0) {
        return event.target.submit();
    }

    // Append the errors to the form
    appendErrorsToForm($form, errors);

    // Get the first error element
    const $firstError = $form.find('.is-invalid').first();

    // Early return if the first error element is not found
    if ($firstError.length === 0) return;

    // Show the tab containing the first error element
    $firstError.parents('.tab-pane').each(function () {
        const tabpane = $(this).attr('id');
        $(`[href="#${tabpane}"]`).tab('show');
    });

    // Scroll to the first error element
    $firstError.get(0).scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });

    toastify().error(__('You have errors in your form. Please correct them and try again.'));
});
