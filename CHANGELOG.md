# Changelog

## [0.1.0] - 2024-11-04

### Añadido
- Aplicación inicial de gestión de PostgreSQL en Docker
- Interfaz gráfica para crear, gestionar y eliminar contenedores
- Consola SQL integrada para ejecutar consultas
- Visualización de logs de contenedores
- Soporte para PostgreSQL versiones 12-16
- Auto-actualización cada 10 segundos
- Puerto por defecto cambiado a 5544 para evitar conflictos

### Corregido
- Parámetros de comandos Tauri correctamente configurados (camelCase en JS, snake_case en Rust)
- Conversión de tipos para boolean en llamadas a comandos
- Cache del navegador mediante versión en URL del JavaScript

### Técnico
- Backend: Rust + Tauri 2.9 + Bollard 0.17
- Frontend: HTML5 + CSS3 + JavaScript vanilla
- Arquitectura: IPC de Tauri para comunicación frontend-backend
