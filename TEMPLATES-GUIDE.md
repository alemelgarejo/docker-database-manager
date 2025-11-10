# 📝 Database Templates Guide

## Overview

The Database Templates feature allows you to save, manage, and apply predefined configurations to your database containers. This ensures consistency across environments and speeds up database deployment.

## Features

### 1. Predefined Templates

The application comes with 4 built-in templates optimized for different use cases:

#### 💻 Local Development
- **Purpose**: Standard configuration for local development
- **Resources**: 256MB RAM, 1 CPU
- **Optimizations**: Balanced settings for development work
- **Best for**: Daily development tasks

#### 🧪 Testing Environment
- **Purpose**: Lightweight setup for automated testing and CI/CD
- **Resources**: 128MB RAM, 0.5 CPU
- **Optimizations**: Fast startup, reduced resource usage, disabled durability features
- **Best for**: Unit tests, integration tests, CI/CD pipelines

#### 🚀 Production Optimized
- **Purpose**: High-performance configuration for production workloads
- **Resources**: 2GB RAM, 2 CPUs
- **Optimizations**: Increased buffer pools, connection limits, write-ahead logs
- **Best for**: Production environments with moderate to high traffic

#### 🛡️ High Availability
- **Purpose**: Maximum reliability and performance
- **Resources**: 4GB RAM, 4 CPUs
- **Optimizations**: Large buffer pools, high connection limits, always restart policy
- **Best for**: Critical production systems requiring high availability

### 2. Custom Templates

Create your own templates with specific configurations:

- Define memory and CPU limits
- Set environment variables
- Configure restart policies
- Support multiple database types in one template

### 3. Template Management

- **View**: See detailed configuration for each template
- **Export**: Download templates as JSON files for backup or sharing
- **Import**: Load templates from JSON files
- **Edit**: Modify custom templates (predefined templates cannot be edited)
- **Delete**: Remove custom templates you no longer need

## How to Use

### Applying a Template During Database Creation

1. Click **"New Database"** button
2. Select your database type (PostgreSQL, MySQL, MongoDB, Redis, or MariaDB)
3. In the configuration step, select a template from the **"Template"** dropdown
4. The template's optimizations will be applied automatically when you create the database
5. You can still modify other settings like name, port, username, and password

### Creating a Custom Template

1. Go to the **"Templates"** tab
2. Click **"New Template"** button
3. Fill in the template details:
   - **Name**: Descriptive name for your template
   - **Description**: What this template is for
   - **Icon**: An emoji to represent the template
4. Add database configurations:
   - Click **"Add Database Configuration"**
   - Select database type
   - Set memory limit (e.g., "512m", "2g")
   - Set CPU limit (e.g., "1", "2", "0.5")
   - (Optional) Set restart policy
   - (Optional) Add environment variables as JSON
5. Click **"Save Template"**

### Exporting a Template

1. Go to the **"Templates"** tab
2. Find the template you want to export
3. Click the download icon button
4. A JSON file will be downloaded to your computer

### Importing a Template

1. Go to the **"Templates"** tab
2. Click **"Import"** button
3. Select a JSON template file from your computer
4. The template will be added to your custom templates

### Viewing Template Details

1. Go to the **"Templates"** tab
2. Find the template you want to view
3. Click the eye icon button
4. A modal will show all configurations including environment variables

### Editing a Custom Template

1. Go to the **"Templates"** tab
2. Find the custom template you want to edit
3. Click the edit icon button
4. Modify the configuration
5. Click **"Save Template"**

### Deleting a Custom Template

1. Go to the **"Templates"** tab
2. Find the custom template you want to delete
3. Click the trash icon button
4. Confirm the deletion

## Template Structure

Templates are stored as JSON with the following structure:

```json
{
  "id": "my-template",
  "name": "My Custom Template",
  "description": "Description of what this template does",
  "icon": "⭐",
  "category": "custom",
  "configurations": {
    "postgres": {
      "memory": "512m",
      "cpus": "1",
      "env": {
        "POSTGRES_SHARED_BUFFERS": "128MB",
        "POSTGRES_MAX_CONNECTIONS": "100"
      },
      "restartPolicy": "unless-stopped"
    },
    "mysql": {
      "memory": "512m",
      "cpus": "1",
      "env": {
        "MYSQL_INNODB_BUFFER_POOL_SIZE": "256M"
      }
    }
  }
}
```

## Environment Variables Reference

### PostgreSQL
- `POSTGRES_SHARED_BUFFERS`: Memory for shared buffer cache
- `POSTGRES_MAX_CONNECTIONS`: Maximum number of connections
- `POSTGRES_WORK_MEM`: Memory for sorting and queries
- `POSTGRES_EFFECTIVE_CACHE_SIZE`: Estimate of memory for caching
- `POSTGRES_MAINTENANCE_WORK_MEM`: Memory for maintenance operations
- `POSTGRES_CHECKPOINT_COMPLETION_TARGET`: Checkpoint completion target (0-1)
- `POSTGRES_WAL_BUFFERS`: Write-ahead log buffer size
- `POSTGRES_DEFAULT_STATISTICS_TARGET`: Statistics collection target

### MySQL
- `MYSQL_INNODB_BUFFER_POOL_SIZE`: InnoDB buffer pool size
- `MYSQL_MAX_CONNECTIONS`: Maximum number of connections
- `MYSQL_INNODB_LOG_FILE_SIZE`: InnoDB log file size
- `MYSQL_INNODB_FLUSH_METHOD`: InnoDB flush method (O_DIRECT, etc.)
- `MYSQL_INNODB_FLUSH_LOG_AT_TRX_COMMIT`: InnoDB log flush behavior (0, 1, 2)

### MongoDB
- `MONGO_CACHE_SIZE_GB`: WiredTiger cache size in GB

### Redis
- `REDIS_MAXMEMORY`: Maximum memory (e.g., "100mb")
- `REDIS_MAXMEMORY_POLICY`: Eviction policy (allkeys-lru, volatile-lru, etc.)
- `REDIS_SAVE`: Save intervals (e.g., "900 1 300 10")
- `REDIS_APPENDONLY`: Enable append-only file (yes/no)

### MariaDB
- `MARIADB_INNODB_BUFFER_POOL_SIZE`: InnoDB buffer pool size
- `MARIADB_MAX_CONNECTIONS`: Maximum number of connections

## Best Practices

1. **Start Small**: Use the Development template for local work and scale up as needed
2. **Test First**: Always test new configurations in a non-production environment
3. **Document Changes**: Add clear descriptions to custom templates
4. **Export Regularly**: Back up your custom templates by exporting them
5. **Share with Team**: Export and share templates with your team for consistency
6. **Monitor Performance**: After applying a template, monitor the database to ensure optimal performance
7. **Adjust as Needed**: Templates are starting points; fine-tune based on your specific needs

## Storage

- **Predefined templates**: Built into the application, cannot be modified
- **Custom templates**: Stored in browser's localStorage
- **Exported templates**: Saved as JSON files on your computer

## Troubleshooting

### Template not appearing in dropdown
- Make sure the template has a configuration for the selected database type
- Check if the template was saved successfully

### Template not applying configuration
- Verify the environment variables are correct
- Check browser console for any errors
- Ensure memory and CPU values are in correct format

### Cannot import template
- Verify the JSON file has the correct structure
- Make sure the file is not corrupted
- Check that environment variables are valid JSON objects

## Support

For issues or questions about templates, please check:
- Application logs for error messages
- Template JSON structure for correctness
- Database-specific documentation for environment variables

---

Made with ❤️ for Docker Database Manager
