#!/usr/bin/env bash
# subdomain-manager.sh - add or delete Apache virtual hosts (Ubuntu/Debian).
#
# Proxy mode reverses-proxies to 127.0.0.1:3000 by default, which is the
# BeeProjects Node app. Static/PHP mode serves a normal document root.
# Configs are tagged with a marker so deletes cannot remove unrelated vhosts.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

MARKER="# Managed by BeeProjects subdomain-manager"
DEFAULT_PROXY_TARGET="http://127.0.0.1:3000"
MAX_BODY_BYTES="${MAX_BODY_BYTES:-12582912}"
WEB_OWNER="${WEB_OWNER:-www-data}"

APACHE_SITES_AVAILABLE="${APACHE_SITES_AVAILABLE:-/etc/apache2/sites-available}"
APACHE_SITES_ENABLED="${APACHE_SITES_ENABLED:-/etc/apache2/sites-enabled}"
APACHE_LOG_DIR="${APACHE_LOG_DIR:-/var/log/apache2}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/beeprojects-subdomains}"
LETSENCRYPT_LIVE_DIR="${LETSENCRYPT_LIVE_DIR:-/etc/letsencrypt/live}"
LETSENCRYPT_OPTIONS_FILE="${LETSENCRYPT_OPTIONS_FILE:-/etc/letsencrypt/options-ssl-apache.conf}"
APACHE_CTL="${APACHE_CTL:-}"
APACHE_SERVICE="${APACHE_SERVICE:-}"

umask 022

if [[ -t 1 ]]; then
	COLOR_RED=$'\033[31m'
	COLOR_GREEN=$'\033[32m'
	COLOR_YELLOW=$'\033[33m'
	COLOR_BOLD=$'\033[1m'
	COLOR_RESET=$'\033[0m'
else
	COLOR_RED=""
	COLOR_GREEN=""
	COLOR_YELLOW=""
	COLOR_BOLD=""
	COLOR_RESET=""
fi

info() {
	printf '%s[info]%s %s\n' "$COLOR_GREEN" "$COLOR_RESET" "$*"
}

warn() {
	printf '%s[warn]%s %s\n' "$COLOR_YELLOW" "$COLOR_RESET" "$*" >&2
}

die() {
	printf '%s[error]%s %s\n' "$COLOR_RED" "$COLOR_RESET" "$*" >&2
	exit 1
}

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/subdomain-manager.XXXXXX")"
cleanup() {
	rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT

COMMAND=""
DOMAIN=""
VHOST_TYPE=""
TARGET=""
DOCROOT=""
EMAIL=""
SSL_CHOICE=""
CREATE_INDEX=0
ASSUME_YES=0
FORCE=0
DELETE_CERT=0
DELETE_LOGS=0
DELETE_DOCROOT=0

SSL_ENABLED=0
LOG_DIR=""
HTTP_CONF=""
SSL_CONF=""
BACKUP_DIR=""
CERT_NAME=""
CERT_FILE=""
CERT_KEY=""

usage() {
	cat <<'EOF'
BeeProjects Apache subdomain manager (Ubuntu/Debian)

Usage:
  sudo ./scripts/subdomain-manager.sh add --domain app.example.com --type proxy [options]
  sudo ./scripts/subdomain-manager.sh add --domain blog.example.com --type static --docroot /var/www/blog/public_html [options]
  sudo ./scripts/subdomain-manager.sh delete --domain app.example.com [options]
  sudo ./scripts/subdomain-manager.sh

Running without a command opens an interactive menu.

Commands:
  add                     Create and enable an Apache virtual host
  delete                  Disable and remove a managed virtual host

Add options:
  --domain FQDN           Domain, e.g. app.example.com (required)
  --type TYPE             proxy (default), static, or php
  --target URL            Proxy target; must be loopback (default: http://127.0.0.1:3000)
  --docroot PATH          Static document root (default: /var/www/FQDN/public_html)
  --email EMAIL           Apache ServerAdmin and Certbot email
  --ssl                   Obtain/reuse a Let's Encrypt certificate and redirect HTTP to HTTPS
  --no-ssl                Keep the site on HTTP only
  --create-index          Create a placeholder index.html in a new static document root
  -y, --yes               Do not ask for confirmation

Delete options:
  --domain FQDN           Domain to delete (required unless prompted)
  --force                 Allow deleting a vhost without the management marker,
                          or a certificate that covers multiple domains
  --delete-cert           Delete the matching Let's Encrypt certificate
  --delete-logs           Delete /var/log/apache2/FQDN
  --delete-docroot        Delete the static document root (only paths under /var/www)
  -y, --yes               Do not ask for confirmation; optional cleanup defaults to "no"

Global options:
  -h, --help              Show this help

Safety:
  - Configs are backed up under /var/backups/beeprojects-subdomains.
  - apachectl configtest runs before and after changes; failed adds roll back.
  - /opt/BeeProjects is never accepted as a document root.
  - The Node app is never stopped or modified by this script.

Environment overrides:
  MAX_BODY_BYTES          Request body limit (default: 12582912 = 12 MiB)
  WEB_OWNER               Owner for newly created static docroots (default: www-data)
EOF
}

# ---------------------------------------------------------------------------
# Prompts and validation
# ---------------------------------------------------------------------------

have_tty() {
	[[ -t 0 ]]
}

prompt_value() {
	local __var="$1" text="$2" default="${3-}" input=""
	have_tty || die "Missing a required value and stdin is not a terminal; pass flags instead."
	read -r -p "$text" input || input=""
	printf -v "$__var" '%s' "${input:-$default}"
}

confirm_action() {
	local prompt="$1" answer=""
	if ((ASSUME_YES)); then
		return 0
	fi
	have_tty || die "Confirmation required; re-run with --yes in non-interactive mode."
	read -r -p "$prompt" answer || answer=""
	case "${answer,,}" in
	y | yes) return 0 ;;
	*) return 1 ;;
	esac
}

ask_optional() {
	local prompt="$1" answer=""
	if ((ASSUME_YES)); then
		return 1
	fi
	have_tty || return 1
	read -r -p "$prompt" answer || answer=""
	case "${answer,,}" in
	y | yes) return 0 ;;
	*) return 1 ;;
	esac
}

normalize_domain() {
	local raw="$1" last
	local -a parts=()

	raw="${raw,,}"
	raw="${raw%.}"
	[[ -n "$raw" ]] || die "Domain cannot be empty."
	((${#raw} <= 253)) || die "Domain is too long: $raw"

	if [[ ! "$raw" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]]; then
		die "Invalid domain: $raw"
	fi

	IFS=. read -r -a parts <<<"$raw"
	last="${parts[${#parts[@]} - 1]}"
	((${#parts[@]} >= 3)) || die "Use a subdomain FQDN such as app.example.com, not an apex domain."
	[[ "$last" =~ ^[0-9]+$ ]] && die "Invalid top-level domain in: $raw"
	((${#last} >= 2)) || die "Invalid top-level domain in: $raw"

	DOMAIN="$raw"
}

normalize_target() {
	local target="$1" port=""
	target="${target,,}"
	while [[ "$target" == */ ]]; do
		target="${target%/}"
	done

	if [[ ! "$target" =~ ^https?://(127\.0\.0\.1|localhost|\[::1\])(:([0-9]{1,5}))?$ ]]; then
		die "Proxy target must be a loopback URL such as http://127.0.0.1:3000 (got: $1)."
	fi
	if [[ -n "${BASH_REMATCH[3]:-}" ]]; then
		port="${BASH_REMATCH[3]}"
		((port >= 1 && port <= 65535)) || die "Invalid port in proxy target: $port"
	fi

	TARGET="$target/"
}

normalize_docroot() {
	local raw="$1" resolved=""
	[[ "$raw" == /* ]] || die "Document root must be an absolute path: $raw"
	resolved="$(readlink -m -- "$raw" 2>/dev/null || printf '%s' "$raw")"

	case "$resolved" in
	/ | /etc | /etc/* | /root | /root/* | /usr | /usr/* | /bin | /bin/* | \
		/sbin | /sbin/* | /lib | /lib/* | /lib64 | /lib64/* | /boot | /boot/* | \
		/proc | /proc/* | /sys | /sys/* | /dev | /dev/* | /run | /run/* | \
		/var/lib | /var/lib/* | /var/backups | /var/backups/*)
		die "Refusing unsafe document root: $resolved"
		;;
	esac

	case "$resolved" in
	/opt/BeeProjects | /opt/BeeProjects/*)
		die "Refusing to serve the BeeProjects application directory as a document root: $resolved"
		;;
	esac

	if [[ "$resolved" == "$REPO_ROOT" || "$resolved" == "$REPO_ROOT"/* ]]; then
		die "Refusing to serve the application repository as a document root: $resolved"
	fi

	if [[ -e "$resolved" && ! -d "$resolved" ]]; then
		die "Document root exists but is not a directory: $resolved"
	fi

	DOCROOT="$resolved"
}

normalize_email() {
	local email="$1"
	[[ -n "$email" ]] || die "An email address is required."
	if [[ ! "$email" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
		die "Invalid email address: $email"
	fi
	EMAIL="$email"
}

default_email_for() {
	local domain="$1"
	printf 'webmaster@%s' "${domain#*.}"
}

# ---------------------------------------------------------------------------
# Apache helpers
# ---------------------------------------------------------------------------

detect_apache() {
	if [[ -z "$APACHE_CTL" ]]; then
		APACHE_CTL="$(command -v apache2ctl || true)"
		if [[ -z "$APACHE_CTL" ]]; then
			APACHE_CTL="$(command -v apachectl || true)"
		fi
	fi
	[[ -n "$APACHE_CTL" && -x "$APACHE_CTL" ]] ||
		die "Apache was not found. This script targets apache2 on Ubuntu/Debian."
}

detect_apache_service() {
	if [[ -n "$APACHE_SERVICE" ]]; then
		return 0
	fi
	if command -v systemctl >/dev/null 2>&1; then
		if systemctl cat apache2.service >/dev/null 2>&1; then
			APACHE_SERVICE="apache2"
		elif systemctl cat httpd.service >/dev/null 2>&1; then
			APACHE_SERVICE="httpd"
		else
			APACHE_SERVICE="apache2"
		fi
	else
		APACHE_SERVICE="apache2"
	fi
}

apache_is_active() {
	if command -v systemctl >/dev/null 2>&1; then
		systemctl is-active --quiet "$APACHE_SERVICE" >/dev/null 2>&1
	elif command -v service >/dev/null 2>&1; then
		service "$APACHE_SERVICE" status >/dev/null 2>&1
	else
		return 1
	fi
}

reload_apache() {
	if ! apache_is_active; then
		warn "Apache is not running; skipping reload. Start it to apply the configuration."
		return 0
	fi

	if command -v systemctl >/dev/null 2>&1; then
		systemctl reload "$APACHE_SERVICE"
	elif command -v service >/dev/null 2>&1; then
		service "$APACHE_SERVICE" reload
	else
		warn "No service manager found; reload Apache manually."
		return 1
	fi
}

configtest_apache() {
	local output=""
	if output="$("$APACHE_CTL" configtest 2>&1)"; then
		info "Apache configuration is valid."
		return 0
	fi
	printf '%s\n' "$output" >&2
	return 1
}

apache_has_namevhost() {
	local domain="$1" escaped="${1//./\\.}" output=""
	output="$("$APACHE_CTL" -S 2>&1 || true)"
	grep -Eq "namevhost[[:space:]]+${escaped}([[:space:]]|$)" <<<"$output"
}

module_enabled() {
	local module="$1"
	if command -v a2query >/dev/null 2>&1; then
		a2query -m "$module" >/dev/null 2>&1
	else
		"$APACHE_CTL" -M 2>/dev/null | grep -q "${module}_module"
	fi
}

ensure_module() {
	local module="$1"
	module_enabled "$module" && return 0
	command -v a2enmod >/dev/null 2>&1 ||
		die "Apache module '$module' is not enabled. Run: sudo a2enmod $module"
	info "Enabling Apache module: $module"
	a2enmod -q "$module" || die "Could not enable Apache module: $module"
}

ensure_add_modules() {
	local -a modules=()
	if [[ "$VHOST_TYPE" == "proxy" ]]; then
		modules+=(proxy proxy_http headers)
	fi
	if ((SSL_ENABLED)); then
		modules+=(ssl socache_shmcb rewrite)
	fi
	local module
	for module in "${modules[@]}"; do
		ensure_module "$module"
	done
}

require_sites_layout() {
	[[ -d "$APACHE_SITES_AVAILABLE" ]] ||
		die "Apache sites-available directory not found: $APACHE_SITES_AVAILABLE"
	[[ -d "$APACHE_SITES_ENABLED" ]] ||
		die "Apache sites-enabled directory not found: $APACHE_SITES_ENABLED"
}

warn_dns() {
	local domain="$1" ips="" local_ips="" ip="" overlap=0
	if command -v getent >/dev/null 2>&1; then
		ips="$(getent ahostsv4 "$domain" 2>/dev/null | awk '{print $1}' | sort -u || true)"
		if [[ -z "$ips" ]]; then
			ips="$(getent ahosts "$domain" 2>/dev/null | awk '{print $1}' | sort -u || true)"
		fi
	fi
	if [[ -z "$ips" ]]; then
		warn "DNS: no A/AAAA record found for $domain. Point it at this server before requesting SSL."
		return 0
	fi

	local_ips="$(hostname -I 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | sort -u || true)"
	while IFS= read -r ip; do
		[[ -n "$ip" ]] || continue
		if grep -qxF -- "$ip" <<<"$local_ips"; then
			overlap=1
			break
		fi
	done <<<"$ips"

	if ((!overlap)); then
		warn "DNS: $domain resolves to $(tr '\n' ' ' <<<"$ips")but not to a local interface."
		warn "Continue only if this server is behind a proxy or CDN."
	fi
}

warn_port_80() {
	command -v ss >/dev/null 2>&1 || return 0
	if ! ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq ':(80|http)$'; then
		warn "Nothing appears to be listening on port 80. Let's Encrypt HTTP-01 validation may fail."
	fi
}

# ---------------------------------------------------------------------------
# Config rendering
# ---------------------------------------------------------------------------

render_proxy_body() {
	local scheme="$1"
	cat <<EOF
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass / $TARGET
    ProxyPassReverse / $TARGET

    RequestHeader set X-Forwarded-Host "$DOMAIN"
    RequestHeader set X-Forwarded-Proto "$scheme"
EOF
}

render_static_body() {
	cat <<EOF
    DocumentRoot $DOCROOT

    <Directory $DOCROOT>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
EOF
}

render_vhost_http() {
	cat <<EOF
$MARKER
# Domain: $DOMAIN
# Mode: $VHOST_TYPE
# Created: $(date -Is)
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAdmin $EMAIL

EOF
	if [[ "$VHOST_TYPE" == "proxy" ]]; then
		render_proxy_body "http"
	else
		render_static_body
	fi
	cat <<EOF

    LimitRequestBody $MAX_BODY_BYTES

    ErrorLog $LOG_DIR/error.log
    CustomLog $LOG_DIR/access.log combined
</VirtualHost>
EOF
}

render_vhost_ssl() {
	cat <<EOF
$MARKER
# Domain: $DOMAIN
# Mode: $VHOST_TYPE
# Created: $(date -Is)
<VirtualHost *:443>
    ServerName $DOMAIN
    ServerAdmin $EMAIL

EOF
	if [[ "$VHOST_TYPE" == "proxy" ]]; then
		render_proxy_body "https"
	else
		render_static_body
	fi
	cat <<EOF

    LimitRequestBody $MAX_BODY_BYTES

    ErrorLog $LOG_DIR/error.log
    CustomLog $LOG_DIR/access.log combined

    SSLEngine on
    SSLCertificateFile $CERT_FILE
    SSLCertificateKeyFile $CERT_KEY
    IncludeOptional $LETSENCRYPT_OPTIONS_FILE
</VirtualHost>
EOF
}

render_vhost_redirect() {
	cat <<EOF
$MARKER
# Domain: $DOMAIN
# Mode: redirect-to-https
# Created: $(date -Is)
<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAdmin $EMAIL

    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/
    RewriteRule ^ https://$DOMAIN%{REQUEST_URI} [R=301,L]

    ErrorLog $LOG_DIR/error.log
    CustomLog $LOG_DIR/access.log combined
</VirtualHost>
EOF
}

install_config() {
	local source="$1" destination="$2"
	install -m 644 -- "$source" "$destination" ||
		die "Could not write Apache config: $destination"
}

# ---------------------------------------------------------------------------
# Backups and certificates
# ---------------------------------------------------------------------------

make_backup_dir() {
	local label="$1" directory=""
	install -d -m 700 "$BACKUP_ROOT" || die "Could not create backup directory: $BACKUP_ROOT"
	directory="$BACKUP_ROOT/${DOMAIN}-${label}-$(date +%Y%m%d-%H%M%S)"
	install -d -m 700 "$directory" || die "Could not create backup directory: $directory"
	printf '%s\n' "$directory"
}

backup_vhost_files() {
	local -a files=("$@")
	local index=0 file saved enabled base
	: >"$BACKUP_DIR/manifest.tsv"
	for file in "${files[@]}"; do
		index=$((index + 1))
		base="$(basename -- "$file")"
		saved="$(printf '%03d-%s' "$index" "$base")"
		cp -a -- "$file" "$BACKUP_DIR/$saved" || die "Could not back up: $file"
		enabled=0
		if [[ -L "$APACHE_SITES_ENABLED/$base" || -e "$APACHE_SITES_ENABLED/$base" ]]; then
			enabled=1
		fi
		printf '%s\t%s\t%s\n' "$file" "$saved" "$enabled" >>"$BACKUP_DIR/manifest.tsv"
	done
	chmod 600 "$BACKUP_DIR"/* 2>/dev/null || true
}

restore_vhost_backup() {
	local directory="$1" original saved enabled base
	[[ -f "$directory/manifest.tsv" ]] || return 1
	while IFS=$'\t' read -r original saved enabled; do
		[[ -n "$original" && -f "$directory/$saved" ]] || continue
		install -d -m 755 "$(dirname -- "$original")" || return 1
		cp -a -- "$directory/$saved" "$original" || return 1
		if [[ "$enabled" == "1" && "$original" == "$APACHE_SITES_AVAILABLE"/* ]]; then
			base="$(basename -- "$original")"
			a2ensite -q "$base" >/dev/null 2>&1 || true
		fi
	done <"$directory/manifest.tsv"
}

cert_name_for_domain() {
	local domain="$1" name=""
	command -v certbot >/dev/null 2>&1 || return 1
	name="$(certbot certificates 2>/dev/null | awk -v wanted="$domain" '
		/^[[:space:]]*Certificate Name:/ { name = $3 }
		/^[[:space:]]*Domains:/ {
			for (i = 2; i <= NF; i++) {
				gsub(",", "", $i)
				if ($i == wanted) { print name; exit }
			}
		}
	')"
	[[ -n "$name" ]] || return 1
	printf '%s\n' "$name"
}

certificate_domains() {
	local name="$1"
	command -v certbot >/dev/null 2>&1 || return 0
	certbot certificates 2>/dev/null | awk -v wanted="$name" '
		/^[[:space:]]*Certificate Name:/ { current = $3 }
		/^[[:space:]]*Domains:/ {
			if (current == wanted) {
				for (i = 2; i <= NF; i++) {
					gsub(",", "", $i)
					print $i
				}
			}
		}
	'
}

cert_in_use() {
	local name="$1"
	grep -Rqs --include='*.conf' -e "$LETSENCRYPT_LIVE_DIR/$name/" \
		"$APACHE_SITES_AVAILABLE" "$APACHE_SITES_ENABLED" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Add
# ---------------------------------------------------------------------------

fail_add() {
	local reason="$1"
	warn "Add failed: $reason"
	warn "Rolling back the new virtual host..."

	if command -v a2dissite >/dev/null 2>&1; then
		a2dissite -q "$DOMAIN.conf" >/dev/null 2>&1 || true
		a2dissite -q "$DOMAIN-le-ssl.conf" >/dev/null 2>&1 || true
	fi
	rm -f -- "$HTTP_CONF" "$SSL_CONF" \
		"$APACHE_SITES_ENABLED/$DOMAIN.conf" \
		"$APACHE_SITES_ENABLED/$DOMAIN-le-ssl.conf" 2>/dev/null || true

	if configtest_apache; then
		reload_apache >/dev/null 2>&1 || true
	else
		warn "Apache still reports errors unrelated to this change; not reloading."
	fi
	die "The subdomain was not created. Fix the error above and retry."
}

resolve_add_options() {
	if [[ -z "$DOMAIN" ]]; then
		prompt_value DOMAIN "Domain (e.g. app.example.com): "
	fi
	normalize_domain "$DOMAIN"

	if [[ -z "$VHOST_TYPE" ]]; then
		if have_tty; then
			prompt_value VHOST_TYPE "Type [proxy/static] (proxy): " "proxy"
		else
			VHOST_TYPE="proxy"
		fi
	fi
	VHOST_TYPE="${VHOST_TYPE,,}"
	case "$VHOST_TYPE" in
	proxy) ;;
	static | php) VHOST_TYPE="static" ;;
	*) die "Invalid type '$VHOST_TYPE'. Use proxy or static." ;;
	esac

	if [[ "$VHOST_TYPE" == "proxy" ]]; then
		if [[ -n "$DOCROOT" ]]; then
			warn "Ignoring --docroot because this is a proxy vhost."
			DOCROOT=""
		fi
		if ((CREATE_INDEX)); then
			warn "Ignoring --create-index because this is a proxy vhost."
			CREATE_INDEX=0
		fi
		if [[ -z "$TARGET" ]]; then
			if have_tty; then
				prompt_value TARGET "Proxy target ($DEFAULT_PROXY_TARGET): " "$DEFAULT_PROXY_TARGET"
			else
				TARGET="$DEFAULT_PROXY_TARGET"
			fi
		fi
		normalize_target "$TARGET"
	else
		if [[ -n "$TARGET" ]]; then
			warn "Ignoring --target because this is a static vhost."
			TARGET=""
		fi
		if [[ -z "$DOCROOT" ]]; then
			local default_docroot="/var/www/$DOMAIN/public_html"
			if have_tty; then
				prompt_value DOCROOT "Document root ($default_docroot): " "$default_docroot"
			else
				DOCROOT="$default_docroot"
			fi
		fi
		normalize_docroot "$DOCROOT"
	fi

	if [[ -z "$SSL_CHOICE" ]]; then
		if have_tty; then
			local answer=""
			read -r -p "Issue Let's Encrypt SSL with certbot? (y/N): " answer || answer=""
			case "${answer,,}" in
			y | yes) SSL_CHOICE="yes" ;;
			*) SSL_CHOICE="no" ;;
			esac
		else
			SSL_CHOICE="no"
		fi
	fi
	case "$SSL_CHOICE" in
	yes) SSL_ENABLED=1 ;;
	no) SSL_ENABLED=0 ;;
	*) die "Invalid SSL choice: $SSL_CHOICE" ;;
	esac

	if [[ -z "$EMAIL" ]]; then
		EMAIL="$(default_email_for "$DOMAIN")"
	fi
	normalize_email "$EMAIL"

	[[ "$MAX_BODY_BYTES" =~ ^[0-9]+$ ]] ||
		die "MAX_BODY_BYTES must be a number: $MAX_BODY_BYTES"
	((MAX_BODY_BYTES > 0)) || die "MAX_BODY_BYTES must be greater than zero."
}

create_docroot() {
	if [[ -d "$DOCROOT" ]]; then
		return 0
	fi
	if [[ -e "$DOCROOT" ]]; then
		die "Document root exists but is not a directory: $DOCROOT"
	fi
	mkdir -p -- "$DOCROOT" || die "Could not create document root: $DOCROOT"
	info "Created document root: $DOCROOT"
	if id -u "$WEB_OWNER" >/dev/null 2>&1; then
		chown "$WEB_OWNER:$WEB_OWNER" "$DOCROOT" ||
			warn "Could not change owner of $DOCROOT to $WEB_OWNER."
	fi
}

create_placeholder_index() {
	local index="$DOCROOT/index.html"
	if [[ -e "$index" ]]; then
		warn "$index already exists; leaving it unchanged."
		return 0
	fi
	cat >"$index" <<EOF
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>$DOMAIN</title></head>
<body><h1>$DOMAIN is live</h1></body>
</html>
EOF
	if id -u "$WEB_OWNER" >/dev/null 2>&1; then
		chown "$WEB_OWNER:$WEB_OWNER" "$index" || true
	fi
}

print_add_summary() {
	local public_url="http://$DOMAIN"
	((SSL_ENABLED)) && public_url="https://$DOMAIN"

	printf '\n%sSubdomain ready%s\n' "$COLOR_BOLD" "$COLOR_RESET"
	printf '  URL:      %s\n' "$public_url"
	printf '  Config:   %s\n' "$HTTP_CONF"
	if ((SSL_ENABLED)); then
		printf '  HTTPS:    %s\n' "$SSL_CONF"
		printf '  Cert:     %s\n' "$CERT_NAME"
	fi
	if [[ "$VHOST_TYPE" == "proxy" ]]; then
		printf '  Proxies:  %s\n' "$TARGET"
	else
		printf '  Docroot:  %s\n' "$DOCROOT"
	fi
	printf '  Logs:     %s\n' "$LOG_DIR"
	if [[ -n "$BACKUP_DIR" ]]; then
		printf '  Backup:   %s\n' "$BACKUP_DIR"
	fi

	if [[ "$VHOST_TYPE" == "proxy" ]]; then
		printf '\nBeeProjects environment reminders:\n'
		printf '  ORIGIN=%s\n' "$public_url"
		printf '  PROTOCOL_HEADER=x-forwarded-proto\n'
		printf '  HOST_HEADER=x-forwarded-host\n'
		printf '  ADDRESS_HEADER=x-forwarded-for\n'
		printf '  XFF_DEPTH=1\n'
		printf '  BODY_SIZE_LIMIT=12M\n'
		printf '\nAfter editing %s/.env, run:\n' "$REPO_ROOT"
		printf '  sudo systemctl restart beeprojects\n'
		printf '  curl %s/health\n' "$public_url"
	fi

	printf '\nMake sure the DNS record for %s points at this server.\n' "$DOMAIN"
}

cmd_add() {
	require_root
	resolve_add_options

	detect_apache
	detect_apache_service
	require_sites_layout
	command -v a2ensite >/dev/null 2>&1 || die "a2ensite was not found."
	command -v a2dissite >/dev/null 2>&1 || die "a2dissite was not found."

	HTTP_CONF="$APACHE_SITES_AVAILABLE/$DOMAIN.conf"
	SSL_CONF="$APACHE_SITES_AVAILABLE/$DOMAIN-le-ssl.conf"
	LOG_DIR="$APACHE_LOG_DIR/$DOMAIN"

	if [[ -e "$HTTP_CONF" || -e "$SSL_CONF" ||
		-L "$APACHE_SITES_ENABLED/$DOMAIN.conf" ||
		-L "$APACHE_SITES_ENABLED/$DOMAIN-le-ssl.conf" ]]; then
		die "A virtual host for $DOMAIN already exists. Run delete first, or edit it manually."
	fi
	if apache_has_namevhost "$DOMAIN"; then
		die "$DOMAIN is already configured in another Apache virtual host (ServerName)."
	fi
	if [[ -n "$(find_alias_files "$DOMAIN")" ]]; then
		die "$DOMAIN is already configured as a ServerAlias in an Apache virtual host."
	fi

	if ((SSL_ENABLED)); then
		command -v certbot >/dev/null 2>&1 ||
			die "certbot was not found. Install it with: sudo apt install certbot python3-certbot-apache"
		apache_is_active ||
			die "Apache must be running before requesting a Let's Encrypt certificate."
		warn_port_80
	fi
	warn_dns "$DOMAIN"

	printf '\n%sAbout to add:%s\n' "$COLOR_BOLD" "$COLOR_RESET"
	printf '  Domain:   %s\n' "$DOMAIN"
	printf '  Type:     %s\n' "$VHOST_TYPE"
	if [[ "$VHOST_TYPE" == "proxy" ]]; then
		printf '  Target:   %s\n' "$TARGET"
	else
		printf '  Docroot:  %s\n' "$DOCROOT"
	fi
	printf '  Config:   %s\n' "$HTTP_CONF"
	printf '  SSL:      %s\n' "$( ((SSL_ENABLED)) && echo "yes (Let's Encrypt)" || echo no )"
	printf '  Email:    %s\n' "$EMAIL"
	confirm_action "Proceed? (y/N): " || die "Aborted."

	ensure_add_modules
	install -d -m 750 "$LOG_DIR" || die "Could not create log directory: $LOG_DIR"
	chown root:adm "$LOG_DIR" 2>/dev/null || true

	if [[ "$VHOST_TYPE" == "static" ]]; then
		create_docroot
		if ((CREATE_INDEX)); then
			create_placeholder_index
		fi
	fi

	render_vhost_http >"$TMP_DIR/http.conf"
	install_config "$TMP_DIR/http.conf" "$HTTP_CONF"

	if ! a2ensite -q "$DOMAIN.conf" >/dev/null; then
		fail_add "Could not enable $DOMAIN.conf"
	fi
	if ! configtest_apache; then
		fail_add "Apache configuration test failed"
	fi
	if ! reload_apache; then
		fail_add "Apache reload failed"
	fi
	info "HTTP virtual host enabled: http://$DOMAIN/"

	if ((SSL_ENABLED)); then
		BACKUP_DIR="$(make_backup_dir add)"
		cp -a -- "$HTTP_CONF" "$BACKUP_DIR/$DOMAIN.conf" ||
			fail_add "Could not back up the HTTP virtual host"
		info "HTTP config backed up to: $BACKUP_DIR"

		CERT_NAME="$(cert_name_for_domain "$DOMAIN" || true)"
		if [[ -z "$CERT_NAME" ]]; then
			info "Requesting a Let's Encrypt certificate for $DOMAIN..."
			if ! certbot certonly --apache -d "$DOMAIN" \
				--non-interactive --agree-tos --email "$EMAIL" \
				--keep-until-expiring; then
				fail_add "certbot could not obtain a certificate. Check DNS, port 80, and certbot logs."
			fi
			CERT_NAME="$(cert_name_for_domain "$DOMAIN" || true)"
		else
			info "Reusing existing certificate: $CERT_NAME"
		fi
		[[ -n "$CERT_NAME" ]] || CERT_NAME="$DOMAIN"

		CERT_FILE="$LETSENCRYPT_LIVE_DIR/$CERT_NAME/fullchain.pem"
		CERT_KEY="$LETSENCRYPT_LIVE_DIR/$CERT_NAME/privkey.pem"
		if [[ ! -f "$CERT_FILE" || ! -f "$CERT_KEY" ]]; then
			fail_add "Certificate files are missing for '$CERT_NAME'"
		fi

		render_vhost_ssl >"$TMP_DIR/ssl.conf"
		install_config "$TMP_DIR/ssl.conf" "$SSL_CONF"

		render_vhost_redirect >"$TMP_DIR/redirect.conf"
		install_config "$TMP_DIR/redirect.conf" "$HTTP_CONF"

		if ! a2ensite -q "$DOMAIN-le-ssl.conf" >/dev/null; then
			fail_add "Could not enable $DOMAIN-le-ssl.conf"
		fi
		if ! configtest_apache; then
			fail_add "Apache configuration test failed after enabling HTTPS"
		fi
		if ! reload_apache; then
			fail_add "Apache reload failed after enabling HTTPS"
		fi
		info "HTTPS virtual host enabled: https://$DOMAIN/"
	fi

	print_add_summary
}

# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

find_vhost_files() {
	local domain="$1" escaped="${1//./\\.}" file resolved
	local -a files=()
	local -A seen=()

	for file in \
		"$APACHE_SITES_AVAILABLE/$domain.conf" \
		"$APACHE_SITES_AVAILABLE/$domain-le-ssl.conf" \
		"$APACHE_SITES_ENABLED/$domain.conf" \
		"$APACHE_SITES_ENABLED/$domain-le-ssl.conf"; do
		[[ -e "$file" || -L "$file" ]] || continue
		resolved="$(readlink -f -- "$file" 2>/dev/null || printf '%s' "$file")"
		[[ -f "$resolved" ]] || continue
		if [[ -z "${seen[$resolved]:-}" ]]; then
			seen[$resolved]=1
			files+=("$resolved")
		fi
	done

	while IFS= read -r file; do
		[[ -n "$file" ]] || continue
		resolved="$(readlink -f -- "$file" 2>/dev/null || printf '%s' "$file")"
		[[ -f "$resolved" ]] || continue
		if [[ -z "${seen[$resolved]:-}" ]]; then
			seen[$resolved]=1
			files+=("$resolved")
		fi
	done < <(grep -lE "^[[:space:]]*ServerName[[:space:]]+${escaped}([[:space:]]|$)" \
		"$APACHE_SITES_AVAILABLE"/*.conf "$APACHE_SITES_ENABLED"/*.conf 2>/dev/null || true)

	if ((${#files[@]})); then
		printf '%s\n' "${files[@]}"
	fi
}

find_alias_files() {
	local escaped="${1//./\\.}"
	grep -lE "^[[:space:]]*ServerAlias.*[[:space:]]${escaped}([[:space:]]|$)" \
		"$APACHE_SITES_AVAILABLE"/*.conf "$APACHE_SITES_ENABLED"/*.conf 2>/dev/null || true
}

find_docroots() {
	local file line root
	for file in "$@"; do
		while IFS= read -r line; do
			root="$(awk '{print $2}' <<<"$line")"
			root="${root#\"}"
			root="${root%\"}"
			root="${root#\'}"
			root="${root%\'}"
			[[ -n "$root" ]] && printf '%s\n' "$root"
		done < <(grep -iE '^[[:space:]]*DocumentRoot[[:space:]]+' "$file" 2>/dev/null || true)
	done | sort -u
}

print_delete_summary() {
	local -a files=("$@")
	local file
	printf '\n%sAbout to delete:%s\n' "$COLOR_BOLD" "$COLOR_RESET"
	printf '  Domain:  %s\n' "$DOMAIN"
	printf '  Configs:\n'
	for file in "${files[@]}"; do
		printf '    %s\n' "$file"
	done
	if [[ -n "$CERT_NAME" ]]; then
		printf '  Cert:    %s\n' "$CERT_NAME"
	else
		printf '  Cert:    none found\n'
	fi
	if [[ -d "$LOG_DIR" ]]; then
		printf '  Logs:    %s\n' "$LOG_DIR"
	fi
	if [[ -n "${DOCROOT_TO_DELETE:-}" ]]; then
		printf '  Docroot: %s\n' "$DOCROOT_TO_DELETE"
	fi
	printf '  Backup:  %s\n' "$BACKUP_ROOT"
}

delete_certificate_if_requested() {
	local -a domains=("$@")
	local should_delete=0 url_domains="" domain

	if ((DELETE_CERT)); then
		should_delete=1
	elif [[ -n "$CERT_NAME" ]] && ! ((ASSUME_YES)); then
		url_domains="$(IFS=,; printf '%s' "${domains[*]}")"
		if ask_optional "Delete certificate '$CERT_NAME' (${url_domains:-unknown domains})? (y/N): "; then
			should_delete=1
		fi
	fi
	((should_delete)) || return 0

	if ((${#domains[@]} > 1)) && ((!FORCE)); then
		warn "Certificate '$CERT_NAME' also covers: ${domains[*]}"
		warn "Not deleting it. Re-run with --force or remove it manually with certbot."
		return 0
	fi
	if cert_in_use "$CERT_NAME"; then
		warn "Certificate '$CERT_NAME' is still referenced by another Apache config; not deleting it."
		return 0
	fi

	info "Deleting Let's Encrypt certificate: $CERT_NAME"
	if ! certbot delete --cert-name "$CERT_NAME" --non-interactive; then
		warn "certbot could not delete the certificate; remove it manually if needed."
	fi
}

delete_logs_if_requested() {
	local should_delete=0
	[[ -d "$LOG_DIR" ]] || return 0
	if ((DELETE_LOGS)); then
		should_delete=1
	elif ! ((ASSUME_YES)); then
		if ask_optional "Delete Apache logs in $LOG_DIR? (y/N): "; then
			should_delete=1
		fi
	fi
	((should_delete)) || return 0
	rm -rf -- "$LOG_DIR" || warn "Could not delete log directory: $LOG_DIR"
}

delete_docroot_if_requested() {
	local resolved="" should_delete=0
	[[ -n "${DOCROOT_TO_DELETE:-}" ]] || return 0

	resolved="$(readlink -m -- "$DOCROOT_TO_DELETE" 2>/dev/null || printf '%s' "$DOCROOT_TO_DELETE")"

	case "$resolved" in
	/opt/BeeProjects | /opt/BeeProjects/*)
		warn "Refusing to delete the BeeProjects application directory: $resolved"
		return 0
		;;
	esac
	if [[ "$resolved" == "$REPO_ROOT" || "$resolved" == "$REPO_ROOT"/* ]]; then
		warn "Refusing to delete the application repository: $resolved"
		return 0
	fi
	case "$resolved" in
	/var/www/html | /var/www/html/* | /var/www)
		warn "Refusing to delete shared Apache default content: $resolved"
		return 0
		;;
	/var/www/*) ;;
	*)
		warn "Refusing to delete a document root outside /var/www: $resolved"
		return 0
		;;
	esac

	if ((DELETE_DOCROOT)); then
		should_delete=1
	elif ! ((ASSUME_YES)); then
		if ask_optional "Delete document root $resolved? (y/N): "; then
			should_delete=1
		fi
	fi
	((should_delete)) || return 0
	rm -rf -- "$resolved" || warn "Could not delete document root: $resolved"
}

cmd_delete() {
	require_root
	if [[ -z "$DOMAIN" ]]; then
		prompt_value DOMAIN "Domain to delete (e.g. app.example.com): "
	fi
	normalize_domain "$DOMAIN"

	detect_apache
	detect_apache_service
	require_sites_layout
	command -v a2dissite >/dev/null 2>&1 || die "a2dissite was not found."
	command -v a2ensite >/dev/null 2>&1 || die "a2ensite was not found."

	LOG_DIR="$APACHE_LOG_DIR/$DOMAIN"

	local -a files=()
	mapfile -t files < <(find_vhost_files "$DOMAIN")
	if ((${#files[@]} == 0)); then
		die "No Apache virtual host found for $DOMAIN. Nothing was changed."
	fi

	local -a unmarked=()
	local file
	for file in "${files[@]}"; do
		if ! grep -qF -- "$MARKER" "$file"; then
			unmarked+=("$file")
		fi
	done
	if ((${#unmarked[@]})); then
		if ((!FORCE)); then
			warn "These vhosts were not created by this script:"
			for file in "${unmarked[@]}"; do
				printf '  %s\n' "$file" >&2
			done
			die "Refusing to delete unmarked vhosts. Re-run with --force if you are certain."
		fi
		warn "Deleting unmarked vhost(s) because --force was given:"
		for file in "${unmarked[@]}"; do
			printf '  %s\n' "$file" >&2
		done
	fi

	if command -v certbot >/dev/null 2>&1; then
		CERT_NAME="$(cert_name_for_domain "$DOMAIN" || true)"
	fi
	local -a cert_domains=()
	if [[ -n "$CERT_NAME" ]]; then
		mapfile -t cert_domains < <(certificate_domains "$CERT_NAME")
	fi

	local -a docroots=()
	mapfile -t docroots < <(find_docroots "${files[@]}")
	DOCROOT_TO_DELETE=""
	if ((${#docroots[@]} == 1)); then
		DOCROOT_TO_DELETE="${docroots[0]}"
	elif ((${#docroots[@]} > 1)); then
		warn "Multiple document roots found; the document root will not be deleted automatically."
	fi

	print_delete_summary "${files[@]}"
	confirm_action "Proceed with deletion? (y/N): " || die "Aborted."

	BACKUP_DIR="$(make_backup_dir delete)"
	backup_vhost_files "${files[@]}"
	info "Configs backed up to: $BACKUP_DIR"

	local base
	for file in "${files[@]}"; do
		base="$(basename -- "$file")"
		if [[ "$file" == "$APACHE_SITES_AVAILABLE"/* ]]; then
			if [[ -L "$APACHE_SITES_ENABLED/$base" || -e "$APACHE_SITES_ENABLED/$base" ]]; then
				a2dissite -q "$base" >/dev/null 2>&1 || true
			fi
		fi
	done
	rm -f -- "$APACHE_SITES_ENABLED/$DOMAIN.conf" \
		"$APACHE_SITES_ENABLED/$DOMAIN-le-ssl.conf" 2>/dev/null || true
	for file in "${files[@]}"; do
		rm -f -- "$file" || {
			warn "Could not remove $file; restoring the backup."
			restore_vhost_backup "$BACKUP_DIR" || warn "Automatic restore failed; see $BACKUP_DIR"
			configtest_apache || true
			reload_apache || true
			die "Delete failed; the original configuration was restored where possible."
		}
	done

	if ! configtest_apache; then
		warn "Apache configuration is invalid after removal; restoring the backup."
		restore_vhost_backup "$BACKUP_DIR" || warn "Automatic restore failed; see $BACKUP_DIR"
		configtest_apache || true
		reload_apache || true
		die "Delete failed; the original configuration was restored where possible."
	fi
	reload_apache || warn "The vhost was removed, but Apache did not reload cleanly."

	info "Virtual host removed: $DOMAIN"

	if [[ -n "$CERT_NAME" ]]; then
		delete_certificate_if_requested "${cert_domains[@]}"
	fi
	delete_logs_if_requested
	delete_docroot_if_requested

	printf '\n%sDeleted:%s %s\n' "$COLOR_BOLD" "$COLOR_RESET" "$DOMAIN"
	if [[ -n "$BACKUP_DIR" ]]; then
		printf 'Backup: %s\n' "$BACKUP_DIR"
	fi
	if [[ -d "$APACHE_LOG_DIR/$DOMAIN" ]]; then
		printf 'Logs kept: %s\n' "$APACHE_LOG_DIR/$DOMAIN"
	fi
	if [[ -n "${DOCROOT_TO_DELETE:-}" && -d "$DOCROOT_TO_DELETE" ]]; then
		printf 'Docroot kept: %s\n' "$DOCROOT_TO_DELETE"
	fi
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

require_root() {
	if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
		return 0
	fi
	# Test harnesses may set this to exercise config generation in a sandbox.
	if [[ "${SUBDOMAIN_MANAGER_ALLOW_NONROOT:-0}" == "1" ]]; then
		warn "Running as non-root because SUBDOMAIN_MANAGER_ALLOW_NONROOT=1 (test mode)."
		return 0
	fi
	die "Please run as root: sudo $0"
}

interactive_menu() {
	printf '%sBeeProjects Apache subdomain manager%s\n\n' "$COLOR_BOLD" "$COLOR_RESET"
	printf '1) Add a subdomain\n'
	printf '2) Delete a subdomain\n'
	printf '3) Quit\n\n'
	local choice=""
	read -r -p "Choose [1-3]: " choice || choice=""
	case "$choice" in
	1) COMMAND="add" && cmd_add ;;
	2) COMMAND="delete" && cmd_delete ;;
	3 | q | Q | "") info "Nothing changed." ;;
	*) die "Invalid choice: $choice" ;;
	esac
}

parse_args() {
	while (($#)); do
		case "$1" in
		-h | --help)
			usage
			exit 0
			;;
		--domain)
			(($# >= 2)) || die "Missing value for --domain"
			DOMAIN="$2"
			shift 2
			;;
		--domain=*)
			DOMAIN="${1#*=}"
			shift
			;;
		--type)
			(($# >= 2)) || die "Missing value for --type"
			VHOST_TYPE="$2"
			shift 2
			;;
		--type=*)
			VHOST_TYPE="${1#*=}"
			shift
			;;
		--target)
			(($# >= 2)) || die "Missing value for --target"
			TARGET="$2"
			shift 2
			;;
		--target=*)
			TARGET="${1#*=}"
			shift
			;;
		--docroot)
			(($# >= 2)) || die "Missing value for --docroot"
			DOCROOT="$2"
			shift 2
			;;
		--docroot=*)
			DOCROOT="${1#*=}"
			shift
			;;
		--email)
			(($# >= 2)) || die "Missing value for --email"
			EMAIL="$2"
			shift 2
			;;
		--email=*)
			EMAIL="${1#*=}"
			shift
			;;
		--ssl)
			SSL_CHOICE="yes"
			shift
			;;
		--no-ssl)
			SSL_CHOICE="no"
			shift
			;;
		--create-index)
			CREATE_INDEX=1
			shift
			;;
		-y | --yes)
			ASSUME_YES=1
			shift
			;;
		--force)
			FORCE=1
			shift
			;;
		--delete-cert)
			DELETE_CERT=1
			shift
			;;
		--delete-logs)
			DELETE_LOGS=1
			shift
			;;
		--delete-docroot)
			DELETE_DOCROOT=1
			shift
			;;
		*)
			die "Unknown option: $1 (use --help)"
			;;
		esac
	done

	if [[ "$COMMAND" == "add" ]]; then
		((FORCE || DELETE_CERT || DELETE_LOGS || DELETE_DOCROOT)) &&
			die "--force and --delete-* are only valid with delete."
	fi
	if [[ "$COMMAND" == "delete" ]]; then
		((CREATE_INDEX)) && die "--create-index is only valid with add."
		[[ -n "$VHOST_TYPE" || -n "$TARGET" || -n "$DOCROOT" || -n "$SSL_CHOICE" ]] &&
			die "--type, --target, --docroot, and --ssl are only valid with add."
	fi

	return 0
}

main() {
	if (($# == 0)); then
		interactive_menu
		return
	fi

	COMMAND="$1"
	shift
	case "$COMMAND" in
	add | delete)
		parse_args "$@"
		if [[ "$COMMAND" == "add" ]]; then
			cmd_add
		else
			cmd_delete
		fi
		;;
	-h | --help | help)
		usage
		;;
	*)
		die "Unknown command: $COMMAND (use --help)"
		;;
	esac
}

main "$@"
