/**
 * discovery-duo-new: optional checkout flow for CTA forms with data-dd-checkout.
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

  function runCheckoutFlow(form) {
    var variantInput = form.querySelector('input[name="id"]');
    if (!variantInput || !variantInput.value) return;

    var variantId = variantInput.value;
    var submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;

    var originalHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = 'Adding…';

    function resetButton() {
      submitButton.innerHTML = originalHTML;
      submitButton.disabled = false;
    }

    clearCart()
      .then(function () {
        return addVariant(variantId);
      })
      .then(function () {
        submitButton.textContent = 'Redirecting…';
        goToCheckout();
      })
      .catch(function (error) {
        console.error('discovery-duo checkout error:', error);
        resetButton();
        alert('Failed to proceed to checkout. Please try again.');
      });
  }

  document.addEventListener(
    'submit',
    function (event) {
      var form = event.target;
      if (!form || form.tagName !== 'FORM' || !form.hasAttribute('data-dd-checkout')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      runCheckoutFlow(form);
      return false;
    },
    true
  );
})();
