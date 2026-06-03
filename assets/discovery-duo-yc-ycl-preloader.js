/**
 * discovery-duo-yc / ycl: brief page preloader for smoother mobile paint.
 */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('dd-yc-ycl-preloading')) return;
  if (root.classList.contains('shopify-design-mode')) {
    root.classList.remove('dd-yc-ycl-preloading');
    root.classList.add('dd-yc-ycl-ready');
    return;
  }

  var done = false;
  var maxMs = 1400;
  var minMs = 320;
  var start = Date.now();

  function finish() {
    if (done) return;
    var elapsed = Date.now() - start;
    if (elapsed < minMs) {
      setTimeout(finish, minMs - elapsed);
      return;
    }
    done = true;
    root.classList.remove('dd-yc-ycl-preloading');
    root.classList.add('dd-yc-ycl-ready');
    var preloader = document.querySelector('.dd-yc-ycl-preloader');
    if (!preloader) return;
    preloader.style.opacity = '0';
    preloader.style.visibility = 'hidden';
    window.setTimeout(function () {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 400);
  }

  if (document.readyState === 'complete') {
    finish();
  } else {
    window.addEventListener('load', finish, { once: true });
  }

  window.setTimeout(finish, maxMs);
})();
