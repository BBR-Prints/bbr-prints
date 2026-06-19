const productGrid = document.querySelector("#productGrid");
const productTemplate = document.querySelector("#productCardTemplate");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const cartDrawer = document.querySelector("#cartDrawer");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");
const checkoutLink = document.querySelector("#checkoutLink");
const customOrderModal = document.querySelector("#customOrderModal");
const customOrderForm = document.querySelector("#customOrderForm");

const CART_KEY = "layerlab-cart";
const EMAIL_KEY = "layerlab-email";
const OWNER_EMAIL = "you@example.com";

let products = window.catalogProducts || [];
let cart = load(CART_KEY, []);

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function hasStripeLink(product) {
  return typeof product.paymentLink === "string" && product.paymentLink.startsWith("https://");
}

function productMatches(product) {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const text = [
    product.name,
    product.category,
    product.material,
    product.colors,
    product.description,
  ]
    .join(" ")
    .toLowerCase();

  return (!query || text.includes(query)) && (category === "all" || product.category === category);
}

async function loadCatalog() {
  try {
    const response = await fetch("products.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.products)) {
      products = data.products;
    }
  } catch {
    // File previews may block fetch; products.js remains the local fallback.
  }
}

function renderProducts() {
  productGrid.innerHTML = "";
  const visibleProducts = products.filter(productMatches);
  document.querySelector("#statProducts").textContent = products.length;

  if (!visibleProducts.length) {
    productGrid.innerHTML = '<div class="empty-state">No products are listed yet.</div>';
    return;
  }

  visibleProducts.forEach((product) => {
    const card = productTemplate.content.cloneNode(true);
    const article = card.querySelector(".product-card");
    const image = card.querySelector("img");
    const details = card.querySelector(".details");
    const payLink = card.querySelector(".pay-link");

    image.src = product.image;
    image.alt = product.name;
    card.querySelector(".category-pill").textContent = product.category;
    card.querySelector("h3").textContent = product.name;
    card.querySelector(".price").textContent = money(product.price);
    card.querySelector(".description").textContent = product.description || "Custom printed project.";

    [
      ["Material", product.material || "Custom"],
      ["Colors", product.colors || "Ask seller"],
      ["Print time", product.time || "Varies"],
      ["Made", "To order"],
    ].forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      term.textContent = label;
      definition.textContent = value;
      wrapper.append(term, definition);
      details.append(wrapper);
    });

    card.querySelector(".add-button").addEventListener("click", () => addToCart(product.id));

    if (hasStripeLink(product)) {
      payLink.href = product.paymentLink;
      payLink.textContent = "Pay with Stripe";
    } else {
      payLink.remove();
    }

    productGrid.append(article);
  });
}

function addToCart(productId) {
  const item = cart.find((cartItem) => cartItem.id === productId);
  if (item) {
    item.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }
  saveCart();
  renderCart();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
}

function renderCart() {
  cartItems.innerHTML = "";
  let total = 0;
  let quantity = 0;

  if (!cart.length) {
    cartItems.innerHTML = '<div class="empty-state">Your cart is ready for a few prints.</div>';
  }

  cart.forEach((cartItem) => {
    const product = products.find((item) => item.id === cartItem.id);
    if (!product) return;

    const lineTotal = product.price * cartItem.quantity;
    total += lineTotal;
    quantity += cartItem.quantity;

    const item = document.createElement("div");
    const image = document.createElement("img");
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    const remove = document.createElement("button");

    item.className = "cart-item";
    image.src = product.image;
    image.alt = product.name;
    title.textContent = product.name;
    meta.textContent = `${cartItem.quantity} x ${money(product.price)}`;
    remove.className = "icon-button";
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${product.name}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>';
    remove.addEventListener("click", () => removeFromCart(product.id));
    copy.append(title, meta);
    item.append(image, copy, remove);
    cartItems.append(item);
  });

  cartCount.textContent = quantity;
  cartTotal.textContent = money(total);
  updateCheckoutLink(total);
}

function updateCheckoutLink(total) {
  const email = localStorage.getItem(EMAIL_KEY) || OWNER_EMAIL;
  const cartProducts = cart
    .map((cartItem) => products.find((item) => item.id === cartItem.id))
    .filter(Boolean);
  const singleStripeProduct =
    cart.length === 1 && cart[0].quantity === 1 && hasStripeLink(cartProducts[0]);

  if (singleStripeProduct) {
    checkoutLink.href = cartProducts[0].paymentLink;
    checkoutLink.textContent = "Pay with Stripe";
    checkoutLink.target = "_blank";
    checkoutLink.rel = "noopener";
    return;
  }

  const subject = encodeURIComponent("3D Print Order Request");
  const lines = cart
    .map((cartItem) => {
      const product = products.find((item) => item.id === cartItem.id);
      return product ? `${cartItem.quantity} x ${product.name} - ${money(product.price)}` : "";
    })
    .filter(Boolean);
  const body = encodeURIComponent(
    `Hi, I would like to order:\n\n${lines.join("\n")}\n\nEstimated total: ${money(
      total,
    )}\n\nName:\nPickup/shipping preference:\nColor requests:\nQuestions:`,
  );
  checkoutLink.href = `mailto:${email}?subject=${subject}&body=${body}`;
  checkoutLink.textContent = "Request order";
  checkoutLink.removeAttribute("target");
  checkoutLink.removeAttribute("rel");
}

function openCart() {
  document.body.classList.add("cart-open");
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.body.classList.remove("cart-open");
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function openCustomOrder() {
  document.body.classList.add("modal-open");
  customOrderModal.classList.add("open");
  customOrderModal.setAttribute("aria-hidden", "false");
  document.querySelector("#customName").focus();
}

function closeCustomOrder() {
  document.body.classList.remove("modal-open");
  customOrderModal.classList.remove("open");
  customOrderModal.setAttribute("aria-hidden", "true");
}

function buildCustomOrderEmail() {
  const email = localStorage.getItem(EMAIL_KEY) || OWNER_EMAIL;
  const name = document.querySelector("#customName").value.trim();
  const customerEmail = document.querySelector("#customEmail").value.trim();
  const request = document.querySelector("#customRequest").value.trim();
  const budget = document.querySelector("#customBudget").value.trim() || "Not specified";
  const deadline = document.querySelector("#customDeadline").value.trim() || "Not specified";
  const delivery = document.querySelector("#customDelivery").value.trim() || "Not specified";
  const subject = encodeURIComponent("Custom 3D Print Request");
  const body = encodeURIComponent(
    `Hi, I would like to request a custom 3D print.\n\nName: ${name}\nEmail: ${customerEmail}\n\nRequest:\n${request}\n\nBudget: ${budget}\nNeeded by: ${deadline}\nPickup/shipping: ${delivery}\n\nThanks!`,
  );

  return `mailto:${email}?subject=${subject}&body=${body}`;
}

window.buildCustomOrderEmail = buildCustomOrderEmail;

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
document.querySelector("#openCart").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", closeCart);
document.querySelector("#clearCart").addEventListener("click", () => {
  cart = [];
  saveCart();
  renderCart();
});

cartDrawer.addEventListener("click", (event) => {
  if (event.target === cartDrawer) closeCart();
});

document.querySelectorAll(".custom-order-trigger").forEach((button) => {
  button.addEventListener("click", openCustomOrder);
});

document.querySelector("#closeCustomOrder").addEventListener("click", closeCustomOrder);

customOrderModal.addEventListener("click", (event) => {
  if (event.target === customOrderModal) closeCustomOrder();
});

customOrderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  window.location.href = buildCustomOrderEmail();
  closeCustomOrder();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeCustomOrder();
  }
});

loadCatalog().then(() => {
  renderProducts();
  renderCart();
});
