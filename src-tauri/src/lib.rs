use bollard::container::{Config, CreateContainerOptions, ListContainersOptions, LogsOptions, RemoveContainerOptions, StartContainerOptions};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::image::CreateImageOptions;
use bollard::Docker;
use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::fs;
use tauri::State;
use tokio::sync::Mutex;

// Enum para tipos de bases de datos
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseType {
    PostgreSQL,
    MySQL,
    MongoDB,
    Redis,
    MariaDB,
}

impl DatabaseType {
    pub fn to_string(&self) -> String {
        match self {
            DatabaseType::PostgreSQL => "postgresql".to_string(),
            DatabaseType::MySQL => "mysql".to_string(),
            DatabaseType::MongoDB => "mongodb".to_string(),
            DatabaseType::Redis => "redis".to_string(),
            DatabaseType::MariaDB => "mariadb".to_string(),
        }
    }

    pub fn get_icon(&self) -> &str {
        match self {
            DatabaseType::PostgreSQL => "🐘",
            DatabaseType::MySQL => "🐬",
            DatabaseType::MongoDB => "🍃",
            DatabaseType::Redis => "🔴",
            DatabaseType::MariaDB => "🦭",
        }
    }

    pub fn get_default_port(&self) -> u16 {
        match self {
            DatabaseType::PostgreSQL => 5544,
            DatabaseType::MySQL => 3306,
            DatabaseType::MongoDB => 27017,
            DatabaseType::Redis => 6379,
            DatabaseType::MariaDB => 3306,
        }
    }

    pub fn get_default_user(&self) -> &str {
        match self {
            DatabaseType::PostgreSQL => "postgres",
            DatabaseType::MySQL => "root",
            DatabaseType::MongoDB => "root",
            DatabaseType::Redis => "",
            DatabaseType::MariaDB => "root",
        }
    }

    pub fn get_available_versions(&self) -> Vec<&str> {
        match self {
            DatabaseType::PostgreSQL => vec!["15", "16", "14", "13", "12"],
            DatabaseType::MySQL => vec!["8.2", "8.0", "5.7"],
            DatabaseType::MongoDB => vec!["7.0", "6.0", "5.0", "4.4"],
            DatabaseType::Redis => vec!["7.2", "7.0", "6.2"],
            DatabaseType::MariaDB => vec!["11.2", "10.11", "10.6"],
        }
    }

    pub fn get_image_name(&self, version: &str) -> String {
        match self {
            DatabaseType::PostgreSQL => format!("postgres:{}", version),
            DatabaseType::MySQL => format!("mysql:{}", version),
            DatabaseType::MongoDB => format!("mongo:{}", version),
            DatabaseType::Redis => format!("redis:{}", version),
            DatabaseType::MariaDB => format!("mariadb:{}", version),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub name: String,
    pub username: String,
    pub password: String,
    pub port: u16,
    pub version: String,
    #[serde(rename = "type")]
    pub db_type: DatabaseType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpus: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "restartPolicy")]
    pub restart_policy: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoveContainerParams {
    #[serde(rename = "containerId")]
    pub container_id: String,
    #[serde(rename = "removeVolumes")]
    pub remove_volumes: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContainerIdParam {
    #[serde(rename = "containerId")]
    pub container_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecSqlParams {
    #[serde(rename = "containerId")]
    pub container_id: String,
    pub database: String,
    pub username: String,
    pub sql: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupParams {
    #[serde(rename = "containerId")]
    pub container_id: String,
    pub database: String,
    pub username: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContainerInfo {
    pub id: String,
    pub name: String,
    pub status: String,
    pub port: String,
    pub created: String,
    pub database_name: String,
    pub db_type: String,
    pub db_icon: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub message: String,
}

pub struct AppState {
    docker: Mutex<Docker>,
}

// Estructura para enviar info de tipos de BD al frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseTypeInfo {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub default_port: u16,
    pub default_user: String,
    pub versions: Vec<String>,
}

#[tauri::command]
async fn check_docker(state: State<'_, AppState>) -> Result<bool, String> {
    let docker = state.docker.lock().await;
    match docker.ping().await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false), // NUNCA devolver Err, solo Ok(false)
    }
}

// Helper function to parse memory strings like "256m", "2g" to bytes
fn parse_memory_string(memory_str: &str) -> Result<i64, String> {
    let memory_str = memory_str.trim().to_lowercase();
    
    if memory_str.ends_with("g") || memory_str.ends_with("gb") {
        let num_str = memory_str.trim_end_matches("gb").trim_end_matches("g");
        let num: f64 = num_str.parse().map_err(|_| format!("Invalid memory format: {}", memory_str))?;
        Ok((num * 1024.0 * 1024.0 * 1024.0) as i64)
    } else if memory_str.ends_with("m") || memory_str.ends_with("mb") {
        let num_str = memory_str.trim_end_matches("mb").trim_end_matches("m");
        let num: f64 = num_str.parse().map_err(|_| format!("Invalid memory format: {}", memory_str))?;
        Ok((num * 1024.0 * 1024.0) as i64)
    } else if memory_str.ends_with("k") || memory_str.ends_with("kb") {
        let num_str = memory_str.trim_end_matches("kb").trim_end_matches("k");
        let num: f64 = num_str.parse().map_err(|_| format!("Invalid memory format: {}", memory_str))?;
        Ok((num * 1024.0) as i64)
    } else {
        // Assume bytes if no suffix
        memory_str.parse::<i64>().map_err(|_| format!("Invalid memory format: {}", memory_str))
    }
}

#[tauri::command]
fn get_database_types() -> Result<Vec<DatabaseTypeInfo>, String> {
    let types = vec![
        DatabaseType::PostgreSQL,
        DatabaseType::MySQL,
        DatabaseType::MariaDB,
        DatabaseType::MongoDB,
        DatabaseType::Redis,
    ];
    
    Ok(types.iter().map(|db_type| {
        DatabaseTypeInfo {
            id: db_type.to_string(),
            name: match db_type {
                DatabaseType::PostgreSQL => "PostgreSQL".to_string(),
                DatabaseType::MySQL => "MySQL".to_string(),
                DatabaseType::MongoDB => "MongoDB".to_string(),
                DatabaseType::Redis => "Redis".to_string(),
                DatabaseType::MariaDB => "MariaDB".to_string(),
            },
            icon: db_type.get_icon().to_string(),
            default_port: db_type.get_default_port(),
            default_user: db_type.get_default_user().to_string(),
            versions: db_type.get_available_versions().iter().map(|v| v.to_string()).collect(),
        }
    }).collect())
}

#[tauri::command]
async fn list_containers(state: State<'_, AppState>) -> Result<Vec<ContainerInfo>, String> {
    let docker = state.docker.lock().await;
    
    // SIN FILTROS - Muestra TODOS los contenedores de Docker
    let containers = docker.list_containers(Some(ListContainersOptions::<String> { 
        all: true, 
        ..Default::default() 
    }))
        .await.map_err(|e| e.to_string())?;

    Ok(containers.iter().map(|c| {
        let name = c.names.as_ref().and_then(|n| n.first()).map(|n| n.trim_start_matches('/').to_string()).unwrap_or_default();
        let port = c.ports.as_ref().and_then(|p| p.first()).and_then(|p| p.public_port).map(|p| p.to_string()).unwrap_or_default();
        let status = c.state.as_ref().unwrap_or(&"unknown".to_string()).clone();
        let created = chrono::DateTime::from_timestamp(c.created.unwrap_or(0), 0).map(|dt| dt.format("%Y-%m-%d %H:%M").to_string()).unwrap_or_default();
        let database_name = c.labels.as_ref().and_then(|l| l.get("database_name")).map(|s| s.clone()).unwrap_or_default();
        let db_type = c.labels.as_ref().and_then(|l| l.get("db_type")).map(|s| s.clone()).unwrap_or("postgresql".to_string());
        let db_icon = c.labels.as_ref().and_then(|l| l.get("db_icon")).map(|s| s.clone()).unwrap_or("🐘".to_string());
        
        ContainerInfo { id: c.id.as_ref().unwrap_or(&String::new()).clone(), name, status, port, created, database_name, db_type, db_icon }
    }).collect())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageInfo {
    pub id: String,
    pub tags: Vec<String>,
    pub size: String,
    pub created: String,
}

#[tauri::command]
async fn list_images(state: State<'_, AppState>) -> Result<Vec<ImageInfo>, String> {
    let docker = state.docker.lock().await;
    
    let images = docker.list_images::<String>(None)
        .await.map_err(|e| e.to_string())?;

    Ok(images.iter().filter_map(|img| {
        // Filtrar solo imágenes de bases de datos
        let tags = img.repo_tags.clone();
        let has_db_tag = tags.iter().any(|tag| {
            tag.contains("postgres") || 
            tag.contains("mysql") || 
            tag.contains("mongo") || 
            tag.contains("redis") ||
            tag.contains("mariadb")
        });
        
        if !has_db_tag {
            return None;
        }
        
        let size_mb = img.size as f64 / 1_048_576.0; // Convertir a MB
        let size = if size_mb > 1024.0 {
            format!("{:.2} GB", size_mb / 1024.0)
        } else {
            format!("{:.0} MB", size_mb)
        };
        
        let created = chrono::DateTime::from_timestamp(img.created, 0)
            .map(|dt| dt.format("%Y-%m-%d").to_string())
            .unwrap_or_default();
        
        Some(ImageInfo {
            id: img.id.clone(),
            tags: tags,
            size,
            created,
        })
    }).collect())
}

#[tauri::command]
async fn remove_image(state: State<'_, AppState>, image_id: String) -> Result<String, String> {
    let docker = state.docker.lock().await;
    
    println!("🗑️ Eliminando imagen: {}", image_id);
    
    docker.remove_image(&image_id, None, None)
        .await
        .map_err(|e| format!("Error al eliminar imagen: {}", e))?;
    
    println!("✅ Imagen eliminada: {}", image_id);
    Ok("Image removed successfully".to_string())
}

#[tauri::command]
async fn create_database(state: State<'_, AppState>, config: DatabaseConfig) -> Result<String, String> {
    println!("📦 Creando base de datos: {} ({})", config.name, config.db_type.to_string());
    let docker = state.docker.lock().await;
    let image = config.db_type.get_image_name(&config.version);
    
    println!("🔍 Validando puerto y nombre...");
    // Validar que el puerto no esté en uso
    let containers = docker.list_containers(Some(ListContainersOptions::<String> { 
        all: true, 
        ..Default::default() 
    })).await.map_err(|e| format!("Error listando contenedores: {}", e))?;
    
    for container in &containers {
        if let Some(ports) = &container.ports {
            for port in ports {
                if let Some(public_port) = port.public_port {
                    if public_port == config.port as u16 {
                        return Err(format!("El puerto {} ya está en uso por otro contenedor", config.port));
                    }
                }
            }
        }
    }
    
    // Validar que el nombre no esté en uso
    let container_name = format!("{}-{}", config.db_type.to_string(), config.name);
    for container in &containers {
        if let Some(names) = &container.names {
            for name in names {
                if name.trim_start_matches('/') == container_name {
                    return Err(format!("Ya existe un contenedor con el nombre '{}'", container_name));
                }
            }
        }
    }
    
    println!("🔍 Verificando imagen: {}", image);
    // Verificar si la imagen ya existe localmente
    let images = docker.list_images::<String>(None).await.map_err(|e| format!("Error listando imágenes: {}", e))?;
    let image_exists = images.iter().any(|img| {
        img.repo_tags.iter().any(|tag| tag == &image)
    });
    
    // Solo descargar la imagen si no existe
    if !image_exists {
        println!("⬇️ Descargando imagen {}... (esto puede tardar 2-5 minutos la primera vez)", image);
        
        // Timeout de 10 minutos para la descarga
        let download_future = async {
            let mut stream = docker.create_image(
                Some(CreateImageOptions { 
                    from_image: image.as_str(), 
                    ..Default::default() 
                }), 
                None, 
                None
            );
            while let Some(result) = stream.next().await {
                result.map_err(|e| format!("Error descargando imagen: {}", e))?;
            }
            Ok::<(), String>(())
        };
        
        match tokio::time::timeout(std::time::Duration::from_secs(600), download_future).await {
            Ok(Ok(_)) => {
                println!("✅ Imagen descargada correctamente: {}", image);
            },
            Ok(Err(e)) => {
                return Err(format!("Error al descargar imagen: {}", e));
            },
            Err(_) => {
                return Err("Timeout: La descarga de la imagen tardó más de 10 minutos. Verifica tu conexión a internet.".to_string());
            }
        }
    } else {
        println!("✅ Imagen ya existe localmente: {}", image);
    }
    
    // Configurar según el tipo de base de datos
    let mut base_env: Vec<String> = Vec::new();
    let exposed_port: String;
    
    match config.db_type {
        DatabaseType::PostgreSQL => {
            exposed_port = "5432/tcp".to_string();
            base_env.push(format!("POSTGRES_USER={}", config.username));
            base_env.push(format!("POSTGRES_PASSWORD={}", config.password));
            base_env.push(format!("POSTGRES_DB={}", config.name));
        },
        DatabaseType::MySQL => {
            exposed_port = "3306/tcp".to_string();
            base_env.push(format!("MYSQL_ROOT_PASSWORD={}", config.password));
            base_env.push(format!("MYSQL_DATABASE={}", config.name));
            base_env.push(format!("MYSQL_USER={}", config.username));
            base_env.push(format!("MYSQL_PASSWORD={}", config.password));
        },
        DatabaseType::MariaDB => {
            exposed_port = "3306/tcp".to_string();
            base_env.push(format!("MARIADB_ROOT_PASSWORD={}", config.password));
            base_env.push(format!("MARIADB_DATABASE={}", config.name));
            base_env.push(format!("MARIADB_USER={}", config.username));
            base_env.push(format!("MARIADB_PASSWORD={}", config.password));
        },
        DatabaseType::MongoDB => {
            exposed_port = "27017/tcp".to_string();
            if !config.username.is_empty() && !config.password.is_empty() {
                base_env.push(format!("MONGO_INITDB_ROOT_USERNAME={}", config.username));
                base_env.push(format!("MONGO_INITDB_ROOT_PASSWORD={}", config.password));
                base_env.push(format!("MONGO_INITDB_DATABASE={}", config.name));
            }
        },
        DatabaseType::Redis => {
            exposed_port = "6379/tcp".to_string();
            // Redis uses command line args, not env vars for password
        },
    }
    
    // Add template environment variables
    if let Some(ref template_env) = config.env {
        for (key, value) in template_env {
            base_env.push(format!("{}={}", key, value));
        }
    }
    
    // Build HostConfig with optional memory and CPU limits
    let mut host_config = json!({
        "PortBindings": {
            &exposed_port: [{"HostPort": config.port.to_string(), "HostIp": "0.0.0.0"}]
        }
    });
    
    if let Some(ref memory) = config.memory {
        // Convert memory string (e.g., "256m", "2g") to bytes
        let memory_bytes = parse_memory_string(memory)?;
        host_config.as_object_mut().unwrap().insert("Memory".to_string(), json!(memory_bytes));
    }
    
    if let Some(ref cpus) = config.cpus {
        // Convert CPU string (e.g., "1", "0.5", "2") to NanoCPUs (1 CPU = 1e9 NanoCPUs)
        if let Ok(cpu_value) = cpus.parse::<f64>() {
            let nano_cpus = (cpu_value * 1_000_000_000.0) as i64;
            host_config.as_object_mut().unwrap().insert("NanoCpus".to_string(), json!(nano_cpus));
        }
    }
    
    if let Some(ref restart_policy) = config.restart_policy {
        host_config.as_object_mut().unwrap().insert("RestartPolicy".to_string(), json!({
            "Name": restart_policy
        }));
    }
    
    // Build container configuration
    let mut container_json = json!({
        "Image": image,
        "Env": base_env,
        "ExposedPorts": {&exposed_port: {}},
        "HostConfig": host_config,
        "Labels": {
            "app": "db-manager", 
            "database_name": config.name.clone(),
            "db_type": config.db_type.to_string(),
            "db_icon": config.db_type.get_icon()
        }
    });
    
    // Special case for Redis with password
    if config.db_type == DatabaseType::Redis && !config.password.is_empty() {
        container_json.as_object_mut().unwrap().insert("Cmd".to_string(), json!(["redis-server", "--requirepass", &config.password]));
    }
    
    let container_config: Config<String> = serde_json::from_value(container_json)
        .map_err(|e| format!("Error en configuración: {}", e))?;
    
    let container = docker.create_container(
        Some(CreateContainerOptions { 
            name: container_name, 
            ..Default::default() 
        }), 
        container_config
    ).await.map_err(|e| format!("Error creando contenedor: {}", e))?;
    
    docker.start_container(&container.id, None::<StartContainerOptions<String>>)
        .await.map_err(|e| format!("Error iniciando contenedor: {}", e))?;
    
    Ok(format!("{} '{}' creada en puerto {}", config.db_type.get_icon(), config.name, config.port))
}

#[tauri::command]
async fn start_container(state: State<'_, AppState>, container_id: String) -> Result<String, String> {
    let docker = state.docker.lock().await;
    docker.start_container(&container_id, None::<StartContainerOptions<String>>)
        .await.map_err(|e| e.to_string())?;
    Ok("Iniciado".to_string())
}

#[tauri::command]
async fn stop_container(state: State<'_, AppState>, container_id: String) -> Result<String, String> {
    let docker = state.docker.lock().await;
    docker.stop_container(&container_id, None).await.map_err(|e| e.to_string())?;
    Ok("Detenido".to_string())
}

#[tauri::command]
async fn restart_container(state: State<'_, AppState>, container_id: String) -> Result<String, String> {
    let docker = state.docker.lock().await;
    docker.restart_container(&container_id, None).await.map_err(|e| e.to_string())?;
    Ok("Reiniciado".to_string())
}

#[tauri::command]
async fn rename_container(state: State<'_, AppState>, container_id: String, new_name: String) -> Result<String, String> {
    let docker = state.docker.lock().await;
    
    // Validar que el nuevo nombre no esté vacío
    if new_name.trim().is_empty() {
        return Err("Container name cannot be empty".to_string());
    }
    
    // Validar formato del nombre (solo letras, números, guiones y guiones bajos)
    if !new_name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err("Container name can only contain letters, numbers, hyphens and underscores".to_string());
    }
    
    // Docker API: POST /containers/{id}/rename?name={newname}
    use bollard::container::RenameContainerOptions;
    
    docker.rename_container(&container_id, RenameContainerOptions {
        name: new_name.clone()
    }).await.map_err(|e| format!("Error renaming container: {}", e))?;
    
    Ok(format!("Container renamed to '{}'", new_name))
}

#[tauri::command]
async fn remove_container(state: State<'_, AppState>, container_id: String, remove_volumes: bool) -> Result<String, String> {
    let docker = state.docker.lock().await;
    
    // Verificar que el contenedor existe
    let containers = docker.list_containers(Some(ListContainersOptions::<String> { 
        all: true, 
        ..Default::default() 
    })).await.map_err(|e| format!("Error listando contenedores: {}", e))?;
    
    let container_exists = containers.iter().any(|c| {
        c.id.as_ref().map(|id| id == &container_id).unwrap_or(false)
    });
    
    if !container_exists {
        return Err(format!("El contenedor no existe"));
    }
    
    // Intentar detener el contenedor (ignorar si ya está detenido)
    let _ = docker.stop_container(&container_id, None).await;
    
    // Esperar un momento para asegurar que está completamente detenido
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    // Eliminar el contenedor
    docker.remove_container(
        &container_id, 
        Some(RemoveContainerOptions { 
            v: remove_volumes, 
            force: true, 
            ..Default::default() 
        })
    ).await.map_err(|e| format!("Error eliminando contenedor: {}", e))?;
    
    Ok("Eliminado".to_string())
}

#[tauri::command]
async fn get_logs(state: State<'_, AppState>, container_id: String) -> Result<Vec<LogEntry>, String> {
    let docker = state.docker.lock().await;
    let mut stream = docker.logs(&container_id, Some(LogsOptions::<String> { stdout: true, stderr: true, tail: "100".to_string(), timestamps: true, ..Default::default() }));
    let mut logs = Vec::new();
    
    while let Some(result) = stream.next().await {
        if let Ok(log) = result {
            logs.push(LogEntry { timestamp: chrono::Local::now().format("%H:%M:%S").to_string(), message: log.to_string() });
        }
    }
    Ok(logs)
}

#[tauri::command]
async fn exec_sql(state: State<'_, AppState>, container_id: String, database: String, username: String, sql: String) -> Result<String, String> {
    let docker = state.docker.lock().await;
    let exec = docker.create_exec(&container_id, CreateExecOptions { cmd: Some(vec!["psql", "-U", &username, "-d", &database, "-c", &sql]), attach_stdout: Some(true), attach_stderr: Some(true), ..Default::default() })
        .await.map_err(|e| e.to_string())?;
    
    let start = docker.start_exec(&exec.id, None).await.map_err(|e| e.to_string())?;
    let mut output = String::new();
    
    if let bollard::exec::StartExecResults::Attached { output: mut stream, .. } = start {
        while let Some(msg) = stream.next().await {
            if let Ok(log) = msg { output.push_str(&log.to_string()); }
        }
    }
    Ok(output)
}

#[tauri::command]
async fn backup_db(state: State<'_, AppState>, container_id: String, database: String, username: String) -> Result<String, String> {
    let docker = state.docker.lock().await;
    let file = format!("/tmp/backup_{}_{}.sql", database, chrono::Local::now().timestamp());
    let exec = docker.create_exec(&container_id, CreateExecOptions { cmd: Some(vec!["pg_dump", "-U", &username, "-d", &database, "-f", &file]), attach_stdout: Some(true), attach_stderr: Some(true), ..Default::default() })
        .await.map_err(|e| e.to_string())?;
    docker.start_exec(&exec.id, None).await.map_err(|e| e.to_string())?;
    Ok(file)
}

// Función helper para conectar a Docker con múltiples intentos
fn connect_docker() -> Result<Docker, String> {
    // Intento 1: Defaults (funciona en Linux y algunas configuraciones de macOS)
    if let Ok(docker) = Docker::connect_with_local_defaults() {
        println!("✅ Conectado a Docker con defaults");
        return Ok(docker);
    }

    // Intento 2: Socket específico de macOS Docker Desktop
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/user".to_string());
        let socket_path = format!("{}/.docker/run/docker.sock", home);
        
        if let Ok(docker) = Docker::connect_with_socket(&socket_path, 120, bollard::API_DEFAULT_VERSION) {
            println!("✅ Conectado a Docker en: {}", socket_path);
            return Ok(docker);
        }
    }

    // Intento 3: Socket Unix estándar
    if let Ok(docker) = Docker::connect_with_socket("/var/run/docker.sock", 120, bollard::API_DEFAULT_VERSION) {
        println!("✅ Conectado a Docker en: /var/run/docker.sock");
        return Ok(docker);
    }

    // Intento 4: HTTP local (Docker Desktop en Windows/Mac a veces usa esto)
    if let Ok(docker) = Docker::connect_with_http("http://localhost:2375", 120, bollard::API_DEFAULT_VERSION) {
        println!("✅ Conectado a Docker en: http://localhost:2375");
        return Ok(docker);
    }

    Err("No se pudo conectar a Docker. Asegúrate de que Docker Desktop está corriendo.".to_string())
}

/// Open Docker Desktop application
/// 
/// # Returns
/// * `Ok(String)` - Success message
/// * `Err(String)` - Error message if opening fails
#[tauri::command]
async fn open_docker_desktop() -> Result<String, String> {
    use std::process::Command;
    
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("open")
            .arg("-a")
            .arg("Docker")
            .output()
            .map_err(|e| format!("Failed to open Docker Desktop: {}", e))?;
        
        if output.status.success() {
            Ok("Docker Desktop opened successfully".to_string())
        } else {
            Err("Failed to open Docker Desktop. Make sure it's installed.".to_string())
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("cmd")
            .args(&["/C", "start", "", "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"])
            .output()
            .map_err(|e| format!("Failed to open Docker Desktop: {}", e))?;
        
        if output.status.success() {
            Ok("Docker Desktop opened successfully".to_string())
        } else {
            Err("Failed to open Docker Desktop. Make sure it's installed.".to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // On Linux, Docker usually runs as a service
        // Try to start the docker service
        let output = Command::new("systemctl")
            .args(&["start", "docker"])
            .output()
            .map_err(|e| format!("Failed to start Docker: {}", e))?;
        
        if output.status.success() {
            Ok("Docker service started successfully".to_string())
        } else {
            Err("Failed to start Docker service. You may need to start it manually with 'sudo systemctl start docker'".to_string())
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Try to connect to Docker, but don't fail if it's not available
    let docker = match connect_docker() {
        Ok(d) => {
            println!("✅ Docker initialized successfully");
            d
        }
        Err(e) => {
            println!("⚠️ Docker not available at startup: {}", e);
            println!("⚠️ The app will start anyway. You can connect to Docker later.");
            // Create a connection that will fail gracefully
            Docker::connect_with_local_defaults().unwrap_or_else(|_| {
                // This should never fail, but if it does, we'll use a dummy connection
                // that will return errors for all operations
                Docker::connect_with_socket("/nonexistent.sock", 1, bollard::API_DEFAULT_VERSION)
                    .expect("Failed to create dummy Docker connection")
            })
        }
    };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState { docker: Mutex::new(docker) })
        .manage(MigrationState { migrated: Mutex::new(Vec::new()) })
        .invoke_handler(tauri::generate_handler![
            check_docker,
            open_docker_desktop, 
            get_database_types, 
            list_containers,
            list_images,
            remove_image,
            create_database, 
            start_container, 
            stop_container, 
            restart_container,
            rename_container,
            remove_container, 
            get_logs, 
            exec_sql, 
            backup_db,
            detect_local_postgres,
            connect_local_postgres,
            list_local_databases,
            migrate_database,
            get_migrated_databases,
            delete_original_database,
            remove_migrated_database,
            list_volumes,
            remove_volume,
            prune_volumes,
            backup_volume,
            restore_volume,
            get_container_stats,
            get_all_containers_stats,
            check_resource_alerts,
            parse_compose_file,
            generate_compose_from_containers,
            deploy_compose_file,
            list_compose_projects,
            stop_compose_project,
            remove_compose_project
        ])
        .run(tauri::generate_context!())
        .expect("error running app");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{sleep, Duration};

    // Helper para conectar con Docker
    async fn get_docker() -> Docker {
        Docker::connect_with_local_defaults().expect("Docker debe estar disponible para tests")
    }

    // Helper para asegurar que la imagen de postgres existe
    async fn ensure_postgres_image(docker: &Docker, version: &str) {
        let image = format!("postgres:{}", version);
        let images = docker.list_images::<String>(None).await.expect("Debería poder listar imágenes");
        
        let image_exists = images.iter().any(|img| {
            img.repo_tags.iter().any(|tag| tag == &image)
        });
        
        if !image_exists {
            println!("Descargando imagen {}...", image);
            let mut stream = docker.create_image(
                Some(CreateImageOptions { 
                    from_image: image.as_str(), 
                    ..Default::default() 
                }), 
                None, 
                None
            );
            
            while let Some(result) = stream.next().await {
                result.expect("Debería poder descargar la imagen");
            }
            println!("Imagen {} descargada correctamente", image);
        } else {
            println!("Imagen {} ya existe localmente", image);
        }
    }

    // Helper para limpiar contenedores de test
    async fn cleanup_test_container(docker: &Docker, name: &str) {
        let container_name = format!("postgres-{}", name);
        
        if let Ok(containers) = docker.list_containers(Some(ListContainersOptions::<String> { 
            all: true, 
            ..Default::default() 
        })).await {
            for container in containers {
                if let Some(names) = &container.names {
                    if names.iter().any(|n| n.trim_start_matches('/') == container_name) {
                        if let Some(id) = &container.id {
                            let _ = docker.stop_container(id, None).await;
                            sleep(Duration::from_secs(1)).await;
                            let _ = docker.remove_container(id, Some(RemoveContainerOptions { 
                                v: true, 
                                force: true, 
                                ..Default::default() 
                            })).await;
                        }
                    }
                }
            }
        }
    }

    #[tokio::test]
    async fn test_docker_connection() {
        let docker = get_docker().await;
        let result = docker.ping().await;
        assert!(result.is_ok(), "Docker debería estar conectado");
    }

    #[tokio::test]
    async fn test_list_postgres_containers() {
        let docker = get_docker().await;
        
        let mut filters = HashMap::new();
        filters.insert("label".to_string(), vec!["app=postgres-manager".to_string()]);
        
        let result = docker.list_containers(Some(ListContainersOptions::<String> { 
            all: true, 
            filters, 
            ..Default::default() 
        })).await;
        
        assert!(result.is_ok(), "Listar contenedores debería funcionar");
        println!("Contenedores encontrados: {}", result.unwrap().len());
    }

    #[tokio::test]
    async fn test_create_database_success() {
        let docker = get_docker().await;
        let db_name = "test_db_success";
        
        cleanup_test_container(&docker, db_name).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        let image = "postgres:16";
        let port = 5433;
        
        // Verificar que el puerto no esté en uso
        let containers = docker.list_containers(Some(ListContainersOptions::<String> { 
            all: true, 
            ..Default::default() 
        })).await.unwrap();
        
        for container in &containers {
            if let Some(ports) = &container.ports {
                for p in ports {
                    if let Some(public_port) = p.public_port {
                        assert_ne!(public_port, port, "Puerto {} ya está en uso", port);
                    }
                }
            }
        }
        
        // Verificar si la imagen existe
        let images = docker.list_images::<String>(None).await.unwrap();
        let image_exists = images.iter().any(|img| {
            img.repo_tags.iter().any(|tag| tag == image)
        });
        
        println!("Imagen {} existe: {}", image, image_exists);
        
        // Crear contenedor
        let container_json = json!({
            "Image": image,
            "Env": [
                format!("POSTGRES_USER={}", "test_user"),
                format!("POSTGRES_PASSWORD={}", "test_pass"),
                format!("POSTGRES_DB={}", db_name)
            ],
            "ExposedPorts": {"5432/tcp": {}},
            "HostConfig": {
                "PortBindings": {
                    "5432/tcp": [{"HostPort": port.to_string(), "HostIp": "0.0.0.0"}]
                }
            },
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container_name = format!("postgres-{}", db_name);
        
        let result = docker.create_container(
            Some(CreateContainerOptions { 
                name: container_name.clone(), 
                ..Default::default() 
            }), 
            container_config
        ).await;
        
        assert!(result.is_ok(), "Crear contenedor debería funcionar: {:?}", result.err());
        
        let container = result.unwrap();
        let start_result = docker.start_container(&container.id, None::<StartContainerOptions<String>>).await;
        assert!(start_result.is_ok(), "Iniciar contenedor debería funcionar");
        
        sleep(Duration::from_secs(2)).await;
        
        // Verificar que está en la lista
        let mut filters = HashMap::new();
        filters.insert("label".to_string(), vec!["app=postgres-manager".to_string()]);
        let containers = docker.list_containers(Some(ListContainersOptions::<String> { 
            all: true, 
            filters, 
            ..Default::default() 
        })).await.unwrap();
        
        let found = containers.iter().any(|c| {
            c.labels.as_ref().and_then(|l| l.get("database_name")).map(|n| n == db_name).unwrap_or(false)
        });
        assert!(found, "El contenedor debería estar en la lista");
        
        cleanup_test_container(&docker, db_name).await;
    }

    #[tokio::test]
    async fn test_duplicate_port_detection() {
        let docker = get_docker().await;
        let db_name1 = "test_dup_port1";
        let db_name2 = "test_dup_port2";
        let port = 5434;
        
        cleanup_test_container(&docker, db_name1).await;
        cleanup_test_container(&docker, db_name2).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        // Crear primer contenedor
        let container_json = json!({
            "Image": "postgres:16",
            "Env": [
                format!("POSTGRES_USER=user1"),
                format!("POSTGRES_PASSWORD=pass1"),
                format!("POSTGRES_DB={}", db_name1)
            ],
            "ExposedPorts": {"5432/tcp": {}},
            "HostConfig": {
                "PortBindings": {
                    "5432/tcp": [{"HostPort": port.to_string(), "HostIp": "0.0.0.0"}]
                }
            },
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name1
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container = docker.create_container(
            Some(CreateContainerOptions { 
                name: format!("postgres-{}", db_name1), 
                ..Default::default() 
            }), 
            container_config
        ).await.unwrap();
        
        docker.start_container(&container.id, None::<StartContainerOptions<String>>).await.unwrap();
        
        sleep(Duration::from_secs(1)).await;
        
        // Verificar que el puerto está en uso
        let containers = docker.list_containers(Some(ListContainersOptions::<String> { 
            all: true, 
            ..Default::default() 
        })).await.unwrap();
        
        let mut port_in_use = false;
        for c in &containers {
            if let Some(ports) = &c.ports {
                for p in ports {
                    if let Some(public_port) = p.public_port {
                        if public_port == port {
                            port_in_use = true;
                            println!("Puerto {} está en uso por contenedor {:?}", port, c.names);
                            break;
                        }
                    }
                }
            }
        }
        
        assert!(port_in_use, "El puerto debería estar en uso");
        
        // Intentar crear segundo contenedor con mismo puerto debería fallar
        let container_json2 = json!({
            "Image": "postgres:16",
            "Env": [
                format!("POSTGRES_USER=user2"),
                format!("POSTGRES_PASSWORD=pass2"),
                format!("POSTGRES_DB={}", db_name2)
            ],
            "ExposedPorts": {"5432/tcp": {}},
            "HostConfig": {
                "PortBindings": {
                    "5432/tcp": [{"HostPort": port.to_string(), "HostIp": "0.0.0.0"}]
                }
            },
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name2
            }
        });
        
        let container_config2: Config<String> = serde_json::from_value(container_json2).unwrap();
        let result2 = docker.create_container(
            Some(CreateContainerOptions { 
                name: format!("postgres-{}", db_name2), 
                ..Default::default() 
            }), 
            container_config2
        ).await;
        
        // El contenedor se crea pero fallar al iniciar por puerto ocupado
        if result2.is_ok() {
            let start_result = docker.start_container(&result2.unwrap().id, None::<StartContainerOptions<String>>).await;
            assert!(start_result.is_err(), "No debería poder iniciar con puerto duplicado");
            println!("Error esperado al iniciar: {:?}", start_result.err());
        }
        
        cleanup_test_container(&docker, db_name1).await;
        cleanup_test_container(&docker, db_name2).await;
    }

    #[tokio::test]
    async fn test_duplicate_name_detection() {
        let docker = get_docker().await;
        let db_name = "test_dup_name";
        
        cleanup_test_container(&docker, db_name).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        // Crear primer contenedor
        let container_json = json!({
            "Image": "postgres:16",
            "Env": [
                format!("POSTGRES_USER=user"),
                format!("POSTGRES_PASSWORD=pass"),
                format!("POSTGRES_DB={}", db_name)
            ],
            "ExposedPorts": {"5432/tcp": {}},
            "HostConfig": {
                "PortBindings": {
                    "5432/tcp": [{"HostPort": "5435", "HostIp": "0.0.0.0"}]
                }
            },
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container_name = format!("postgres-{}", db_name);
        
        let result1 = docker.create_container(
            Some(CreateContainerOptions { 
                name: container_name.clone(), 
                ..Default::default() 
            }), 
            container_config.clone()
        ).await;
        
        assert!(result1.is_ok(), "Primera creación debería funcionar");
        
        // Intentar crear segundo contenedor con mismo nombre
        let result2 = docker.create_container(
            Some(CreateContainerOptions { 
                name: container_name, 
                ..Default::default() 
            }), 
            container_config
        ).await;
        
        assert!(result2.is_err(), "No debería permitir nombre duplicado");
        println!("Error esperado: {:?}", result2.err());
        
        cleanup_test_container(&docker, db_name).await;
    }

    #[tokio::test]
    async fn test_start_stop_container() {
        let docker = get_docker().await;
        let db_name = "test_startstop";
        
        cleanup_test_container(&docker, db_name).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        // Crear y arrancar contenedor
        let container_json = json!({
            "Image": "postgres:16",
            "Env": [
                format!("POSTGRES_DB={}", db_name),
                "POSTGRES_USER=postgres",
                "POSTGRES_PASSWORD=postgres"
            ],
            "ExposedPorts": {"5432/tcp": {}},
            "HostConfig": {
                "PortBindings": {
                    "5432/tcp": [{"HostPort": "5437", "HostIp": "0.0.0.0"}]
                }
            },
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container = docker.create_container(
            Some(CreateContainerOptions { 
                name: format!("postgres-{}", db_name), 
                ..Default::default() 
            }), 
            container_config
        ).await.unwrap();
        
        docker.start_container(&container.id, None::<StartContainerOptions<String>>).await.unwrap();
        sleep(Duration::from_secs(5)).await;
        
        // Verificar que está corriendo
        let info = docker.inspect_container(&container.id, None).await.unwrap();
        let is_running = info.state.as_ref().and_then(|s| s.running).unwrap_or(false);
        assert!(is_running, "Debería estar corriendo. Estado: {:?}", info.state);
        
        // Detener
        let result = docker.stop_container(&container.id, None).await;
        assert!(result.is_ok(), "Detener debería funcionar");
        
        sleep(Duration::from_secs(3)).await;
        
        // Verificar que está detenido
        let info = docker.inspect_container(&container.id, None).await.unwrap();
        let is_running = info.state.as_ref().and_then(|s| s.running).unwrap_or(true);
        assert!(!is_running, "Debería estar detenido. Estado: {:?}", info.state);
        
        // Iniciar de nuevo
        let result = docker.start_container(&container.id, None::<StartContainerOptions<String>>).await;
        assert!(result.is_ok(), "Iniciar debería funcionar");
        
        sleep(Duration::from_secs(5)).await;
        
        // Verificar que está corriendo
        let info = docker.inspect_container(&container.id, None).await.unwrap();
        let is_running = info.state.as_ref().and_then(|s| s.running).unwrap_or(false);
        assert!(is_running, "Debería estar corriendo después de reiniciar. Estado: {:?}", info.state);
        
        cleanup_test_container(&docker, db_name).await;
    }

    #[tokio::test]
    async fn test_restart_container() {
        let docker = get_docker().await;
        let db_name = "test_restart";
        
        cleanup_test_container(&docker, db_name).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        // Crear y arrancar contenedor
        let container_json = json!({
            "Image": "postgres:16",
            "Env": [
                format!("POSTGRES_DB={}", db_name),
                "POSTGRES_USER=postgres",
                "POSTGRES_PASSWORD=postgres"
            ],
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container = docker.create_container(
            Some(CreateContainerOptions { 
                name: format!("postgres-{}", db_name), 
                ..Default::default() 
            }), 
            container_config
        ).await.unwrap();
        
        docker.start_container(&container.id, None::<StartContainerOptions<String>>).await.unwrap();
        sleep(Duration::from_secs(5)).await;
        
        // Reiniciar
        let result = docker.restart_container(&container.id, None).await;
        assert!(result.is_ok(), "Reiniciar debería funcionar");
        
        sleep(Duration::from_secs(5)).await;
        
        // Verificar que está corriendo
        let info = docker.inspect_container(&container.id, None).await.unwrap();
        let is_running = info.state.as_ref().and_then(|s| s.running).unwrap_or(false);
        assert!(is_running, "Debería estar corriendo después de reiniciar. Estado: {:?}", info.state);
        
        cleanup_test_container(&docker, db_name).await;
    }

    #[tokio::test]
    async fn test_remove_container_with_volumes() {
        let docker = get_docker().await;
        let db_name = "test_remove_vol";
        
        cleanup_test_container(&docker, db_name).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        // Crear contenedor
        let container_json = json!({
            "Image": "postgres:16",
            "Env": [
                format!("POSTGRES_DB={}", db_name),
                "POSTGRES_USER=postgres",
                "POSTGRES_PASSWORD=postgres"
            ],
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container = docker.create_container(
            Some(CreateContainerOptions { 
                name: format!("postgres-{}", db_name), 
                ..Default::default() 
            }), 
            container_config
        ).await.unwrap();
        
        docker.start_container(&container.id, None::<StartContainerOptions<String>>).await.unwrap();
        sleep(Duration::from_secs(2)).await;
        
        let container_id = container.id.clone();
        
        // Detener y eliminar
        let _ = docker.stop_container(&container_id, None).await;
        sleep(Duration::from_secs(1)).await;
        
        let result = docker.remove_container(
            &container_id, 
            Some(RemoveContainerOptions { 
                v: true, 
                force: true, 
                ..Default::default() 
            })
        ).await;
        
        assert!(result.is_ok(), "Eliminar con volúmenes debería funcionar: {:?}", result.err());
        
        sleep(Duration::from_secs(1)).await;
        
        // Verificar que no existe
        let info_result = docker.inspect_container(&container_id, None).await;
        assert!(info_result.is_err(), "El contenedor no debería existir");
    }

    #[tokio::test]
    async fn test_remove_nonexistent_container() {
        let docker = get_docker().await;
        
        let result = docker.remove_container(
            "nonexistent_container_12345", 
            Some(RemoveContainerOptions { 
                v: true, 
                force: true, 
                ..Default::default() 
            })
        ).await;
        
        assert!(result.is_err(), "Eliminar contenedor inexistente debería fallar");
        println!("Error esperado: {:?}", result.err());
    }

    #[tokio::test]
    async fn test_get_container_logs() {
        let docker = get_docker().await;
        let db_name = "test_logs";
        
        cleanup_test_container(&docker, db_name).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        // Crear y arrancar contenedor
        let container_json = json!({
            "Image": "postgres:16",
            "Env": [
                format!("POSTGRES_DB={}", db_name),
                "POSTGRES_USER=postgres",
                "POSTGRES_PASSWORD=postgres"
            ],
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container = docker.create_container(
            Some(CreateContainerOptions { 
                name: format!("postgres-{}", db_name), 
                ..Default::default() 
            }), 
            container_config
        ).await.unwrap();
        
        docker.start_container(&container.id, None::<StartContainerOptions<String>>).await.unwrap();
        sleep(Duration::from_secs(5)).await;
        
        // Obtener logs
        let mut stream = docker.logs(
            &container.id, 
            Some(LogsOptions::<String> { 
                stdout: true, 
                stderr: true, 
                tail: "100".to_string(), 
                timestamps: true, 
                ..Default::default() 
            })
        );
        
        let mut log_count = 0;
        while let Some(result) = stream.next().await {
            if result.is_ok() {
                log_count += 1;
            }
        }
        
        assert!(log_count > 0, "Debería haber logs disponibles");
        println!("Logs encontrados: {}", log_count);
        
        cleanup_test_container(&docker, db_name).await;
    }

    #[tokio::test]
    async fn test_exec_sql_command() {
        let docker = get_docker().await;
        let db_name = "test_exec_sql";
        
        cleanup_test_container(&docker, db_name).await;
        
        // Asegurar que la imagen existe
        ensure_postgres_image(&docker, "16").await;
        
        // Crear y arrancar contenedor
        let container_json = json!({
            "Image": "postgres:16",
            "Env": [
                "POSTGRES_USER=postgres",
                "POSTGRES_PASSWORD=postgres",
                format!("POSTGRES_DB={}", db_name)
            ],
            "Labels": {
                "app": "postgres-manager",
                "database_name": db_name
            }
        });
        
        let container_config: Config<String> = serde_json::from_value(container_json).unwrap();
        let container = docker.create_container(
            Some(CreateContainerOptions { 
                name: format!("postgres-{}", db_name), 
                ..Default::default() 
            }), 
            container_config
        ).await.unwrap();
        
        docker.start_container(&container.id, None::<StartContainerOptions<String>>).await.unwrap();
        
        // Esperar a que PostgreSQL esté listo
        println!("Esperando a que PostgreSQL esté listo...");
        sleep(Duration::from_secs(10)).await;
        
        // Ejecutar comando SQL
        let exec = docker.create_exec(
            &container.id, 
            CreateExecOptions { 
                cmd: Some(vec!["psql", "-U", "postgres", "-d", db_name, "-c", "SELECT version();"]), 
                attach_stdout: Some(true), 
                attach_stderr: Some(true), 
                ..Default::default() 
            }
        ).await;
        
        assert!(exec.is_ok(), "Crear exec debería funcionar");
        
        let start = docker.start_exec(&exec.unwrap().id, None).await;
        assert!(start.is_ok(), "Ejecutar comando debería funcionar");
        
        if let Ok(bollard::exec::StartExecResults::Attached { output: mut stream, .. }) = start {
            let mut output = String::new();
            while let Some(msg) = stream.next().await {
                if let Ok(log) = msg {
                    output.push_str(&log.to_string());
                }
            }
            assert!(output.len() > 0, "Debería haber output del comando");
            println!("Output SQL: {}", output);
        }
        
        cleanup_test_container(&docker, db_name).await;
    }

    #[tokio::test]
    async fn test_image_exists_check() {
        let docker = get_docker().await;
        
        let image = "postgres:16";
        let images = docker.list_images::<String>(None).await.unwrap();
        
        let image_exists = images.iter().any(|img| {
            img.repo_tags.iter().any(|tag| tag == image)
        });
        
        println!("Imagen {} existe: {}", image, image_exists);
        
        // Este test solo verifica que podemos consultar imágenes
        // (siempre retorna algo, aunque sea vacío)
    }
}

// ============================================================================
// LOCAL POSTGRES MIGRATION
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalPostgresConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalDatabase {
    pub name: String,
    pub size: String,
    pub owner: String,
    pub tables: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MigratedDatabase {
    pub original_name: String,
    pub container_id: String,
    pub container_name: String,
    pub migrated_at: String,
    pub size: String,
}

// State para tracking de migraciones
pub struct MigrationState {
    pub migrated: Mutex<Vec<MigratedDatabase>>,
}

#[tauri::command]
async fn detect_local_postgres() -> Result<serde_json::Value, String> {
    // Intenta detectar PostgreSQL local en puertos comunes
    let common_ports = vec![5432, 5433];
    
    for port in common_ports {
        if check_postgres_port("localhost", port, "postgres", "").await {
            return Ok(json!({
                "host": "localhost",
                "port": port,
                "detected": true
            }));
        }
    }
    
    Err("No local PostgreSQL detected".to_string())
}

async fn check_postgres_port(host: &str, port: u16, user: &str, password: &str) -> bool {
    println!("Attempting to connect to PostgreSQL:");
    println!("  Host: {}", host);
    println!("  Port: {}", port);
    println!("  User: {}", user);
    
    let connection_string = if password.is_empty() {
        format!("host={} port={} user={}", host, port, user)
    } else {
        format!("host={} port={} user={} password={}", host, port, user, password)
    };
    
    match tokio_postgres::connect(&connection_string, tokio_postgres::NoTls).await {
        Ok((client, connection)) => {
            // Spawn connection handler
            tokio::spawn(async move {
                if let Err(e) = connection.await {
                    eprintln!("Connection error: {}", e);
                }
            });
            
            // Test query
            match client.query("SELECT 1", &[]).await {
                Ok(_) => {
                    println!("✓ Connection successful");
                    true
                }
                Err(e) => {
                    println!("✗ Query failed: {}", e);
                    false
                }
            }
        }
        Err(e) => {
            println!("✗ Connection failed: {}", e);
            false
        }
    }
}

#[tauri::command]
async fn connect_local_postgres(config: LocalPostgresConfig) -> Result<String, String> {
    println!("connect_local_postgres called");
    if check_postgres_port(&config.host, config.port, &config.user, &config.password).await {
        Ok("Connected successfully".to_string())
    } else {
        Err("Failed to connect to PostgreSQL. Check: 1) PostgreSQL is running, 2) Credentials are correct, 3) Host/Port are correct".to_string())
    }
}

#[tauri::command]
async fn list_local_databases(config: LocalPostgresConfig) -> Result<Vec<LocalDatabase>, String> {
    println!("list_local_databases called");
    
    let connection_string = if config.password.is_empty() {
        format!("host={} port={} user={} dbname=postgres", config.host, config.port, config.user)
    } else {
        format!("host={} port={} user={} password={} dbname=postgres", config.host, config.port, config.user, config.password)
    };
    
    let (client, connection) = tokio_postgres::connect(&connection_string, tokio_postgres::NoTls)
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;
    
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Connection error: {}", e);
        }
    });
    
    // Query to get database info
    let query = r#"
        SELECT 
            d.datname as name,
            pg_size_pretty(pg_database_size(d.datname)) as size,
            u.usename as owner
        FROM pg_database d
        JOIN pg_user u ON d.datdba = u.usesysid
        WHERE d.datistemplate = false
        AND d.datname NOT IN ('postgres', 'template0', 'template1')
        ORDER BY d.datname
    "#;
    
    let rows = client.query(query, &[])
        .await
        .map_err(|e| format!("Query failed: {}", e))?;
    
    let mut databases = Vec::new();
    
    for row in rows {
        databases.push(LocalDatabase {
            name: row.get(0),
            size: row.get(1),
            owner: row.get(2),
            tables: 0, // We'll calculate this separately if needed
        });
    }
    
    println!("Found {} databases", databases.len());
    Ok(databases)
}

#[tauri::command]
async fn migrate_database(
    config: LocalPostgresConfig,
    database_name: String,
    docker_state: State<'_, AppState>,
    migration_state: State<'_, MigrationState>,
) -> Result<String, String> {
    
    let docker = docker_state.docker.lock().await;
    
    // 0. Detectar versión de PostgreSQL del servidor local
    println!("[MIGRATE] Detecting PostgreSQL version...");
    let (client, connection) = tokio_postgres::connect(
        &format!(
            "host={} port={} user={} password={} dbname={}",
            config.host, config.port, config.user, config.password, database_name
        ),
        tokio_postgres::NoTls,
    )
    .await
    .map_err(|e| format!("Failed to connect to source database: {}", e))?;
    
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Connection error: {}", e);
        }
    });
    
    let version_row = client
        .query_one("SELECT version()", &[])
        .await
        .map_err(|e| format!("Failed to get PostgreSQL version: {}", e))?;
    
    let version_string: String = version_row.get(0);
    println!("[MIGRATE] PostgreSQL version: {}", version_string);
    
    // Extraer versión mayor (ej: "PostgreSQL 16.1..." -> "16")
    let postgres_major_version = version_string
        .split_whitespace()
        .nth(1)
        .and_then(|v| v.split('.').next())
        .unwrap_or("16");
    
    println!("[MIGRATE] Using postgres:{} image for compatibility", postgres_major_version);
    
    // 1. Crear dump de la base de datos local usando Docker
    let dump_path = format!("/tmp/{}_dump.sql", database_name);
    
    println!("[MIGRATE] Creating dump of database: {}", database_name);
    println!("[MIGRATE] Dump path: {}", dump_path);
    
    // En lugar de un contenedor que corre y termina, vamos a:
    // 1. Crear un contenedor con postgres que se quede corriendo
    // 2. Ejecutar pg_dump via docker exec
    // 3. Capturar la salida
    // 4. Eliminar el contenedor
    
    let dump_container_name = format!("temp-dump-{}-{}", database_name, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
    let postgres_image = format!("postgres:{}", postgres_major_version);
    
    // Pull image si no existe
    println!("[MIGRATE] Pulling postgres image for dump...");
    let mut stream = docker.create_image(
        Some(CreateImageOptions {
            from_image: postgres_image.as_str(),
            ..Default::default()
        }),
        None,
        None,
    );
    
    while let Some(_) = stream.next().await {}
    
    // En Docker Desktop Mac, usar host.docker.internal para acceder al host
    let host = if config.host == "localhost" || config.host == "127.0.0.1" {
        "host.docker.internal"
    } else {
        &config.host
    };
    
    println!("[MIGRATE] Creating temporary postgres container for dump...");
    
    // Crear un contenedor simple que duerma (para poder ejecutar comandos en él)
    let dump_container_json = json!({
        "Image": postgres_image,
        "Cmd": vec!["sleep", "300"],
        "HostConfig": {
            "NetworkMode": "host"
        }
    });
    
    let dump_container_config: Config<String> = serde_json::from_value(dump_container_json)
        .map_err(|e| format!("Failed to create dump container config: {}", e))?;
    
    let dump_container = docker.create_container(
        Some(CreateContainerOptions {
            name: dump_container_name.clone(),
            ..Default::default()
        }),
        dump_container_config,
    ).await.map_err(|e| format!("Failed to create dump container: {}", e))?;
    
    println!("[MIGRATE] Starting dump container...");
    docker.start_container(&dump_container.id, None::<StartContainerOptions<String>>)
        .await.map_err(|e| format!("Failed to start dump container: {}", e))?;
    
    // Pequeña pausa para asegurar que el contenedor está listo
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    // Ejecutar pg_dump usando docker exec
    println!("[MIGRATE] Executing pg_dump via docker exec...");
    
    let pgpassword_env = format!("PGPASSWORD={}", config.password);
    let port_str = config.port.to_string();
    
    let exec = docker.create_exec(
        &dump_container.id,
        CreateExecOptions {
            cmd: Some(vec![
                "pg_dump",
                "-h",
                host,
                "-p",
                &port_str,
                "-U",
                &config.user,
                "-d",
                &database_name,
                "-F",
                "p",
                "--no-owner",
                "--no-acl",
            ]),
            env: Some(vec![pgpassword_env.as_str()]),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        }
    ).await.map_err(|e| format!("Failed to create exec for pg_dump: {}", e))?;
    
    let exec_start = docker.start_exec(&exec.id, None).await
        .map_err(|e| format!("Failed to start pg_dump exec: {}", e))?;
    
    let mut dump_output = Vec::new();
    let mut dump_stderr = Vec::new();
    
    if let StartExecResults::Attached { mut output, .. } = exec_start {
        while let Some(msg) = output.next().await {
            match msg {
                Ok(bollard::container::LogOutput::StdOut { message }) => {
                    dump_output.extend_from_slice(&message);
                }
                Ok(bollard::container::LogOutput::StdErr { message }) => {
                    dump_stderr.extend_from_slice(&message);
                }
                Err(e) => {
                    eprintln!("[MIGRATE] Error reading pg_dump output: {}", e);
                }
                _ => {}
            }
        }
    }
    
    // Limpiar contenedor temporal
    println!("[MIGRATE] Cleaning up temporary dump container...");
    let _ = docker.remove_container(&dump_container_name, Some(RemoveContainerOptions {
        force: true,
        ..Default::default()
    })).await;
    
    // Verificar que obtuvimos datos
    if dump_output.is_empty() {
        let stderr = String::from_utf8_lossy(&dump_stderr);
        return Err(format!("pg_dump produced no output. Error: {}", stderr));
    }
    
    // Escribir el dump al archivo
    fs::write(&dump_path, &dump_output)
        .map_err(|e| format!("Failed to write dump file: {}", e))?;
    
    println!("[MIGRATE] Dump created successfully: {} bytes", dump_output.len());
    
    // 2. Buscar puerto disponible
    let mut port = 5544;
    let containers = docker.list_containers(Some(ListContainersOptions::<String> {
        all: true,
        ..Default::default()
    })).await.map_err(|e| format!("Failed to list containers: {}", e))?;
    
    let used_ports: Vec<u16> = containers.iter()
        .filter_map(|c| {
            c.ports.as_ref()?.iter()
                .filter_map(|p| p.public_port.map(|port| port as u16))
                .next()
        })
        .collect();
    
    while used_ports.contains(&port) {
        port += 1;
    }
    
    println!("[MIGRATE] Using port: {}", port);
    
    // 3. Crear contenedor Docker con la misma versión de PostgreSQL
    let container_name = format!("migrated-{}", database_name);
    
    // Usar la misma versión de postgres que el servidor local
    let image = postgres_image.clone();
    
    // Pull image si no existe (puede que ya esté de la etapa de dump, pero por si acaso)
    println!("[MIGRATE] Pulling image: {}", image);
    let mut stream = docker.create_image(
        Some(CreateImageOptions {
            from_image: image.as_str(),
            ..Default::default()
        }),
        None,
        None,
    );
    
    while let Some(_) = stream.next().await {}
    
    // Crear volumen Docker persistente
    let volume_name = format!("{}_data", container_name);
    
    println!("[MIGRATE] Creating container with volume: {}", volume_name);
    
    let container_json = json!({
        "Image": image,
        "Env": [
            format!("POSTGRES_USER={}", config.user),
            format!("POSTGRES_PASSWORD={}", config.password),
            format!("POSTGRES_DB={}", database_name)
        ],
        "ExposedPorts": {"5432/tcp": {}},
        "HostConfig": {
            "PortBindings": {
                "5432/tcp": [{"HostPort": port.to_string(), "HostIp": "0.0.0.0"}]
            },
            "Binds": [
                format!("{}:/var/lib/postgresql/data", volume_name)
            ]
        },
        "Labels": {
            "app": "docker-db-manager",
            "database_name": database_name.clone(),
            "db_type": "postgresql",
            "db_icon": "🐘",
            "migrated": "true",
            "original_source": "local",
            "volume": volume_name.clone()
        }
    });
    
    let container_config: Config<String> = serde_json::from_value(container_json)
        .map_err(|e| format!("Failed to create config: {}", e))?;
    
    let container = docker.create_container(
        Some(CreateContainerOptions {
            name: container_name.clone(),
            ..Default::default()
        }),
        container_config,
    ).await.map_err(|e| format!("Failed to create container: {}", e))?;
    
    println!("[MIGRATE] Container created: {}", container.id);
    
    // Iniciar contenedor
    docker.start_container(&container.id, None::<StartContainerOptions<String>>)
        .await.map_err(|e| format!("Failed to start container: {}", e))?;
    
    println!("[MIGRATE] Container started, waiting for PostgreSQL to be ready...");
    
    // Esperar a que PostgreSQL esté listo (con retries usando docker exec)
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
    
    // Verificar que PostgreSQL está listo usando docker exec
    let mut retries = 0;
    let max_retries = 15;
    loop {
        let exec = docker.create_exec(
            &container.id,
            CreateExecOptions {
                cmd: Some(vec!["pg_isready", "-U", &config.user]),
                attach_stdout: Some(true),
                attach_stderr: Some(true),
                ..Default::default()
            }
        ).await;
        
        if let Ok(exec) = exec {
            if let Ok(start_exec) = docker.start_exec(&exec.id, None).await {
                if let StartExecResults::Attached { mut output, .. } = start_exec {
                    let mut success = false;
                    while let Some(msg) = output.next().await {
                        if let Ok(bollard::container::LogOutput::StdOut { .. }) = msg {
                            success = true;
                            break;
                        }
                    }
                    if success {
                        println!("[MIGRATE] PostgreSQL is ready!");
                        break;
                    }
                }
            }
        }
        
        retries += 1;
        if retries >= max_retries {
            return Err("PostgreSQL did not become ready in time".to_string());
        }
        println!("[MIGRATE] Waiting for PostgreSQL... ({}/{})", retries, max_retries);
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    }
    
    // 4. Restaurar dump en el nuevo contenedor
    println!("[MIGRATE] Restoring dump to new container...");
    
    // Copiar el archivo dump al contenedor usando docker cp
    // Primero, necesitamos usar el API de Docker para copiar el archivo
    use tokio::fs::File;
    use tokio::io::AsyncReadExt;
    
    let mut dump_file = File::open(&dump_path).await
        .map_err(|e| format!("Failed to open dump file: {}", e))?;
    
    let mut dump_content_bytes = Vec::new();
    dump_file.read_to_end(&mut dump_content_bytes).await
        .map_err(|e| format!("Failed to read dump file: {}", e))?;
    
    // Usar tar para crear un archivo que podamos copiar al contenedor
    use flate2::write::GzEncoder;
    use flate2::Compression;
    
    
    let mut tar_gz = Vec::new();
    {
        let enc = GzEncoder::new(&mut tar_gz, Compression::default());
        let mut tar = tar::Builder::new(enc);
        
        let mut header = tar::Header::new_gnu();
        header.set_path("dump.sql").map_err(|e| format!("Failed to set path: {}", e))?;
        header.set_size(dump_content_bytes.len() as u64);
        header.set_mode(0o644);
        header.set_cksum();
        
        tar.append(&header, &dump_content_bytes[..])
            .map_err(|e| format!("Failed to append to tar: {}", e))?;
        
        tar.finish().map_err(|e| format!("Failed to finish tar: {}", e))?;
    }
    
    // Copiar al contenedor
    docker.upload_to_container(
        &container.id,
        Some(bollard::container::UploadToContainerOptions {
            path: "/tmp".to_string(),
            ..Default::default()
        }),
        tar_gz.into(),
    ).await.map_err(|e| format!("Failed to upload dump to container: {}", e))?;
    
    println!("[MIGRATE] Dump file copied to container");
    
    // Ahora ejecutar psql para restaurar el dump
    let restore_exec = docker.create_exec(
        &container.id,
        CreateExecOptions {
            cmd: Some(vec![
                "psql",
                "-U",
                &config.user,
                "-d",
                &database_name,
                "-f",
                "/tmp/dump.sql"
            ]),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        }
    ).await.map_err(|e| format!("Failed to create restore exec: {}", e))?;
    
    let restore_start = docker.start_exec(&restore_exec.id, None).await
        .map_err(|e| format!("Failed to start restore: {}", e))?;
    
    let mut restore_stdout = String::new();
    let mut restore_stderr = String::new();
    
    if let StartExecResults::Attached { mut output, .. } = restore_start {
        // Leer la salida
        while let Some(msg) = output.next().await {
            match msg {
                Ok(bollard::container::LogOutput::StdOut { message }) => {
                    restore_stdout.push_str(&String::from_utf8_lossy(&message));
                }
                Ok(bollard::container::LogOutput::StdErr { message }) => {
                    restore_stderr.push_str(&String::from_utf8_lossy(&message));
                }
                Err(e) => eprintln!("[MIGRATE] Error reading restore output: {}", e),
                _ => {}
            }
        }
    }
    
    println!("[MIGRATE] Restore output:");
    println!("STDOUT: {}", restore_stdout);
    println!("STDERR: {}", restore_stderr);
    
    // Verificar si hubo errores críticos
    if restore_stderr.contains("FATAL") || restore_stderr.contains("could not connect") {
        return Err(format!("Restore failed with errors:\n{}", restore_stderr));
    }
    
    println!("[MIGRATE] Restore completed");
    
    // 5. Verificar que los datos se restauraron usando docker exec
    println!("[MIGRATE] Verifying data restoration...");
    let verify_exec = docker.create_exec(
        &container.id,
        CreateExecOptions {
            cmd: Some(vec![
                "psql",
                "-U",
                &config.user,
                "-d",
                &database_name,
                "-t",
                "-c",
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
            ]),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            ..Default::default()
        }
    ).await.map_err(|e| format!("Failed to create verification exec: {}", e))?;
    
    let verify_start = docker.start_exec(&verify_exec.id, None).await
        .map_err(|e| format!("Failed to start verification: {}", e))?;
    
    let mut verify_result = String::new();
    
    if let StartExecResults::Attached { mut output, .. } = verify_start {
        while let Some(msg) = output.next().await {
            if let Ok(bollard::container::LogOutput::StdOut { message }) = msg {
                verify_result.push_str(&String::from_utf8_lossy(&message));
            }
        }
    }
    
    println!("[MIGRATE] Verification - tables in public schema: {}", verify_result.trim());
    
    // 6. Limpiar archivo dump
    let _ = fs::remove_file(&dump_path);
    
    // 7. Guardar en tracking de migraciones
    let migrated_db = MigratedDatabase {
        original_name: database_name.clone(),
        container_id: container.id.clone(),
        container_name: container_name.clone(),
        migrated_at: chrono::Utc::now().to_rfc3339(),
        size: "Unknown".to_string(),
    };
    
    migration_state.migrated.lock().await.push(migrated_db);
    
    Ok(format!("Database '{}' migrated successfully to container '{}' on port {}", database_name, container_name, port))
}

#[tauri::command]
async fn get_migrated_databases(migration_state: State<'_, MigrationState>) -> Result<Vec<MigratedDatabase>, String> {
    let migrated = migration_state.migrated.lock().await;
    Ok(migrated.clone())
}

#[tauri::command]
async fn delete_original_database(
    config: LocalPostgresConfig,
    database_name: String,
) -> Result<String, String> {
    use tokio_postgres::NoTls;
    
    // Conectar a la base de datos postgres (no a la que vamos a eliminar)
    let connection_string = format!(
        "host={} port={} user={} password={} dbname=postgres",
        config.host, config.port, config.user, config.password
    );
    
    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls)
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;
    
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("Connection error: {}", e);
        }
    });
    
    // Primero terminar todas las conexiones a esa base de datos
    let terminate_query = format!(
        "SELECT pg_terminate_backend(pg_stat_activity.pid) \
         FROM pg_stat_activity \
         WHERE pg_stat_activity.datname = '{}' \
         AND pid <> pg_backend_pid()",
        database_name
    );
    
    client.execute(&terminate_query, &[])
        .await
        .map_err(|e| format!("Failed to terminate connections: {}", e))?;
    
    // Esperar un momento para que se cierren las conexiones
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // Ahora eliminar la base de datos
    let drop_query = format!("DROP DATABASE IF EXISTS \"{}\"", database_name);
    
    client.execute(&drop_query, &[])
        .await
        .map_err(|e| format!("Failed to drop database: {}", e))?;
    
    Ok(format!("Database '{}' deleted successfully", database_name))
}

#[tauri::command]
async fn remove_migrated_database(
    container_id: String,
    migration_state: State<'_, MigrationState>,
    docker_state: State<'_, AppState>,
) -> Result<String, String> {
    let docker = docker_state.docker.lock().await;
    
    // Detener y eliminar contenedor
    let _ = docker.stop_container(&container_id, None).await;
    
    docker.remove_container(
        &container_id,
        Some(RemoveContainerOptions {
            v: true,
            force: true,
            ..Default::default()
        }),
    ).await.map_err(|e| format!("Failed to remove container: {}", e))?;
    
    // Eliminar del tracking
    let mut migrated = migration_state.migrated.lock().await;
    migrated.retain(|db| db.container_id != container_id);
    
    Ok("Migrated database removed successfully".to_string())
}

// ==================== VOLUMES MANAGEMENT ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VolumeInfo {
    name: String,
    driver: String,
    mountpoint: String,
    created: String,
    size: String,
    in_use: bool,
    containers: Vec<String>,
}

#[tauri::command]
async fn list_volumes(docker_state: State<'_, AppState>) -> Result<Vec<VolumeInfo>, String> {
    let docker = docker_state.docker.lock().await;
    
    // Listar todos los volúmenes
    let volumes_response = docker
        .list_volumes::<String>(None)
        .await
        .map_err(|e| format!("Failed to list volumes: {}", e))?;
    
    // Listar todos los contenedores para ver qué volúmenes están en uso
    let containers = docker
        .list_containers(Some(ListContainersOptions::<String> {
            all: true,
            ..Default::default()
        }))
        .await
        .map_err(|e| format!("Failed to list containers: {}", e))?;
    
    let mut volume_infos = Vec::new();
    
    if let Some(volumes) = volumes_response.volumes {
        for volume in volumes {
            let volume_name = volume.name.clone();
            
            // Buscar qué contenedores usan este volumen
            let mut using_containers = Vec::new();
            for container in &containers {
                if let Some(mounts) = &container.mounts {
                    for mount in mounts {
                        if let Some(name) = &mount.name {
                            if name == &volume_name {
                                if let Some(container_name) = container.names.as_ref().and_then(|n| n.first()) {
                                    using_containers.push(container_name.trim_start_matches('/').to_string());
                                }
                            }
                        }
                    }
                }
            }
            
            // Calcular tamaño (aproximado basándose en el uso)
            let size = if let Some(usage_data) = &volume.usage_data {
                format_size(usage_data.size)
            } else {
                "Unknown".to_string()
            };
            
            volume_infos.push(VolumeInfo {
                name: volume_name,
                driver: volume.driver,
                mountpoint: volume.mountpoint,
                created: volume.created_at.unwrap_or_default(),
                size,
                in_use: !using_containers.is_empty(),
                containers: using_containers,
            });
        }
    }
    
    Ok(volume_infos)
}

#[tauri::command]
async fn remove_volume(
    volume_name: String,
    force: bool,
    docker_state: State<'_, AppState>,
) -> Result<String, String> {
    let docker = docker_state.docker.lock().await;
    
    use bollard::volume::RemoveVolumeOptions;
    
    docker
        .remove_volume(
            &volume_name,
            Some(RemoveVolumeOptions { force }),
        )
        .await
        .map_err(|e| format!("Failed to remove volume: {}", e))?;
    
    Ok(format!("Volume '{}' removed successfully", volume_name))
}

#[tauri::command]
async fn prune_volumes(docker_state: State<'_, AppState>) -> Result<String, String> {
    let docker = docker_state.docker.lock().await;
    
    use bollard::volume::PruneVolumesOptions;
    use std::collections::HashMap;
    
    let result = docker
        .prune_volumes(Some(PruneVolumesOptions::<String> {
            filters: HashMap::new(),
        }))
        .await
        .map_err(|e| format!("Failed to prune volumes: {}", e))?;
    
    let removed_count = result.volumes_deleted.as_ref().map(|v| v.len()).unwrap_or(0);
    let space_reclaimed = result.space_reclaimed.unwrap_or(0);
    
    Ok(format!(
        "Removed {} unused volumes, reclaimed {}",
        removed_count,
        format_size(space_reclaimed as i64)
    ))
}

#[tauri::command]
async fn backup_volume(
    volume_name: String,
    backup_path: String,
    docker_state: State<'_, AppState>,
) -> Result<String, String> {
    use bollard::container::{Config, CreateContainerOptions};
    
    let docker = docker_state.docker.lock().await;
    
    // Crear un contenedor temporal para hacer backup del volumen
    let container_name = format!("backup-{}", chrono::Utc::now().timestamp());
    
    let config = Config {
        image: Some("alpine:latest".to_string()),
        cmd: Some(vec![
            "tar".to_string(),
            "-czf".to_string(),
            "/backup/volume-backup.tar.gz".to_string(),
            "-C".to_string(),
            "/volume-data".to_string(),
            ".".to_string(),
        ]),
        host_config: Some(bollard::models::HostConfig {
            binds: Some(vec![
                format!("{}:/volume-data:ro", volume_name),
                format!("{}:/backup", backup_path),
            ]),
            ..Default::default()
        }),
        ..Default::default()
    };
    
    // Crear contenedor
    let container = docker
        .create_container(
            Some(CreateContainerOptions {
                name: container_name.clone(),
                ..Default::default()
            }),
            config,
        )
        .await
        .map_err(|e| format!("Failed to create backup container: {}", e))?;
    
    // Iniciar contenedor
    docker
        .start_container(&container.id, None::<StartContainerOptions<String>>)
        .await
        .map_err(|e| format!("Failed to start backup container: {}", e))?;
    
    // Esperar a que termine
    use bollard::container::WaitContainerOptions;
    let mut wait_stream = docker.wait_container(&container.id, None::<WaitContainerOptions<String>>);
    
    while let Some(wait_result) = wait_stream.next().await {
        if let Ok(result) = wait_result {
            if result.status_code != 0 {
                // Limpiar contenedor
                let _ = docker.remove_container(&container.id, None).await;
                return Err(format!("Backup failed with status code: {}", result.status_code));
            }
            break;
        }
    }
    
    // Limpiar contenedor temporal
    docker
        .remove_container(&container.id, Some(RemoveContainerOptions {
            force: true,
            ..Default::default()
        }))
        .await
        .map_err(|e| format!("Failed to remove backup container: {}", e))?;
    
    Ok(format!("Volume '{}' backed up successfully to {}/volume-backup.tar.gz", volume_name, backup_path))
}

#[tauri::command]
async fn restore_volume(
    volume_name: String,
    backup_file: String,
    docker_state: State<'_, AppState>,
) -> Result<String, String> {
    use bollard::container::{Config, CreateContainerOptions};
    use bollard::volume::CreateVolumeOptions;
    
    let docker = docker_state.docker.lock().await;
    
    // Crear el volumen si no existe
    let _ = docker
        .create_volume(CreateVolumeOptions {
            name: volume_name.clone(),
            ..Default::default()
        })
        .await;
    
    // Extraer directorio del archivo de backup
    let backup_dir = std::path::Path::new(&backup_file)
        .parent()
        .and_then(|p| p.to_str())
        .ok_or("Invalid backup file path")?
        .to_string();
    
    let backup_filename = std::path::Path::new(&backup_file)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid backup filename")?
        .to_string();
    
    // Crear contenedor temporal para restaurar
    let container_name = format!("restore-{}", chrono::Utc::now().timestamp());
    
    let config = Config {
        image: Some("alpine:latest".to_string()),
        cmd: Some(vec![
            "tar".to_string(),
            "-xzf".to_string(),
            format!("/backup/{}", backup_filename),
            "-C".to_string(),
            "/volume-data".to_string(),
        ]),
        host_config: Some(bollard::models::HostConfig {
            binds: Some(vec![
                format!("{}:/volume-data", volume_name),
                format!("{}:/backup:ro", backup_dir),
            ]),
            ..Default::default()
        }),
        ..Default::default()
    };
    
    // Crear contenedor
    let container = docker
        .create_container(
            Some(CreateContainerOptions {
                name: container_name.clone(),
                ..Default::default()
            }),
            config,
        )
        .await
        .map_err(|e| format!("Failed to create restore container: {}", e))?;
    
    // Iniciar contenedor
    docker
        .start_container(&container.id, None::<StartContainerOptions<String>>)
        .await
        .map_err(|e| format!("Failed to start restore container: {}", e))?;
    
    // Esperar a que termine
    use bollard::container::WaitContainerOptions;
    let mut wait_stream = docker.wait_container(&container.id, None::<WaitContainerOptions<String>>);
    
    while let Some(wait_result) = wait_stream.next().await {
        if let Ok(result) = wait_result {
            if result.status_code != 0 {
                // Limpiar contenedor
                let _ = docker.remove_container(&container.id, None).await;
                return Err(format!("Restore failed with status code: {}", result.status_code));
            }
            break;
        }
    }
    
    // Limpiar contenedor temporal
    docker
        .remove_container(&container.id, Some(RemoveContainerOptions {
            force: true,
            ..Default::default()
        }))
        .await
        .map_err(|e| format!("Failed to remove restore container: {}", e))?;
    
    Ok(format!("Volume '{}' restored successfully from {}", volume_name, backup_file))
}

// Helper function para formatear tamaños
fn format_size(bytes: i64) -> String {
    const KB: i64 = 1024;
    const MB: i64 = KB * 1024;
    const GB: i64 = MB * 1024;
    
    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

// ==================== MONITORING & STATS ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContainerStats {
    container_id: String,
    container_name: String,
    cpu_percentage: f64,
    memory_usage: u64,
    memory_limit: u64,
    memory_percentage: f64,
    network_rx_bytes: u64,
    network_tx_bytes: u64,
    block_read_bytes: u64,
    block_write_bytes: u64,
    timestamp: String,
}

#[tauri::command]
async fn get_container_stats(
    container_id: String,
    docker_state: State<'_, AppState>,
) -> Result<ContainerStats, String> {
    use bollard::container::StatsOptions;
    
    let docker = docker_state.docker.lock().await;
    
    // Obtener info del contenedor
    let container_info = docker
        .inspect_container(&container_id, None)
        .await
        .map_err(|e| format!("Failed to inspect container: {}", e))?;
    
    let container_name = container_info
        .name
        .unwrap_or_else(|| container_id.clone())
        .trim_start_matches('/')
        .to_string();
    
    // Obtener stats (stream=false para un solo snapshot)
    let mut stats_stream = docker.stats(
        &container_id,
        Some(StatsOptions {
            stream: false,
            one_shot: true,
        }),
    );
    
    if let Some(stats_result) = stats_stream.next().await {
        let stats = stats_result.map_err(|e| format!("Failed to get stats: {}", e))?;
        
        // Calcular CPU percentage
        let cpu_delta = stats.cpu_stats.cpu_usage.total_usage as f64
            - stats.precpu_stats.cpu_usage.total_usage as f64;
        let system_delta = stats.cpu_stats.system_cpu_usage.unwrap_or(0) as f64
            - stats.precpu_stats.system_cpu_usage.unwrap_or(0) as f64;
        let cpu_percentage = if system_delta > 0.0 && cpu_delta > 0.0 {
            let num_cpus = stats.cpu_stats.online_cpus.unwrap_or(1) as f64;
            (cpu_delta / system_delta) * num_cpus * 100.0
        } else {
            0.0
        };
        
        // Memory stats
        let memory_usage = stats.memory_stats.usage.unwrap_or(0);
        let memory_limit = stats.memory_stats.limit.unwrap_or(0);
        let memory_percentage = if memory_limit > 0 {
            (memory_usage as f64 / memory_limit as f64) * 100.0
        } else {
            0.0
        };
        
        // Network stats
        let (network_rx, network_tx) = if let Some(networks) = stats.networks {
            let rx: u64 = networks.values().map(|n| n.rx_bytes).sum();
            let tx: u64 = networks.values().map(|n| n.tx_bytes).sum();
            (rx, tx)
        } else {
            (0, 0)
        };
        
        // Block I/O stats
        let (block_read, block_write) = if let Some(io_stats) = stats.blkio_stats.io_service_bytes_recursive {
            let read: u64 = io_stats
                .iter()
                .filter(|s| s.op == "read" || s.op == "Read")
                .map(|s| s.value)
                .sum();
            let write: u64 = io_stats
                .iter()
                .filter(|s| s.op == "write" || s.op == "Write")
                .map(|s| s.value)
                .sum();
            (read, write)
        } else {
            (0, 0)
        };
        
        Ok(ContainerStats {
            container_id: container_id.clone(),
            container_name,
            cpu_percentage: (cpu_percentage * 100.0).round() / 100.0, // Redondear a 2 decimales
            memory_usage,
            memory_limit,
            memory_percentage: (memory_percentage * 100.0).round() / 100.0,
            network_rx_bytes: network_rx,
            network_tx_bytes: network_tx,
            block_read_bytes: block_read,
            block_write_bytes: block_write,
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    } else {
        Err("No stats available for container".to_string())
    }
}

#[tauri::command]
async fn get_all_containers_stats(
    docker_state: State<'_, AppState>,
) -> Result<Vec<ContainerStats>, String> {
    let docker = docker_state.docker.lock().await;
    
    // Listar todos los contenedores en ejecución
    let containers = docker
        .list_containers(Some(ListContainersOptions::<String> {
            all: false, // Solo contenedores en ejecución
            ..Default::default()
        }))
        .await
        .map_err(|e| format!("Failed to list containers: {}", e))?;
    
    drop(docker); // Liberar el lock
    
    let mut all_stats = Vec::new();
    
    for container in containers {
        if let Some(id) = &container.id {
            match get_container_stats(id.clone(), docker_state.clone()).await {
                Ok(stats) => all_stats.push(stats),
                Err(e) => {
                    eprintln!("Failed to get stats for container {}: {}", id, e);
                    // Continuar con los demás contenedores
                }
            }
        }
    }
    
    Ok(all_stats)
}

#[tauri::command]
async fn check_resource_alerts(
    cpu_threshold: f64,
    memory_threshold: f64,
    docker_state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let stats = get_all_containers_stats(docker_state).await?;
    
    let mut alerts = Vec::new();
    
    for stat in stats {
        if stat.cpu_percentage > cpu_threshold {
            alerts.push(format!(
                "⚠️ {} - High CPU usage: {:.2}%",
                stat.container_name, stat.cpu_percentage
            ));
        }
        
        if stat.memory_percentage > memory_threshold {
            alerts.push(format!(
                "⚠️ {} - High Memory usage: {:.2}%",
                stat.container_name, stat.memory_percentage
            ));
        }
    }
    
    Ok(alerts)
}

// ===== DOCKER COMPOSE INTEGRATION =====

/// Represents a Docker Compose service configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComposeService {
    pub image: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub container_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ports: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub environment: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub volumes: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub networks: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub restart: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub depends_on: Option<Vec<String>>,
}

/// Represents a Docker Compose configuration file
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComposeConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    pub services: HashMap<String, ComposeService>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub volumes: Option<HashMap<String, serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub networks: Option<HashMap<String, serde_json::Value>>,
}

/// Represents a Docker Compose project status
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComposeProject {
    pub name: String,
    pub services: Vec<ComposeServiceStatus>,
    pub created_at: String,
}

/// Represents the status of a compose service
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComposeServiceStatus {
    pub name: String,
    pub container_id: String,
    pub container_name: String,
    pub status: String,
    pub image: String,
}

/// Parse a docker-compose.yml file content
/// 
/// # Arguments
/// * `yaml_content` - The YAML content as a string
/// 
/// # Returns
/// * `Ok(ComposeConfig)` - Parsed compose configuration
/// * `Err(String)` - Error message if parsing fails
#[tauri::command]
async fn parse_compose_file(yaml_content: String) -> Result<ComposeConfig, String> {
    serde_yaml::from_str(&yaml_content)
        .map_err(|e| format!("Failed to parse compose file: {}", e))
}

/// Generate a docker-compose.yml content from existing containers
/// 
/// # Arguments
/// * `container_ids` - List of container IDs to include
/// * `docker_state` - Docker state
/// 
/// # Returns
/// * `Ok(String)` - Generated YAML content
/// * `Err(String)` - Error message if generation fails
#[tauri::command]
async fn generate_compose_from_containers(
    container_ids: Vec<String>,
    docker_state: State<'_, AppState>,
) -> Result<String, String> {
    let docker = docker_state.docker.lock().await;
    let mut services = HashMap::new();
    let mut volumes_set = std::collections::HashSet::new();

    for container_id in container_ids {
        let inspect = docker
            .inspect_container(&container_id, None)
            .await
            .map_err(|e| format!("Failed to inspect container {}: {}", container_id, e))?;

        let config = inspect.config.ok_or("Container config not found")?;
        let name = inspect.name.ok_or("Container name not found")?;
        let service_name = name.trim_start_matches('/').to_string();

        // Extract image
        let image = config.image.ok_or("Container image not found")?;

        // Extract ports
        let ports: Option<Vec<String>> = inspect.host_config.and_then(|hc| {
            hc.port_bindings.map(|pb| {
                pb.iter()
                    .filter_map(|(container_port, bindings)| {
                        bindings.as_ref().and_then(|b| {
                            b.first().and_then(|binding| {
                                binding.host_port.as_ref().map(|hp| {
                                    format!("{}:{}", hp, container_port)
                                })
                            })
                        })
                    })
                    .collect()
            })
        });

        // Extract environment variables
        let environment: Option<HashMap<String, String>> = config.env.map(|env_list| {
            env_list
                .iter()
                .filter_map(|env| {
                    let parts: Vec<&str> = env.splitn(2, '=').collect();
                    if parts.len() == 2 {
                        Some((parts[0].to_string(), parts[1].to_string()))
                    } else {
                        None
                    }
                })
                .collect()
        });

        // Extract volumes
        let volumes: Option<Vec<String>> = inspect.mounts.map(|mounts| {
            mounts
                .iter()
                .filter_map(|mount| {
                    if let (Some(source), Some(destination)) = (&mount.source, &mount.destination) {
                        // Track named volumes
                        if let Some(ref typ) = mount.typ {
                            if typ == &bollard::secret::MountPointTypeEnum::VOLUME {
                                if let Some(name) = &mount.name {
                                    volumes_set.insert(name.clone());
                                }
                            }
                        }
                        Some(format!("{}:{}", source, destination))
                    } else {
                        None
                    }
                })
                .collect()
        });

        let service = ComposeService {
            image,
            container_name: Some(service_name.clone()),
            ports,
            environment,
            volumes,
            networks: None,
            restart: Some("unless-stopped".to_string()),
            depends_on: None,
        };

        services.insert(service_name, service);
    }

    // Create volumes section
    let volumes = if !volumes_set.is_empty() {
        let mut vols = HashMap::new();
        for vol in volumes_set {
            vols.insert(vol, serde_json::json!({}));
        }
        Some(vols)
    } else {
        None
    };

    let compose_config = ComposeConfig {
        version: Some("3.8".to_string()),
        services,
        volumes,
        networks: None,
    };

    serde_yaml::to_string(&compose_config)
        .map_err(|e| format!("Failed to generate YAML: {}", e))
}

/// Deploy a docker-compose file
/// 
/// # Arguments
/// * `yaml_content` - The compose file content
/// * `project_name` - Name for the compose project
/// * `docker_state` - Docker state
/// 
/// # Returns
/// * `Ok(Vec<String>)` - List of created container IDs
/// * `Err(String)` - Error message if deployment fails
#[tauri::command]
async fn deploy_compose_file(
    yaml_content: String,
    project_name: String,
    docker_state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let compose_config: ComposeConfig = serde_yaml::from_str(&yaml_content)
        .map_err(|e| format!("Failed to parse compose file: {}", e))?;

    let docker = docker_state.docker.lock().await;
    let mut created_containers = Vec::new();

    // Create volumes first
    if let Some(volumes) = &compose_config.volumes {
        for volume_name in volumes.keys() {
            let full_volume_name = format!("{}_{}", project_name, volume_name);
            let volume_config = bollard::volume::CreateVolumeOptions {
                name: full_volume_name.clone(),
                driver: "local".to_string(),
                ..Default::default()
            };

            match docker.create_volume(volume_config).await {
                Ok(_) => println!("Created volume: {}", full_volume_name),
                Err(e) => {
                    // Volume might already exist, that's ok
                    println!("Volume creation note: {}", e);
                }
            }
        }
    }

    // Create networks first
    if let Some(networks) = &compose_config.networks {
        for network_name in networks.keys() {
            let full_network_name = format!("{}_{}", project_name, network_name);
            let network_config = bollard::network::CreateNetworkOptions {
                name: full_network_name.clone(),
                driver: "bridge".to_string(),
                ..Default::default()
            };

            match docker.create_network(network_config).await {
                Ok(_) => println!("Created network: {}", full_network_name),
                Err(e) => {
                    // Network might already exist, that's ok
                    println!("Network creation note: {}", e);
                }
            }
        }
    }

    // Deploy each service
    for (service_name, service_config) in &compose_config.services {
        // Pull image if needed
        let image = &service_config.image;
        println!("Pulling image: {}", image);
        
        let create_image_options = Some(CreateImageOptions {
            from_image: image.clone(),
            ..Default::default()
        });

        let mut stream = docker.create_image(create_image_options, None, None);
        while let Some(result) = stream.next().await {
            match result {
                Ok(_) => {},
                Err(e) => println!("Image pull note: {}", e),
            }
        }

        // Prepare container configuration
        let container_name = service_config
            .container_name
            .clone()
            .unwrap_or_else(|| format!("{}_{}", project_name, service_name));

        // Parse port bindings
        let mut port_bindings = HashMap::new();
        let mut exposed_ports = HashMap::new();
        
        if let Some(ports) = &service_config.ports {
            for port_mapping in ports {
                if let Some((host_port, container_port)) = port_mapping.split_once(':') {
                    let container_port_key = format!("{}/tcp", container_port);
                    exposed_ports.insert(container_port_key.clone(), HashMap::new());
                    port_bindings.insert(
                        container_port_key,
                        Some(vec![bollard::service::PortBinding {
                            host_ip: Some("0.0.0.0".to_string()),
                            host_port: Some(host_port.to_string()),
                        }]),
                    );
                }
            }
        }

        // Prepare environment variables
        let env: Option<Vec<String>> = service_config.environment.as_ref().map(|env_map| {
            env_map
                .iter()
                .map(|(k, v)| format!("{}={}", k, v))
                .collect()
        });

        // Prepare volumes (binds)
        let binds: Option<Vec<String>> = service_config.volumes.as_ref().map(|vols| {
            vols.iter()
                .map(|v| {
                    // Replace volume names with project-prefixed names
                    if let Some(volumes) = &compose_config.volumes {
                        for volume_name in volumes.keys() {
                            if v.starts_with(&format!("{}:", volume_name)) {
                                return v.replace(
                                    &format!("{}:", volume_name),
                                    &format!("{}_{}:", project_name, volume_name),
                                );
                            }
                        }
                    }
                    v.clone()
                })
                .collect()
        });

        // Prepare restart policy
        let restart_policy = service_config.restart.as_ref().map(|_r| {
            bollard::service::RestartPolicy {
                name: Some(bollard::service::RestartPolicyNameEnum::UNLESS_STOPPED),
                maximum_retry_count: None,
            }
        });

        // Create labels for compose tracking
        let mut labels = HashMap::new();
        labels.insert(
            "com.docker.compose.project".to_string(),
            project_name.clone(),
        );
        labels.insert(
            "com.docker.compose.service".to_string(),
            service_name.clone(),
        );

        let config = Config {
            image: Some(image.clone()),
            env,
            exposed_ports: if exposed_ports.is_empty() {
                None
            } else {
                Some(exposed_ports)
            },
            labels: Some(labels),
            host_config: Some(bollard::service::HostConfig {
                port_bindings: if port_bindings.is_empty() {
                    None
                } else {
                    Some(port_bindings)
                },
                binds,
                restart_policy,
                ..Default::default()
            }),
            ..Default::default()
        };

        // Create container
        let options = CreateContainerOptions {
            name: container_name.clone(),
            platform: None,
        };

        let container = docker
            .create_container(Some(options), config)
            .await
            .map_err(|e| format!("Failed to create container {}: {}", service_name, e))?;

        // Start container
        docker
            .start_container(&container.id, None::<StartContainerOptions<String>>)
            .await
            .map_err(|e| format!("Failed to start container {}: {}", service_name, e))?;

        created_containers.push(container.id);
        println!("Deployed service: {} ({})", service_name, container_name);
    }

    Ok(created_containers)
}

/// List all compose projects
/// 
/// # Arguments
/// * `docker_state` - Docker state
/// 
/// # Returns
/// * `Ok(Vec<ComposeProject>)` - List of compose projects
/// * `Err(String)` - Error message if listing fails
#[tauri::command]
async fn list_compose_projects(
    docker_state: State<'_, AppState>,
) -> Result<Vec<ComposeProject>, String> {
    let docker = docker_state.docker.lock().await;

    let mut filters = HashMap::new();
    filters.insert("label".to_string(), vec!["com.docker.compose.project".to_string()]);

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    let containers = docker
        .list_containers(options)
        .await
        .map_err(|e| format!("Failed to list containers: {}", e))?;

    let mut projects: HashMap<String, Vec<ComposeServiceStatus>> = HashMap::new();

    for container in containers {
        if let Some(labels) = container.labels {
            if let Some(project_name) = labels.get("com.docker.compose.project") {
                if let Some(service_name) = labels.get("com.docker.compose.service") {
                    let status = ComposeServiceStatus {
                        name: service_name.clone(),
                        container_id: container.id.clone().unwrap_or_default(),
                        container_name: container
                            .names
                            .and_then(|n| n.first().map(|s| s.trim_start_matches('/').to_string()))
                            .unwrap_or_default(),
                        status: container.state.unwrap_or_default(),
                        image: container.image.unwrap_or_default(),
                    };

                    projects
                        .entry(project_name.clone())
                        .or_insert_with(Vec::new)
                        .push(status);
                }
            }
        }
    }

    let compose_projects: Vec<ComposeProject> = projects
        .into_iter()
        .map(|(name, services)| ComposeProject {
            name,
            services,
            created_at: chrono::Utc::now().to_rfc3339(),
        })
        .collect();

    Ok(compose_projects)
}

/// Stop all containers in a compose project
/// 
/// # Arguments
/// * `project_name` - Name of the compose project
/// * `docker_state` - Docker state
/// 
/// # Returns
/// * `Ok(())` - Success
/// * `Err(String)` - Error message if stopping fails
#[tauri::command]
async fn stop_compose_project(
    project_name: String,
    docker_state: State<'_, AppState>,
) -> Result<(), String> {
    let docker = docker_state.docker.lock().await;

    let mut filters = HashMap::new();
    filters.insert(
        "label".to_string(),
        vec![format!("com.docker.compose.project={}", project_name)],
    );

    let options = Some(ListContainersOptions {
        all: false,
        filters,
        ..Default::default()
    });

    let containers = docker
        .list_containers(options)
        .await
        .map_err(|e| format!("Failed to list containers: {}", e))?;

    for container in containers {
        if let Some(id) = container.id {
            docker
                .stop_container(&id, None)
                .await
                .map_err(|e| format!("Failed to stop container {}: {}", id, e))?;
        }
    }

    Ok(())
}

/// Remove all containers in a compose project
/// 
/// # Arguments
/// * `project_name` - Name of the compose project
/// * `remove_volumes` - Whether to remove associated volumes
/// * `docker_state` - Docker state
/// 
/// # Returns
/// * `Ok(())` - Success
/// * `Err(String)` - Error message if removal fails
#[tauri::command]
async fn remove_compose_project(
    project_name: String,
    remove_volumes: bool,
    docker_state: State<'_, AppState>,
) -> Result<(), String> {
    let docker = docker_state.docker.lock().await;

    let mut filters = HashMap::new();
    filters.insert(
        "label".to_string(),
        vec![format!("com.docker.compose.project={}", project_name)],
    );

    let options = Some(ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    });

    let containers = docker
        .list_containers(options)
        .await
        .map_err(|e| format!("Failed to list containers: {}", e))?;

    // Stop and remove containers
    for container in containers {
        if let Some(id) = container.id {
            // Stop if running
            let _ = docker.stop_container(&id, None).await;

            // Remove container
            let remove_options = Some(RemoveContainerOptions {
                v: remove_volumes,
                force: true,
                ..Default::default()
            });

            docker
                .remove_container(&id, remove_options)
                .await
                .map_err(|e| format!("Failed to remove container {}: {}", id, e))?;
        }
    }

    // Remove project volumes if requested
    if remove_volumes {
        let volumes = docker
            .list_volumes::<String>(None)
            .await
            .map_err(|e| format!("Failed to list volumes: {}", e))?;

        if let Some(volumes_list) = volumes.volumes {
            for volume in volumes_list {
                if volume.name.starts_with(&format!("{}_", project_name)) {
                    let _ = docker.remove_volume(&volume.name, None).await;
                }
            }
        }

        // Remove project networks
        let networks = docker
            .list_networks::<String>(None)
            .await
            .map_err(|e| format!("Failed to list networks: {}", e))?;

        for network in networks {
            if let Some(name) = network.name {
                if name.starts_with(&format!("{}_", project_name)) {
                    let _ = docker.remove_network(&name).await;
                }
            }
        }
    }

    Ok(())
}
