/**
 * Discovery Duo pages (new / yc / ycl): checkout flow for forms with data-dd-checkout.
 * clear cart → add single variant → redirect to checkout.
 * YC/YCL: silent flow — no cart drawer / Rebuy flash before checkout.
 */
(function () {
  var SILENT_CLASS = 'dd-checkout-silent';
  var nativeFetch = window.fetch.bind(window);
  var fetchGuardActive = false;

  function cartRoot() {
    return window.Shopify && window.Shopify.routes && window.Shopify.routes.root
      ? window.Shopify.routes.root
      : '/';
  }

  function isSilentCheckoutPage() {
    var body = document.body;
    if (!body || !body.classList) return false;
    return (
      body.classList.contains('template-page-discovery-duo-yc') ||
      body.classList.contains('template-page-discovery-duo-ycl')
    );
  }

  function injectSilentCheckoutStyles() {
    if (!isSilentCheckoutPage() || document.getElementById('dd-checkout-silent-styles')) return;

    var style = document.createElement('style');
    style.id = 'dd-checkout-silent-styles';
    style.textContent =
      'body.' +
      SILENT_CLASS +
      ' cart-drawer,' +
      'body.' +
      SILENT_CLASS +
      ' cart-drawer.active,' +
      'body.' +
      SILENT_CLASS +
      ' #rebuy-cart,' +
      'body.' +
      SILENT_CLASS +
      ' #rebuy-cart.is-visible {' +
      'visibility:hidden !important;opacity:0 !important;pointer-events:none !important;' +
      '}';
    document.head.appendChild(style);
  }

  function suppressCartUI() {
    var drawer = document.querySelector('cart-drawer');
    if (drawer) {
      drawer.classList.remove('animate', 'active');
      if (typeof drawer.close === 'function') drawer.close();
    }

    var rebuy = document.getElementById('rebuy-cart');
    if (rebuy) {
      rebuy.classList.remove('is-visible');
      rebuy.setAttribute('aria-hidden', 'true');
    }

    document.body.classList.remove('overflow-hidden');
  }

  function beginSilentCheckout() {
    if (!isSilentCheckoutPage()) return;
    document.body.classList.add(SILENT_CLASS);
    suppressCartUI();
    enableFetchGuard();
  }

  function endSilentCheckout() {
    if (!isSilentCheckoutPage()) return;
    document.body.classList.remove(SILENT_CLASS);
    disableFetchGuard();
  }

  function enableFetchGuard() {
    if (fetchGuardActive) return;
    fetchGuardActive = true;

    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url ? input.url : '';
      return nativeFetch(input, init).then(function (response) {
        if (
          document.body.classList.contains(SILENT_CLASS) &&
          (url.indexOf('cart/clear') !== -1 || url.indexOf('cart/add') !== -1)
        ) {
          suppressCartUI();
        }
        return response;
      });
    };
  }

  function disableFetchGuard() {
    if (!fetchGuardActive) return;
    window.fetch = nativeFetch;
    fetchGuardActive = false;
  }

  function watchCartDrawerDuringSilentCheckout() {
    if (!isSilentCheckoutPage()) return;

    var drawer = document.querySelector('cart-drawer');
    if (!drawer || drawer.__ddSilentObserver) return;

    var observer = new MutationObserver(function () {
      if (document.body.classList.contains(SILENT_CLASS)) suppressCartUI();
    });
    observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
    drawer.__ddSilentObserver = observer;
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
    suppressCartUI();

    if (!isSilentCheckoutPage()) {
      document.documentElement.dispatchEvent(
        new CustomEvent('cart:refresh', { bubbles: true })
      );
    }

    window.location.replace(cartRoot() + 'checkout');
  }

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

    var originalHTML = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = 'Adding…';

    beginSilentCheckout();

    function resetButton() {
      submitButton.innerHTML = originalHTML;
      submitButton.disabled = false;
      endSilentCheckout();
      suppressCartUI();
    }

    clearCart()
      .then(function () {
        suppressCartUI();
        return addVariant(variantId);
      })
      .then(function () {
        submitButton.textContent = 'Redirecting…';
        suppressCartUI();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectSilentCheckoutStyles();
      watchCartDrawerDuringSilentCheckout();
    });
  } else {
    injectSilentCheckoutStyles();
    watchCartDrawerDuringSilentCheckout();
  }
})();
