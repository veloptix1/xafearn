-- =====================================================================
-- XAFEARN — TOUR DE CONTRÔLE, PARTIE 2 : argent, retraits, alertes, croissance, communication
-- À exécuter dans Supabase > SQL Editor (tout le fichier d'un coup), APRÈS 10 (relancer 10 d'abord s'il a changé).
-- Ajoute des tables et des fonctions ; ne modifie aucune donnée existante.
--
--   1. GRAND LIVRE      : chaque mouvement de solde FCFA / jetons est enregistré (avant/après, origine, auteur)
--   2. PLAFONDS         : budget maximum par jour pour les gains « gratuits » (roue, bonus, coffres…) et limites de retrait
--   3. TRÉSORERIE       : entrées, sorties, dettes envers les utilisateurs
--   4. FILE DES RETRAITS: chaque demande avec un score de risque
--   5. ALERTES / RÈGLES : détection automatique, gel automatique des retraits (optionnel), résumé quotidien
--   6. CROISSANCE       : entonnoir, rétention, meilleurs parrains, performance des campagnes
--   7. COMMUNICATION    : annonces / bandeaux, messages ciblés, restrictions visibles par l'utilisateur
--   8. ERREURS DE L'APP : plantages remontés dans l'admin
--   9. EXPORT et NETTOYAGE (la base gratuite est limitée à 500 Mo)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1) GRAND LIVRE
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.ledger_entries (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  user_id       uuid not null,
  kind          text not null check (kind in ('fcfa', 'coins')),
  delta         numeric not null,
  balance_after numeric,
  source        text not null default 'inconnu',
  actor         uuid
);
create index if not exists ledger_user_idx    on public.ledger_entries (user_id, created_at desc);
create index if not exists ledger_source_idx  on public.ledger_entries (source, kind, created_at desc);
create index if not exists ledger_created_idx on public.ledger_entries (created_at desc);
alter table public.ledger_entries enable row level security;

create table if not exists public.economy_caps (
  source     text not null,
  kind       text not null check (kind in ('fcfa', 'coins')),
  daily_max  numeric not null check (daily_max >= 0),
  enabled    boolean not null default true,
  primary key (source, kind)
);
alter table public.economy_caps enable row level security;

-- Avant la modification : applique les plafonds journaliers
create or replace function public.ledger_before_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src  text := coalesce(nullif(current_setting('app.ledger_reason', true), ''), 'inconnu');
  d      numeric;
  v_cap  numeric;
  v_used numeric;
begin
  if NEW.balance is distinct from OLD.balance then
    d := coalesce(NEW.balance, 0) - coalesce(OLD.balance, 0);
    if d > 0 then
      select daily_max into v_cap from public.economy_caps where source = v_src and kind = 'fcfa' and enabled;
      if found then
        select coalesce(sum(delta), 0) into v_used from public.ledger_entries
         where source = v_src and kind = 'fcfa' and delta > 0 and created_at >= date_trunc('day', now());
        if v_used + d > v_cap then
          raise exception 'Limite journalière atteinte pour cette fonctionnalité. Réessaie demain.' using errcode = 'XA001';
        end if;
      end if;
    end if;
  end if;
  if NEW.coins_balance is distinct from OLD.coins_balance then
    d := coalesce(NEW.coins_balance, 0) - coalesce(OLD.coins_balance, 0);
    if d > 0 then
      select daily_max into v_cap from public.economy_caps where source = v_src and kind = 'coins' and enabled;
      if found then
        select coalesce(sum(delta), 0) into v_used from public.ledger_entries
         where source = v_src and kind = 'coins' and delta > 0 and created_at >= date_trunc('day', now());
        if v_used + d > v_cap then
          raise exception 'Limite journalière atteinte pour cette fonctionnalité. Réessaie demain.' using errcode = 'XA001';
        end if;
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

-- Après la modification : écrit dans le livre
create or replace function public.ledger_after_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_src text := coalesce(nullif(current_setting('app.ledger_reason', true), ''), 'inconnu');
begin
  if NEW.balance is distinct from OLD.balance then
    insert into public.ledger_entries (user_id, kind, delta, balance_after, source, actor)
    values (NEW.id, 'fcfa', coalesce(NEW.balance, 0) - coalesce(OLD.balance, 0), NEW.balance, v_src, auth.uid());
  end if;
  if NEW.coins_balance is distinct from OLD.coins_balance then
    insert into public.ledger_entries (user_id, kind, delta, balance_after, source, actor)
    values (NEW.id, 'coins', coalesce(NEW.coins_balance, 0) - coalesce(OLD.coins_balance, 0), NEW.coins_balance, v_src, auth.uid());
  end if;
  return NEW;
end;
$$;

drop trigger if exists ledger_before on public.profiles;
create trigger ledger_before
before update of balance, coins_balance on public.profiles
for each row when (OLD.balance is distinct from NEW.balance or OLD.coins_balance is distinct from NEW.coins_balance)
execute function public.ledger_before_trg();

drop trigger if exists ledger_after on public.profiles;
create trigger ledger_after
after update of balance, coins_balance on public.profiles
for each row when (OLD.balance is distinct from NEW.balance or OLD.coins_balance is distinct from NEW.coins_balance)
execute function public.ledger_after_trg();

-- Étiquette l'ORIGINE des mouvements : chaque fonction d'argent déclare « d'où vient » le changement de solde.
-- (À relancer si tu recrées une de ces fonctions : « select control_label_money_functions(); »)
create or replace function public.control_label_money_functions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare m record; r record; n integer := 0;
begin
  for m in select * from (values
      ('claim_daily_bonus', 'bonus_quotidien'), ('request_withdrawal', 'retrait'), ('request_coin_withdrawal', 'retrait_jetons'),
      ('buy_coins_with_balance', 'achat_jetons'), ('convert_coins_to_balance', 'conversion_jetons'), ('claim_treasure', 'coffre'),
      ('create_campaign', 'campagne'), ('handle_leekpay_payment', 'paiement_leekpay'),
      ('send_coins__inner', 'pourboire'), ('spin_wheel__inner', 'roue'), ('unlock_episode__inner', 'episode'),
      ('publish_product_with_coins__inner', 'produit_marche'), ('process_bonus_withdrawal__inner', 'retrait_bonus'),
      ('request_bonus_withdrawal__inner', 'bonus_vers_solde'), ('buy_ai_credits__inner', 'credits_ia'), ('use_ai_credit__inner', 'credits_ia'),
      ('activate_premium_account_inner', 'activation_premium'),
      ('admin_adjust_balance__inner', 'ajustement_admin'), ('admin_adjust_balance', 'ajustement_admin'),
      ('admin_adjust_coins', 'ajustement_admin'), ('admin_adjust_credits', 'ajustement_admin'),
      ('admin_validate_submission__inner', 'validation_preuve'), ('admin_validate_submission', 'validation_preuve'),
      ('admin_process_withdrawal__inner', 'traitement_retrait'), ('admin_process_withdrawal', 'traitement_retrait'),
      ('admin_process_campaign__inner', 'traitement_campagne'), ('admin_process_campaign', 'traitement_campagne'),
      ('admin_delete_user__inner', 'suppression_compte')
    ) as v(fn, src)
  loop
    for r in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = m.fn loop
      execute format('alter function %s set app.ledger_reason = %L', r.sig, m.src);
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;
revoke all on function public.control_label_money_functions() from public, anon, authenticated;
select public.control_label_money_functions();

-- Limites de retrait (par utilisateur et globales, par jour) : 0 ou vide = pas de limite
create or replace function public.control_withdraw_limits_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_max   numeric := coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'limit_withdraw_user_daily'), 0);
  v_global_max numeric := coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'limit_withdraw_global_daily'), 0);
  v_user_sum   numeric;
  v_global_sum numeric;
begin
  if v_user_max > 0 then
    select coalesce(sum(w.amount), 0) into v_user_sum from public.withdrawals w
     where w.user_id = NEW.user_id and w.status <> 'rejected' and (to_jsonb(w) ->> 'created_at')::timestamptz >= date_trunc('day', now());
    if v_user_sum + coalesce(NEW.amount, 0) > v_user_max then
      raise exception 'Limite de retrait journalière atteinte (% F par jour). Réessaie demain.', round(v_user_max) using errcode = 'XA001';
    end if;
  end if;
  if v_global_max > 0 then
    select coalesce(sum(w.amount), 0) into v_global_sum from public.withdrawals w
     where w.status <> 'rejected' and (to_jsonb(w) ->> 'created_at')::timestamptz >= date_trunc('day', now());
    if v_global_sum + coalesce(NEW.amount, 0) > v_global_max then
      raise exception 'Les retraits du jour sont complets. Réessaie demain.' using errcode = 'XA001';
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists control_withdraw_limits on public.withdrawals;
create trigger control_withdraw_limits before insert on public.withdrawals
for each row execute function public.control_withdraw_limits_trg();
revoke all on function public.ledger_before_trg()          from public, anon, authenticated;
revoke all on function public.ledger_after_trg()           from public, anon, authenticated;
revoke all on function public.control_withdraw_limits_trg() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 2) PLAFONDS ET ÉCONOMIE (admin)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.control_get_economy()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return jsonb_build_object(
    'caps', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'kind', kind, 'daily_max', daily_max, 'enabled', enabled) order by source) from public.economy_caps), '[]'::jsonb),
    'today', coalesce((select jsonb_agg(to_jsonb(t) order by t.credited desc) from (
        select source, kind, sum(delta) filter (where delta > 0) as credited, sum(-delta) filter (where delta < 0) as debited, count(*) as n
          from public.ledger_entries where created_at >= date_trunc('day', now()) group by source, kind) t), '[]'::jsonb),
    'limit_user_daily',   coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'limit_withdraw_user_daily'), 0),
    'limit_global_daily', coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'limit_withdraw_global_daily'), 0),
    'auto_hold_score',    coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'control_auto_hold_score'), 0));
end;
$$;

create or replace function public.control_set_cap(p_source text, p_kind text, p_daily_max numeric, p_enabled boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  if p_kind not in ('fcfa', 'coins') or coalesce(p_daily_max, -1) < 0 or length(coalesce(p_source, '')) not between 2 and 50 then
    return jsonb_build_object('success', false, 'error', 'Valeurs invalides');
  end if;
  insert into public.economy_caps (source, kind, daily_max, enabled) values (p_source, p_kind, p_daily_max, p_enabled)
  on conflict (source, kind) do update set daily_max = excluded.daily_max, enabled = excluded.enabled;
  perform public.control_log('plafond_modifie', null, jsonb_build_object('source', p_source, 'kind', p_kind, 'max', p_daily_max, 'actif', p_enabled));
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.control_set_limit(p_key text, p_value numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_setting text;
begin
  perform public.control_assert_admin();
  v_setting := case p_key when 'user_daily' then 'limit_withdraw_user_daily' when 'global_daily' then 'limit_withdraw_global_daily' when 'auto_hold_score' then 'control_auto_hold_score' end;
  if v_setting is null or coalesce(p_value, -1) < 0 then
    return jsonb_build_object('success', false, 'error', 'Valeurs invalides');
  end if;
  insert into public.app_settings (key, value, updated_at) values (v_setting, p_value::text, now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  perform public.control_log('limite_modifiee', null, jsonb_build_object('cle', p_key, 'valeur', p_value));
  return jsonb_build_object('success', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 3) GRAND LIVRE (lecture) ET TRÉSORERIE
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.control_ledger_overview(p_hours integer default 24)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_since timestamptz := now() - make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 720)));
begin
  perform public.control_assert_admin();
  return jsonb_build_object(
    'by_source', coalesce((select jsonb_agg(to_jsonb(t) order by t.credits desc nulls last) from (
        select source, kind, coalesce(sum(delta) filter (where delta > 0), 0) as credits, coalesce(sum(-delta) filter (where delta < 0), 0) as debits, count(*) as n
          from public.ledger_entries where created_at >= v_since group by source, kind) t), '[]'::jsonb),
    'unknown', coalesce((select jsonb_agg(to_jsonb(t) order by t.credited desc) from (
        select l.user_id, p.full_name, l.kind, sum(l.delta) as credited, count(*) as n, max(l.created_at) as last_at
          from public.ledger_entries l left join public.profiles p on p.id = l.user_id
         where l.created_at >= v_since and l.source = 'inconnu' and l.delta > 0
         group by l.user_id, p.full_name, l.kind order by sum(l.delta) desc limit 20) t), '[]'::jsonb));
end;
$$;

create or replace function public.control_user_ledger(p_user_id uuid, p_limit integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((select jsonb_agg(to_jsonb(t)) from (
      select created_at, kind, delta, balance_after, source from public.ledger_entries
       where user_id = p_user_id order by created_at desc limit greatest(1, least(coalesce(p_limit, 30), 200))) t), '[]'::jsonb);
end;
$$;

create or replace function public.control_treasury(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d    integer := greatest(1, least(coalesce(p_days, 30), 180));
  rate numeric := coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'coin_fcfa_rate'), 0.30);
begin
  perform public.control_assert_admin();
  return jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', g.day, 'deposits', coalesce(dep.v, 0), 'requested', coalesce(req.v, 0), 'processed', coalesce(prc.v, 0)) order by g.day)
      from (select generate_series(current_date - (d - 1), current_date, interval '1 day')::date as day) g
      left join (select (to_jsonb(lp) ->> 'created_at')::timestamptz::date as day, sum(lp.amount) as v from public.leekpay_payments lp where lp.status = 'completed' group by 1) dep on dep.day = g.day
      left join (select (to_jsonb(w) ->> 'created_at')::timestamptz::date as day, sum(w.amount) as v from public.withdrawals w group by 1) req on req.day = g.day
      left join (select (to_jsonb(w) ->> 'created_at')::timestamptz::date as day, sum(w.amount) as v from public.withdrawals w where w.status not in ('pending', 'rejected', 'cancelled') group by 1) prc on prc.day = g.day
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'deposits',  (select coalesce(sum(amount), 0) from public.leekpay_payments where status = 'completed'),
      'processed', (select coalesce(sum(amount), 0) from public.withdrawals where status not in ('pending', 'rejected', 'cancelled')),
      'pending',   (select coalesce(sum(amount), 0) from public.withdrawals where status = 'pending')),
    'liabilities', jsonb_build_object(
      'balance',     (select coalesce(sum(balance), 0) from public.profiles),
      'coins',       (select coalesce(sum(coins_balance), 0) from public.profiles),
      'coin_rate',   rate,
      'coins_value', (select coalesce(sum(coins_balance), 0) from public.profiles) * rate,
      'bonus',       (select coalesce(sum(amount), 0) from public.bonus_earnings where status = 'available'),
      'withdrawals_pending', (select coalesce(sum(amount), 0) from public.withdrawals where status = 'pending')),
    'conversion_margin', (select coalesce(sum(commission), 0) from public.coin_conversions));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4) FILE DE CONTRÔLE DES RETRAITS
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.control_withdrawal_queue(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((
    with sus as (
      select (x ->> 'id')::uuid as id, (x ->> 'score')::int as sc from jsonb_array_elements(public.control_suspects_core(200)) x
    ),
    allwd as (
      select w.user_id, regexp_replace(coalesce(to_jsonb(w) ->> 'phone', to_jsonb(w) ->> 'phone_number', ''), '\D', '', 'g') as pd from public.withdrawals w
    ),
    shared as (
      select pd from allwd where length(pd) >= 8 group by pd having count(distinct user_id) > 1
    ),
    pend as (
      select user_id, count(*) as n from public.withdrawals where status = 'pending' group by user_id
    ),
    unk as (
      select user_id, sum(delta) as v from public.ledger_entries where source = 'inconnu' and delta > 0 and created_at > now() - interval '7 days' group by user_id
    ),
    q as (
      select w.id, w.user_id, p.full_name, w.amount, w.status,
             coalesce(to_jsonb(w) ->> 'method', to_jsonb(w) ->> 'operator') as method,
             regexp_replace(coalesce(to_jsonb(w) ->> 'phone', to_jsonb(w) ->> 'phone_number', ''), '\D', '', 'g') as phone,
             (to_jsonb(w) ->> 'created_at')::timestamptz as created_at,
             coalesce(p.balance, 0) as user_balance,
             (to_jsonb(p) ->> 'created_at')::timestamptz as account_created,
             sus.sc as suspect_score, pend.n as pending_count, unk.v as unknown_credits,
             (select count(*) from public.withdrawals o where o.user_id = w.user_id and o.status not in ('pending', 'rejected', 'cancelled')) as previous_paid
        from public.withdrawals w
        join public.profiles p on p.id = w.user_id
        left join sus on sus.id = w.user_id
        left join pend on pend.user_id = w.user_id
        left join unk on unk.user_id = w.user_id
       where w.status = 'pending'
    ),
    scored as (
      select q.*,
        (case when q.account_created > now() - interval '48 hours' then 30 else 0 end)
        + (case when length(q.phone) >= 8 and q.phone in (select pd from shared) then 40 else 0 end)
        + least(coalesce(q.suspect_score, 0) / 2, 40)
        + (case when coalesce(q.unknown_credits, 0) >= 500 then 25 else 0 end)
        + (case when coalesce(q.pending_count, 0) >= 3 then 20 else 0 end) as score,
        array_remove(array[
          case when q.account_created > now() - interval '48 hours' then 'Compte de moins de 48 h' end,
          case when length(q.phone) >= 8 and q.phone in (select pd from shared) then 'Même numéro de paiement que d''autres comptes' end,
          case when q.suspect_score is not null then 'Compte suspect (score ' || q.suspect_score || ')' end,
          case when coalesce(q.unknown_credits, 0) >= 500 then 'Solde crédité hors fonctions connues (' || round(q.unknown_credits) || ')' end,
          case when coalesce(q.pending_count, 0) >= 3 then q.pending_count || ' retraits en attente' end,
          case when q.previous_paid = 0 then 'Premier retrait du compte' end
        ], null) as reasons
      from q
    )
    select jsonb_agg(jsonb_build_object(
        'id', s.id, 'user_id', s.user_id, 'full_name', s.full_name, 'amount', s.amount, 'method', s.method, 'phone', s.phone,
        'created_at', s.created_at, 'user_balance', s.user_balance, 'score', s.score, 'reasons', s.reasons,
        'level', case when s.score >= 60 then 'high' when s.score >= 30 then 'medium' else 'low' end)
      order by s.score desc, s.created_at asc)
    from (select * from scored order by score desc, created_at asc limit greatest(1, least(coalesce(p_limit, 50), 200))) s
  ), '[]'::jsonb);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5) ALERTES, RÈGLES AUTOMATIQUES, RÉSUMÉ QUOTIDIEN
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.control_alerts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  severity     text not null check (severity in ('info', 'warning', 'critical')),
  kind         text not null,
  user_id      uuid,
  message      text not null,
  dedupe_key   text not null,
  resolved     boolean not null default false,
  resolved_by  uuid,
  resolved_at  timestamptz
);
create unique index if not exists control_alerts_open_uniq on public.control_alerts (dedupe_key) where not resolved;
create index if not exists control_alerts_created_idx on public.control_alerts (created_at desc);
alter table public.control_alerts enable row level security;

create or replace function public.control_raise_alert(p_severity text, p_kind text, p_user uuid, p_message text, p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  insert into public.control_alerts (severity, kind, user_id, message, dedupe_key)
  values (p_severity, p_kind, p_user, p_message, p_key)
  on conflict (dedupe_key) where not resolved do nothing;
  get diagnostics n = row_count;
  if n > 0 and p_severity = 'critical' then
    insert into public.notifications (user_id, title, message, link)
    select pr.id, '🛰️ Alerte critique', left(p_message, 200), '/dashboard/admin/controle'
      from public.profiles pr where pr.role = 'admin' or coalesce((to_jsonb(pr) ->> 'is_admin')::boolean, false);
  end if;
  return n > 0;
end;
$$;

create or replace function public.control_run_rules_core()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n        integer := 0;
  held     integer := 0;
  s        record;
  v_auto   integer := coalesce((select nullif(value, '')::numeric::integer from public.app_settings where key = 'control_auto_hold_score'), 0);
  v_db     bigint := pg_database_size(current_database());
  v_store  bigint := null;
  v_cnt    integer;
begin
  -- 1) comptes très suspects
  for s in select (x ->> 'id')::uuid as id, x ->> 'full_name' as nm, (x ->> 'score')::int as sc
             from jsonb_array_elements(public.control_suspects_core(100)) x where (x ->> 'score')::int >= 70 loop
    if public.control_raise_alert('critical', 'suspect', s.id, 'Compte très suspect : ' || coalesce(s.nm, '?') || ' (score ' || s.sc || ')', 'suspect:' || s.id) then n := n + 1; end if;
  end loop;

  -- 2) gel automatique des retraits (désactivé tant que le seuil est à 0)
  if v_auto > 0 then
    for s in select (x ->> 'id')::uuid as id, x ->> 'full_name' as nm, (x ->> 'score')::int as sc
               from jsonb_array_elements(public.control_suspects_core(100)) x where (x ->> 'score')::int >= v_auto loop
      if not exists (select 1 from public.user_restrictions where user_id = s.id and feature = 'withdraw' and active) then
        insert into public.user_restrictions (user_id, feature, reason, created_by) values (s.id, 'withdraw', 'Vérification automatique en cours', null);
        perform public.control_log('gel_automatique', array[s.id], jsonb_build_object('score', s.sc));
        held := held + 1;
        perform public.control_raise_alert('critical', 'auto_hold', s.id,
          'Retraits gelés automatiquement : ' || coalesce(s.nm, '?') || ' (score ' || s.sc || ')', 'auto_hold:' || s.id || ':' || current_date);
      end if;
    end loop;
  end if;

  -- 3) paiements bloqués
  select count(*) into v_cnt from public.leekpay_payments lp where lp.status = 'pending' and (to_jsonb(lp) ->> 'created_at')::timestamptz < now() - interval '30 minutes';
  if v_cnt > 0 and public.control_raise_alert('warning', 'payments_stuck', null, v_cnt || ' paiement(s) LeekPay en attente depuis plus de 30 min', 'payments_stuck:' || current_date) then n := n + 1; end if;

  -- 4) retraits en retard
  select count(*) into v_cnt from public.withdrawals w where w.status = 'pending' and (to_jsonb(w) ->> 'created_at')::timestamptz < now() - interval '72 hours';
  if v_cnt > 0 and public.control_raise_alert('warning', 'withdrawals_late', null, v_cnt || ' retrait(s) en attente depuis plus de 72 h', 'withdrawals_late:' || current_date) then n := n + 1; end if;

  -- 5) limites du plan gratuit
  if v_db > 0.8 * 500 * 1024 * 1024 and public.control_raise_alert('critical', 'db_limit', null, 'Base de données à ' || round(v_db / 1048576.0) || ' Mo sur 500 Mo : fais de la place ou passe au plan payant', 'db_limit:' || current_date) then n := n + 1; end if;
  begin
    select coalesce(sum((metadata ->> 'size')::bigint), 0) into v_store from storage.objects;
  exception when others then v_store := null;
  end;
  if v_store is not null and v_store > 0.8 * 1024 * 1024 * 1024 and public.control_raise_alert('critical', 'storage_limit', null, 'Stockage à ' || round(v_store / 1048576.0) || ' Mo sur 1 Go', 'storage_limit:' || current_date) then n := n + 1; end if;

  -- 6) crédits de solde d'origine inconnue (fort montant en 24 h)
  for s in select l.user_id as id, p.full_name as nm, l.kind, sum(l.delta) as v
             from public.ledger_entries l left join public.profiles p on p.id = l.user_id
            where l.source = 'inconnu' and l.delta > 0 and l.created_at > now() - interval '24 hours'
            group by l.user_id, p.full_name, l.kind having sum(l.delta) >= case when l.kind = 'fcfa' then 1000 else 3000 end loop
    if public.control_raise_alert('warning', 'ledger_unknown', s.id, 'Solde de ' || coalesce(s.nm, '?') || ' crédité de ' || round(s.v) || ' (' || s.kind || ') sans fonction connue', 'ledger_unknown:' || s.id || ':' || s.kind || ':' || current_date) then n := n + 1; end if;
  end loop;

  -- 7) plafonds presque atteints
  for s in select c.source, c.kind, c.daily_max,
                  coalesce((select sum(delta) from public.ledger_entries l where l.source = c.source and l.kind = c.kind and l.delta > 0 and l.created_at >= date_trunc('day', now())), 0) as used
             from public.economy_caps c where c.enabled loop
    if s.daily_max > 0 and s.used >= 0.9 * s.daily_max
       and public.control_raise_alert('info', 'cap_reached', null, 'Plafond « ' || s.source || ' » atteint à ' || round(100 * s.used / s.daily_max) || ' %', 'cap:' || s.source || ':' || s.kind || ':' || current_date) then n := n + 1; end if;
  end loop;

  return jsonb_build_object('created', n, 'frozen', held);
end;
$$;

create or replace function public.control_run_rules()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return public.control_run_rules_core();
end;
$$;

create or replace function public.control_daily_digest_core()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_txt text;
begin
  v_txt := 'Inscrits 24 h : ' || (select count(*) from public.profiles p where (to_jsonb(p) ->> 'created_at')::timestamptz > now() - interval '24 hours')
        || ' · Retraits en attente : ' || (select count(*) from public.withdrawals where status = 'pending')
        || ' (' || (select coalesce(round(sum(amount)), 0) from public.withdrawals where status = 'pending') || ' F)'
        || ' · Preuves à valider : ' || ((select count(*) from public.task_submissions where status = 'pending') + (select count(*) from public.ad_submissions where status = 'pending'))
        || ' · Alertes ouvertes : ' || (select count(*) from public.control_alerts where not resolved);
  insert into public.notifications (user_id, title, message, link)
  select pr.id, '📊 Résumé du jour', v_txt, '/dashboard/admin/controle'
    from public.profiles pr where pr.role = 'admin' or coalesce((to_jsonb(pr) ->> 'is_admin')::boolean, false);
end;
$$;

create or replace function public.control_digest_now()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  perform public.control_daily_digest_core();
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.control_alerts_list(p_resolved boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((select jsonb_agg(to_jsonb(t)) from (
      select a.id, a.created_at, a.severity, a.kind, a.user_id, p.full_name as user_name, a.message, a.resolved
        from public.control_alerts a left join public.profiles p on p.id = a.user_id
       where a.resolved = coalesce(p_resolved, false)
       order by case a.severity when 'critical' then 0 when 'warning' then 1 else 2 end, a.created_at desc limit 100) t), '[]'::jsonb);
end;
$$;

create or replace function public.control_resolve_alert(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.control_assert_admin();
begin
  update public.control_alerts set resolved = true, resolved_by = v_admin, resolved_at = now() where id = p_id and not resolved;
  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.control_raise_alert(text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.control_run_rules_core()     from public, anon, authenticated;
revoke all on function public.control_daily_digest_core()  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 6) CROISSANCE ET CAMPAGNES
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.control_growth(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare d integer := greatest(1, least(coalesce(p_days, 30), 180));
begin
  perform public.control_assert_admin();
  return jsonb_build_object(
    'signups_by_day', coalesce((select jsonb_agg(jsonb_build_object('day', s.day, 'n', s.n) order by s.day) from (
        select (to_jsonb(p) ->> 'created_at')::timestamptz::date as day, count(*) as n from public.profiles p
         where (to_jsonb(p) ->> 'created_at')::timestamptz >= now() - make_interval(days => d) group by 1) s), '[]'::jsonb),
    'funnel', (select jsonb_build_object(
        'signups', count(*),
        'with_task', count(*) filter (where exists (select 1 from public.task_submissions s where s.user_id = c.id)),
        'premium', count(*) filter (where coalesce(c.is_premium, false)),
        'withdrew', count(*) filter (where exists (select 1 from public.withdrawals w where w.user_id = c.id)))
       from (select p.* from public.profiles p where (to_jsonb(p) ->> 'created_at')::timestamptz >= now() - make_interval(days => d)) c),
    'retention', jsonb_build_object(
      'd1', (select round(100.0 * count(*) filter (where ls >= created + interval '1 day') / nullif(count(*), 0), 1)
               from (select (to_jsonb(p) ->> 'created_at')::timestamptz as created, (select max(last_seen) from public.user_presence where user_id = p.id) as ls from public.profiles p) x
              where created <= now() - interval '2 days' and created >= now() - make_interval(days => d)),
      'd7', (select round(100.0 * count(*) filter (where ls >= created + interval '7 days') / nullif(count(*), 0), 1)
               from (select (to_jsonb(p) ->> 'created_at')::timestamptz as created, (select max(last_seen) from public.user_presence where user_id = p.id) as ls from public.profiles p) x
              where created <= now() - interval '8 days' and created >= now() - make_interval(days => d))),
    'top_referrers', coalesce((select jsonb_agg(to_jsonb(t)) from (
        select r.referred_by as id, pr.full_name, count(*) as referrals,
               count(*) filter (where exists (select 1 from public.user_presence up where up.user_id = r.id and up.last_seen > now() - interval '7 days')) as active
          from public.profiles r left join public.profiles pr on pr.id = r.referred_by
         where r.referred_by is not null group by r.referred_by, pr.full_name order by count(*) desc limit 10) t), '[]'::jsonb));
end;
$$;

create or replace function public.control_campaign_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return jsonb_build_object(
    'campaigns_by_status', coalesce((select jsonb_object_agg(st, n) from (select coalesce(status, '?') as st, count(*) as n from public.campaigns group by 1) s), '{}'::jsonb),
    'budget_total',    (select coalesce(sum((to_jsonb(c) ->> 'budget')::numeric), 0) from public.campaigns c),
    'views_purchased', (select coalesce(sum((to_jsonb(c) ->> 'views_purchased')::numeric), 0) from public.campaigns c),
    'submissions_by_status', coalesce((select jsonb_object_agg(st, n) from (select coalesce(status, '?') as st, count(*) as n from public.ad_submissions group by 1) s), '{}'::jsonb),
    'views_validated', (select coalesce(sum((to_jsonb(a) ->> 'views_count')::numeric), 0) from public.ad_submissions a where a.status = 'validated'),
    'top_diffusers', coalesce((select jsonb_agg(to_jsonb(t)) from (
        select a.user_id as id, p.full_name, count(*) as validated, coalesce(sum((to_jsonb(a) ->> 'views_count')::numeric), 0) as views
          from public.ad_submissions a left join public.profiles p on p.id = a.user_id
         where a.status = 'validated' group by a.user_id, p.full_name order by count(*) desc limit 10) t), '[]'::jsonb),
    'click_anomalies', coalesce((select jsonb_agg(to_jsonb(t)) from (
        select a.user_id as id, p.full_name, (to_jsonb(a) ->> 'whatsapp_clicks')::numeric as clicks, coalesce((to_jsonb(a) ->> 'views_count')::numeric, 0) as views
          from public.ad_submissions a left join public.profiles p on p.id = a.user_id
         where coalesce((to_jsonb(a) ->> 'whatsapp_clicks')::numeric, 0) >= 20
           and coalesce((to_jsonb(a) ->> 'whatsapp_clicks')::numeric, 0) > 3 * coalesce((to_jsonb(a) ->> 'views_count')::numeric, 0) limit 10) t), '[]'::jsonb));
end;
$$;

create or replace function public.control_ip_clusters()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((select jsonb_agg(to_jsonb(t)) from (
      select s.ip::text as ip, count(distinct s.user_id) as accounts, array_agg(distinct p.full_name) filter (where p.full_name is not null) as names
        from auth.sessions s left join public.profiles p on p.id = s.user_id
       where s.ip is not null group by s.ip having count(distinct s.user_id) >= 3 order by count(distinct s.user_id) desc limit 20) t), '[]'::jsonb);
exception when others then
  return '[]'::jsonb;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7) COMMUNICATION : annonces, messages ciblés, bandeau côté utilisateur
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid,
  title       text not null,
  message     text not null,
  audience    text not null default 'all',
  level       text not null default 'info' check (level in ('info', 'warning', 'maintenance')),
  active      boolean not null default true,
  expires_at  timestamptz
);
alter table public.announcements enable row level security;

create or replace function public.control_audience_match(p_audience text, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case coalesce(p_audience, 'all')
    when 'all'        then true
    when 'premium'    then exists (select 1 from public.profiles p where p.id = p_user and coalesce(p.is_premium, false))
    when 'new7'       then exists (select 1 from public.profiles p where p.id = p_user and (to_jsonb(p) ->> 'created_at')::timestamptz > now() - interval '7 days')
    when 'inactive7'  then not exists (select 1 from public.user_presence up where up.user_id = p_user and up.last_seen > now() - interval '7 days')
    when 'restricted' then exists (select 1 from public.user_restrictions r where r.user_id = p_user and r.active and (r.expires_at is null or r.expires_at > now()))
    else false end;
$$;
revoke all on function public.control_audience_match(text, uuid) from public, anon, authenticated;

create or replace function public.control_announcement_save(p_title text, p_message text, p_audience text default 'all', p_level text default 'info', p_expires_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.control_assert_admin();
begin
  if length(trim(coalesce(p_title, ''))) < 2 or length(p_title) > 120 or length(trim(coalesce(p_message, ''))) < 2 or length(p_message) > 600 then
    return jsonb_build_object('success', false, 'error', 'Titre (2-120) et message (2-600 caractères) requis.');
  end if;
  if p_audience not in ('all', 'premium', 'new7', 'inactive7', 'restricted') or p_level not in ('info', 'warning', 'maintenance') then
    return jsonb_build_object('success', false, 'error', 'Valeurs invalides');
  end if;
  insert into public.announcements (created_by, title, message, audience, level, expires_at) values (v_admin, trim(p_title), trim(p_message), p_audience, p_level, p_expires_at);
  perform public.control_log('annonce_creee', null, jsonb_build_object('titre', p_title, 'public', p_audience, 'niveau', p_level));
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.control_announcement_toggle(p_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  update public.announcements set active = p_active where id = p_id;
  perform public.control_log(case when p_active then 'annonce_activee' else 'annonce_retiree' end, null, jsonb_build_object('id', p_id));
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.control_announcements_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from public.announcements order by created_at desc limit 50) a), '[]'::jsonb);
end;
$$;

-- Message poussé (notification + push) à un groupe d'utilisateurs
create or replace function public.control_broadcast(p_audience text, p_title text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  perform public.control_assert_admin();
  if length(trim(coalesce(p_title, ''))) < 2 or length(p_title) > 80 or length(trim(coalesce(p_message, ''))) < 2 or length(p_message) > 300 then
    return jsonb_build_object('success', false, 'error', 'Titre (2-80) et message (2-300 caractères) requis.');
  end if;
  if p_audience not in ('all', 'premium', 'new7', 'inactive7', 'restricted') then
    return jsonb_build_object('success', false, 'error', 'Public invalide');
  end if;
  insert into public.notifications (user_id, title, message, link)
  select pr.id, trim(p_title), trim(p_message), '/dashboard'
    from public.profiles pr
   where coalesce(pr.role, '') <> 'admin' and public.control_audience_match(p_audience, pr.id)
   limit 5000;
  get diagnostics n = row_count;
  perform public.control_log('message_groupe', null, jsonb_build_object('public', p_audience, 'titre', p_title, 'destinataires', n));
  return jsonb_build_object('success', true, 'sent', n);
end;
$$;

-- Ce que l'utilisateur doit voir : annonces actives + ses restrictions + fonctions coupées pour tous
create or replace function public.get_my_notices()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return '{}'::jsonb; end if;
  return jsonb_build_object(
    'announcements', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'message', a.message, 'level', a.level) order by a.created_at desc)
                                 from public.announcements a
                                where a.active and (a.expires_at is null or a.expires_at > now()) and a.audience <> 'inactive7'
                                  and public.control_audience_match(a.audience, uid)), '[]'::jsonb),
    'restrictions', coalesce((select jsonb_agg(jsonb_build_object('feature', r.feature, 'reason', r.reason, 'expires_at', r.expires_at))
                                from public.user_restrictions r
                               where r.user_id = uid and r.active and r.feature <> 'account' and (r.expires_at is null or r.expires_at > now())), '[]'::jsonb),
    'global_off', coalesce((select jsonb_agg(replace(key, 'feature_off_', '')) from public.app_settings
                             where key like 'feature\_off\_%' and key not like 'feature\_off\_reason\_%' and value = 'true'), '[]'::jsonb));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8) ERREURS DE L'APP
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.client_errors (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid,
  platform    text,
  route       text,
  message     text not null,
  stack       text,
  user_agent  text,
  app_version text
);
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;

create or replace function public.report_client_error(
  p_message text, p_stack text default null, p_route text default null, p_platform text default null,
  p_user_agent text default null, p_version text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or length(trim(coalesce(p_message, ''))) = 0 then return; end if;
  if (select count(*) from public.client_errors where user_id = uid and created_at > now() - interval '1 hour') >= 20 then return; end if;
  insert into public.client_errors (user_id, platform, route, message, stack, user_agent, app_version)
  values (uid, left(p_platform, 30), left(p_route, 200), left(p_message, 500), left(p_stack, 2000), left(p_user_agent, 300), left(p_version, 30));
end;
$$;

create or replace function public.control_errors(p_hours integer default 48)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.n desc) from (
      select message, route, platform, count(*) as n, count(distinct user_id) as users, max(created_at) as last_at, max(stack) as stack
        from public.client_errors where created_at > now() - make_interval(hours => greatest(1, least(coalesce(p_hours, 48), 720)))
       group by message, route, platform order by count(*) desc limit 50) t), '[]'::jsonb);
end;
$$;

create or replace function public.control_errors_clear()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  delete from public.client_errors;
  perform public.control_log('erreurs_effacees', null, '{}'::jsonb);
  return jsonb_build_object('success', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 9) EXPORT ET NETTOYAGE
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.control_export(p_kind text, p_days integer default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare d integer := greatest(1, least(coalesce(p_days, 90), 730));
begin
  perform public.control_assert_admin();
  if p_kind = 'users' then
    return coalesce((select jsonb_agg(to_jsonb(t)) from (
        select p.id, p.full_name, p.phone, au.email, p.role, p.level, coalesce(p.is_premium, false) as premium, coalesce(p.balance, 0) as balance,
               coalesce(p.coins_balance, 0) as coins, coalesce(p.is_blocked, false) as blocked, (to_jsonb(p) ->> 'created_at')::timestamptz as created_at
          from public.profiles p left join auth.users au on au.id = p.id order by 11 desc nulls last limit 5000) t), '[]'::jsonb);
  elsif p_kind = 'withdrawals' then
    return coalesce((select jsonb_agg(to_jsonb(t)) from (
        select w.*, p.full_name from public.withdrawals w left join public.profiles p on p.id = w.user_id
         where (to_jsonb(w) ->> 'created_at')::timestamptz >= now() - make_interval(days => d) order by (to_jsonb(w) ->> 'created_at')::timestamptz desc limit 5000) t), '[]'::jsonb);
  elsif p_kind = 'payments' then
    return coalesce((select jsonb_agg(to_jsonb(t)) from (
        select lp.*, p.full_name from public.leekpay_payments lp left join public.profiles p on p.id = lp.user_id
         where (to_jsonb(lp) ->> 'created_at')::timestamptz >= now() - make_interval(days => d) order by (to_jsonb(lp) ->> 'created_at')::timestamptz desc limit 5000) t), '[]'::jsonb);
  elsif p_kind = 'ledger' then
    return coalesce((select jsonb_agg(to_jsonb(t)) from (
        select l.created_at, l.user_id, p.full_name, l.kind, l.delta, l.balance_after, l.source from public.ledger_entries l left join public.profiles p on p.id = l.user_id
         where l.created_at >= now() - make_interval(days => d) order by l.created_at desc limit 5000) t), '[]'::jsonb);
  elsif p_kind = 'audit' then
    return coalesce((select jsonb_agg(to_jsonb(t)) from (
        select a.created_at, a.action, a.details, ap.full_name as admin, tp.full_name as cible from public.admin_audit_log a
          left join public.profiles ap on ap.id = a.admin_id left join public.profiles tp on tp.id = a.target_user
         where a.created_at >= now() - make_interval(days => d) order by a.created_at desc limit 5000) t), '[]'::jsonb);
  end if;
  return '[]'::jsonb;
end;
$$;

create or replace function public.control_purge_core()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare a bigint; b bigint; c bigint;
begin
  delete from public.client_errors where created_at < now() - interval '14 days';   get diagnostics a = row_count;
  delete from public.ledger_entries where created_at < now() - interval '180 days'; get diagnostics b = row_count;
  delete from public.control_alerts where resolved and resolved_at < now() - interval '60 days'; get diagnostics c = row_count;
  return jsonb_build_object('errors', a, 'ledger', b, 'alerts', c);
end;
$$;

create or replace function public.control_purge_now()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  perform public.control_log('nettoyage', null, '{}'::jsonb);
  return public.control_purge_core();
end;
$$;
revoke all on function public.control_purge_core() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- DROITS
-- ─────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and p.proname in ('control_get_economy','control_set_cap','control_set_limit','control_ledger_overview','control_user_ledger',
                               'control_treasury','control_withdrawal_queue','control_run_rules','control_digest_now','control_alerts_list',
                               'control_resolve_alert','control_growth','control_campaign_stats','control_ip_clusters',
                               'control_announcement_save','control_announcement_toggle','control_announcements_list','control_broadcast',
                               'get_my_notices','report_client_error','control_errors','control_errors_clear','control_export','control_purge_now')
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- AUTOMATISATION (facultatif, recommandé) : règles toutes les 10 min + résumé chaque matin à 8 h
-- Active d'abord l'extension dans Supabase : Database > Extensions > pg_cron, puis exécute :
--   select cron.schedule('controle-regles',  '*/10 * * * *', 'select public.control_run_rules_core()');
--   select cron.schedule('controle-resume',  '0 8 * * *',    'select public.control_daily_digest_core()');
--   select cron.schedule('controle-menage',  '30 3 * * *',   'select public.control_purge_core()');
-- Sans pg_cron, la page « Alertes » analyse à l'ouverture et à chaque clic sur « Analyser maintenant ».
-- ─────────────────────────────────────────────────────────────────────
