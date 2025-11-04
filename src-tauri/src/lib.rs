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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub name: String,
    pub username: String,
    pub password: String,
    pub port: u16,
    pub version: String,
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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub message: String,
}

pub struct AppState {
    docker: Mutex<Docker>,
}

#[tauri::command]
async fn check_docker(state: State<'_, AppState>) -> Result<bool, String> {
    let docker = state.docker.lock().await;
    docker.ping().await.map(|_| true).map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_containers(state: State<'_, AppState>) -> Result<Vec<ContainerInfo>, String> {
    let docker = state.docker.lock().await;
    let mut filters = HashMap::new();
    filters.insert("label".to_string(), vec!["app=postgres-manager".to_string()]);
    
    let containers = docker.list_containers(Some(ListContainersOptions::<String> { all: true, filters, ..Default::default() }))
        .await.map_err(|e| e.to_string())?;

    Ok(containers.iter().map(|c| {
        let name = c.names.as_ref().and_then(|n| n.first()).map(|n| n.trim_start_matches('/').to_string()).unwrap_or_default();
        let port = c.ports.as_ref().and_then(|p| p.first()).and_then(|p| p.public_port).map(|p| p.to_string()).unwrap_or_default();
        let status = c.state.as_ref().unwrap_or(&"unknown".to_string()).clone();
        let created = chrono::DateTime::from_timestamp(c.created.unwrap_or(0), 0).map(|dt| dt.format("%Y-%m-%d %H:%M").to_string()).unwrap_or_default();
        let database_name = c.labels.as_ref().and_then(|l| l.get("database_name")).map(|s| s.clone()).unwrap_or_default();
        
        ContainerInfo { id: c.id.as_ref().unwrap_or(&String::new()).clone(), name, status, port, created, database_name }
    }).collect())
}

#[tauri::command]
async fn create_database(state: State<'_, AppState>, config: DatabaseConfig) -> Result<String, String> {
    let docker = state.docker.lock().await;
    let image = format!("postgres:{}", config.version);
    
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
    let container_name = format!("postgres-{}", config.name);
    for container in &containers {
        if let Some(names) = &container.names {
            for name in names {
                if name.trim_start_matches('/') == container_name {
                    return Err(format!("Ya existe un contenedor con el nombre '{}'", container_name));
                }
            }
        }
    }
    
    // Verificar si la imagen ya existe localmente
    let images = docker.list_images::<String>(None).await.map_err(|e| format!("Error listando imágenes: {}", e))?;
    let image_exists = images.iter().any(|img| {
        img.repo_tags.iter().any(|tag| tag == &image)
    });
    
    // Solo descargar la imagen si no existe
    if !image_exists {
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
    }
    
    let container_json = json!({
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
            "app": "postgres-manager", 
            "database_name": config.name.clone()
        }
    });
    
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
    
    Ok(format!("BD '{}' creada en puerto {}", config.name, config.port))
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let docker = Docker::connect_with_local_defaults().expect("Docker no disponible");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState { docker: Mutex::new(docker) })
        .invoke_handler(tauri::generate_handler![check_docker, list_containers, create_database, start_container, stop_container, restart_container, remove_container, get_logs, exec_sql, backup_db])
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
