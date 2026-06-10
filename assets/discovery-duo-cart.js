/**
 * Discovery Duo pages (new / yc / ycl): checkout flow for forms with data-dd-checkout.
 * clear cart → add variant(s) → apply discount (optional) → redirect to checkout.
 * LP2 preload mode: cart is prepared on page load; CTAs redirect to checkout only.
 */
(function () {
  var cartPreloadPromise = null;
  var cartPreloadFailed = false;
  var cartUiSuppressCleanup = null;
  var DISCOUNT_SETTLE_MS = 300;

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

  function getDiscountFromForm(form) {
    if (!form || form.getAttribute('data-dd-apply-discount') !== 'true') {
      return '';
    }
    return (form.getAttribute('data-dd-discount-code') || '').trim();
  }

  function applyDiscountCode(code) {
    if (!code) return Promise.resolve();

    return fetch(cartRoot() + 'discount/' + encodeURIComponent(code), {
      method: 'GET',
      redirect: 'manual',
    })
      .then(function (response) {
        if (!response.ok && response.type !== 'opaqueredirect') {
          console.warn('discovery-duo discount apply failed:', code, response.status);
        }
      })
      .catch(function (error) {
        console.warn('discovery-duo discount apply error:', code, error);
      });
  }

  function waitAfterDiscount(code) {
    if (!code) return Promise.resolve();
    return new Promise(function (resolve) {
      window.setTimeout(resolve, DISCOUNT_SETTLE_MS);
    });
  }

  function prepareCartFromForm(form) {
    var variantIds = collectVariantIds(form);
    if (variantIds.length === 0) {
      return Promise.reject(new Error('No variant IDs'));
    }

    var discountCode = getDiscountFromForm(form);

    return clearCart()
      .then(function () {
        return addVariants(variantIds);
      })
      .then(function () {
        return applyDiscountCode(discountCode);
      })
      .then(function () {
        return waitAfterDiscount(discountCode);
      });
  }

  function goToCheckout() {
    document.documentElement.dispatchEvent(
      new CustomEvent('cart:refresh', { bubbles: true })
    );
    window.location.href = cartRoot() + 'checkout';
  }

  function closeCartUiSilently() {
    var drawer = document.querySelector('cart-drawer');
    if (drawer) {
      if (typeof drawer.close === 'function') {
        drawer.close();
      }
      drawer.classList.remove('active', 'animate');
    }

    document.body.classList.remove('overflow-hidden');

    var rebuyCart = document.getElementById('rebuy-cart');
    if (rebuyCart) {
      rebuyCart.classList.remove('is-visible');
      rebuyCart.setAttribute('aria-hidden', 'true');
    }

    if (window.Rebuy && window.Rebuy.SmartCart && typeof window.Rebuy.SmartCart.hide === 'function') {
      window.Rebuy.SmartCart.hide();
    }
  }

  function stopCartUiSuppress() {
    if (typeof cartUiSuppressCleanup === 'function') {
      cartUiSuppressCleanup();
    }
  }

  function suppressCartUiAfterPreload(durationMs) {
    stopCartUiSuppress();

    var duration = durationMs || 4000;
    var endAt = Date.now() + duration;
    var observer = null;
    var bodyObserver = null;
    var intervalId = null;

    function suppressIfNeeded() {
      if (Date.now() > endAt) return;
      closeCartUiSilently();
    }

    function observeCartNodes() {
      if (!observer) return;

      var rebuyCart = document.getElementById('rebuy-cart');
      var drawer = document.querySelector('cart-drawer');

      if (rebuyCart && !rebuyCart.dataset.ddSuppressObserved) {
        rebuyCart.dataset.ddSuppressObserved = '1';
        observer.observe(rebuyCart, {
          attributes: true,
          attributeFilter: ['class', 'aria-hidden', 'style'],
        });
      }

      if (drawer && !drawer.dataset.ddSuppressObserved) {
        drawer.dataset.ddSuppressObserved = '1';
        observer.observe(drawer, {
          attributes: true,
          attributeFilter: ['class', 'open'],
        });
      }
    }

    function cleanup() {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (bodyObserver) {
        bodyObserver.disconnect();
        bodyObserver = null;
      }
      cartUiSuppressCleanup = null;
    }

    cartUiSuppressCleanup = cleanup;

    suppressIfNeeded();

    observer = new MutationObserver(suppressIfNeeded);
    observeCartNodes();

    intervalId = window.setInterval(function () {
      if (Date.now() > endAt) {
        cleanup();
        return;
      }
      observeCartNodes();
      suppressIfNeeded();
    }, 100);

    bodyObserver = new MutationObserver(function () {
      observeCartNodes();
      suppressIfNeeded();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(cleanup, duration);
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

    if (!canRunCheckout(form)) {
      return Promise.resolve(false);
    }

    suppressCartUiAfterPreload();

    return prepareCartFromForm(form)
      .then(function () {
        markCartReady();
        return true;
      })
      .catch(function (error) {
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

    var discountCode = getDiscountFromForm(form);

    applyDiscountCode(discountCode)
      .then(function () {
        return waitAfterDiscount(discountCode);
      })
      .then(goToCheckout)
      .catch(function (error) {
        console.error('discovery-duo checkout redirect error:', error);
        resetButton(submitButton);
        alert('Failed to proceed to checkout. Please try again.');
      });
  }

  function runCheckoutFlow(form) {
    if (!canRunCheckout(form)) return;

    var submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;

    markButtonBusy(submitButton);
    setButtonLoadingText(submitButton, 'Adding…');

    prepareCartFromForm(form)
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
    stopCartUiSuppress();

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
