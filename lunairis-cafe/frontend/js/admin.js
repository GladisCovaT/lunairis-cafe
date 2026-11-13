const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let toastTimer;

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción.');
  return data;
}
function notify(message) {
  const toast = $('#adminToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function showDashboard(email) {
  $('#loginView').hidden = true;
  $('#dashboardView').hidden = false;
  $('#adminEmail').textContent = email || 'Equipo Lunairis';
  loadDashboard();
  loadProducts();
  loadOrders();
  loadMessages();
  runSeoAudit();
}
function showLogin() {
  $('#dashboardView').hidden = true;
  $('#loginView').hidden = false;
}

async function checkSession() {
  try {
    const session = await api('/api/admin/session');
    if (session.authenticated) showDashboard(session.email);
  } catch { /* La pantalla de acceso permanece disponible si el servidor responde con error. */ }
}

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = $('#loginFeedback');
  const button = form.querySelector('button');
  button.disabled = true;
  feedback.textContent = 'Verificando acceso…';
  try {
    const credentials = Object.fromEntries(new FormData(form).entries());
    const result = await api('/api/admin/login', { method: 'POST', body: JSON.stringify(credentials) });
    feedback.textContent = '';
    form.reset();
    showDashboard(result.email);
  } catch (error) { feedback.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#logoutButton').addEventListener('click', async () => {
  try { await api('/api/admin/logout', { method: 'POST', body: '{}' }); }
  catch (error) { notify(error.message); }
  showLogin();
});

function activateTab(tabName) {
  document.querySelectorAll('.side-link').forEach(button => button.classList.toggle('active', button.dataset.tab === tabName));
  document.querySelectorAll('.admin-tab').forEach(section => section.classList.toggle('active', section.id === `tab-${tabName}`));
  const titles = { overview: 'Resumen general', products: 'Gestión del catálogo', orders: 'Pedidos recibidos', messages: 'Mensajes de la comunidad', seo: 'Salud SEO del sitio' };
  $('#pageTitle').textContent = titles[tabName] || 'Administración';
  $('#sidebar').classList.remove('open');
  if (tabName === 'seo') runSeoAudit();
}
document.querySelectorAll('.side-link').forEach(button => button.addEventListener('click', () => activateTab(button.dataset.tab)));
document.querySelectorAll('[data-goto]').forEach(button => button.addEventListener('click', () => activateTab(button.dataset.goto)));
$('#mobileSideToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

async function loadDashboard() {
  try {
    const data = await api('/api/admin/dashboard');
    $('#statProducts').textContent = data.stats.products;
    $('#statMessages').textContent = data.stats.messages;
    $('#statNewMessages').textContent = data.stats.newMessages;
    $('#statOrders').textContent = data.stats.orders;
    $('#statPendingOrders').textContent = data.stats.pendingOrders;
    $('#statRevenue').textContent = money(data.stats.revenue);
    $('#pendingOrdersBadge').textContent = data.stats.pendingOrders;
    $('#newMessagesBadge').textContent = data.stats.newMessages;
    renderWeeklyChart(data.weeklyOrders || []);
  } catch (error) { notify(error.message); }
}
function renderWeeklyChart(days) {
  const chart = $('#weeklyChart');
  const max = Math.max(1, ...days.map(day => day.count));
  chart.innerHTML = days.map(day => {
    const level = day.count === 0 ? 0 : Math.max(1, Math.ceil(day.count / max * 10));
    const tone = day.count === 0 ? 'bar-empty' : day.count === max ? 'bar-peak' : 'bar-normal';
    return `<div class="chart-day"><span class="chart-value">${day.count}</span><div class="chart-bar-wrap"><div class="chart-bar bar-level-${level} ${tone}"></div></div><small>${escapeHTML(day.label)}</small></div>`;
  }).join('');
}

async function loadProducts() {
  try {
    const products = await api('/api/admin/products');
    $('#productCountLabel').textContent = `${products.length} productos`;
    $('#adminProductRows').innerHTML = products.length ? products.map(product => `<tr><td><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.tagline || '')}</small></td><td>${escapeHTML(product.category)}</td><td>${money(product.price)}</td><td><span class="status-pill ${product.active ? '' : 'off'}">${product.active ? 'Activo' : 'Inactivo'}</span></td><td><div class="row-actions"><button data-edit-product="${escapeHTML(product.id)}">Editar</button><button class="delete" data-delete-product="${escapeHTML(product.id)}">Eliminar</button></div></td></tr>`).join('') : '<tr><td colspan="5" class="table-empty">Todavía no hay productos.</td></tr>';
    $('#adminProductRows').dataset.products = JSON.stringify(products);
    if ($('#tab-overview').classList.contains('active')) $('#statProducts').textContent = products.filter(item => item.active).length;
  } catch (error) { notify(error.message); }
}
function resetProductForm() {
  $('#productForm').reset();
  $('#productForm').elements.id.value = '';
  $('#productFormTitle').textContent = 'Crear producto';
  $('#saveProductButton').textContent = 'Guardar producto';
  $('#productFeedback').textContent = '';
}
$('#newProductButton').addEventListener('click', () => { resetProductForm(); $('#productForm').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('#cancelEditButton').addEventListener('click', resetProductForm);
$('#adminProductRows').addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit-product]');
  const deleteButton = event.target.closest('[data-delete-product]');
  const products = JSON.parse($('#adminProductRows').dataset.products || '[]');
  if (editButton) {
    const product = products.find(item => item.id === editButton.dataset.editProduct);
    if (!product) return;
    const form = $('#productForm');
    Object.entries(product).forEach(([key, value]) => {
      if (form.elements[key]) {
        if (form.elements[key].type === 'checkbox') form.elements[key].checked = Boolean(value);
        else form.elements[key].value = value;
      }
    });
    form.elements.id.value = product.id;
    $('#productFormTitle').textContent = 'Editar producto';
    $('#saveProductButton').textContent = 'Guardar cambios';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (deleteButton) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return;
    try {
      await api(`/api/admin/products/${encodeURIComponent(deleteButton.dataset.deleteProduct)}`, { method: 'DELETE' });
      notify('Producto eliminado.');
      loadProducts(); loadDashboard();
    } catch (error) { notify(error.message); }
  }
});
$('#productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.featured = form.elements.featured.checked;
  data.active = true;
  data.price = Number(data.price);
  const id = data.id;
  delete data.id;
  const button = $('#saveProductButton');
  button.disabled = true;
  try {
    await api(id ? `/api/admin/products/${encodeURIComponent(id)}` : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
    notify(id ? 'Producto actualizado.' : 'Producto creado.');
    resetProductForm();
    loadProducts(); loadDashboard();
  } catch (error) { $('#productFeedback').textContent = error.message; }
  finally { button.disabled = false; }
});

async function loadOrders() {
  try {
    const orders = await api('/api/admin/orders');
    $('#ordersCountLabel').textContent = `${orders.length} pedidos`;
    $('#adminOrderRows').innerHTML = orders.length ? orders.map(order => `<tr><td><strong>#${escapeHTML(order.id.slice(0, 8))}</strong><small>${new Date(order.createdAt).toLocaleString('es-CO')}</small></td><td><strong>${escapeHTML(order.name)}</strong><small>${escapeHTML(order.phone)}</small></td><td>${order.items.map(item => `${escapeHTML(item.name)} × ${item.quantity}`).join('<br>')}</td><td><strong>${money(order.total)}</strong></td><td><select class="status-select" data-order-status="${escapeHTML(order.id)}"><option ${order.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option><option ${order.status === 'En preparación' ? 'selected' : ''}>En preparación</option><option ${order.status === 'Listo' ? 'selected' : ''}>Listo</option><option ${order.status === 'Entregado' ? 'selected' : ''}>Entregado</option><option ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option></select></td></tr>`).join('') : '<tr><td colspan="5" class="table-empty">Aún no hay pedidos registrados.</td></tr>';
  } catch (error) { notify(error.message); }
}
$('#adminOrderRows').addEventListener('change', async event => {
  const select = event.target.closest('[data-order-status]');
  if (!select) return;
  try {
    await api(`/api/admin/orders/${encodeURIComponent(select.dataset.orderStatus)}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
    notify('Estado del pedido actualizado.');
    loadDashboard();
  } catch (error) { notify(error.message); }
});

async function loadMessages() {
  try {
    const messages = await api('/api/admin/messages');
    $('#messagesCountLabel').textContent = `${messages.length} mensajes`;
    $('#adminMessageList').innerHTML = messages.length ? messages.map(message => `<article class="message-card"><div><h3>${escapeHTML(message.name)} <span class="status-pill">${escapeHTML(message.status)}</span></h3><div class="message-meta">${escapeHTML(message.email)} · ${escapeHTML(message.topic)} · ${new Date(message.createdAt).toLocaleString('es-CO')}</div><p>${escapeHTML(message.message)}</p><a href="mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent('Lunairis Café - ' + message.topic)}">Responder por correo ↗</a></div><select data-message-status="${escapeHTML(message.id)}" aria-label="Estado del mensaje"><option ${message.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option><option ${message.status === 'En seguimiento' ? 'selected' : ''}>En seguimiento</option><option ${message.status === 'Respondido' ? 'selected' : ''}>Respondido</option></select></article>`).join('') : '<div class="panel-card empty-state">Aún no hay mensajes. Cuando alguien escriba desde el sitio, aparecerá aquí.</div>';
  } catch (error) { notify(error.message); }
}
$('#adminMessageList').addEventListener('change', async event => {
  const select = event.target.closest('[data-message-status]');
  if (!select) return;
  try {
    await api(`/api/admin/messages/${encodeURIComponent(select.dataset.messageStatus)}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
    notify('Estado del mensaje actualizado.');
    loadDashboard();
  } catch (error) { notify(error.message); }
});

async function runSeoAudit() {
  const checks = [];
  try {
    const response = await fetch('/', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo leer la página pública.');
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const meta = name => doc.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';
    const property = name => doc.querySelector(`meta[property="${name}"]`)?.content?.trim() || '';
    const canonical = doc.querySelector('link[rel="canonical"]')?.href || '';
    const images = [...doc.querySelectorAll('img')];
    const imageAlts = images.length > 0 && images.every(image => image.hasAttribute('alt'));
    const robotsAndMap = Boolean(meta('robots'));
    checks.push(['Título descriptivo', doc.title.trim().length >= 20 && doc.title.trim().length <= 65, 'El título identifica la marca y la propuesta.']);
    checks.push(['Meta descripción', meta('description').length >= 70 && meta('description').length <= 170, 'Resumen para los resultados de búsqueda.']);
    checks.push(['Un encabezado H1', doc.querySelectorAll('h1').length === 1, 'Una jerarquía principal clara por página.']);
    checks.push(['Idioma declarado', doc.documentElement.lang === 'es', 'El documento declara español como idioma.']);
    checks.push(['Diseño adaptable', Boolean(doc.querySelector('meta[name="viewport"]')), 'Configuración para móviles y pantallas pequeñas.']);
    checks.push(['Datos para compartir', Boolean(property('og:title') && property('og:description') && property('og:image')), 'Metadatos Open Graph para compartir el sitio.']);
    checks.push(['Dominio canónico real', Boolean(canonical && !canonical.includes('.example') && !canonical.includes('tudominio')), 'Reemplaza el dominio de ejemplo por el dominio público real.']);
    checks.push(['Estructura semántica', Boolean(doc.querySelector('main') && doc.querySelector('nav') && doc.querySelector('footer')), 'Uso de regiones semánticas para organizar el contenido.']);
    checks.push(['Texto alternativo en imágenes', imageAlts, `${images.length} imagen(es) encontradas; todas deben tener atributo alt.`]);
    checks.push(['Directivas para buscadores', robotsAndMap, 'Meta robots presente; publica también sitemap.xml.']);
  } catch (error) {
    checks.push(['Página pública disponible', false, error.message]);
  }
  const passed = checks.filter(item => item[1]).length;
  const score = Math.round(passed / checks.length * 100);
  $('#seoScore').textContent = score;
  $('#miniSeoScore').textContent = `${score}/100`;
  $('#seoPassed').textContent = `${passed} / ${checks.length}`;
  $('#seoGauge').className = `seo-gauge score-${score}`;
  $('#seoGrade').textContent = score >= 90 ? 'Una base digital sólida' : score >= 70 ? 'Buen inicio, hay detalles por pulir' : 'Necesita algunos ajustes';
  $('#seoAuditDate').textContent = `Última revisión: ${new Date().toLocaleString('es-CO')}`;
  $('#seoChecks').innerHTML = checks.map(([label, ok, detail]) => `<div class="seo-check"><div><strong>${escapeHTML(label)}</strong><small>${escapeHTML(detail)}</small></div><span class="check-result ${ok ? '' : 'pending'}">${ok ? '✓ Correcto' : 'Pendiente'}</span></div>`).join('');
}
$('#refreshSeoButton').addEventListener('click', runSeoAudit);
checkSession();
