/**
 * Discovery Duo pages (new / yc / ycl): checkout flow for forms with data-dd-checkout.
 * clear cart → add single variant → redirect to checkout.
 */
(function () {
  function cartRoot() {
    return window.Shopify && window.Shopify.routes && window.Shopify.routes.root
      ? window.Shopify.routes.root
      : '/';
  }

  function jsonHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  function clearCart() {
    return fetch(cartRoot() + 'cart/clear.js', {
      method: 'POST',
      headers: jsonHeaders(),
    }).then(function (response) {
      if (!response.ok) throw new Error('Cart clear failed');
      return response.json();
    });
  }

  function addVariant(variantId) {
    return fetch(cartRoot() + 'cart/add.js', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        items: [{ id: parseInt(variantId, 10), quantity: 1 }],
      }),
    }).then(function (response) {
      if (!response.ok) throw new Error('Cart add failed');
      return response.json();
    });
  }

  function goToCheckout() {
    document.documentElement.dispatchEvent(
      new CustomEvent('cart:refresh', { bubbles: true })
    );
    window.location.href = cartRoot() + 'checkout';
  }

  function markButtonBusy(button) {
    if (!button.dataset.ddOriginalHtml) {
      button.dataset.ddOriginalHtml = button.innerHTML;
    }
    button.dataset.ddBusy = '1';
    button.classList.add('is-loading');
    button.disabled = true;
  }

  function resetButton(button) {
    if (button.dataset.ddOriginalHtml != null) {
      button.innerHTML = button.dataset.ddOriginalHtml;
    }
    button.disabled = false;
    button.classList.remove('is-loading');
    delete button.dataset.ddBusy;
    delete button.dataset.ddOriginalHtml;
  }

  function setButtonLoadingText(button, text) {
    button.textContent = text;
  }

  function restoreBusyButtonsFromCache() {
    document.querySelectorAll('[data-dd-busy]').forEach(function (btn) {
      resetButton(btn);
    });
  }

  function shouldRestoreFromNavigation(event) {
    if (event.persisted) return true;
    var nav = performance.getEntriesByType('navigation')[0];
    return nav && nav.type === 'back_forward';
  }

  window.addEventListener('pageshow', function (event) {
    if (!shouldRestoreFromNavigation(event)) return;
    restoreBusyButtonsFromCache();
  });

  function canRunCheckout(form) {
    var variantInput = form.querySelector('input[name="id"]');
    return !!(variantInput && variantInput.value);
  }

  function runCheckoutFlow(form) {
    var variantInput = form.querySelector('input[name="id"]');
    if (!variantInput || !variantInput.value) return;

    var variantId = variantInput.value;
    var submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;

    markButtonBusy(submitButton);
    setButtonLoadingText(submitButton, 'Adding…');

    clearCart()
      .then(function () {
        return addVariant(variantId);
      })
      .then(function () {
        setButtonLoadingText(submitButton, 'Redirecting…');
        goToCheckout();
      })
      .catch(function (error) {
        console.error('discovery-duo checkout error:', error);
        resetButton(submitButton);
        alert('Failed to proceed to checkout. Please try again.');
      });
  }

  document.addEventListener(
    'submit',
    function (event) {
      var form = event.target && event.target.closest ? event.target.closest('form') : event.target;
      if (!form || !form.hasAttribute('data-dd-checkout')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!canRunCheckout(form)) {
        console.error('discovery-duo checkout: cannot proceed without variant', form);
        alert('Product is unavailable. Please refresh and try again.');
        return false;
      }

      runCheckoutFlow(form);
      return false;
    },
    true
  );
})();
