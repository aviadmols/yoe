/**
 * Discovery Duo sticky CTA: reveal after scrolling past hero (default 100vh).
 * Appends bar to document.body so position:fixed works (main has overflow:hidden).
 * PDP add-to-cart: AJAX submit when form has no data-dd-checkout.
 */
(function () {
  function getProductFormVariantInput() {
    var productForm = document.querySelector('product-form form');
    if (!productForm) return null;
    return productForm.querySelector('input[name="id"]');
  }

  function getStickyVariantInput(sticky) {
    var form = sticky.querySelector('form');
    if (!form) return null;
    return form.querySelector('[data-dd-variant-id], input[name="id"]');
  }

  function syncStickyVariantFromProductForm(sticky) {
    var source = getProductFormVariantInput();
    var target = getStickyVariantInput(sticky);
    if (!source || !target || !source.value) return;
    target.value = source.value;
    var submitButton = sticky.querySelector('.dd-sticky-cta__btn');
    if (submitButton) {
      submitButton.disabled = source.disabled;
    }
  }

  function initVariantSync(sticky) {
    syncStickyVariantFromProductForm(sticky);

    if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;

    subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
      if (!event || !event.data || !event.data.variant) return;
      var target = getStickyVariantInput(sticky);
      if (!target) return;
      target.value = event.data.variant.id;
      var submitButton = sticky.querySelector('.dd-sticky-cta__btn');
      if (submitButton) {
        submitButton.disabled = !event.data.variant.available;
      }
    });
  }

  function initAddToCartForm(sticky) {
    var form = sticky.querySelector('form');
    if (!form || form.hasAttribute('data-dd-checkout')) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var submitButton = form.querySelector('button[type="submit"]');
      if (!submitButton || submitButton.disabled || submitButton.classList.contains('is-loading')) {
        return;
      }

      var variantInput = getStickyVariantInput(sticky);
      if (!variantInput || !variantInput.value) return;

      submitButton.classList.add('is-loading');
      submitButton.disabled = true;

      var cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      var config = typeof fetchConfig === 'function' ? fetchConfig('javascript') : { method: 'POST' };
      config.headers = config.headers || {};
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      var formData = new FormData(form);
      if (cart && typeof cart.getSectionsToRender === 'function') {
        formData.append(
          'sections',
          cart.getSectionsToRender().map(function (section) {
            return section.id;
          })
        );
        formData.append('sections_url', window.location.pathname);
        if (typeof cart.setActiveElement === 'function') {
          cart.setActiveElement(document.activeElement);
        }
      }
      config.body = formData;

      var cartAddUrl =
        (window.routes && window.routes.cart_add_url) ||
        (window.Shopify && window.Shopify.routes && window.Shopify.routes.root
          ? window.Shopify.routes.root + 'cart/add'
          : '/cart/add');

      fetch(cartAddUrl, config)
        .then(function (response) {
          return response.json();
        })
        .then(function (response) {
          if (response.status) {
            if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'dd-sticky-cta',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
            }
            console.error('dd-sticky-cta add to cart:', response.description || response.message);
            return;
          }

          if (!cart) {
            window.location =
              (window.routes && window.routes.cart_url) ||
              (window.Shopify && window.Shopify.routes && window.Shopify.routes.root
                ? window.Shopify.routes.root + 'cart'
                : '/cart');
            return;
          }

          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'dd-sticky-cta',
              productVariantId: formData.get('id'),
            });
          }

          if (typeof cart.renderContents === 'function') {
            cart.renderContents(response);
          }
          if (cart.classList && cart.classList.contains('is-empty')) {
            cart.classList.remove('is-empty');
          }
        })
        .catch(function (error) {
          console.error('dd-sticky-cta add to cart error:', error);
        })
        .finally(function () {
          submitButton.classList.remove('is-loading');
          var source = getProductFormVariantInput();
          submitButton.disabled = !!(source && source.disabled);
        });
    });
  }

  function initScrollReveal(sticky) {
    if (sticky.parentNode !== document.body) {
      document.body.appendChild(sticky);
    }

    var scrollVh = parseFloat(sticky.getAttribute('data-scroll-vh'), 10);
    if (isNaN(scrollVh) || scrollVh <= 0) scrollVh = 100;

    var visible = false;
    var ticking = false;
    var isDesignMode = document.documentElement.classList.contains('shopify-design-mode');

    function getScrollY() {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    function getThreshold() {
      return (scrollVh / 100) * window.innerHeight;
    }

    function setVisible(shouldShow) {
      if (isDesignMode) {
        shouldShow = window.matchMedia('(max-width: 749px)').matches;
      }
      if (shouldShow === visible) return;
      visible = shouldShow;
      sticky.classList.toggle('is-visible', visible);
      sticky.setAttribute('aria-hidden', visible ? 'false' : 'true');
      document.body.classList.toggle('dd-has-sticky-cta', visible);
    }

    function updateFromScroll() {
      ticking = false;
      setVisible(getScrollY() >= getThreshold());
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateFromScroll);
      }
    }

    var hero = document.querySelector('.dd-hero');
    if (hero && typeof IntersectionObserver !== 'undefined' && !isDesignMode) {
      var observer = new IntersectionObserver(
        function (entries) {
          var entry = entries[0];
          if (!entry) return;
          var heroMostlyPassed = entry.boundingClientRect.bottom <= 0;
          var scrolledPastVh = getScrollY() >= getThreshold();
          setVisible(heroMostlyPassed || scrolledPastVh);
        },
        { threshold: [0, 0.01, 1] }
      );
      observer.observe(hero);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateFromScroll();
  }

  function init() {
    var sticky = document.querySelector('[data-dd-sticky-cta]');
    if (!sticky) return;

    initScrollReveal(sticky);
    initVariantSync(sticky);
    initAddToCartForm(sticky);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
