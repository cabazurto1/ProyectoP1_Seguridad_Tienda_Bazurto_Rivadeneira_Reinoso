#!/bin/bash
echo "Configuring primary for replication..."
echo "wal_level = replica" >> $PGDATA/postgresql.conf
echo "max_wal_senders = 3" >> $PGDATA/postgresql.conf
echo "hot_standby = on" >> $PGDATA/postgresql.conf
echo "host replication replicator 0.0.0.0/0 md5" >> $PGDATA/pg_hba.conf

psql -U postgres -c "CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replica_password';"
