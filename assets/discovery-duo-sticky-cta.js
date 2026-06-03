/**
 * Discovery Duo sticky CTA: reveal after scrolling past hero (default 100vh).
 */
(function () {
  var sticky = document.querySelector('[data-dd-sticky-cta]');
  if (!sticky) return;

  var scrollVh = parseFloat(sticky.getAttribute('data-scroll-vh'), 10);
  if (isNaN(scrollVh) || scrollVh <= 0) scrollVh = 100;

  var visible = false;
  var ticking = false;

  function getThreshold() {
    return (scrollVh / 100) * window.innerHeight;
  }

  function updateVisibility() {
    ticking = false;
    var shouldShow = window.scrollY >= getThreshold();
    if (shouldShow === visible) return;
    visible = shouldShow;
    sticky.classList.toggle('is-visible', visible);
    sticky.setAttribute('aria-hidden', visible ? 'false' : 'true');
    document.body.classList.toggle('dd-has-sticky-cta', visible);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateVisibility();
})();
