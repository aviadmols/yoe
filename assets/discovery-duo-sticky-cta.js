/**
 * Discovery Duo sticky CTA: reveal after scrolling past hero (default 100vh).
 * Appends bar to document.body so position:fixed works (main has overflow:hidden).
 */
(function () {
  function init() {
    var sticky = document.querySelector('[data-dd-sticky-cta]');
    if (!sticky) return;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
