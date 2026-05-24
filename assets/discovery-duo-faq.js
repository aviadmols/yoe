/* Discovery Duo – FAQ accordion
 * Single-purpose vanilla JS scoped to [data-faq-item] / [data-faq-button].
 * No external dependencies; safe to run on multiple FAQ sections on one page.
 */

(function () {
  'use strict';

  function init() {
    var items = document.querySelectorAll('[data-faq-item]');
    if (!items.length) return;

    items.forEach(function (item) {
      var button = item.querySelector('[data-faq-button]');
      var panelId = button && button.getAttribute('aria-controls');
      var panel = panelId ? document.getElementById(panelId) : null;
      if (!button || !panel) return;

      button.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-active');
        if (isOpen) {
          close(item, button, panel);
        } else {
          open(item, button, panel);
        }
      });
    });
  }

  function open(item, button, panel) {
    item.classList.add('is-active');
    button.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    panel.style.height = '0px';
    requestAnimationFrame(function () {
      panel.style.height = panel.scrollHeight + 'px';
    });
    panel.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName !== 'height') return;
      panel.style.height = 'auto';
      panel.removeEventListener('transitionend', onEnd);
    });
  }

  function close(item, button, panel) {
    panel.style.height = panel.scrollHeight + 'px';
    requestAnimationFrame(function () {
      panel.style.height = '0px';
    });
    item.classList.remove('is-active');
    button.setAttribute('aria-expanded', 'false');
    panel.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName !== 'height') return;
      panel.hidden = true;
      panel.style.height = '';
      panel.removeEventListener('transitionend', onEnd);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
