/**
 * Discovery Duo pages (new / yc / ycl): checkout flow for forms with data-dd-checkout.
 * clear cart → add variant(s) → redirect to checkout.
 * LP2 preload mode: cart is prepared on page load; CTAs redirect to checkout only.
 */
(function () {
  var cartPreloadPromise = null;
  var cartPreloadFailed = false;

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

  function collectVariantIds(form) {
    var ids = [];
    var inputs = form.querySelectorAll('[data-dd-variant-id]');
    for (var i = 0; i < inputs.length; i++) {
      var value = (inputs[i].value || '').trim();
      if (value && ids.indexOf(value) === -1) {
        ids.push(value);
      }
    }
    if (ids.length === 0) {
      var fallback = form.querySelector('input[name="id"]');
      if (fallback && fallback.value) {
        ids.push(fallback.value.trim());
      }
    }
    return ids;
  }

  function addVariants(variantIds) {
    var items = variantIds.map(function (variantId) {
      return { id: parseInt(variantId, 10), quantity: 1 };
    });
    return fetch(cartRoot() + 'cart/add.js', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ items: items }),
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

  function shouldSuppressCartDrawer() {
    return document.documentElement.hasAttribute('data-dd-suppress-cart-drawer');
  }

  function suppressCartDrawer() {
    document.documentElement.setAttribute('data-dd-suppress-cart-drawer', 'true');
  }

  function releaseCartDrawerSuppression() {
    document.documentElement.removeAttribute('data-dd-suppress-cart-drawer');
  }

  function closeCartDrawers() {
    var rebuyCart = document.getElementById('rebuy-cart');
    if (rebuyCart) {
      rebuyCart.classList.remove('is-visible');
      rebuyCart.setAttribute('aria-hidden', 'true');
    }

    var cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer) {
      cartDrawer.classList.remove('active', 'animate');
      if (typeof cartDrawer.close === 'function') {
        cartDrawer.close();
      }
    }

    document.body.classList.remove('overflow-hidden');
  }

  function scheduleCartDrawerCloseAttempts() {
    closeCartDrawers();
    [100, 300, 800, 1500].forEach(function (delay) {
      window.setTimeout(closeCartDrawers, delay);
    });
  }

  function installCartDrawerSuppressor() {
    if (window.__ddCartDrawerSuppressorInstalled) return;
    window.__ddCartDrawerSuppressorInstalled = true;

    var cartDrawer = document.querySelector('cart-drawer');
    if (cartDrawer && !cartDrawer.__ddOpenPatched) {
      cartDrawer.__ddOpenPatched = true;
      var originalOpen = cartDrawer.open.bind(cartDrawer);
      var originalRenderContents = cartDrawer.renderContents.bind(cartDrawer);

      cartDrawer.open = function () {
        if (shouldSuppressCartDrawer()) return;
        return originalOpen.apply(this, arguments);
      };

      cartDrawer.renderContents = function () {
        if (shouldSuppressCartDrawer()) return;
        return originalRenderContents.apply(this, arguments);
      };
    }

    var rebuyCart = document.getElementById('rebuy-cart');
    if (rebuyCart && !rebuyCart.__ddObserverAttached) {
      rebuyCart.__ddObserverAttached = true;
      var observer = new MutationObserver(function () {
        if (!shouldSuppressCartDrawer()) return;
        if (rebuyCart.classList.contains('is-visible')) {
          rebuyCart.classList.remove('is-visible');
          rebuyCart.setAttribute('aria-hidden', 'true');
        }
      });
      observer.observe(rebuyCart, { attributes: true, attributeFilter: ['class'] });
    }
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

  function isPreloadMode() {
    return !!document.querySelector('[data-dd-preload-cart="true"]');
  }

  function isCartReady() {
    return document.documentElement.getAttribute('data-dd-cart-ready') === 'true';
  }

  function markCartReady() {
    document.documentElement.setAttribute('data-dd-cart-ready', 'true');
  }

  function getPreloadForm() {
    var sticky = document.querySelector('[data-dd-preload-cart="true"]');
    if (!sticky) return null;
    return sticky.querySelector('form[data-dd-checkout]');
  }

  function preloadCartIfEnabled() {
    if (!isPreloadMode()) {
      return Promise.resolve(false);
    }

    if (document.documentElement.classList.contains('shopify-design-mode')) {
      return Promise.resolve(false);
    }

    var form = getPreloadForm();
    if (!form) {
      return Promise.resolve(false);
    }

    var variantIds = collectVariantIds(form);
    if (variantIds.length === 0) {
      return Promise.resolve(false);
    }

    installCartDrawerSuppressor();
    suppressCartDrawer();

    return clearCart()
      .then(function () {
        return addVariants(variantIds);
      })
      .then(function () {
        markCartReady();
        scheduleCartDrawerCloseAttempts();
        window.setTimeout(releaseCartDrawerSuppression, 2000);
        return true;
      })
      .catch(function (error) {
        releaseCartDrawerSuppression();
        cartPreloadFailed = true;
        console.error('discovery-duo cart preload error:', error);
        return false;
      });
  }

  function startCartPreload() {
    if (cartPreloadPromise) return cartPreloadPromise;
    cartPreloadPromise = preloadCartIfEnabled();
    return cartPreloadPromise;
  }

  function canRunCheckout(form) {
    return collectVariantIds(form).length > 0;
  }

  function runCheckoutOnly(form) {
    var submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;

    markButtonBusy(submitButton);
    setButtonLoadingText(submitButton, 'Redirecting…');
    goToCheckout();
  }

  function runCheckoutFlow(form) {
    var variantIds = collectVariantIds(form);
    if (variantIds.length === 0) return;

    var submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;

    markButtonBusy(submitButton);
    setButtonLoadingText(submitButton, 'Adding…');

    clearCart()
      .then(function () {
        return addVariants(variantIds);
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

  function handleCheckoutSubmit(form) {
    if (isCartReady()) {
      runCheckoutOnly(form);
      return;
    }

    if (isPreloadMode() && !cartPreloadFailed) {
      var submitButton = form.querySelector('button[type="submit"]');
      if (submitButton && !submitButton.disabled) {
        markButtonBusy(submitButton);
        setButtonLoadingText(submitButton, 'Adding…');
      }

      startCartPreload().then(function (success) {
        if (success || isCartReady()) {
          runCheckoutOnly(form);
          return;
        }

        if (submitButton) {
          resetButton(submitButton);
        }
        runCheckoutFlow(form);
      });
      return;
    }

    runCheckoutFlow(form);
  }

  function initCartPreload() {
    if (!isPreloadMode()) return;
    installCartDrawerSuppressor();
    startCartPreload();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartPreload);
  } else {
    initCartPreload();
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

      handleCheckoutSubmit(form);
      return false;
    },
    true
  );
})();
