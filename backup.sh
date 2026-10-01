#!/bin/sh
# =====================================================================
# NEXUSGEST - BACKUP DE POSTGRESQL Y UPLOADS
# =====================================================================
# Este script se ejecuta DENTRO del contenedor `postgres`, que es donde
# Coolify lanza los cron jobs. Por eso usa pg_dump directamente y NO
# `docker compose exec` / `docker cp`: dentro del contenedor no hay CLI
# de Docker ni socket montado.
#
# Para ejecutarlo a mano desde el host, con el stack ya levantado:
#   docker compose exec -e RETENTION_DAYS=14 postgres sh /backups/backup.sh
#
# Ambito: la BD tiene las fichas de clientes y expedientes, pero los PDFs
# que suben los clientes viven en uploads_data. Perder solo uno de los dos
# deja el CRM inutilizable, asi que se respaldan los dos.
#
# En Coolify: anadir un Cron Job en el resource apuntando al servicio
# `postgres`, con BACKUP_DIR=/backups (volumen backups_data).
#
# Restaurar la BD (DESTRUYE los datos actuales):
#   gunzip -c /backups/nexusgest-20261001-030000.sql.gz | \
#     docker compose exec -T postgres psql -U nexusgest_user -d nexusgest_db
#
# Restaurar los uploads:
#   docker compose cp /tmp/restore/. backend:/app/uploads/
# =====================================================================
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
# Volumen uploads_data montado en solo lectura dentro de postgres.
UPLOADS_DIR="${UPLOADS_DIR:-/app/uploads}"

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
DUMP_FILENAME="nexusgest-${TIMESTAMP}.sql.gz"
UPLOADS_FILENAME="uploads-${TIMESTAMP}.sql.gz.tmp"

# pg_dump falla si no recibe contrasena y no hay PGPASSFILE ni .pgpass.
# Sin esto el backup fallaria en cuanto Postgres tenga password.
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD no esta definida}"
PGUSER_VALUE="${POSTGRES_USER:-nexusgest_user}"
PGDB_VALUE="${POSTGRES_DB:-nexusgest_db}"

mkdir -p "$BACKUP_DIR"

# --- 1. Base de datos -------------------------------------------------
# Formato plano (NO -Fc): portable entre versiones de Postgres y
# restaurable con psql, no solo con pg_restore.
pg_dump -U "$PGUSER_VALUE" -d "$PGDB_VALUE" | gzip -9 > "$BACKUP_DIR/$DUMP_FILENAME"

# gzip sobre un stream vacio produce un fichero de 20 bytes (la cabecera
# gzip), NO uno de 0. Un `test -s` lo daria por bueno y restaurarlo dejaria
# la base de datos vacia sin avisar. Por eso se comprueba el contenido
# DESCOMPRIMIDO: un dump real de Postgres empieza por comentarios "--".
if [ "$(gunzip -c "$BACKUP_DIR/$DUMP_FILENAME" 2>/dev/null | head -c 2)" != "--" ]; then
  echo "ERROR: el backup de la BD esta vacio o corrupto (pg_dump no produjo nada)." >&2
  echo "       No se conserva. Revisar logs del contenedor postgres." >&2
  rm -f "${BACKUP_DIR:?}/${DUMP_FILENAME:?}"
  exit 1
fi

echo "OK: $BACKUP_DIR/$DUMP_FILENAME ($(du -h "$BACKUP_DIR/$DUMP_FILENAME" | cut -f1))"

# --- 2. Documentos de los clientes (uploads) --------------------------
# Un directorio de uploads VACIO es legitimo (si nadie ha subido nada), asi
# que aqui no se aplica el chequeo de "--" del dump: un tar.gz de un
# directorio vacio es valido y debe guardarse igual.
if [ -d "$UPLOADS_DIR" ]; then
  FILE_COUNT="$(find "$UPLOADS_DIR" -type f | wc -l)"
  tar czf "$BACKUP_DIR/$UPLOADS_FILENAME" -C "$UPLOADS_DIR" .
  gzip -t "$BACKUP_DIR/$UPLOADS_FILENAME"
  mv "$BACKUP_DIR/$UPLOADS_FILENAME" "$BACKUP_DIR/uploads-${TIMESTAMP}.tar.gz"
  echo "OK: $BACKUP_DIR/uploads-${TIMESTAMP}.tar.gz ($(du -h "$BACKUP_DIR/uploads-${TIMESTAMP}.tar.gz" | cut -f1), $FILE_COUNT ficheros)"
else
  echo "AVISO: $UPLOADS_DIR no existe. La BD si se ha respaldado." >&2
fi

# --- 3. Rotacion ------------------------------------------------------
# Borra los backups con mas de RETENTION_DAYS dias, de los dos tipos.
find "$BACKUP_DIR" \( -name 'nexusgest-*.sql.gz' -o -name 'uploads-*.tar.gz' \) \
  -type f -mtime "+$RETENTION_DAYS" -print -delete

# Los .tmp nunca deben quedar: son dumps a medio escribir.
find "$BACKUP_DIR" -name '*.tmp' -type f -print -delete