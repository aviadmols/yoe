setTimeout(() => {
  if (window.location.pathname.includes("apps/customer-portal")) {
    const menuContainer = document.querySelector(".Polaris-Navigation__PrimaryNavigation");

    if (menuContainer) {
      const newMenuSection = document.createElement("div");
      newMenuSection.classList.add("bss-menu-navigation-section", "portal-custom-subscription");

      const customerId = window.BSS_BCP?.shopData?.customer?.id || "";

      const menuItems = [
        {
          name: "My Subscriptions",
          link: `/a/loop_subscriptions/auth?customer_id=${customerId}&myshopify_domain=78b240-70.myshopify.com&locale=&rootUrl=/`,
        },
      ];

      const menuContent = document.createElement("div");
      menuContent.classList.add("Polaris-Box");
      menuContent.style.cssText =
        "--pc-box-padding-block-end-xs: var(--p-space-5); --pc-box-padding-block-start-xs: var(--p-space-5); --pc-box-padding-inline-start-xs: var(--p-space-8); --pc-box-padding-inline-end-xs: var(--p-space-8); --pc-box-width: 100%;";

      const menuStack = document.createElement("div");
      menuStack.classList.add("Polaris-VerticalStack");
      menuStack.style.cssText =
        "--pc-vertical-stack-order: column; --pc-vertical-stack-gap-xs: var(--p-space-2);";

      menuItems.forEach((item) => {
        const menuItem = document.createElement("div");
        menuItem.classList.add("bss-menu-navigation-section-btn");

        menuItem.innerHTML = `
          <div class="Polaris-HorizontalStack" style="--pc-horizontal-stack-align: space-between; --pc-horizontal-stack-wrap: wrap;">
            <div class="Polaris-HorizontalStack" style="--pc-horizontal-stack-wrap: wrap; --pc-horizontal-stack-gap-xs: var(--p-space-2);">
              <a href="${item.link}" class="Polaris-Text--root Polaris-Text--bodyMd" style="text-decoration: none; color: inherit;">
                ${item.name}
              </a>
            </div>
          </div>
        `;

        menuStack.appendChild(menuItem);
      });

      menuContent.appendChild(menuStack);
      newMenuSection.appendChild(menuContent);
      menuContainer.appendChild(newMenuSection);
    }


    const waitForLogoutBtn = setInterval(() => {
      const btns = document.querySelectorAll(".bss-menu-navigation-section-btn");
      for (const btn of btns) {
        if (btn.querySelector(".logout-icon")) {
          btn.addEventListener("click", function (e) {

            setTimeout(() => {
              window.location.href = "https://yoeandco.com/apps/customer-portal";
            }, 500);
          });
          clearInterval(waitForLogoutBtn); 
          break;
        }
      }
    }, 200);
  }
}, 2000);
