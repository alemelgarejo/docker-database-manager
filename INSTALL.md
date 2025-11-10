# 📦 Instalación de Docker DB Manager

## ⚠️ Mensaje "Archivo dañado"

Es **NORMAL** que macOS diga que está "dañado" o que no puede verificar el desarrollador. 

**NO está dañado**, simplemente no está firmado con certificado de Apple ($99/año).

---

## ✅ Solución (Elige UNA):

### OPCIÓN 1: Comando rápido (MÁS FÁCIL) ⭐

Después de arrastrar la app a Aplicaciones, abre la Terminal y ejecuta:

```bash
xattr -cr "/Applications/Docker Database Manager.app"
```

Luego abre la app normalmente.

---

### OPCIÓN 2: Click derecho → Abrir

1. Abre el `.dmg` descargado
2. Arrastra **Docker Database Manager** a **Aplicaciones**
3. Ve a tu carpeta **Aplicaciones**
4. Haz **click DERECHO** en "Docker Database Manager"
5. Selecciona **"Abrir"** del menú
6. En el diálogo que aparece, click en **"Abrir"**

Solo necesitas hacer esto la PRIMERA vez.

---

### OPCIÓN 3: Preferencias del Sistema

1. Intenta abrir la app (te dará error)
2. Ve a: **Preferencias del Sistema** → **Seguridad y Privacidad**
3. Verás un mensaje sobre la app bloqueada
4. Click en **"Abrir de todas formas"**
5. Confirma que quieres abrirla

---

## 🚀 Instalación normal

1. Descarga el `.dmg` desde [Releases](https://github.com/alemelgarejo/docker-database-manager/releases)
2. Abre el archivo `.dmg`
3. Arrastra **Docker Database Manager** a **Aplicaciones**
4. Sigue **OPCIÓN 1** arriba para evitar el mensaje de seguridad
5. ¡Listo! Ya puedes usar la app

---

## ⚙️ Requisitos

- macOS 11.0 (Big Sur) o superior
- Docker Desktop instalado y corriendo
- Apple Silicon (M1/M2/M3) o Intel Mac

---

## 🐛 Si tienes problemas

Asegúrate de que Docker Desktop esté:
- ✅ Instalado
- ✅ Corriendo (icono en la barra de menú)
- ✅ Con permisos correctos

---

## 🔒 ¿Es seguro?

**SÍ**. El código es tuyo, lo compilaste tú mismo. macOS solo avisa porque no pagaste $99/año por el certificado de desarrollador de Apple.

Para apps de uso personal, NO necesitas firmarlo.
