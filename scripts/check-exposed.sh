#!/usr/bin/env bash
# Vérifie qu'aucun fichier sensible ne se télécharge depuis le site public.
#
# Usage : bash scripts/check-exposed.sh technolot.ca
#         bash scripts/check-exposed.sh https://www.technolot.ca
#
# À lancer SEULEMENT contre notre propre domaine. Requêtes GET simples, sans
# témoin ni authentification. Le contenu des réponses n'est jamais affiché
# (un .env exposé contiendrait des clés) : on montre le code HTTP, le type,
# la taille et une conclusion.
#
# Piège : app/(fr)/[...rest]/page.tsx répond à toute URL inconnue avec la page
# « introuvable » du site. Une réponse HTML qui contient le gabarit Next.js
# (/_next/static/) est donc la page du site, pas le fichier demandé.
#
# Code de sortie : 0 si rien n'est exposé, 1 si au moins un chemin l'est,
# 2 en cas d'erreur d'usage ou de réseau.

set -u

if [ $# -lt 1 ] || [ -z "${1:-}" ]; then
  echo "Usage : $0 <domaine>   (ex. : $0 technolot.ca)" >&2
  exit 2
fi

BASE="${1%/}"
case "$BASE" in
  http://*|https://*) ;;
  *) BASE="https://$BASE" ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "curl est requis." >&2
  exit 2
fi

if [ -t 1 ]; then
  ROUGE=$'\033[1;31m'; JAUNE=$'\033[33m'; VERT=$'\033[32m'; GRAS=$'\033[1m'; FIN=$'\033[0m'
else
  ROUGE=""; JAUNE=""; VERT=""; GRAS=""; FIN=""
fi

TMP="$(mktemp -d 2>/dev/null || mktemp -d -t check-exposed)"
trap 'rm -rf "$TMP"' EXIT
CORPS="$TMP/corps"

UA="check-exposed/1.0 (verification de securite du proprietaire)"

# Chemins du guide (check 23)
CHEMINS=(
  /.env /.env.local /.env.production /.env.development /.env.backup /.env.bak /.env.old
  /.git/config /.git/HEAD /.gitignore /.DS_Store /.vscode/settings.json /.idea/workspace.xml
  /backup.zip /backup.tar.gz /db.sql /dump.sql /database.sql /database.sqlite /data.db
  /config.json /config.yml /docker-compose.yml /.npmrc /phpinfo.php /server-status
  /swagger.json /openapi.json /graphql
)
# Fichiers propres à ce dépôt (Next.js sur Hostinger / LiteSpeed)
CHEMINS+=(
  /package.json /package-lock.json /next.config.mjs /CLAUDE.md /prompt-technolot-nextjs.md
  /supabase/config.toml /.next/BUILD_ID /README.md /.htaccess
  /.env.example /tsconfig.json /middleware.ts /.git/index
  /.next/required-server-files.json /.next/prerender-manifest.json /.next/routes-manifest.json
  /assets/outils/calculatrice.html /assets/outils/ebay-description.html
  /scripts/cron-process-emails.sh /supabase/migrations/20260713000000_initial_schema.sql
  /docs/PUBLICITES-SETUP.md
)

nb_expose=0
nb_douteux=0
nb_ok=0

# Analyse une réponse déjà téléchargée dans $CORPS.
# $1 = chemin, $2 = code, $3 = type de contenu, $4 = taille, $5 = redirection
afficher() {
  local chemin="$1" code="$2" type="$3" taille="$4" redir="$5"
  local etiquette couleur note=""

  case "$code" in
    200|206)
      if printf '%s' "$type" | grep -qi 'text/html' && grep -q '/_next/static/' "$CORPS" 2>/dev/null; then
        etiquette="page du site"; couleur="$JAUNE"
        note="gabarit HTML du site (pas le fichier demandé)"
        nb_douteux=$((nb_douteux + 1))
      else
        etiquette="EXPOSÉ"; couleur="$ROUGE"
        nb_expose=$((nb_expose + 1))
        # Indices sur la nature du fichier, sans jamais l'afficher
        if grep -Eq '^[A-Z][A-Z0-9_]{2,}=' "$CORPS" 2>/dev/null; then
          note="contient des lignes CLE=valeur : traiter toutes les clés comme compromises"
        elif grep -q '\[core\]' "$CORPS" 2>/dev/null; then
          note="configuration Git"
        fi
      fi
      ;;
    301|302|303|307|308)
      etiquette="redirection"; couleur="$JAUNE"; note="vers ${redir:-?}"
      nb_douteux=$((nb_douteux + 1))
      ;;
    401|403|404|405|410)
      etiquette="ok"; couleur="$VERT"; nb_ok=$((nb_ok + 1))
      ;;
    000)
      etiquette="erreur réseau"; couleur="$JAUNE"; nb_douteux=$((nb_douteux + 1))
      ;;
    *)
      etiquette="à vérifier"; couleur="$JAUNE"; nb_douteux=$((nb_douteux + 1))
      ;;
  esac

  printf '%s%-4s %-14s%s %-52s %-28s %8s o  %s\n' \
    "$couleur" "$code" "$etiquette" "$FIN" "$chemin" "${type:--}" "${taille:-0}" "$note"
}

tester() {
  local chemin="$1" sortie code type taille redir
  rm -f "$CORPS"
  sortie="$(curl -s -A "$UA" --max-time 20 -o "$CORPS" \
    -w '%{http_code}\t%{content_type}\t%{size_download}\t%{redirect_url}' \
    "$BASE$chemin" 2>/dev/null)" || true
  IFS=$'\t' read -r code type taille redir <<<"$sortie"
  afficher "$chemin" "${code:-000}" "${type%%;*}" "${taille%%.*}" "$redir"
}

echo "${GRAS}Fichiers exposés : $BASE${FIN}  ($(date '+%Y-%m-%d %H:%M'))"
printf '%-4s %-14s %-52s %-28s %10s  %s\n' "Code" "Verdict" "Chemin" "Type" "Taille" "Note"

for chemin in "${CHEMINS[@]}"; do
  tester "$chemin"
done

# Cartes de sources (.map) : quelques fichiers JS réels de l'accueil
echo
echo "${GRAS}Cartes de sources (.map) des fichiers /_next/static de l'accueil${FIN}"
ACCUEIL="$TMP/accueil.html"
if curl -s -A "$UA" --max-time 30 -o "$ACCUEIL" "$BASE/" 2>/dev/null; then
  SCRIPTS="$(grep -oE '/_next/static/[A-Za-z0-9/_.~-]+\.js' "$ACCUEIL" | sort -u | head -n 8)"
  if [ -z "$SCRIPTS" ]; then
    echo "  Aucun fichier /_next/static/*.js trouvé dans l'accueil."
  else
    for js in $SCRIPTS; do
      tester "$js.map"
    done
  fi
else
  echo "  Accueil injoignable : cartes de sources non testées."
fi

echo
echo "Résumé : ${ROUGE}${nb_expose} exposé(s)${FIN}, ${JAUNE}${nb_douteux} à regarder${FIN}, ${VERT}${nb_ok} ok${FIN}."
if [ "$nb_expose" -gt 0 ]; then
  echo "${ROUGE}Au moins un fichier se télécharge : le retirer du dossier servi, bloquer le chemin, et faire tourner les clés qu'il contenait.${FIN}"
  exit 1
fi
exit 0
