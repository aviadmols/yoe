document.addEventListener('DOMContentLoaded', function() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const currentlyActive = document.querySelector('.accordion-item.active');

            if (currentlyActive && currentlyActive !== this.parentElement) {
                currentlyActive.classList.remove('active');
                currentlyActive.querySelector('.accordion-content').style.maxHeight = '0';
            }

            this.parentElement.classList.toggle('active');
            const content = this.nextElementSibling;
            if (this.parentElement.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = '0';
            }
        });
    });

    const toggleButton = document.querySelector('.menu-drawer__inner-container .disclosure__button');
    const listWrapper = document.querySelector('.menu-drawer__inner-container .disclosure__list-wrapper');

    toggleButton.addEventListener('click', function() {
        const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            toggleButton.setAttribute('aria-expanded', 'false');
            listWrapper.setAttribute('hidden', 'true');
        } else {
            toggleButton.setAttribute('aria-expanded', 'true');
            listWrapper.removeAttribute('hidden');
        }
    });

    document.querySelectorAll('.menu-drawer__inner-container .disclosure__link').forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault();

            // Get the currency value from the clicked item
            const currency = this.getAttribute('data-value');

            // Set the hidden input field with the selected currency
            document.querySelector('input[name="country_code"]').value = currency;

            // Submit the form
            document.getElementById('HeaderCountryForm').submit();
        });
    });

    document.getElementById('HeaderMenu-discover').addEventListener('click', function() {
        this.style.display = 'none';
        const menuDiv = document.getElementById('HeaderMenu-discover-div');
        menuDiv.style.display = 'flex';
        const items = menuDiv.querySelectorAll('li');

        items.forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '1';
            }, index * 500);
        });
    });
});


document.addEventListener('DOMContentLoaded', function () {

    function updateProductPrices() {
        if (typeof Shopify === 'undefined' || typeof Shopify.formatMoney !== 'function') {
            console.warn('Shopify.formatMoney is not available; skipping price formatting.');
            return;
        }

        const prices = document.querySelectorAll('.product-price, .product-price-mobile');

        prices.forEach(function (priceElement) {
            const basePriceAttr = priceElement.getAttribute('data-price');
            if (!basePriceAttr) return;

            var basePrice = parseFloat(basePriceAttr);
            if (isNaN(basePrice)) return;

            const formattedPrice = Shopify.formatMoney(Math.round(basePrice * 100));
            priceElement.innerHTML = formattedPrice;
        });
    }

    document.addEventListener('currency:updated', function () {
        updateProductPrices();
    });

    updateProductPrices();
});

function updateOptgroupLabel() {
    const optgroup = document.querySelector('optgroup[label="Subscribe and Save 7%"]');
    if (optgroup) {
        optgroup.label = "Subscribe and Save 20%";
    }
}

function delayedUpdate() {
    setTimeout(updateOptgroupLabel, 1);
}

document.addEventListener('DOMContentLoaded', function() {
    delayedUpdate();
});

document.addEventListener('click', function(event) {
    if (
        event.target.classList.contains('product-form__submit') ||
        event.target.classList.contains('header__icon') ||
        event.target.classList.contains('rebuy-select')
    ) {
        delayedUpdate();
    }
});
