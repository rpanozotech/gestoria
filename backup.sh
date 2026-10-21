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
# COPIA OFFSITE (recomendada): los volumenes backups_data, uploads_data y la
# BD viven en la MISMA maquina. Un `docker compose down -v`, un fallo de disco o
# un ransomware se lleva las tres cosas a la vez, backup incluido. Definir estas
# variables en Coolify sube cada backup a un bucket S3-compatible (Backblaze B2,
# AWS S3, Cloudflare R2, MinIO...) que ya no depende de este servidor:
#
#   S3_ENDPOINT=https://s3.eu-west-003.backblazeb2.com
#   S3_BUCKET=nexusgest-backups
#   S3_ACCESS_KEY_ID=...
#   S3_SECRET_ACCESS_KEY=...
#   S3_PREFIX=nexusgest           # opcional
#
# Sin ellas el script funciona igual y el backup se queda solo en local, pero
# entonces hay que aceptar que no protege de la perdida del servidor.
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

S3_BUCKET="${S3_BUCKET:-}"
S3_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-}"
S3_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-}"
S3_ENDPOINT="${S3_ENDPOINT:-https://s3.amazonaws.com}"
S3_PREFIX="${S3_PREFIX:-nexusgest}"

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
DUMP_FILENAME="nexusgest-${TIMESTAMP}.sql.gz"
DB_DUMP_TMP="${DUMP_FILENAME}.tmp"
UPLOADS_FILENAME="uploads-${TIMESTAMP}.tar.gz.tmp"

if [ ! -d "$UPLOADS_DIR" ]; then
  echo "ERROR: $UPLOADS_DIR no existe; no se puede crear un backup completo." >&2
  exit 1
fi

# pg_dump falla si no recibe contrasena y no hay PGPASSFILE ni .pgpass.
# Sin esto el backup fallaria en cuanto Postgres tenga password.
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD no esta definida}"
PGUSER_VALUE="${POSTGRES_USER:-nexusgest_user}"
PGDB_VALUE="${POSTGRES_DB:-nexusgest_db}"

mkdir -p "$BACKUP_DIR"
umask 077
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"; rm -f "$BACKUP_DIR/$DB_DUMP_TMP" "$BACKUP_DIR/$UPLOADS_FILENAME"' 0

# --- 1. Base de datos -------------------------------------------------
# Formato plano (NO -Fc): portable entre versiones de Postgres y
# restaurable con psql, no solo con pg_restore.
pg_dump -U "$PGUSER_VALUE" -d "$PGDB_VALUE" -f "$WORK_DIR/database.sql"

if [ ! -s "$WORK_DIR/database.sql" ] || [ "$(head -c 2 "$WORK_DIR/database.sql")" != "--" ]; then
  echo "ERROR: el backup de la BD esta vacio o corrupto (pg_dump no produjo nada)." >&2
  echo "       No se conserva. Revisar logs del contenedor postgres." >&2
  exit 1
fi

gzip -9 -c "$WORK_DIR/database.sql" > "$BACKUP_DIR/$DB_DUMP_TMP"
gzip -t "$BACKUP_DIR/$DB_DUMP_TMP"
mv "$BACKUP_DIR/$DB_DUMP_TMP" "$BACKUP_DIR/$DUMP_FILENAME"

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
fi

# --- 3. Copia offsite (opcional) --------------------------------------
# Si hay credenciales S3, se sube una copia fuera del servidor. Un fallo aqui
# NO es motivo para fallar el backup: la copia local ya esta escrita y es
# valida, asi que se avisa pero se sale con 0.
subir_a_s3() {
  archivo="$1"
  nombre="$(basename "$archivo")"
  destino="${S3_PREFIX}/${nombre}"

  # Firma AWS SigV4 con curl. Los buckets S3-compatibles (B2, R2, MinIO)
  # aceptan este mismo esquema.
  fecha="$(date -u +%Y%m%dT%H%M%SZ)"
  sello="$(date -u +%Y%m%d)"
  region="${S3_REGION:-us-east-1}"
  servicio="s3"
  host="$(echo "$S3_ENDPOINT" | sed -e 's|^https\?://||' -e 's|/$||')"
  suma="$(sha256sum "$archivo" | cut -d' ' -f1)"

  # Payload canonico para PUT (conexion vacia).
  canonico_cabeceras="host:${host}\nx-amz-content-sha256:${suma}\nx-amz-date:${fecha}\n"
  cadena_a_firmar="PUT\n/${destino}\n\n${canonico_cabeceras}\n${suma}"

  # Derivar clave con openssl si esta disponible; sin openssl no hay firma.
  if ! command -v openssl >/dev/null 2>&1; then
    echo "AVISO: openssl no disponible, se omite la copia offsite de $nombre" >&2
    return 0
  fi

  k_fecha="$(printf '%s' "$sello" | openssl dgst -sha256 -hmac "$S3_SECRET_ACCESS_KEY" -binary | openssl base64 -A)"
  k_region="$(printf '%s' "$region" | openssl dgst -sha256 -hmac "$k_fecha" -binary | openssl base64 -A)"
  k_servicio="$(printf '%s' "$servicio" | openssl dgst -sha256 -hmac "$k_region" -binary | openssl base64 -A)"

  # La firma se deriva de la cadena-a-firmar, y el encabezado Authorization se
  # monta con ella: ambos se calculan aqui, en este orden.
  k_firma="$(printf '%s' "$cadena_a_firmar" | openssl dgst -sha256 -hmac "$k_servicio" -binary | openssl base64 -A)"
  firma_fin="AWS4-HMAC-SHA256 Credential=${S3_ACCESS_KEY_ID}/${sello}/${region}/${servicio}/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${k_firma}"

  codigo="$(curl -s -o /dev/null -w '%{http_code}' -X PUT \
    -H "Host: ${host}" \
    -H "x-amz-content-sha256: ${suma}" \
    -H "x-amz-date: ${fecha}" \
    -H "Authorization: ${firma_fin}" \
    --data-binary "@${archivo}" \
    "${S3_ENDPOINT}/${destino}")"

  case "$codigo" in
    2*) echo "OK offsite: ${S3_ENDPOINT}/${destino}" ;;
    *)  echo "AVISO: la copia offsite de ${nombre} devolvio HTTP ${codigo} (sigue valido en local)" >&2 ;;
  esac
  return 0
}

if [ -n "$S3_BUCKET" ] && [ -n "$S3_ACCESS_KEY_ID" ] && [ -n "$S3_SECRET_ACCESS_KEY" ]; then
  echo "--- copia offsite a s3://${S3_BUCKET}/${S3_PREFIX}/ ---"
  # El bucket va en el Host (virtual-hosted style), que es lo que espera B2/R2/S3.
  S3_ENDPOINT="https://${S3_BUCKET}.${S3_ENDPOINT}"
  subir_a_s3 "$BACKUP_DIR/$DUMP_FILENAME"
  [ -f "$BACKUP_DIR/uploads-${TIMESTAMP}.tar.gz" ] && subir_a_s3 "$BACKUP_DIR/uploads-${TIMESTAMP}.tar.gz"
  unset S3_ENDPOINT
fi

# --- 4. Rotacion ------------------------------------------------------
# Borra los backups con mas de RETENTION_DAYS dias, de los dos tipos.
find "$BACKUP_DIR" \( -name 'nexusgest-*.sql.gz' -o -name 'uploads-*.tar.gz' \) \
  -type f -mtime "+$RETENTION_DAYS" -print -delete

# Los .tmp nunca deben quedar: son dumps a medio escribir.
find "$BACKUP_DIR" -name '*.tmp' -type f -print -delete