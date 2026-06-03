/**
 * landing-page-b: clear cart → add single variant → redirect to checkout.
 * Loaded only on template suffix landing-page-b.
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

  function isLandingForm(form) {
    if (!form || form.tagName !== 'FORM') return false;
    return (
      form.classList.contains('landing-cart-form') ||
      form.hasAttribute('data-lp-hero-form') ||
      form.classList.contains('landing-discover-products-cta-form')
    );
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

  function applyDiscount(code) {
    return fetch('/discount/' + encodeURIComponent(code), {
      method: 'GET',
      redirect: 'manual',
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

  function createButtonUI(button, form) {
    var isHero = form.hasAttribute('data-lp-hero-form');
    var isDiscover = form.classList.contains('landing-discover-products-cta-form');
    var isAddCart = form.classList.contains('landing-cart-form');

    var state = {
      button: button,
      isHero: isHero,
      label: button.getAttribute('data-button-label') || '',
      price: button.getAttribute('data-price') || '48',
      compareAt: button.getAttribute('data-compare-at') || '',
    };

    if (isAddCart) {
      state.labelClass = 'landing-add-cart-cta-label';
      state.compareClass = 'landing-add-cart-compare';
    } else if (isDiscover) {
      state.labelClass = 'landing-discover-products__section-cta-label whitespace-nowrap';
      state.compareClass = 'landing-discover-products__section-cta-compare';
    }

    function setStructuredContent(labelText, compareAtText) {
      button.replaceChildren();
      var labelSpan = document.createElement('span');
      labelSpan.className = state.labelClass;
      labelSpan.textContent = labelText;
      button.appendChild(labelSpan);
      if (compareAtText && String(compareAtText).trim() !== '') {
        var compareSpan = document.createElement('span');
        compareSpan.className = state.compareClass;
        compareSpan.textContent = '$' + compareAtText;
        button.appendChild(compareSpan);
      }
    }

    return {
      setLoading: function () {
        markButtonBusy(button);
        if (isHero) {
          button.textContent = 'Adding…';
        } else if (state.labelClass) {
          setStructuredContent('Adding…', '');
        } else {
          button.textContent = 'Adding…';
        }
      },
      setRedirecting: function () {
        if (isHero) {
          button.textContent = 'Redirecting…';
        } else if (state.labelClass) {
          setStructuredContent('Redirecting…', '');
        } else {
          button.textContent = 'Redirecting…';
        }
      },
      reset: function (message) {
        if (message) {
          button.disabled = false;
          button.classList.remove('is-loading');
          if (isHero) {
            if (button.dataset.ddOriginalHtml != null) {
              button.innerHTML = button.dataset.ddOriginalHtml;
            }
            button.textContent = message;
          } else if (state.labelClass) {
            setStructuredContent(message, state.compareAt);
          } else {
            button.textContent = message;
          }
          delete button.dataset.ddBusy;
          delete button.dataset.ddOriginalHtml;
          return;
        }
        resetButton(button);
      },
    };
  }

  function runCheckoutFlow(form) {
    var variantInput = form.querySelector('input[name="id"]');
    if (!variantInput || !variantInput.value) return;

    var variantId = variantInput.value;
    var discountCode = (form.getAttribute('data-discount-code') || '').trim();
    var submitButton =
      form.querySelector('[data-lp-hero-submit]') ||
      form.querySelector('button[type="submit"]');

    if (!submitButton || submitButton.disabled) return;

    var ui = createButtonUI(submitButton, form);
    ui.setLoading();

    function checkoutSequence() {
      return clearCart()
        .then(function () {
          if (discountCode) {
            return applyDiscount(discountCode).then(function () {
              return new Promise(function (resolve) {
                setTimeout(resolve, 300);
              });
            });
          }
        })
        .then(function () {
          return addVariant(variantId);
        })
        .then(function () {
          ui.setRedirecting();
          goToCheckout();
        })
        .catch(function (error) {
          console.error('landing-page-b checkout error:', error);
          ui.reset();
          alert('Failed to proceed to checkout. Please try again.');
        });
    }

    checkoutSequence();
  }

  document.addEventListener(
    'submit',
    function (event) {
      var form = event.target && event.target.closest ? event.target.closest('form') : event.target;
      if (!isLandingForm(form)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      runCheckoutFlow(form);
      return false;
    },
    true
  );
})();
