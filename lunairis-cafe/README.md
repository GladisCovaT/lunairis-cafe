# Lunairis Café — proyecto final de grado

Sitio web full-stack para un café transformador que combina cafetería, arte, tecnología, actividades creativas y comunidad. La interfaz está en español y es responsive.

## 1. Estructura del proyecto

```text
lunairis-cafe/
├── frontend/
│   ├── assets/             # Logo, favicon e ilustraciones SVG locales
│   ├── css/                # Estilos de la web y del panel admin
│   ├── js/                 # Interacciones del sitio y del administrador
│   ├── index.html          # Página pública
│   ├── admin.html          # Panel administrador
│   ├── robots.txt
│   └── sitemap.xml
├── backend/
│   ├── data/
│   │   └── seed.json       # Datos iniciales de demostración
│   └── src/
│       ├── server.js       # API REST, sesiones y rutas
│       └── store.js        # Persistencia local en JSON
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 2. Requisitos

- Node.js 20 o superior.
- npm (se instala junto con Node.js).
- Un editor como Visual Studio Code o Trae.

Comprueba la instalación desde una terminal:

```bash
node -v
npm -v
```

## 3. Instalar y ejecutar

Abre la carpeta `lunairis-cafe` en tu editor. En la terminal integrada, asegúrate de estar en la carpeta raíz (la que contiene `package.json`) y ejecuta:

```bash
npm install
```

Crea tu archivo de configuración copiando `.env.example` y renombrando la copia a `.env` en la raíz del proyecto.

Genera un hash para la contraseña de administrador. Cambia `TuClaveSegura123!` por una contraseña propia:

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('TuClaveSegura123!', 12))"
```

Copia el resultado en `ADMIN_PASSWORD_HASH` dentro de `.env`. Completa también:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=escribe-una-frase-larga-y-aleatoria-dificil-de-adivinar
ADMIN_EMAIL=admin@lunairiscafe.com
ADMIN_PASSWORD_HASH=PEGA_AQUI_EL_HASH_BCRYPT
```

Guarda `.env` y ejecuta:

```bash
npm run dev
```

Abre en el navegador:

- Sitio público: http://localhost:3000
- Panel administrador: http://localhost:3000/admin.html
- Comprobación de API: http://localhost:3000/api/health

Para detener el servidor, vuelve a la terminal y pulsa `Ctrl + C`.

## 4. Funcionalidades incluidas

### Sitio público
- Inicio con propuesta de valor, identidad visual y navegación responsive.
- Secciones de esencia, experiencias, arte, tecnología, lectura y comunidad intergeneracional.
- Catálogo conectado al backend, con filtros por categoría y búsqueda.
- Carrito con cantidades y cálculo de total.
- Solicitud de pedidos; el precio se calcula de nuevo en el backend para evitar confiar en el valor enviado desde el navegador.
- Formulario de contacto que almacena los mensajes.
- Selector de estado de ánimo que ofrece una idea de actividad (no es diagnóstico ni atención psicológica).
- Recordatorios positivos aleatorios.
- Animaciones de entrada y microinteracciones con respeto a `prefers-reduced-motion`.

### Panel administrador
- Inicio de sesión con contraseña protegida mediante hash bcrypt.
- Resumen de productos, mensajes, pedidos e importe registrado.
- Gráfico dinámico de pedidos de los últimos siete días; las barras cambian según los datos.
- Crear, editar y eliminar productos del catálogo.
- Consultar pedidos y cambiar su estado.
- Consultar mensajes y marcar su seguimiento.
- Auditoría SEO básica sobre la página pública.

### Backend
- API REST con Express.
- Sesión de administrador con cookie `httpOnly` y `sameSite`.
- Validaciones básicas, límite de peticiones en login y formularios, y cabeceras de seguridad con Helmet.
- Persistencia de demostración en `backend/data/runtime.json`, creada automáticamente a partir de `seed.json`.

## 5. Datos y personalización

- Cambia colores y tipografías en `frontend/css/styles.css` y `frontend/css/admin.css`, dentro de `:root`.
- Cambia textos y secciones en `frontend/index.html`.
- Cambia los productos iniciales en `backend/data/seed.json`. Para reiniciar los datos de prueba, detén el servidor y elimina `backend/data/runtime.json`; al volver a iniciar, se crea desde `seed.json`.
- La carta se modifica desde el panel administrador cuando el servidor está activo.
- Las ilustraciones SVG están en `frontend/assets/` y puedes reemplazarlas conservando sus nombres o actualizando las rutas HTML.

## 6. SEO: qué significa la puntuación

En el panel hay una revisión automática de 10 comprobaciones técnicas: título, descripción, un H1, idioma, viewport, metadatos Open Graph, URL canónica, estructura semántica, texto alternativo y directiva para buscadores. Cada comprobación correcta suma el mismo peso. Es una puntuación orientativa de implementación; **no representa una calificación oficial ni garantiza posiciones en Google**.

Antes de publicar, reemplaza `https://lunairiscafe.example/` por el dominio real en:

- `frontend/index.html` (canonical y `og:image`).
- `frontend/robots.txt`.
- `frontend/sitemap.xml`.

El dominio `.example` es un marcador de posición y no debe dejarse en producción. Después de publicar, envía el sitemap desde Google Search Console.

## 7. Git y GitHub

Desde la terminal situada en la carpeta raíz:

```bash
git init
git add .
git commit -m "Construye sitio inicial de Lunairis Café"
```

Crea un repositorio vacío en GitHub y conecta la URL que GitHub te muestre:

```bash
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

No subas el archivo `.env`; está excluido por `.gitignore`. Si publicas el código, configura las variables de entorno en el servicio donde alojes el backend.

**Importante:** GitHub Pages sirve sitios estáticos; no ejecuta este backend de Node.js ni guarda pedidos. Para que catálogo administrador, login, mensajes y pedidos funcionen en internet, debes alojar el backend Node.js en un servicio compatible y configurar allí las variables `.env`. La persistencia JSON es útil para una demostración académica de una sola instancia; para un negocio real se recomienda una base de datos y un almacén de sesiones persistente.

## 8. Alcance y uso responsable

Lunairis Café se presenta como un espacio de bienestar, creatividad y escucha comunitaria. El selector de estado de ánimo solo propone ideas recreativas: no diagnostica, no sustituye terapia psicológica ni atención profesional, y no debe utilizarse como herramienta clínica. Si se incorporan programas de salud mental reales, deben diseñarse con profesionales cualificados, protocolos de protección de menores, consentimiento informado y privacidad de datos.

## 9. Próximas mejoras recomendadas

- Conectar una base de datos PostgreSQL o MySQL.
- Añadir recuperación de contraseña, roles y almacenamiento persistente de sesiones.
- Incorporar disponibilidad/calendario para reservas de talleres.
- Añadir pruebas automatizadas de API y frontend.
- Configurar dominio, HTTPS, analítica con consentimiento y Search Console.
