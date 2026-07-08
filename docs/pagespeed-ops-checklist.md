# PageSpeed ops checklist (outside theme code)

These items improve PDP performance but must be changed in vendor dashboards, not in the theme repo.

## Google Tag Manager (GTM-KXWF7BPH)
- Theme now late-loads GTM after first interact / idle (timeout ~4s).
- Still recommend delaying heavy tags inside GTM:
  - Facebook Pixel → trigger: Consent / Scroll depth / Timer 3–5s (not All Pages immediate)
  - Microsoft Clarity → same delayed trigger
  - Any Square / marketing pixels → Timer or Interact
- Review duplicate analytics (Clarity + GA4 + Facebook) and keep one primary behavioral tool if possible.

## Klaviyo
- Delay popup / forms until interact or exit-intent (not on immediate page view for PDP).
- Disable “Prevent background scrolling” on forms (known to lock `body` with `klaviyo-prevent-body-scrolling`).

## Chat (Azure Front Door widget)
- Load chat after first interact or after 5–8s timer in the chat / GTM config.
- Do not inject chat in `<head>` on product templates if the vendor allows page rules.

## shop.app / Shop Pay
- Prefer Shopify’s native deferred Shop Pay / shop.app where available; avoid duplicate cart accelerators.

## Afterpay / Square
- Messaging already styled late in theme; keep widgets async.
- Cache lifetime for their assets is vendor-controlled — file an ask with Afterpay/Square if PSI still flags short TTL.

## Okendo
- Reviews widgets below the fold can stay; avoid loading review scripts above the fold if Okendo offers lazy mount.
- Prefer `loading="lazy"` on any review images Okendo injects (vendor setting).

## Rebuy
- Theme loads `rebuy.js` after idle/interact and scopes gift widgets by product handle.
- Confirm in Rebuy admin that unused gift campaigns are disabled so no redundant network calls remain.

## After deploy verification
1. Clear theme CDN / hard-refresh PDP: Ympossible Cream.
2. Re-run PageSpeed Insights (Mobile).
3. Spot-check: LOOP subscribe/ATC, Rebuy gift with purchase, press-mentions slick on mobile, GTM `dataLayer` still receives events after scroll.
