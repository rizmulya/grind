#!/bin/sh
set -e

until psql -h postgres -U postgres -d grind -t -c "SELECT 1 FROM auth.users LIMIT 1" 2>/dev/null
do
  echo "trigger-setup: waiting for auth.users..."
  sleep 1
done

psql -h postgres -U postgres -d grind <<'EOSQL'
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

echo "trigger-setup: auth sync trigger ready"
