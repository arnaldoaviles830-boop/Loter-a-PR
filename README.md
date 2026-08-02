# Lotería PR

Aplicación React + TypeScript para registrar resultados, consultar frecuencias históricas y generar combinaciones informativas para juegos de la Lotería Electrónica de Puerto Rico.

## Ejecutar localmente

```bash
npm install
npm run dev
```

## Crear versión de producción

```bash
npm run build
```

La carpeta generada será `dist`.

## Publicar en Cloudflare Pages

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

## Publicar en GitHub Pages

Este proyecto usa `base: "./"`, por lo que los archivos compilados funcionan desde una subcarpeta. Para un despliegue automatizado, configura GitHub Actions o publica la carpeta `dist`.

## Datos

Los resultados se guardan exclusivamente en `localStorage` del navegador. No se envían a ningún servidor.

> Cada sorteo es aleatorio e independiente. Las frecuencias históricas no predicen resultados futuros.
