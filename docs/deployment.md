# Deployment

## GitHub Pages

Veyra se despliega automáticamente con GitHub Actions.

### Configuración

1. Habilitar GitHub Pages en Settings → Pages → Source: GitHub Actions
2. Push a `main` activa el deploy

### Base path

```typescript
// vite.config.ts
base: process.env.VITE_BASE_PATH || '/veyra/'
```

### Variables de entorno en CI

| Variable | Descripción |
|---|---|
| VITE_BASE_PATH | Ruta base (`/repo-name/`) |
| VITE_BUILD_HASH | SHA del commit |
| VITE_REPO_URL | URL del repositorio |

### Verificación

- [ ] Build exitoso
- [ ] Assets sin 404
- [ ] manifest.json accesible
- [ ] Service worker registrado
- [ ] App funciona bajo subruta

## Desarrollo local

```bash
npm run dev
```

## Build local

```bash
npm run build
npm run preview
```
