# Lotería PR — V4.0 Modular

Esta versión conserva el motor funcional de la V3.5.1 y separa la aplicación en recursos independientes.

## Estructura

- `index.html`: estructura principal.
- `css/app.css`: estilos completos.
- `js/app.js`: núcleo funcional estable.
- `js/v4/config.js`: configuración central para la Fase 4.
- `js/v4/storage.js`: almacenamiento y respaldos para módulos nuevos.
- `js/v4/sync.js`: cliente del futuro Centro de Datos.
- `workers/worker.js`: Cloudflare Worker base.
- `assets/manifest.json`: metadatos preparados para la futura PWA.

## Publicación en GitHub Pages

Sube **todo el contenido** de esta carpeta conservando las carpetas.  
`index.html` debe permanecer en la raíz.

## Cloudflare Worker

El Worker actual incluye:

- `/health`
- `/api/results`

Todavía no inventa ni descarga resultados. V4.1 añadirá adaptadores de fuentes verificadas.

## Seguridad de datos

Antes de sustituir la versión anterior, descarga un respaldo JSON desde la aplicación.
