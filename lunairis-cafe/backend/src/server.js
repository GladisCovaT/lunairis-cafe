require('dotenv').config({ path: require('node:path').join(__dirname, '..', '..', '.env') });

const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit').rateLimit;
const { ensureStore, readData, updateData } = require('./store');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

if (IS_PRODUCTION && (!process.env.SESSION_SECRET || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD_HASH)) {
  throw new Error('Configura SESSION_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD_HASH antes de iniciar en producción.');
}
if (IS_PRODUCTION) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: IS_PRODUCTION ? [] : null
    }
  }
}));
app.use(express.json({ limit: '30kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(session({
  name: 'lunairis.sid',
  secret: process.env.SESSION_SECRET || 'solo-desarrollo-cambia-esta-clave',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    maxAge: 1000 * 60 * 60 * 4
  }
}));
app.use(express.static(FRONTEND_DIR, { extensions: ['html'] }));

const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: 'draft-7', legacyHeaders: false });

function cleanText(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Debes iniciar sesión como administrador.' });
  next();
}

function validProduct(body) {
  const name = cleanText(body.name, 70);
  const category = cleanText(body.category, 40);
  const description = cleanText(body.description, 240);
  const tagline = cleanText(body.tagline, 90);
  const price = Number(body.price);
  if (!name || !category || !description || !Number.isFinite(price) || price < 1000 || price > 1000000) return null;
  return {
    name,
    category,
    description,
    tagline: tagline || 'Un momento para disfrutar',
    price: Math.round(price),
    icon: cleanText(body.icon, 4) || '☕',
    featured: Boolean(body.featured),
    active: body.active !== false
  };
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Lunairis Café API' }));

app.get('/api/products', async (_req, res, next) => {
  try {
    const data = await readData();
    res.json(data.products.filter(product => product.active));
  } catch (error) { next(error); }
});

app.post('/api/contact', contactLimiter, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 80);
    const email = cleanText(req.body.email, 120).toLowerCase();
    const topic = cleanText(req.body.topic, 80);
    const message = cleanText(req.body.message, 1200);
    if (name.length < 2 || !isValidEmail(email) || message.length < 10) {
      return res.status(400).json({ error: 'Revisa tu nombre, correo y mensaje (mínimo 10 caracteres).' });
    }
    const saved = await updateData(data => {
      const item = { id: crypto.randomUUID(), name, email, topic: topic || 'Mensaje general', message, status: 'Nuevo', createdAt: new Date().toISOString() };
      data.messages.unshift(item);
      return item;
    });
    res.status(201).json({ message: 'Tu mensaje llegó a Lunairis. Gracias por escribirnos.', id: saved.id });
  } catch (error) { next(error); }
});

app.post('/api/orders', contactLimiter, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 80);
    const phone = cleanText(req.body.phone, 30);
    const note = cleanText(req.body.note, 400);
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (name.length < 2 || phone.length < 7 || requestedItems.length < 1 || requestedItems.length > 20) {
      return res.status(400).json({ error: 'Completa tu nombre, teléfono y agrega al menos un producto.' });
    }
    const saved = await updateData(data => {
      const items = [];
      for (const requested of requestedItems) {
        const product = data.products.find(item => item.id === requested.id && item.active);
        const quantity = Number(requested.quantity);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) continue;
        items.push({ productId: product.id, name: product.name, price: product.price, quantity });
      }
      if (!items.length) throw new Error('PRODUCTS_UNAVAILABLE');
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const order = { id: crypto.randomUUID(), name, phone, note, items, total, status: 'Pendiente', createdAt: new Date().toISOString() };
      data.orders.unshift(order);
      return order;
    });
    res.status(201).json({ message: 'Tu pedido fue registrado. El equipo de Lunairis se pondrá en contacto contigo.', orderId: saved.id });
  } catch (error) {
    if (error.message === 'PRODUCTS_UNAVAILABLE') return res.status(400).json({ error: 'No encontramos los productos del pedido. Actualiza el catálogo e inténtalo de nuevo.' });
    next(error);
  }
});

app.post('/api/admin/login', loginLimiter, async (req, res, next) => {
  try {
    const email = cleanText(req.body.email, 120).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const passwordHash = process.env.ADMIN_PASSWORD_HASH || '';
    if (!adminEmail || !passwordHash || passwordHash === 'PEGA_AQUI_EL_HASH_BCRYPT') {
      return res.status(503).json({ error: 'Falta configurar ADMIN_EMAIL y ADMIN_PASSWORD_HASH en el archivo .env.' });
    }
    const valid = email === adminEmail && await bcrypt.compare(password, passwordHash);
    if (!valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.admin = { email: adminEmail };
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        res.json({ message: 'Sesión iniciada.', email: adminEmail });
      });
    });
  } catch (error) { next(error); }
});

app.get('/api/admin/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session.admin), email: req.session.admin?.email || null });
});

app.post('/api/admin/logout', requireAdmin, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('lunairis.sid', { httpOnly: true, sameSite: 'lax', secure: IS_PRODUCTION });
    res.json({ message: 'Sesión cerrada.' });
  });
});

app.get('/api/admin/dashboard', requireAdmin, async (_req, res, next) => {
  try {
    const data = await readData();
    const now = Date.now();
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const count = data.orders.filter(order => order.createdAt.slice(0, 10) === key).length;
      return { label: date.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''), count };
    });
    res.json({
      stats: {
        products: data.products.filter(item => item.active).length,
        messages: data.messages.length,
        newMessages: data.messages.filter(item => item.status === 'Nuevo').length,
        orders: data.orders.length,
        pendingOrders: data.orders.filter(item => item.status === 'Pendiente').length,
        revenue: data.orders.filter(item => item.status !== 'Cancelado').reduce((sum, item) => sum + item.total, 0)
      },
      weeklyOrders: lastSevenDays
    });
  } catch (error) { next(error); }
});

app.get('/api/admin/products', requireAdmin, async (_req, res, next) => {
  try { res.json((await readData()).products); } catch (error) { next(error); }
});

app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
  try {
    const product = validProduct(req.body);
    if (!product) return res.status(400).json({ error: 'Completa nombre, categoría, descripción y un precio válido.' });
    const saved = await updateData(data => {
      const item = { id: crypto.randomUUID(), ...product, createdAt: new Date().toISOString() };
      data.products.unshift(item);
      return item;
    });
    res.status(201).json(saved);
  } catch (error) { next(error); }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const product = validProduct(req.body);
    if (!product) return res.status(400).json({ error: 'Completa los campos del producto y revisa el precio.' });
    const updated = await updateData(data => {
      const index = data.products.findIndex(item => item.id === req.params.id);
      if (index === -1) return null;
      data.products[index] = { ...data.products[index], ...product, updatedAt: new Date().toISOString() };
      return data.products[index];
    });
    if (!updated) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(updated);
  } catch (error) { next(error); }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const deleted = await updateData(data => {
      const index = data.products.findIndex(item => item.id === req.params.id);
      if (index === -1) return false;
      data.products.splice(index, 1);
      return true;
    });
    if (!deleted) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ message: 'Producto eliminado.' });
  } catch (error) { next(error); }
});

app.get('/api/admin/messages', requireAdmin, async (_req, res, next) => {
  try { res.json((await readData()).messages); } catch (error) { next(error); }
});

app.patch('/api/admin/messages/:id', requireAdmin, async (req, res, next) => {
  try {
    const status = cleanText(req.body.status, 20);
    if (!['Nuevo', 'En seguimiento', 'Respondido'].includes(status)) return res.status(400).json({ error: 'Estado no válido.' });
    const item = await updateData(data => {
      const message = data.messages.find(entry => entry.id === req.params.id);
      if (!message) return null;
      message.status = status;
      return message;
    });
    if (!item) return res.status(404).json({ error: 'Mensaje no encontrado.' });
    res.json(item);
  } catch (error) { next(error); }
});

app.get('/api/admin/orders', requireAdmin, async (_req, res, next) => {
  try { res.json((await readData()).orders); } catch (error) { next(error); }
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const status = cleanText(req.body.status, 20);
    if (!['Pendiente', 'En preparación', 'Listo', 'Entregado', 'Cancelado'].includes(status)) return res.status(400).json({ error: 'Estado no válido.' });
    const item = await updateData(data => {
      const order = data.orders.find(entry => entry.id === req.params.id);
      if (!order) return null;
      order.status = status;
      order.updatedAt = new Date().toISOString();
      return order;
    });
    if (!item) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json(item);
  } catch (error) { next(error); }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error interno. Inténtalo nuevamente.' });
});

ensureStore().then(() => {
  app.listen(PORT, () => console.log(`Lunairis Café está listo en http://localhost:${PORT}`));
}).catch(error => {
  console.error('No se pudo iniciar el almacenamiento:', error);
  process.exit(1);
});
