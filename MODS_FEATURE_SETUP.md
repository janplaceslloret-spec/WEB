# Feature: Mods — Instrucciones de Activación

> **Estado:** Frontend listo ✅ | Supabase pendiente ⬜ | n8n pendiente ⬜

---

## PASO 1 — Supabase: Crear tabla `server_mods`

1. Ir a **Supabase Dashboard** → proyecto `bttpqnuwspwlszzlapht`
2. Abrir **SQL Editor**
3. Ejecutar el contenido de `db/migrations/001_server_mods.sql`

Esto crea:
- Tabla `server_mods` con campos: id, server_id, mod_id, mod_name, version, file_name, source, status, error_msg, installed_at, updated_at
- RLS: usuarios solo ven mods de sus propios servidores
- Trigger: `updated_at` automático
- Realtime habilitado

---

## PASO 2 — n8n: Importar workflows

### 2a. INSTALL_MODS con Webhook HTTP

1. Ir a **n8n** → Workflows → Import
2. Importar `n8n-workflows/INSTALL_MODS_with_webhook.json`
3. Configurar credenciales:
   - **Supabase**: URL = `https://bttpqnuwspwlszzlapht.supabase.co` + Service Role Key
   - **SSH**: host `46.225.115.78`, user `root`, password (la del servidor)
4. Activar el workflow (toggle ON)
5. Webhook resultante: `https://snack55-n8n1.q7pa8v.easypanel.host/webhook/install-mod`

### 2b. UNINSTALL_MOD (nuevo workflow)

1. Importar `n8n-workflows/UNINSTALL_MOD.json`
2. Mismas credenciales (Supabase + SSH)
3. Activar
4. Webhook: `https://snack55-n8n1.q7pa8v.easypanel.host/webhook/uninstall-mod`

### 2c. INSTALL_MODS existente (el que ya tenías)

- Si ya tienes un workflow `INSTALL_MODS` en n8n que la IA usa internamente:
  - Añadirle al final un nodo Supabase que actualice `server_mods` con status='installed'
  - El workflow importado en 2a es una versión nueva con webhook + integración Supabase

---

## PASO 3 — Deploy Frontend

```bash
cd /home/ubuntu/projects/WEB
git add -A
git commit -m "feat: mods panel — search, install, uninstall UI"
# Deploy como siempre
```

---

## Qué hace el frontend (ya implementado)

- **Dashboard**: cuando el servidor está `running`, aparece la sección **Mods** debajo de las tarjetas
- **Tab "Instalados"**: lista de mods desde Supabase con estado en tiempo real (realtime)
- **Tab "Buscar mods"**: búsqueda contra API pública de Modrinth (sin key), filtrada por version y loader del servidor
- **Instalar**: llama a `/webhook/install-mod` + inserta en Supabase con status='installing'
- **Desinstalar**: llama a `/webhook/uninstall-mod` + marca status='uninstalling'
- **Estados visuales**: instalando / instalado / desinstalando / error

---

## Flujo completo vía chat (ya funciona si n8n lo implementa)

El SERVER MANAGER ya puede llamar INSTALL_MODS internamente.  
Cuando lo haga, debe al terminar:
1. Insertar/actualizar registro en `server_mods` con status='installed'
2. Opcionalmente responder al usuario con el nombre del mod instalado

---

## Notas técnicas

- Modrinth API: gratuita, sin auth, usada para búsqueda y descarga
- La búsqueda filtra por loader (forge/fabric/paper) y mc_version del servidor automáticamente
- Los mods se descargan directamente en la VM via SSH desde n8n
- La ruta de mods asumida: `/opt/minecraft/<server_name>/mods/`
- Si la ruta es diferente, ajustar en los nodos SSH de n8n
