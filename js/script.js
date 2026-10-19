
/* ==========================================
   CASH DELIVER — SHARED JAVASCRIPT
   Local shopping website prototype
========================================== */

"use strict";

/* ---------- Shared Settings ---------- */

const CashDeliver = {
  cartKey: "cashDeliverCart",
  currency: "₹",
  maxQuantity: 20
};

/* ---------- DOM Helpers ---------- */

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/* ---------- Mobile Navigation ---------- */

function initMobileMenu() {
  const menuButton =
    $("#menuBtn") ||
    $("#mobileMenuBtn") ||
    $(".mobile-menu") ||
    $(".menu-btn");

  const navigation =
    $("#mainNav") ||
    $("#navLinks") ||
    $(".nav-links");

  if (!menuButton || !navigation) return;

  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the menu after choosing a page on mobile.
  $$("a", navigation).forEach(link => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Cart Storage ---------- */

function getCart() {
  try {
    const saved = localStorage.getItem(CashDeliver.cartKey);
    const parsed = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item =>
        item &&
        Number.isFinite(Number(item.id)) &&
        Number.isFinite(Number(item.price)) &&
        Number(item.price) >= 0 &&
        Number.isFinite(Number(item.quantity)) &&
        Number(item.quantity) > 0
      )
      .map(item => ({
        ...item,
        id: Number(item.id),
        price: Number(item.price),
        quantity: Math.min(
          CashDeliver.maxQuantity,
          Math.floor(Number(item.quantity))
        )
      }));
  } catch (error) {
    console.error("Unable to read cart:", error);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(
      CashDeliver.cartKey,
      JSON.stringify(cart)
    );

    updateCartCount();
    return true;
  } catch (error) {
    console.error("Unable to save cart:", error);
    return false;
  }
}

function addToCart(product) {
  if (!product || product.id == null) {
    return { success: false, message: "Invalid product." };
  }

  const price = Number(product.price);

  if (!Number.isFinite(price) || price < 0) {
    return { success: false, message: "Invalid product price." };
  }

  const cart = getCart();
  const existing = cart.find(
    item => Number(item.id) === Number(product.id)
  );

  if (existing) {
    if (existing.quantity >= CashDeliver.maxQuantity) {
      return {
        success: false,
        message: "Maximum quantity reached."
      };
    }

    existing.quantity += 1;
  } else {
    cart.push({
      id: Number(product.id),
      name: String(product.name || "Product"),
      price,
      quantity: 1,
      image: String(product.image || "")
    });
  }

  if (!saveCart(cart)) {
    return {
      success: false,
      message: "Could not save your cart in this browser."
    };
  }

  return {
    success: true,
    message: "Product added to your cart."
  };
}

function removeFromCart(productId) {
  const cart = getCart().filter(
    item => Number(item.id) !== Number(productId)
  );

  return saveCart(cart);
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find(
    product => Number(product.id) === Number(productId)
  );

  if (!item) return false;

  const newQuantity = Math.floor(Number(quantity));

  if (!Number.isFinite(newQuantity) || newQuantity < 1) {
    return removeFromCart(productId);
  }

  item.quantity = Math.min(
    CashDeliver.maxQuantity,
    newQuantity
  );

  return saveCart(cart);
}

function getCartSubtotal() {
  return getCart().reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

function getCartItemCount() {
  return getCart().reduce(
    (total, item) => total + item.quantity,
    0
  );
}

function formatPrice(amount) {
  return CashDeliver.currency +
    Number(amount).toLocaleString("en-IN", {
      maximumFractionDigits: 2
    });
}

/* ---------- Cart Badge ---------- */

function updateCartCount() {
  const count = getCartItemCount();

  const badgeSelectors = [
    "#cartCount",
    ".cart-count",
    "[data-cart-count]"
  ];

  badgeSelectors.forEach(selector => {
    $$(selector).forEach(element => {
      element.textContent = count;
      element.hidden = count === 0;
      element.setAttribute("aria-label", `${count} items in cart`);
    });
  });
}

/* ---------- Product Search ---------- */

function initProductSearch() {
  const searchInputs = [
    ...$$("[data-product-search]"),
    ...$$("#productSearch")
  ];

  searchInputs.forEach(input => {
    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();

      const productCards = $$("[data-product-card]");

      productCards.forEach(card => {
        const searchableText = (
          card.dataset.name ||
          card.textContent ||
          ""
        ).toLowerCase();

        card.hidden = !searchableText.includes(query);
      });

      const noResults = $("#noResults");

      if (noResults) {
        const visibleCards = productCards.filter(
          card => !card.hidden
        );

        noResults.hidden = visibleCards.length > 0;
      }
    });
  });
}

/* ---------- Category Filtering ---------- */

function initCategoryFilters() {
  const filters = $$("[data-category-filter]");

  filters.forEach(filter => {
    filter.addEventListener("click", () => {
      const category = filter.dataset.categoryFilter;

      filters.forEach(button => {
        button.classList.toggle("active", button === filter);
      });

      $$("[data-product-card]").forEach(card => {
        const cardCategory = card.dataset.category || "all";

        card.hidden =
          category !== "all" &&
          cardCategory !== category;
      });
    });
  });
}

/* ---------- Add-to-Cart Buttons ---------- */

/*
  Example HTML:

  <button
    data-add-to-cart
    data-id="1"
    data-name="Kitchen Sink Organizer"
    data-price="199"
    data-image="images/sink-organizer.jpg">
    Add to Cart
  </button>

  Product prices must be verified before taking real orders.
*/

function initAddToCartButtons() {
  $$("[data-add-to-cart]").forEach(button => {
    button.addEventListener("click", () => {
      const product = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: button.dataset.price,
        image: button.dataset.image
      };

      const result = addToCart(product);

      showToast(result.message, !result.success);
    });
  });
}

/* ---------- Toast Notifications ---------- */

function showToast(message, isError = false) {
  let toast = $("#cashDeliverToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cashDeliverToast";

    Object.assign(toast.style, {
      position: "fixed",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      maxWidth: "calc(100% - 30px)",
      padding: "13px 20px",
      borderRadius: "12px",
      color: "#ffffff",
      background: "#0b3180",
      boxShadow: "0 8px 25px rgba(0,0,0,.18)",
      zIndex: "9999",
      fontSize: "14px",
      textAlign: "center",
      display: "none"
    });

    document.body.appendChild(toast);
  }

  toast.style.background = isError ? "#b42318" : "#0b3180";
  toast.textContent = message;
  toast.style.display = "block";

  // Hide automatically without using a global timer.
  toast.dataset.visible = "true";

  window.clearTimeout(showToast.hideTimer);

  showToast.hideTimer = window.setTimeout(() => {
    toast.style.display = "none";
    toast.dataset.visible = "false";
  }, 2600);
}

/* ---------- Current Year ---------- */

function initCurrentYear() {
  const year = String(new Date().getFullYear());

  $$("#year, [data-current-year]").forEach(element => {
    element.textContent = year;
  });
}

/* ---------- Demo Contact Form ---------- */

function initDemoContactForm() {
  const form = $("#contactForm");

  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const status = $("#formStatus");

    if (status) {
      status.textContent =
        "Demo only: your message was not sent or saved. Connect a backend before launch.";
    }
  });
}

/* ---------- Initialise Shared Features ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  updateCartCount();
  initProductSearch();
  initCategoryFilters();
  initAddToCartButtons();
  initCurrentYear();
  initDemoContactForm();
});
