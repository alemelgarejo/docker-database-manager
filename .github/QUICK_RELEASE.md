# 🚀 Quick Release Guide

## First Time Setup (5 minutes)

```bash
# 1. Generate keys
./.github/setup-release.sh

# 2. Add to GitHub Secrets (copy from script output)
#    https://github.com/alemelgarejo/docker-database-manager/settings/secrets/actions
#    - TAURI_PRIVATE_KEY
#    - TAURI_KEY_PASSWORD (if you set a password)

# 3. Update tauri.conf.json with public key (copy from script output)
#    src-tauri/tauri.conf.json → "pubkey": "..."
```

## Creating a Release (2 minutes)

```bash
# 1. Update version in these files:
#    - package.json: "version": "1.0.0"
#    - src-tauri/Cargo.toml: version = "1.0.0"
#    - src-tauri/tauri.conf.json: "version": "1.0.0"

# 2. Commit and push
git add .
git commit -m "chore: bump version to 1.0.0"
git push origin main

# 3. Create and push tag
git tag v1.0.0
git push origin v1.0.0

# 4. Done! ��
#    Watch the build: https://github.com/alemelgarejo/docker-database-manager/actions
```

## What You Get

After ~15-20 minutes:
- ✅ macOS Apple Silicon DMG
- ✅ macOS Intel DMG
- ✅ Windows EXE installer
- ✅ latest.json for auto-updates
- ✅ All files signed and ready

## Users Get Auto-Updates

Users will see update notifications in the app automatically! 🔄

---

**Need help?** See [RELEASE_SETUP.md](RELEASE_SETUP.md) for detailed instructions.
