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
const reviewForm = document.querySelector("#reviewForm");
const reviewList = document.querySelector("#reviewList");
const reviewNote = document.querySelector("#reviewNote");

const CART_KEY = "layerlab-cart";
const EMAIL_KEY = "layerlab-email";
const REVIEWS_KEY = "bbrprints-reviews";
const OWNER_EMAIL = "bbrprints.shop@gmail.com";

let products = window.catalogProducts || [];
let reviews = window.shopReviews || [];
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

function isVideo(src = "") {
  return /\.(mp4|mov|m4v|webm|ogg)$/i.test(src.split("?")[0]);
}

function getProductMedia(product) {
  const media = Array.isArray(product.media)
    ? product.media
        .map((item) => {
          const src = item.src || item.image || item.video || "";
          if (!src) return null;
          return {
            src,
            type: item.type || (isVideo(src) ? "video" : "image"),
            alt: item.alt || product.name,
          };
        })
        .filter(Boolean)
    : [];

  if (media.length) return media;

  return [
    {
      src: product.image || "assets/product-planter.svg",
      type: isVideo(product.image) ? "video" : "image",
      alt: product.name,
    },
  ];
}

function renderProductMedia(stage, media, index) {
  stage.innerHTML = "";
  const item = media[index];
  const element = document.createElement(item.type === "video" ? "video" : "img");

  if (item.type === "video") {
    element.controls = true;
    element.playsInline = true;
    element.preload = "metadata";
    element.setAttribute("aria-label", item.alt);
  } else {
    element.alt = item.alt;
  }

  element.src = item.src;
  stage.append(element);
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

async function loadReviews() {
  try {
    const response = await fetch("reviews.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.reviews)) {
      reviews = data.reviews;
    }
  } catch {
    // File previews may block fetch; reviews.js remains the local fallback.
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
    const mediaStage = card.querySelector(".media-stage");
    const mediaPrev = card.querySelector(".media-prev");
    const mediaNext = card.querySelector(".media-next");
    const mediaCount = card.querySelector(".media-count");
    const details = card.querySelector(".details");
    const payLink = card.querySelector(".pay-link");
    const media = getProductMedia(product);
    let mediaIndex = 0;

    renderProductMedia(mediaStage, media, mediaIndex);
    mediaCount.textContent = `${mediaIndex + 1} / ${media.length}`;
    if (media.length < 2) {
      mediaPrev.remove();
      mediaNext.remove();
      mediaCount.remove();
    } else {
      const updateMedia = (nextIndex) => {
        mediaIndex = (nextIndex + media.length) % media.length;
        renderProductMedia(mediaStage, media, mediaIndex);
        mediaCount.textContent = `${mediaIndex + 1} / ${media.length}`;
      };
      mediaPrev.addEventListener("click", () => updateMedia(mediaIndex - 1));
      mediaNext.addEventListener("click", () => updateMedia(mediaIndex + 1));
    }
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
    image.src = getProductMedia(product)[0].src;
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

function renderReviews() {
  const savedReviews = load(REVIEWS_KEY, []);
  const allReviews = [...savedReviews, ...reviews].filter((review) => review.name && review.message);

  reviewList.innerHTML = "";

  if (!allReviews.length) {
    reviewList.innerHTML = '<div class="empty-state">No reviews yet. Be the first to leave one.</div>';
    return;
  }

  allReviews.forEach((review) => {
    const card = document.createElement("article");
    const header = document.createElement("div");
    const name = document.createElement("h3");
    const rating = document.createElement("span");
    const message = document.createElement("p");

    card.className = "review-card";
    header.className = "review-card-header";
    name.textContent = review.name;
    rating.className = "review-rating";
    const ratingValue = Math.min(5, Math.max(1, Number(review.rating) || 5));
    rating.textContent = `${"★".repeat(ratingValue)}${"☆".repeat(5 - ratingValue)}`;
    message.textContent = review.message;

    header.append(name, rating);
    card.append(header, message);
    reviewList.append(card);
  });
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

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(reviewForm);
  const newReview = {
    name: document.querySelector("#reviewName").value.trim(),
    rating: document.querySelector("#reviewRating").value,
    message: document.querySelector("#reviewMessage").value.trim(),
  };
  const savedReviews = load(REVIEWS_KEY, []);
  localStorage.setItem(REVIEWS_KEY, JSON.stringify([newReview, ...savedReviews]));
  renderReviews();
  reviewForm.reset();
  reviewNote.textContent = "Thanks. Your review was added here and sent to BBR Prints.";

  try {
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString(),
    });
  } catch {
    reviewNote.textContent = "Thanks. Your review was added here. If sending fails, try again from the live site.";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeCustomOrder();
  }
});

Promise.all([loadCatalog(), loadReviews()]).then(() => {
  renderProducts();
  renderCart();
  renderReviews();
});
