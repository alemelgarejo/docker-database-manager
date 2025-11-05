# Configuración de Biome

Este proyecto utiliza [Biome](https://biomejs.dev/) para el formateo y análisis de código.

## Scripts Disponibles

- `pnpm format` - Formatea el código automáticamente
- `pnpm format:check` - Verifica el formato sin modificar archivos
- `pnpm lint` - Analiza el código en busca de problemas
- `pnpm lint:fix` - Corrige automáticamente los problemas detectados
- `pnpm check` - Ejecuta formato y linting en un solo comando

## Integración con VSCode

El proyecto incluye configuración de VSCode para usar Biome automáticamente:

1. Instala la extensión de Biome:
   - ID: `biomejs.biome`
   - O busca "Biome" en el marketplace de VSCode

2. La configuración ya está lista en `.vscode/settings.json`:
   - Formato automático al guardar
   - Organización de imports automática
   - Correcciones rápidas habilitadas

## Configuración

La configuración de Biome se encuentra en `biome.json`:

- **Formato**: 2 espacios, punto y coma obligatorio, comillas simples para JS
- **Línea máxima**: 80 caracteres
- **Line ending**: LF (Unix)
- **Trailing commas**: Siempre
- **Arrow parentheses**: Siempre

## Reglas Deshabilitadas

Algunas reglas están deshabilitadas para este proyecto:

- `useButtonType` - Botones HTML sin type explícito
- `useKeyWithClickEvents` - Eventos click sin keyboard
- `noSvgWithoutTitle` - SVG sin título
- Y otras (ver `biome.json` para la lista completa)

## Uso en CI/CD

Puedes agregar estos comandos a tu pipeline de CI/CD:

```bash
# Verificar formato
pnpm format:check

# Verificar linting
pnpm lint

# O ambos
pnpm check
```

## Pre-commit Hooks

Recomendamos usar Biome con hooks de pre-commit. Puedes usar herramientas como:

- [husky](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/okonet/lint-staged)

Ejemplo de configuración:

```json
{
  "lint-staged": {
    "*.{js,json,css,html}": ["biome check --write"]
  }
}
```
