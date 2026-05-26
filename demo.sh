#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Grind — Demo Data Seeder
# ──────────────────────────────────────────────

# ── load .env ──
if [ -f "$(dirname "$0")/.env" ]; then
  set -a; source "$(dirname "$0")/.env"; set +a
fi

JWT_SECRET="${PGRST_JWT_SECRET:-${GOTRUE_JWT_SECRET:-test-jwt-secret-do-not-use-in-production}}"
PGREST="http://localhost:3000"
VERBOSE="${VERBOSE:-0}"
DEMO_EMAIL="yourmail@gmail.com"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
DC="docker-compose -f $(dirname "$0")/docker-compose.yml"

# ── helpers ──
__last_resp=""
call_get() {
  local _v="$1" _t="$2"; shift 2
  __last_resp=$(curl -s -H "Authorization: Bearer $_t" -H "Content-Type: application/json" -X GET "$@")
  printf -v "$_v" '%s' "$__last_resp"
}
call_write() {
  local _v="$1" _t="$2"; shift 2
  __last_resp=$(curl -s -H "Authorization: Bearer $_t" -H "Content-Type: application/json" \
    -H "Prefer: return=representation" -X POST "$@")
  printf -v "$_v" '%s' "$__last_resp"
}
die() { echo -e "  ${YELLOW}ABORT${NC} $1"; echo "  ${__last_resp:0:300}"; exit 1; }

base64url_encode() {
  openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n'
}
gen_jwt() {
  local uid="$1" sec="$2"
  local h p s
  h=$(printf '{"alg":"HS256","typ":"JWT"}' | base64url_encode)
  p=$(printf '{"sub":"%s","aud":"authenticated","role":"authenticated","exp":%d}' \
    "$uid" "$(( $(date +%s) + 7200 ))" | base64url_encode)
  s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$sec" -binary | base64url_encode)
  echo "$h.$p.$s"
}

# ── wait for services ──
echo -e "${CYAN}=== Waiting for services ===${NC}"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" "$PGREST/" | grep -q 200; then
    echo "  PostgREST ready"; break
  fi
  sleep 1
done

# ── get user from DB ──
echo -e "\n${CYAN}=== Loading user: ${DEMO_EMAIL} ===${NC}"
USER_ID=$($DC exec -T db psql -U grind -d grind -t -A \
  -c "SELECT id FROM users WHERE email='${DEMO_EMAIL}' LIMIT 1;" | sed -n '1p' | xargs)

if [ -z "$USER_ID" ]; then
  echo -e "  ${YELLOW}User not found. Creating...${NC}"
  $DC exec -T db psql -U grind -d grind -c "
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (gen_random_uuid(), '${DEMO_EMAIL}', '{\"full_name\":\"Riskii\"}')
    ON CONFLICT (email) DO NOTHING;
  " > /dev/null 2>&1
  sleep 2
  USER_ID=$($DC exec -T db psql -U grind -d grind -t -A \
    -c "SELECT id FROM users WHERE email='${DEMO_EMAIL}' LIMIT 1;" | sed -n '1p' | xargs)
fi

[ -z "$USER_ID" ] && die "Could not find or create user"
JWT=$(gen_jwt "$USER_ID" "$JWT_SECRET")
echo -e "  ${GREEN}User ID:${NC} ${USER_ID:0:8}..."
echo -e "  ${GREEN}JWT:${NC} ${JWT:0:20}..."

# ── get categories ──
echo -e "\n${CYAN}=== Fetching categories ===${NC}"
call_get CATS "$JWT" GET "$PGREST/categories" || die "GET /categories failed"
echo "$CATS" | jq -r '.[] | "  \(.sort_order). \(.name)"'

# build category map: name → id
declare -A CAT
while IFS=$'\t' read -r name id; do
  CAT["$name"]="$id"
done < <(echo "$CATS" | jq -r '.[] | "\(.name)\t\(.id)"')

# ── cleanup existing demo data ──
echo -e "\n${CYAN}=== Cleaning existing data ===${NC}"
$DC exec -T db psql -U grind -d grind -c "DELETE FROM habits WHERE user_id='${USER_ID}';" > /dev/null
echo "  Done"

# ── seed habits with varied sort_order ──
echo -e "\n${CYAN}=== Seeding habits ===${NC}"

TODAY=$(date -u +%Y-%m-%d)
YEAR_MONTH="${TODAY%-*}-01"

# ordered list for realistic mixed-category sorting
DEMO_ORDER=(
  "Fitness:Morning Run 3km"
  "Productivity:Deep Work Session"
  "Learning:Read 20 Pages"
  "Money:Track Daily Expenses"
  "Grooming:Morning Skincare Routine"
  "Sleep:Sleep by 10:30 PM"
  "Social:Call a Friend"
  "Faith:Morning Prayer"
  "Other:Declutter 5 Items Daily"
  "Productivity:Eat That Frog Task"
  "Fitness:Push-ups & Planks"
  "Learning:Practice Duolingo"
  "Money:No-Spend Day"
  "Sleep:No Phone 1hr Before Bed"
  "Grooming:Stretch for 10min"
  "Social:Reply Pending Messages"
  "Faith:Read Scripture 15min"
  "Other:Hydrate 8 Glasses"
  "Productivity:Daily Standup Notes"
  "Fitness:Evening Yoga Flow"
  "Learning:Watch a Tech Talk"
  "Money:Review Investment Portfolio"
  "Grooming:Plan Tomorrow Outfit"
  "Sleep:Wake Up at 6 AM"
  "Social:Family Dinner Time"
  "Faith:Evening Gratitude"
  "Other:Write in Journal"
)

ALL_HABIT_IDS=()
ALL_DAYS=(0 1 2 3 4 5 6)
SORT=1

for entry in "${DEMO_ORDER[@]}"; do
  cat_name="${entry%%:*}"
  hname="${entry##*:}"
  cid="${CAT[$cat_name]}"
  [ -z "$cid" ] && continue

  # pick 3-5 random days
  n=$(( RANDOM % 3 + 3 ))
  days=$(printf '%s\n' "${ALL_DAYS[@]}" | shuf | head -n "$n" | sort -n | jq -Rsc 'split("\n") | map(select(length>0) | tonumber)')

  call_write HABIT "$JWT" POST "$PGREST/habits" \
    -d "{\"name\":\"${hname}\",\"category_id\":\"${cid}\",\"days_of_week\":${days},\"sort_order\":${SORT}}" || die "POST /habits failed"
  hid=$(echo "$HABIT" | jq -r 'if type=="array" then .[0].id else .id end')
  ALL_HABIT_IDS+=("$hid")
  echo -e "  ${GREEN}${SORT}.${NC} ${hname} → ${cat_name}"
  SORT=$(( SORT + 1 ))
done

# ── set monthly targets ──
echo -e "\n${CYAN}=== Setting monthly targets ===${NC}"
for hid in "${ALL_HABIT_IDS[@]}"; do
  target=$(( RANDOM % 16 + 10 ))   # 10-25
  call_write _ JWT POST "$PGREST/monthly_targets" \
    -d "{\"habit_id\":\"${hid}\",\"year_month\":\"${YEAR_MONTH}\",\"target_count\":${target}}" > /dev/null
done
echo "  Targets set for ${#ALL_HABIT_IDS[@]} habits"

# ── seed past logs (last 14 days) ──
echo -e "\n${CYAN}=== Seeding 14 days of history ===${NC}"
TOTAL_LOGS=0
for d in $(seq 0 13); do
  log_date=$(date -u -d "-${d} days" +%Y-%m-%d)
  dow=$(date -u -d "${log_date}" +%w)
  # complete ~65% of habits scheduled on that day
  for hid in "${ALL_HABIT_IDS[@]}"; do
    if [ $(( RANDOM % 100 )) -lt 65 ]; then
      call_write _ JWT POST "$PGREST/habit_logs" \
        -d "{\"habit_id\":\"${hid}\",\"completed_date\":\"${log_date}\"}" > /dev/null 2>&1 || true
      TOTAL_LOGS=$(( TOTAL_LOGS + 1 ))
    fi
  done
done
echo "  ${TOTAL_LOGS} log entries created across 14 days"

# ── done ──
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "  ${GREEN}Demo data ready!${NC}"
echo -e "  Habits:   $(echo "${ALL_HABIT_IDS[@]}" | wc -w)"
echo -e "  Targets:  ${#ALL_HABIT_IDS[@]}"
echo -e "  Logs:     ${TOTAL_LOGS} (14 days)"
echo -e "  User:     ${DEMO_EMAIL}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

echo -e "\n  Open http://localhost:5173 and sign in with Google to see the data."
