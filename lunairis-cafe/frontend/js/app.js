
// ==========================================
// LUNAIRIS CAFÉ - FUNCIONALIDADES PRINCIPALES
// ==========================================

// MENÚ RESPONSIVE

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  navMenu.classList.toggle("open");
});

navMenu.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
  });
});


// ==========================================
// FILTROS DEL CATÁLOGO
// ==========================================

const filters = document.querySelectorAll(".filter");
const products = document.querySelectorAll(".product-card");

filters.forEach(button => {
  button.addEventListener("click", () => {

    filters.forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    const category = button.dataset.filter;

    products.forEach(product => {
      const matches =
        category === "todos" ||
        product.dataset.category === category;

      product.hidden = !matches;
    });

  });
});


// ==========================================
// CARRITO DE COMPRAS
// ==========================================

let cart = [];

const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const cartDetails = document.getElementById("cartDetails");

function formatPrice(value) {
  return "$" + value.toLocaleString("es-CO");
}

function updateCart() {

  const quantity = cart.reduce(
    (total, item) => total + item.quantity, 0
  );

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  cartCount.textContent = quantity;
  cartTotal.textContent = formatPrice(total);

  cartDetails.innerHTML = `
    <h3>Tu pedido</h3>
    ${cart.map((item, index) => `
      <p>
        ${item.name} × ${item.quantity}
        — ${formatPrice(item.price * item.quantity)}
        <button data-remove="${index}" aria-label="Quitar producto">−</button>
      </p>
    `).join("")}
    <hr>
    <strong>Total: ${formatPrice(total)}</strong>
    <p><small>Pedido de demostración. Confirma disponibilidad con el establecimiento.</small></p>
  `;

  cartDetails.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.remove);

      cart[index].quantity--;

      if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
      }

      updateCart();
    });
  });
}

document.querySelectorAll(".add-cart").forEach(button => {

  button.addEventListener("click", () => {

    const name = button.dataset.name;
    const price = Number(button.dataset.price);

    const existing = cart.find(item => item.name === name);

    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    updateCart();

    button.textContent = "✓";

    setTimeout(() => {
      button.textContent = "+";
    }, 700);

  });

});

document.getElementById("viewCart").addEventListener("click", () => {
  cartDetails.hidden = !cartDetails.hidden;
});


// ==========================================
// GENERADOR DE RUTINA IDEAL
// ==========================================

const createRoutine = document.getElementById("createRoutine");
const routineResult = document.getElementById("routineResult");

createRoutine.addEventListener("click", () => {

  const selected = [
    ...document.querySelectorAll(
      ".routine-options input:checked"
    )
  ].map(input => input.value);

  if (selected.length === 0) {
    routineResult.innerHTML = `
      <h3>¡Empecemos!</h3>
      <p>Selecciona al menos una actividad para diseñar tu rutina.</p>
    `;
    return;
  }

  routineResult.innerHTML = `
    <h3>Tu experiencia Lunairis ✨</h3>
    <p>Hemos preparado esta propuesta con tus preferencias:</p>
    <ol>
      ${selected.map(activity => `<li>${activity}</li>`).join("")}
    </ol>
    <p><strong>Un momento para ti, a tu manera.</strong></p>
    <a href="#reservas" class="experience-link">
      Reservar esta experiencia →
    </a>
  `;

});


// ==========================================
// HORARIOS SEGÚN EDAD
// ==========================================

const ageSelect = document.getElementById("visitorAge");
const timeSelect = document.getElementById("bookingTime");

const schedules = {
  ninos: [
    "09:00",
    "10:30",
    "14:00",
    "15:30"
  ],

  jovenes: [
    "11:00",
    "13:00",
    "15:00",
    "17:00"
  ],

  adultos: [
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00"
  ]
};

ageSelect.addEventListener("change", () => {

  const group = ageSelect.value;

  timeSelect.innerHTML = "";

  if (!group) {
    timeSelect.disabled = true;
    timeSelect.add(new Option(
      "Primero selecciona el grupo de edad", ""
    ));
    return;
  }

  timeSelect.disabled = false;

  timeSelect.add(new Option("Selecciona un horario", ""));

  schedules[group].forEach(time => {
    timeSelect.add(new Option(time, time));
  });

});


// ==========================================
// FECHA MÍNIMA DE RESERVA
// ==========================================

const dateInput = document.getElementById("bookingDate");

const today = new Date();
const localToday = new Date(
  today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().split("T")[0];

dateInput.min = localToday;


// ==========================================
// REGISTRO DE RESERVAS (DEMOSTRACIÓN)
// ==========================================

const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");

bookingForm.addEventListener("submit", event => {

  event.preventDefault();

  if (!bookingForm.reportValidity()) return;

  const formData = new FormData(bookingForm);

  const booking = {
    id: Date.now(),
    name: formData.get("name"),
    email: formData.get("email"),
    ageGroup: formData.get("ageGroup"),
    people: Number(formData.get("people")),
    activity: formData.get("activity"),
    date: formData.get("date"),
    time: formData.get("time"),
    notes: formData.get("notes"),
    status: "Pendiente"
  };

  if (booking.ageGroup === "ninos" && booking.people < 1) {
    bookingMessage.textContent = "Verifica la cantidad de visitantes.";
    return;
  }

  const reservations = JSON.parse(
    localStorage.getItem("lunairisReservations") || "[]"
  );

  reservations.push(booking);

  localStorage.setItem(
    "lunairisReservations",
    JSON.stringify(reservations)
  );

  bookingMessage.textContent =
    "¡Solicitud registrada! Tu reserva está pendiente de confirmación.";

  bookingMessage.style.color = "#174d3c";

  bookingForm.reset();
  timeSelect.disabled = true;
  timeSelect.innerHTML =
    '<option value="">Primero selecciona el grupo de edad</option>';

});


// ==========================================
// FORMULARIO DE CONTACTO (DEMOSTRACIÓN)
// ==========================================

const contactForm = document.getElementById("contactForm");
const contactMessage = document.getElementById("contactMessage");

contactForm.addEventListener("submit", event => {

  event.preventDefault();

  if (!contactForm.reportValidity()) return;

  const data = new FormData(contactForm);

  const message = {
    name: data.get("name"),
    email: data.get("email"),
    message: data.get("message"),
    date: new Date().toISOString()
  };

  const messages = JSON.parse(
    localStorage.getItem("lunairisMessages") || "[]"
  );

  messages.push(message);

  localStorage.setItem(
    "lunairisMessages",
    JSON.stringify(messages)
  );

  contactMessage.textContent =
    "¡Gracias por escribirnos! Tu mensaje se ha guardado en esta demostración.";

  contactMessage.style.color = "#174d3c";

  contactForm.reset();

});


// ==========================================
// ANIMACIÓN DE ENTRADA DE TARJETAS
// ==========================================

const observer = new IntersectionObserver(entries => {

  entries.forEach(entry => {

    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }

  });

}, { threshold: 0.12 });

document.querySelectorAll(
  ".experience-card, .product-card"
).forEach(card => {

  card.classList.add("reveal");
  observer.observe(card);

});

console.log("Lunairis Café: funcionalidades inicializadas.");
