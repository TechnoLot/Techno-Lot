#!/bin/bash
# Cron job pour Hostinger — appelle l'API de traitement des courriels à 17h chaque jour
# Configurer dans Hostinger > Cron Jobs avec l'expression : 0 17 * * *
#
# Variables à définir :
#   SITE_URL   — URL de base du site (ex: https://technolot.ca)
#   CRON_SECRET — secret partagé entre le cron et l'API

SITE_URL="${SITE_URL:-https://technolot.ca}"
CRON_SECRET="${CRON_SECRET}"

if [ -z "$CRON_SECRET" ]; then
  echo "ERREUR: CRON_SECRET non défini"
  exit 1
fi

curl -s -X POST "${SITE_URL}/api/admin/process-emails" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --max-time 120
