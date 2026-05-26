#!/usr/bin/env bash
set -euo pipefail

JWT_SECRET="test-jwt-secret-do-not-use-in-production"
PGREST="http://localhost:3000"
GOTRUE="http://localhost:9999"
PASS=0; FAIL=0
VERBOSE="${VERBOSE:-0}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; NC='\033[0m'
DC="docker-compose -f $(dirname "$0")/docker-compose.yml"

# ---- request/response tracing ----
__last_method="" __last_url="" __last_resp=""

call_get() {
    local _varname="$1" _t="$2" _m="$3" _u="$4"; shift 4
    __last_method="$_m"; __last_url="$_u"
    __last_resp=$(curl -s -H "Authorization: Bearer $_t" -H "Content-Type: application/json" -X "$_m" "$_u" "$@")
    printf -v "$_varname" '%s' "$__last_resp"
}
call_write() {
    local _varname="$1" _t="$2" _m="$3" _u="$4"; shift 4
    __last_method="$_m"; __last_url="$_u"
    __last_resp=$(curl -s -H "Authorization: Bearer $_t" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" -X "$_m" "$_u" "$@")
    printf -v "$_varname" '%s' "$__last_resp"
}
call_get_quiet() { local _; call_get _ "$@"; }
call_write_quiet() { local _; call_write _ "$@"; }
call_anon() {
    local _varname="$1" _m="$2" _u="$3"; shift 3
    __last_method="$_m"; __last_url="$_u"
    __last_resp=$(curl -s -X "$_m" "$_u" "$@")
    printf -v "$_varname" '%s' "$__last_resp"
}

trace() {
    [ "$VERBOSE" = "1" ] || return 0
    local r="${__last_resp:0:180}"
    echo -e "    ${YELLOW}>>${NC} $__last_method $__last_url"
    echo -e "    ${YELLOW}<<${NC} $r"
}
trace_hidden() {
    [ "$VERBOSE" = "1" ] || return 0
    echo -e "    ${YELLOW}>>${NC} $__last_method $__last_url"
    echo -e "    ${YELLOW}<<${NC} (hidden)"
}
die_context() {
    echo -e "  ${RED}FATAL${NC} $1"
    echo -e "  ${CYAN}>>${NC} $__last_method $__last_url"
    echo -e "  ${CYAN}<<${NC} ${__last_resp:0:300}"
    exit 1
}

# ---- jq helpers ----
jq_r()      { echo "$1" | jq -r "($2)" 2>/dev/null || true; }
jq_item()   { jq_r "$1" '(if type == "array" then .[0].'"$2"' else .'"$2"' end)'; }
jq_count()  { echo "$1" | jq '. | length' 2>/dev/null || echo 0; }
jq_arr_filter() {
    local json="$1" id="$2" field="$3"
    echo "$json" | jq --arg id "$id" "[.[] | select(.${field} == \$id)] | length" 2>/dev/null || echo 0
}
is_error() {
    local code; code=$(jq_r "$1" '.code')
    [ -n "$code" ] && [ "$code" != "null" ]
}

# ---- test helpers ----
assert_eq() {
    if [ "${2:-}" = "${3:-}" ]; then
        echo -e "  ${GREEN}PASS${NC} $1"; PASS=$((PASS+1))
    else
        echo -e "  ${RED}FAIL${NC} $1 (got='${2:-}', want='${3:-}')"
        [ "$VERBOSE" = "1" ] && echo -e "    ${YELLOW}<<${NC} ${__last_resp:0:200}"
        FAIL=$((FAIL+1))
    fi
}
assert_gt() {
    if [ "${2:-0}" -gt "${3:-0}" ]; then
        echo -e "  ${GREEN}PASS${NC} $1"; PASS=$((PASS+1))
    else
        echo -e "  ${RED}FAIL${NC} $1 (got='${2:-}', min='${3:-}')"
        [ "$VERBOSE" = "1" ] && echo -e "    ${YELLOW}<<${NC} ${__last_resp:0:200}"
        FAIL=$((FAIL+1))
    fi
}
assert_json_eq() {
    local actual; actual=$(jq_r "$2" "$3")
    if [ "$actual" = "$4" ]; then
        echo -e "  ${GREEN}PASS${NC} $1"; PASS=$((PASS+1))
    else
        echo -e "  ${RED}FAIL${NC} $1 (got='$actual', want='$4')"
        [ "$VERBOSE" = "1" ] && echo -e "    ${YELLOW}<<${NC} ${__last_resp:0:200}"
        FAIL=$((FAIL+1))
    fi
}

# ---- JWT helpers (bypass Google OAuth for testing) ----
base64url_encode() {
    openssl base64 -e | tr -d '=' | tr '/+' '_-' | tr -d '\n'
}
gen_jwt() {
    local user_id="$1" secret="$2"
    local hdr pld sig
    hdr=$(printf '{"alg":"HS256","typ":"JWT"}' | base64url_encode)
    pld=$(printf '{"sub":"%s","aud":"authenticated","role":"authenticated","exp":%d}' \
        "$user_id" "$(( $(date +%s) + 3600 ))" | base64url_encode)
    sig=$(printf '%s.%s' "$hdr" "$pld" | openssl dgst -sha256 -hmac "$secret" -binary | base64url_encode)
    echo "$hdr.$pld.$sig"
}

# =====================================================================
# SETUP
# =====================================================================
echo -e "${CYAN}=== Waiting for services ===${NC}"

# wait for PostgREST
for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" "$PGREST/" | grep -q 200; then
        echo "  PostgREST ready"
        break
    fi
    sleep 1
done

# wait for GoTrue
for i in $(seq 1 30); do
    if curl -s -o /dev/null "$GOTRUE/health" 2>/dev/null; then
        echo "  GoTrue ready"
        break
    fi
    sleep 1
done

# ensure auth sync trigger exists (fallback — trigger-setup should have done it)
$DC exec -T db psql -U grind -d grind <<'EOSQL' 2>/dev/null && echo "  Auth sync trigger ready" || true
  DO $$
  BEGIN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_user_from_auth();
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  $$;
EOSQL

# =====================================================================
# SETUP TEST USERS (bypass Google OAuth — insert directly into DB)
# =====================================================================
echo -e "\n${CYAN}=== Creating test users directly in DB ===${NC}"

# clean previous test users (cascades to habits, logs, targets)
$DC exec -T db psql -U grind -d grind -c \
    "DELETE FROM users WHERE email IN ('alice@test.com','bob@test.com');" > /dev/null 2>&1

# create users and capture their IDs (first line only, strip command tag)
ALICE_ID=$($DC exec -T db psql -U grind -d grind -t -A \
    -c "INSERT INTO users (username, email) VALUES ('alice','alice@test.com') RETURNING id;" | sed -n '1p' | xargs)
BOB_ID=$($DC exec -T db psql -U grind -d grind -t -A \
    -c "INSERT INTO users (username, email) VALUES ('bob','bob@test.com') RETURNING id;" | sed -n '1p' | xargs)

[ -z "$ALICE_ID" ] && die_context "Failed to create Alice"
[ -z "$BOB_ID" ]   && die_context "Failed to create Bob"

# generate JWTs with the same secret PostgREST trusts
JWTA=$(gen_jwt "$ALICE_ID" "$JWT_SECRET")
JWTB=$(gen_jwt "$BOB_ID" "$JWT_SECRET")

echo "  Alice ID:  $ALICE_ID"
echo "  Bob ID:    $BOB_ID"
echo "  Alice JWT: ${JWTA:0:20}..."
echo "  Bob JWT:   ${JWTB:0:20}..."

# =====================================================================
# SECTION 1 — SYSTEM CATEGORIES (visible to both)
# =====================================================================
echo -e "\n${CYAN}=== 1. System categories ===${NC}"

call_get CATS_A "$JWTA" GET "$PGREST/categories"; trace
call_get CATS_B "$JWTB" GET "$PGREST/categories"; trace

is_error "$CATS_A" && die_context "GET /categories failed (A)"
is_error "$CATS_B" && die_context "GET /categories failed (B)"

CAT_A_COUNT=$(echo "$CATS_A" | jq 'if type == "array" then length else 0 end')
CAT_B_COUNT=$(echo "$CATS_B" | jq 'if type == "array" then length else 0 end')

assert_gt "System categories exist for User A" "$CAT_A_COUNT" 0
assert_gt "System categories exist for User B" "$CAT_B_COUNT" 0
assert_eq  "Same category count for both users" "$CAT_A_COUNT" "$CAT_B_COUNT"

CAT_ID=$(echo "$CATS_A" | jq -r '.[0].id')

# =====================================================================
# SECTION 2 — USER A: CRUD habits + logs
# =====================================================================
echo -e "\n${CYAN}=== 2. User A creates habit + log ===${NC}"

TODAY=$(date -u +%Y-%m-%d)
DOW=$(date -u +%w)
YEAR_MONTH="${TODAY%-*}-01"

# create habit for User A (scheduled for today)
call_write HABIT_A "$JWTA" POST "$PGREST/habits" -d \
    "{\"name\":\"Morning run\",\"category_id\":\"$CAT_ID\",\"days_of_week\":[$DOW]}"; trace
is_error "$HABIT_A" && die_context "POST /habits failed"

HABIT_A_ID=$(jq_item "$HABIT_A" "id")
assert_gt "User A creates habit" "${#HABIT_A_ID}" 0

# create monthly target
call_write MT_A "$JWTA" POST "$PGREST/monthly_targets" -d \
    "{\"habit_id\":\"$HABIT_A_ID\",\"year_month\":\"$YEAR_MONTH\",\"target_count\":20}"; trace
is_error "$MT_A" && die_context "POST /monthly_targets failed"

MT_A_ID=$(jq_item "$MT_A" "id")
assert_gt "User A creates monthly target" "${#MT_A_ID}" 0

# log completion for today (user_id auto-filled via DEFAULT public.current_user_id())
call_write LOG_A "$JWTA" POST "$PGREST/habit_logs" -d \
    "{\"habit_id\":\"$HABIT_A_ID\",\"completed_date\":\"$TODAY\",\"note\":\"done early\"}"; trace
is_error "$LOG_A" && die_context "POST /habit_logs failed"

LOG_A_ID=$(jq_item "$LOG_A" "id")
assert_gt "User A logs habit completion" "${#LOG_A_ID}" 0

LOG_USER=$(jq_item "$LOG_A" "user_id")
assert_eq "Log user_id auto-set to A" "$LOG_USER" "$ALICE_ID"

# =====================================================================
# SECTION 3 — USER B: CRUD habits + logs
# =====================================================================
echo -e "\n${CYAN}=== 3. User B creates habit + log ===${NC}"

call_write HABIT_B "$JWTB" POST "$PGREST/habits" -d \
    "{\"name\":\"Read book\",\"category_id\":\"$CAT_ID\",\"days_of_week\":[$DOW]}"; trace
is_error "$HABIT_B" && die_context "POST /habits failed"

HABIT_B_ID=$(jq_item "$HABIT_B" "id")
assert_gt "User B creates habit" "${#HABIT_B_ID}" 0

call_write LOG_B "$JWTB" POST "$PGREST/habit_logs" -d \
    "{\"habit_id\":\"$HABIT_B_ID\",\"completed_date\":\"$TODAY\"}"; trace
is_error "$LOG_B" && die_context "POST /habit_logs failed"

LOG_B_ID=$(jq_item "$LOG_B" "id")
assert_gt "User B logs habit completion" "${#LOG_B_ID}" 0

LOG_USER_B=$(jq_item "$LOG_B" "user_id")
assert_eq "Log user_id auto-set to B" "$LOG_USER_B" "$BOB_ID"

# =====================================================================
# SECTION 4 — RLS ISOLATION
# =====================================================================
echo -e "\n${CYAN}=== 4. RLS isolation ===${NC}"

call_get HABITS_FROM_B "$JWTB" GET "$PGREST/habits"; trace
A_VISIBLE_TO_B=$(jq_arr_filter "$HABITS_FROM_B" "$HABIT_A_ID" "id")
assert_eq "User B cannot see User A's habit" "$A_VISIBLE_TO_B" "0"

call_get LOGS_FROM_B "$JWTB" GET "$PGREST/habit_logs"; trace
A_LOG_VISIBLE_TO_B=$(jq_arr_filter "$LOGS_FROM_B" "$LOG_A_ID" "id")
assert_eq "User B cannot see User A's log" "$A_LOG_VISIBLE_TO_B" "0"

call_get HABITS_FROM_A "$JWTA" GET "$PGREST/habits"; trace
B_VISIBLE_TO_A=$(jq_arr_filter "$HABITS_FROM_A" "$HABIT_B_ID" "id")
assert_eq "User A cannot see User B's habit" "$B_VISIBLE_TO_A" "0"

A_SEES_OWN=$(jq_arr_filter "$HABITS_FROM_A" "$HABIT_A_ID" "id")
assert_eq "User A sees own habit" "$A_SEES_OWN" "1"

B_SEES_OWN=$(jq_arr_filter "$HABITS_FROM_B" "$HABIT_B_ID" "id")
assert_eq "User B sees own habit" "$B_SEES_OWN" "1"

# =====================================================================
# SECTION 5 — RPC: get_daily_progress
# =====================================================================
echo -e "\n${CYAN}=== 5. get_daily_progress ===${NC}"

call_get DP_A "$JWTA" POST "$PGREST/rpc/get_daily_progress" -d "{\"p_date\":\"$TODAY\"}"; trace
call_get DP_B "$JWTB" POST "$PGREST/rpc/get_daily_progress" -d "{\"p_date\":\"$TODAY\"}"; trace

assert_json_eq "User A daily: scheduled" "$DP_A" '.[0].total_scheduled' "1"
assert_json_eq "User A daily: completed" "$DP_A" '.[0].total_completed' "1"
assert_json_eq "User B daily: scheduled" "$DP_B" '.[0].total_scheduled' "1"
assert_json_eq "User B daily: completed" "$DP_B" '.[0].total_completed' "1"

# =====================================================================
# SECTION 6 — RPC: get_monthly_progress
# =====================================================================
echo -e "\n${CYAN}=== 6. get_monthly_progress ===${NC}"

call_get MP_A "$JWTA" POST "$PGREST/rpc/get_monthly_progress" -d "{\"p_year_month\":\"$YEAR_MONTH\"}"; trace
call_get MP_B "$JWTB" POST "$PGREST/rpc/get_monthly_progress" -d "{\"p_year_month\":\"$YEAR_MONTH\"}"; trace

assert_json_eq "User A monthly: name"   "$MP_A" '.[0].habit_name' "Morning run"
assert_json_eq "User A monthly: target" "$MP_A" '.[0].target'     "20"
assert_json_eq "User A monthly: done"   "$MP_A" '.[0].completed'  "1"

assert_json_eq "User B monthly: name"   "$MP_B" '.[0].habit_name' "Read book"
assert_json_eq "User B monthly: target" "$MP_B" '.[0].target'     "0"
assert_json_eq "User B monthly: done"   "$MP_B" '.[0].completed'  "1"

# =====================================================================
# SECTION 7 — UPDATE & DELETE
# =====================================================================
echo -e "\n${CYAN}=== 7. Update & delete ===${NC}"

call_write UPD "$JWTA" PATCH "$PGREST/habits?id=eq.$HABIT_A_ID" -d '{"name":"Evening run"}'; trace
is_error "$UPD" && die_context "PATCH /habits failed"

UPD_OK=$(jq_item "$UPD" "name")
assert_eq "User A updates habit name" "$UPD_OK" "Evening run"

call_get_quiet "$JWTA" DELETE "$PGREST/habit_logs?id=eq.$LOG_A_ID" -o /dev/null; trace_hidden
call_get LOG_DEL "$JWTA" GET "$PGREST/habit_logs"; trace
REMAINING=$(jq_arr_filter "$LOG_DEL" "$LOG_A_ID" "id")
assert_eq "User A deletes log entry" "$REMAINING" "0"

call_get_quiet "$JWTB" DELETE "$PGREST/habits?id=eq.$HABIT_B_ID" -o /dev/null; trace_hidden
call_get HB_B_AFTER "$JWTB" GET "$PGREST/habits"; trace
assert_eq "User B deletes habit (cascades)" "$(jq_count "$HB_B_AFTER")" "0"

# =====================================================================
# SECTION 8 — ANON ACCESS (RLS filters everything)
# =====================================================================
echo -e "\n${CYAN}=== 8. Anonymous access filtered ===${NC}"

call_anon ANON_RESP GET "$PGREST/habits"; trace
assert_eq "Anon GET /habits returns empty (RLS)" "$(jq_count "$ANON_RESP")" "0"

# =====================================================================
# SUMMARY
# =====================================================================
echo -e "\n---"
echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}  Total: $((PASS+FAIL))"

[ "$VERBOSE" = "1" ] && echo -e "  ${YELLOW}Run: VERBOSE=1 ./test.sh${NC}"

if [ "$FAIL" -gt 0 ]; then
    echo -e "\n${RED}Some tests FAILED!${NC}"
    exit 1
else
    echo -e "\n${GREEN}All tests PASSED!${NC}"
    exit 0
fi
