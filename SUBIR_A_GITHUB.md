# 📤 Pasos para Subir a GitHub

## Opción 1: Desde la Terminal (Recomendado)

### 1. Inicializar Git en el proyecto
```bash
cd /Users/alemelgarejo/MT360/test/docker-db-manager
git init
```

### 2. Agregar todos los archivos
```bash
git add .
```

### 3. Hacer el primer commit
```bash
git commit -m "Initial commit: Docker PostgreSQL Manager v0.1.0"
```

### 4. Crear el repositorio en GitHub
- Ve a https://github.com/new
- Nombre del repositorio: `docker-postgresql-manager` (o el que prefieras)
- Descripción: "macOS desktop app to manage PostgreSQL databases in Docker containers"
- Público o Privado: Tu elección
- **NO marques** "Initialize with README" (ya tienes uno)
- Click en "Create repository"

### 5. Conectar con GitHub y subir
GitHub te mostrará comandos, pero básicamente son estos:

```bash
# Conectar con tu repositorio (cambia 'tu-usuario' por tu usuario de GitHub)
git remote add origin https://github.com/tu-usuario/docker-postgresql-manager.git

# Subir a GitHub
git branch -M main
git push -u origin main
```

---

## Opción 2: Usando GitHub Desktop

### 1. Abrir GitHub Desktop
- Abre la aplicación GitHub Desktop

### 2. Agregar el repositorio local
- File → Add Local Repository
- Selecciona la carpeta: `/Users/alemelgarejo/MT360/test/docker-db-manager`

### 3. Hacer el commit inicial
- Verás todos los archivos listados
- Mensaje de commit: "Initial commit: Docker PostgreSQL Manager v0.1.0"
- Click en "Commit to main"

### 4. Publicar en GitHub
- Click en "Publish repository"
- Nombre: `docker-postgresql-manager`
- Descripción: "macOS desktop app to manage PostgreSQL databases in Docker containers"
- Elige Público o Privado
- Click en "Publish Repository"

---

## Pasos Posteriores (Opcionales)

### Agregar Topics en GitHub
Ve a tu repositorio en GitHub y agrega estos topics para mejor descubrimiento:
- `rust`
- `tauri`
- `postgresql`
- `docker`
- `macos`
- `desktop-app`
- `database-management`

### Crear un Release
1. Ve a tu repositorio en GitHub
2. Click en "Releases" → "Create a new release"
3. Tag: `v0.1.0`
4. Title: "v0.1.0 - Initial Release"
5. Descripción: Copia el contenido de CHANGELOG.md
6. Adjunta el archivo `.dmg` de: `src-tauri/target/release/bundle/dmg/`
7. Click en "Publish release"

### Agregar Badge del Build
Puedes agregar más badges al README si configuras GitHub Actions para CI/CD.

---

## ⚠️ Importante: Archivos que NO se subirán

Gracias al `.gitignore`, estos archivos NO se subirán (lo cual es correcto):
- `node_modules/` (se instala con `pnpm install`)
- `src-tauri/target/` (se genera al compilar)
- `.DS_Store` (archivos del sistema macOS)
- Logs y archivos temporales

---

## 🔍 Verificar antes de subir

Ejecuta estos comandos para ver qué se va a subir:

```bash
# Ver status
git status

# Ver archivos que se incluirán
git ls-files
```

Si ves algún archivo que no debería subirse, agrégalo al `.gitignore`
