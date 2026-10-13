#!/usr/bin/env bash
#
# One-time setup for a fresh EC2 instance running NeedleThreads.
#
# Copy this whole deploy/ folder to the server and run it once as root:
#
#   scp -i mykey.pem -r deploy ubuntu@<PUBLIC-IP>:~
#   ssh -i mykey.pem ubuntu@<PUBLIC-IP>
#
# (On Amazon Linux the login user is ec2-user instead of ubuntu.)
#   sudo bash deploy/setup-ec2.sh
#
# It installs Node.js and nginx, creates the service account and directories,
# and registers the app with systemd so it starts on boot. After this, use
# deploy/deploy.sh from your laptop to push code.
#
# Works on Amazon Linux 2023 and on Ubuntu 22.04/24.04.

# Bash "strict mode": stop on the first error (-e), stop on an undefined
# variable (-u), and make a failing command inside a pipeline fail the whole
# pipeline (-o pipefail).
set -euo pipefail

APP_NAME="needlethreads"
APP_DIR="/opt/needlethreads"
APP_USER="needlethreads"
NODE_MAJOR="20"

# The directory this script lives in, so it can find the files next to it no
# matter where it was called from.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# The human who ran `sudo`. They get write access to APP_DIR so that rsync from
# a laptop works without sudo on the far end.
DEPLOY_USER="${SUDO_USER:-root}"

# --- helpers ----------------------------------------------------------------

say() {
    printf '\n==> %s\n' "$1"
}

die() {
    printf 'ERROR: %s\n' "$1" >&2
    exit 1
}

# --- checks -----------------------------------------------------------------

[ "$(id -u)" -eq 0 ] || die "run this with sudo: sudo bash $0"

[ -r /etc/os-release ] || die "cannot read /etc/os-release; unsupported system"
# shellcheck disable=SC1091
. /etc/os-release

case "${ID:-}" in
    amzn|rhel|centos|fedora)
        PKG="dnf"
        ;;
    ubuntu|debian)
        PKG="apt"
        export DEBIAN_FRONTEND=noninteractive
        ;;
    *)
        die "unsupported distribution '${ID:-unknown}'; expected Amazon Linux or Ubuntu"
        ;;
esac

say "Detected ${PRETTY_NAME:-$ID} (package manager:$PKG)"

# --- packages ---------------------------------------------------------------

say "Installing Node.js ${NODE_MAJOR}, nginx, and SQLite3"

if [ "$PKG" = "dnf" ]; then
    dnf -y update
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    dnf -y install nodejs nginx rsync sqlite
else
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg rsync sqlite3
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs nginx
fi

say "Node $(node --version), npm$(npm --version)"

# --- service account and directories ----------------------------------------

say "Creating the '$APP_USER' service account"

if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"
else
    echo "user '$APP_USER' already exists, leaving it alone"
fi

say "Creating $APP_DIR and data directories"

mkdir -p "$APP_DIR/data"

# The deployment user owns code directory so rsync works from local laptop.
# The service account owns data directory so SQLite can read/write DB files.
chown -R "$DEPLOY_USER:$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/data"
chmod 750 "$APP_DIR"
chmod 770 "$APP_DIR/data"

# --- systemd ----------------------------------------------------------------

say "Installing the $APP_NAME systemd service"

if [ -f "$SCRIPT_DIR/needlethreads.service" ]; then
    install -m 644 "$SCRIPT_DIR/needlethreads.service" "/etc/systemd/system/${APP_NAME}.service"
    systemctl daemon-reload
    systemctl enable "$APP_NAME"
else
    die "Missing service file: $SCRIPT_DIR/needlethreads.service"
fi

# --- nginx ------------------------------------------------------------------

say "Configuring nginx as a reverse proxy on port 80"

if [ -f "$SCRIPT_DIR/nginx-needlethreads.conf" ]; then
    install -m 644 "$SCRIPT_DIR/nginx-needlethreads.conf" "/etc/nginx/conf.d/${APP_NAME}.conf"
else
    die "Missing Nginx config file: $SCRIPT_DIR/nginx-needlethreads.conf"
fi

# Remove default site on Ubuntu if present
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
fi

# Enable SELinux network connect for Amazon Linux / RHEL
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != "Disabled" ]; then
    setsebool -P httpd_can_network_connect 1 || true
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

# --- firewall ---------------------------------------------------------------

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
    say "Opening ports 80 and 22 in ufw"
    ufw allow 80/tcp
    ufw allow 22/tcp
fi

# --- done -------------------------------------------------------------------

cat <<EOF

==> Server setup complete!

The NeedleThreads application is registered with systemd but not running yet because no code has been deployed.

From your laptop, in the project folder, run:

    ./deploy/deploy.sh -h <PUBLIC-IP-OR-DNS> -i ~/path/to/key.pem

Then open http://<PUBLIC-IP> in a browser.

Handy management commands on this EC2 instance:
    sudo systemctl status $APP_NAME
    journalctl -u $APP_NAME -f
    sudo systemctl restart $APP_NAME

EOF