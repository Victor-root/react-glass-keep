#!/bin/sh
# =============================================================================
#  GlassKeep — container entrypoint
#  - Fixes /data ownership on first run, drops to the 'node' user
#  - Persists an auto-generated JWT_SECRET in /data/.jwt_secret (if unset)
#  - Bootstraps the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD
#  - Exec's the server
# =============================================================================
set -eu

DATA_DIR="/data"
DB_FILE="${DB_FILE:-${DATA_DIR}/notes.db}"
export DB_FILE

# Fix permissions once, then re-exec as the unprivileged 'node' user.
if [ "$(id -u)" = "0" ]; then
    mkdir -p "$DATA_DIR"
    chown -R node:node "$DATA_DIR"

    # If the operator mounted the Docker socket (one-click self-update
    # from the admin panel), the unprivileged 'node' user needs to be in
    # the group that owns the socket on the host.
    #
    # Most hosts expose the socket as root:docker with a NON-ZERO docker
    # group GID (varies: 999/998/120/...), which we discover at runtime
    # and mirror into the container.
    #
    # Synology DSM / Container Manager (and some other NAS platforms)
    # expose it as root:root — GID 0, with no docker group at all. There
    # the only way to grant 'node' access without chmod-ing the shared
    # host inode is to add 'node' to the root *group* (GID 0). That is
    # acceptable here: mounting docker.sock already hands the container
    # full root-level control of the host, so group-0 membership inside
    # the container grants nothing the operator has not already opted
    # into by adding the mount.
    if [ -S /var/run/docker.sock ]; then
        DOCKER_SOCK_GID=$(stat -c %g /var/run/docker.sock 2>/dev/null || echo "")
        if [ -n "$DOCKER_SOCK_GID" ]; then
            EXISTING_GROUP=$(awk -F: -v gid="$DOCKER_SOCK_GID" '$3 == gid {print $1; exit}' /etc/group)
            if [ -z "$EXISTING_GROUP" ]; then
                echo "dockerhost:x:${DOCKER_SOCK_GID}:node" >> /etc/group
                echo "[entrypoint] docker.sock GID ${DOCKER_SOCK_GID}: created group 'dockerhost' with member 'node'"
            else
                # Append node to the existing group's member list if missing.
                if ! awk -F: -v g="$EXISTING_GROUP" '$1 == g {print $4}' /etc/group | grep -qw node; then
                    sed -i "s|^\(${EXISTING_GROUP}:[^:]*:[^:]*:\)\(.*\)$|\1\2,node|" /etc/group
                    # Clean up a stray leading comma if the member list was empty.
                    sed -i "s|^\(${EXISTING_GROUP}:[^:]*:[^:]*:\),|\1|" /etc/group
                fi
                echo "[entrypoint] docker.sock GID ${DOCKER_SOCK_GID}: granted 'node' access via group '${EXISTING_GROUP}'"
            fi
        fi
    fi

    exec gosu node "$0" "$@"
fi

# --- Persistent JWT secret ----------------------------------------------------
# The server refuses to start without JWT_SECRET. If the operator did not
# provide one, generate it once and reuse it across restarts / image upgrades
# so existing login sessions keep working.
if [ -z "${JWT_SECRET:-}" ]; then
    JWT_FILE="${DATA_DIR}/.jwt_secret"
    if [ ! -s "$JWT_FILE" ]; then
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > "$JWT_FILE"
        chmod 600 "$JWT_FILE"
        echo "[entrypoint] Generated JWT secret at $JWT_FILE"
    fi
    JWT_SECRET="$(cat "$JWT_FILE")"
    export JWT_SECRET
fi

# --- First-run admin bootstrap -----------------------------------------------
# If the DB has no users yet and ADMIN_EMAIL + ADMIN_PASSWORD are set,
# create the initial admin. Idempotent: skipped once any user exists.
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    node /app/server/bootstrap-admin.js || \
        echo "[entrypoint] Admin bootstrap failed — continuing startup." >&2
fi

# Make sure ADMIN_EMAILS includes ADMIN_EMAIL so the server keeps the
# account flagged as admin on every restart (harmless if already set).
if [ -n "${ADMIN_EMAIL:-}" ] && [ -z "${ADMIN_EMAILS:-}" ]; then
    export ADMIN_EMAILS="$ADMIN_EMAIL"
fi

exec "$@"
