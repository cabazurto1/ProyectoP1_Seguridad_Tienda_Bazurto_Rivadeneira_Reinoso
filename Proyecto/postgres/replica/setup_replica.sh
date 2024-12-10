#!/bin/bash

# Esperar a que el primario esté disponible
echo "Esperando el primario..."
until pg_isready -h postgres_primary -U postgres; do
  echo "Esperando a que el primario esté listo..."
  sleep 2
done

# Crear el archivo standby.signal para habilitar el modo standby
echo "Creando archivo standby.signal para habilitar replicación..."
touch /var/lib/postgresql/data/standby.signal

# Configurar los parámetros de conexión al primario en postgresql.conf
echo "Configurando conexión al primario en postgresql.conf..."
echo "primary_conninfo = 'host=postgres_primary port=5432 user=postgres password=primary_password'" >> /var/lib/postgresql/data/postgresql.conf

# Asegurarse de que la base de datos se inicie en modo de replicación
echo "Configurando modo de replicación en postgresql.conf..."
echo "restore_command = 'cp /var/lib/postgresql/archive/%f %p'" >> /var/lib/postgresql/data/postgresql.conf
