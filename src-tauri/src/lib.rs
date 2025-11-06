use bollard::container::{Config, CreateContainerOptions, ListContainersOptions, LogsOptions, RemoveContainerOptions, StartContainerOptions};
use bollard::exec::CreateExecOptions;
use bollard::image::CreateImageOptions;
use bollard::Docker;
use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
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
    let mut filters = HashMap::new();
    filters.insert("label".to_string(), vec!["app=db-manager".to_string()]);
    
    let containers = docker.list_containers(Some(ListContainersOptions::<String> { all: true, filters, ..Default::default() }))
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
    let container_json = match config.db_type {
        DatabaseType::PostgreSQL => {
            json!({
                "Image": image,
                "Env": [
                    format!("POSTGRES_USER={}", config.username), 
                    format!("POSTGRES_PASSWORD={}", config.password), 
                    format!("POSTGRES_DB={}", config.name)
                ],
                "ExposedPorts": {"5432/tcp": {}},
                "HostConfig": {
                    "PortBindings": {
                        "5432/tcp": [{"HostPort": config.port.to_string(), "HostIp": "0.0.0.0"}]
                    }
                },
                "Labels": {
                    "app": "db-manager", 
                    "database_name": config.name.clone(),
                    "db_type": config.db_type.to_string(),
                    "db_icon": config.db_type.get_icon()
                }
            })
        },
        DatabaseType::MySQL => {
            json!({
                "Image": image,
                "Env": [
                    format!("MYSQL_ROOT_PASSWORD={}", config.password),
                    format!("MYSQL_DATABASE={}", config.name),
                    format!("MYSQL_USER={}", config.username),
                    format!("MYSQL_PASSWORD={}", config.password),
                ],
                "ExposedPorts": {"3306/tcp": {}},
                "HostConfig": {
                    "PortBindings": {
                        "3306/tcp": [{"HostPort": config.port.to_string(), "HostIp": "0.0.0.0"}]
                    }
                },
                "Labels": {
                    "app": "db-manager",
                    "database_name": config.name.clone(),
                    "db_type": config.db_type.to_string(),
                    "db_icon": config.db_type.get_icon()
                }
            })
        },
        DatabaseType::MariaDB => {
            json!({
                "Image": image,
                "Env": [
                    format!("MARIADB_ROOT_PASSWORD={}", config.password),
                    format!("MARIADB_DATABASE={}", config.name),
                    format!("MARIADB_USER={}", config.username),
                    format!("MARIADB_PASSWORD={}", config.password),
                ],
                "ExposedPorts": {"3306/tcp": {}},
                "HostConfig": {
                    "PortBindings": {
                        "3306/tcp": [{"HostPort": config.port.to_string(), "HostIp": "0.0.0.0"}]
                    }
                },
                "Labels": {
                    "app": "db-manager",
                    "database_name": config.name.clone(),
                    "db_type": config.db_type.to_string(),
                    "db_icon": config.db_type.get_icon()
                }
            })
        },
        DatabaseType::MongoDB => {
            let env = if !config.username.is_empty() && !config.password.is_empty() {
                vec![
                    format!("MONGO_INITDB_ROOT_USERNAME={}", config.username),
                    format!("MONGO_INITDB_ROOT_PASSWORD={}", config.password),
                    format!("MONGO_INITDB_DATABASE={}", config.name),
                ]
            } else {
                vec![]
            };
            
            json!({
                "Image": image,
                "Env": env,
                "ExposedPorts": {"27017/tcp": {}},
                "HostConfig": {
                    "PortBindings": {
                        "27017/tcp": [{"HostPort": config.port.to_string(), "HostIp": "0.0.0.0"}]
                    }
                },
                "Labels": {
                    "app": "db-manager",
                    "database_name": config.name.clone(),
                    "db_type": config.db_type.to_string(),
                    "db_icon": config.db_type.get_icon()
                }
            })
        },
        DatabaseType::Redis => {
            let cmd = if !config.password.is_empty() {
                vec!["redis-server", "--requirepass", &config.password]
            } else {
                vec!["redis-server"]
            };
            
            json!({
                "Image": image,
                "Cmd": cmd,
                "ExposedPorts": {"6379/tcp": {}},
                "HostConfig": {
                    "PortBindings": {
                        "6379/tcp": [{"HostPort": config.port.to_string(), "HostIp": "0.0.0.0"}]
                    }
                },
                "Labels": {
                    "app": "db-manager",
                    "database_name": config.name.clone(),
                    "db_type": config.db_type.to_string(),
                    "db_icon": config.db_type.get_icon()
                }
            })
        },
    };
    
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let docker = connect_docker().expect("Docker no disponible. Por favor, inicia Docker Desktop y vuelve a intentar.");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState { docker: Mutex::new(docker) })
        .manage(MigrationState { migrated: Mutex::new(Vec::new()) })
        .invoke_handler(tauri::generate_handler![
            check_docker, 
            get_database_types, 
            list_containers,
            list_images,
            remove_image,
            create_database, 
            start_container, 
            stop_container, 
            restart_container, 
            remove_container, 
            get_logs, 
            exec_sql, 
            backup_db,
            detect_local_postgres,
            connect_local_postgres,
            list_local_databases,
            migrate_database,
            get_migrated_databases,
            remove_migrated_database
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
    use std::process::Command;
    use std::fs;
    
    let docker = docker_state.docker.lock().await;
    
    // 1. Crear dump de la base de datos local
    let dump_path = format!("/tmp/{}_dump.sql", database_name);
    
    println!("Creating dump of database: {}", database_name);
    
    let dump_output = Command::new("pg_dump")
        .arg("-h")
        .arg(&config.host)
        .arg("-p")
        .arg(config.port.to_string())
        .arg("-U")
        .arg(&config.user)
        .arg("-d")
        .arg(&database_name)
        .arg("-F")
        .arg("c")
        .arg("-f")
        .arg(&dump_path)
        .env("PGPASSWORD", &config.password)
        .output()
        .map_err(|e| format!("Failed to create dump: {}", e))?;
    
    if !dump_output.status.success() {
        return Err(format!("pg_dump error: {}", String::from_utf8_lossy(&dump_output.stderr)));
    }
    
    println!("Dump created successfully at: {}", dump_path);
    
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
    
    println!("Using port: {}", port);
    
    // 3. Crear contenedor Docker
    let container_name = format!("migrated-{}", database_name);
    let image = "postgres:15";
    
    // Pull image si no existe
    println!("Pulling image: {}", image);
    let mut stream = docker.create_image(
        Some(CreateImageOptions {
            from_image: image,
            ..Default::default()
        }),
        None,
        None,
    );
    
    while let Some(_) = stream.next().await {}
    
    // Crear contenedor
    // Crear volumen Docker persistente
    let volume_name = format!("{}_data", container_name);
    
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
            "migrated": "true",
            "original_source": "local",
            "volume": volume_name.clone()
        }
    });
    
    println!("Creating container with persistent volume: {}", volume_name);
    
    let container_config: Config<String> = serde_json::from_value(container_json)
        .map_err(|e| format!("Failed to create config: {}", e))?;
    
    let container = docker.create_container(
        Some(CreateContainerOptions {
            name: container_name.clone(),
            ..Default::default()
        }),
        container_config,
    ).await.map_err(|e| format!("Failed to create container: {}", e))?;
    
    println!("Container created: {}", container.id);
    
    // Iniciar contenedor
    docker.start_container(&container.id, None::<StartContainerOptions<String>>)
        .await.map_err(|e| format!("Failed to start container: {}", e))?;
    
    println!("Container started, waiting for PostgreSQL to be ready...");
    
    // Esperar a que PostgreSQL esté listo
    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    
    // 4. Restaurar dump en el nuevo contenedor
    println!("Restoring dump to new container...");
    
    let restore_output = Command::new("pg_restore")
        .arg("-h")
        .arg("localhost")
        .arg("-p")
        .arg(port.to_string())
        .arg("-U")
        .arg(&config.user)
        .arg("-d")
        .arg(&database_name)
        .arg("--no-owner")
        .arg("--no-acl")
        .arg(&dump_path)
        .env("PGPASSWORD", &config.password)
        .output()
        .map_err(|e| format!("Failed to restore dump: {}", e))?;
    
    if !restore_output.status.success() {
        let stderr = String::from_utf8_lossy(&restore_output.stderr);
        // pg_restore puede tener warnings pero aún así funcionar
        if !stderr.contains("ERROR") {
            println!("Restore completed with warnings: {}", stderr);
        } else {
            return Err(format!("pg_restore error: {}", stderr));
        }
    }
    
    println!("Restore completed successfully");
    
    // 5. Limpiar archivo dump
    let _ = fs::remove_file(&dump_path);
    
    // 6. Guardar en tracking de migraciones
    let migrated_db = MigratedDatabase {
        original_name: database_name.clone(),
        container_id: container.id.clone(),
        container_name: container_name.clone(),
        migrated_at: chrono::Utc::now().to_rfc3339(),
        size: "Unknown".to_string(), // Se puede calcular después
    };
    
    migration_state.migrated.lock().await.push(migrated_db);
    
    Ok(format!("Database '{}' migrated successfully to container '{}'", database_name, container_name))
}

#[tauri::command]
async fn get_migrated_databases(migration_state: State<'_, MigrationState>) -> Result<Vec<MigratedDatabase>, String> {
    let migrated = migration_state.migrated.lock().await;
    Ok(migrated.clone())
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
