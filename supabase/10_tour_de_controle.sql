-- =====================================================================
-- XAFEARN — TOUR DE CONTRÔLE (admin)
-- À exécuter dans Supabase > SQL Editor (tout le fichier d'un coup). Ajoute des tables et des fonctions,
-- ne modifie aucune donnée existante. À lancer APRÈS 07.
--
-- Ce que ça met en place :
--   • RESTRICTIONS : désactiver une fonction (tâches, diffusion, campagnes, retraits, messages, coffres)
--     pour un ou plusieurs utilisateurs, avec motif et date de fin. Elles sont appliquées PAR LA BASE DE DONNÉES :
--     contourner l'app ou l'API ne sert à rien.
--   • INTERRUPTEURS GLOBAUX : couper une fonction pour TOUT LE MONDE (ex. geler les retraits en cas de fraude).
--   • SUSPENSION / BLOCAGE : l'utilisateur est déconnecté et ne peut plus se reconnecter (durée choisie ou définitif).
--   • SUSPECTS : score de risque calculé automatiquement (mêmes numéros, rafales de filleuls, retraits trop
--     rapides, preuves en rafale, taux de rejet…).
--   • FICHE UTILISATEUR 360°, FLUX EN DIRECT, SANTÉ DU SITE (taille de la base, stockage, files d'attente),
--     et JOURNAL de toutes les actions d'admin.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1) TABLES
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.user_restrictions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  feature     text not null,
  reason      text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  active      boolean not null default true
);
create unique index if not exists user_restrictions_active_uniq on public.user_restrictions (user_id, feature) where active;
create index if not exists user_restrictions_user_idx on public.user_restrictions (user_id);

create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid,
  action       text not null,
  target_user  uuid,
  details      jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user);

create table if not exists public.user_flags (
  user_id      uuid primary key,
  status       text not null default 'dismissed',
  note         text,
  reviewed_by  uuid,
  reviewed_at  timestamptz not null default now()
);

-- Aucune règle d'accès : ces tables ne sont lisibles / modifiables que par les fonctions ci-dessous
alter table public.user_restrictions enable row level security;
alter table public.admin_audit_log   enable row level security;
alter table public.user_flags        enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- 2) OUTILS INTERNES
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.control_assert_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (
       select 1 from public.profiles p
       where p.id = uid and (p.role = 'admin' or coalesce((to_jsonb(p) ->> 'is_admin')::boolean, false))) then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  return uid;
end;
$$;

create or replace function public.control_log(p_action text, p_targets uuid[], p_details jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare t uuid;
begin
  if p_targets is null or array_length(p_targets, 1) is null then
    insert into public.admin_audit_log (admin_id, action, target_user, details) values (auth.uid(), p_action, null, p_details);
    return;
  end if;
  foreach t in array p_targets[1:200] loop
    insert into public.admin_audit_log (admin_id, action, target_user, details) values (auth.uid(), p_action, t, p_details);
  end loop;
end;
$$;

create or replace function public.control_kill_sessions(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin delete from auth.refresh_tokens where user_id = any (array(select x::text from unnest(p_ids) x)); exception when others then null; end;
  begin delete from auth.sessions where user_id = any (p_ids); exception when others then null; end;
end;
$$;

-- Lève une erreur claire si la fonction est coupée (pour tous, ou pour cet utilisateur)
create or replace function public.assert_not_restricted(p_user_id uuid, p_feature text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare r record;
begin
  if p_user_id is null then return; end if;

  select value, (select s2.value from public.app_settings s2 where s2.key = 'feature_off_reason_' || p_feature) as reason
    into r from public.app_settings where key = 'feature_off_' || p_feature;
  if found and r.value = 'true' then
    raise exception 'Cette fonctionnalité est temporairement désactivée%', coalesce(' : ' || nullif(r.reason, ''), '.')
      using errcode = 'XA001';
  end if;

  select reason into r from public.user_restrictions
   where user_id = p_user_id and feature = p_feature and active and (expires_at is null or expires_at > now()) limit 1;
  if found then
    raise exception 'Cette fonctionnalité est désactivée pour ton compte%', coalesce(' : ' || nullif(r.reason, ''), '.')
      using errcode = 'XA001';
  end if;
end;
$$;

create or replace function public.control_restrict_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_not_restricted(nullif(to_jsonb(NEW) ->> TG_ARGV[1], '')::uuid, TG_ARGV[0]);
  return NEW;
end;
$$;

-- Application sur les tables concernées (celles qui existent)
do $$
declare t record;
begin
  for t in select * from (values
      ('task_submissions',  'user_id',   'tasks'),
      ('ad_submissions',    'user_id',   'diffusion'),
      ('campaigns',         'user_id',   'campaigns'),
      ('withdrawals',       'user_id',   'withdraw'),
      ('bonus_withdrawals', 'user_id',   'withdraw'),
      ('messages',          'sender_id', 'messages'),
      ('treasure_attempts', 'user_id',   'treasures')
    ) as v(tbl, col, feat)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop trigger if exists control_restrict on public.%I', t.tbl);
      execute format('create trigger control_restrict before insert on public.%I for each row execute function public.control_restrict_trigger(%L, %L)', t.tbl, t.feat, t.col);
      raise notice 'Contrôle activé sur : % (%)', t.tbl, t.feat;
    end if;
  end loop;
end $$;

revoke all on function public.control_log(text, uuid[], jsonb)       from public, anon, authenticated;
revoke all on function public.control_kill_sessions(uuid[])          from public, anon, authenticated;
revoke all on function public.assert_not_restricted(uuid, text)      from public, anon, authenticated;
revoke all on function public.control_restrict_trigger()             from public, anon, authenticated;
revoke all on function public.control_assert_admin()                 from public, anon;
grant execute on function public.control_assert_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 3) ACTIONS D'ADMIN (toutes journalisées)
-- ─────────────────────────────────────────────────────────────────────

-- Restreindre / rétablir UNE fonction pour un ou plusieurs utilisateurs
create or replace function public.control_set_restriction(
  p_user_ids uuid[], p_feature text, p_enable boolean, p_reason text default null, p_until timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.control_assert_admin();
  v_ids   uuid[];
  v_uid   uuid;
begin
  if p_feature is null or not (p_feature = any (array['tasks','diffusion','campaigns','withdraw','messages','treasures'])) then
    return jsonb_build_object('success', false, 'error', 'Fonction inconnue');
  end if;
  if p_enable and p_until is not null and p_until <= now() then
    return jsonb_build_object('success', false, 'error', 'La date de fin doit être dans le futur.');
  end if;

  -- on ne vise jamais un administrateur
  select coalesce(array_agg(pr.id), '{}') into v_ids from public.profiles pr
   where pr.id = any (p_user_ids) and coalesce(pr.role, '') <> 'admin' and not coalesce((to_jsonb(pr) ->> 'is_admin')::boolean, false);

  foreach v_uid in array v_ids loop
    update public.user_restrictions set active = false where user_id = v_uid and feature = p_feature and active;
    if p_enable then
      insert into public.user_restrictions (user_id, feature, reason, created_by, expires_at)
      values (v_uid, p_feature, nullif(trim(coalesce(p_reason, '')), ''), v_admin, p_until);
    end if;
  end loop;

  perform public.control_log(case when p_enable then 'restriction_activee' else 'restriction_levee' end, v_ids,
                             jsonb_build_object('fonction', p_feature, 'motif', p_reason, 'jusqua', p_until));
  return jsonb_build_object('success', true, 'affected', coalesce(array_length(v_ids, 1), 0));
end;
$$;

-- Suspendre (jusqu'à une date) ou bloquer (définitif) : déconnexion immédiate + impossible de se reconnecter
create or replace function public.control_ban_users(
  p_user_ids uuid[], p_until timestamptz, p_reason text default null, p_block boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.control_assert_admin();
  v_ids   uuid[];
  v_until timestamptz := case when p_block then timestamptz '2999-01-01' else p_until end;
begin
  if not p_block and (p_until is null or p_until <= now()) then
    return jsonb_build_object('success', false, 'error', 'La date de fin doit être dans le futur.');
  end if;

  select coalesce(array_agg(pr.id), '{}') into v_ids from public.profiles pr
   where pr.id = any (p_user_ids) and coalesce(pr.role, '') <> 'admin' and not coalesce((to_jsonb(pr) ->> 'is_admin')::boolean, false);

  if array_length(v_ids, 1) is null then
    return jsonb_build_object('success', false, 'error', 'Aucun utilisateur valide (les admins ne peuvent pas être visés).');
  end if;

  update auth.users set banned_until = v_until where id = any (v_ids);
  if p_block then update public.profiles set is_blocked = true where id = any (v_ids); end if;

  update public.user_restrictions set active = false where user_id = any (v_ids) and feature = 'account' and active;
  insert into public.user_restrictions (user_id, feature, reason, created_by, expires_at)
  select u, 'account', nullif(trim(coalesce(p_reason, '')), ''), v_admin, case when p_block then null else p_until end
  from unnest(v_ids) u;

  perform public.control_kill_sessions(v_ids);
  perform public.control_log(case when p_block then 'blocage' else 'suspension' end, v_ids,
                             jsonb_build_object('motif', p_reason, 'jusqua', case when p_block then null else p_until end));
  return jsonb_build_object('success', true, 'affected', array_length(v_ids, 1));
end;
$$;

create or replace function public.control_unban_users(p_user_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.control_assert_admin();
begin
  update auth.users set banned_until = null where id = any (p_user_ids);
  update public.profiles set is_blocked = false where id = any (p_user_ids);
  update public.user_restrictions set active = false where user_id = any (p_user_ids) and feature = 'account' and active;
  perform public.control_log('rehabilitation', p_user_ids, '{}'::jsonb);
  return jsonb_build_object('success', true, 'affected', coalesce(array_length(p_user_ids, 1), 0));
end;
$$;

create or replace function public.control_force_logout(p_user_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  perform public.control_kill_sessions(p_user_ids);
  perform public.control_log('deconnexion_forcee', p_user_ids, '{}'::jsonb);
  return jsonb_build_object('success', true);
end;
$$;

-- Interrupteurs globaux (couper une fonction pour tout le monde)
create or replace function public.control_set_global_feature(p_feature text, p_off boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  if not (p_feature = any (array['tasks','diffusion','campaigns','withdraw','messages','treasures'])) then
    return jsonb_build_object('success', false, 'error', 'Fonction inconnue');
  end if;
  insert into public.app_settings (key, value, updated_at) values
    ('feature_off_' || p_feature, case when p_off then 'true' else 'false' end, now()),
    ('feature_off_reason_' || p_feature, coalesce(nullif(trim(coalesce(p_reason, '')), ''), ''), now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  perform public.control_log(case when p_off then 'coupure_globale' else 'reprise_globale' end, null,
                             jsonb_build_object('fonction', p_feature, 'motif', p_reason));
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.control_get_global_features()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((
    select jsonb_object_agg(f, jsonb_build_object(
             'off', coalesce((select value = 'true' from public.app_settings where key = 'feature_off_' || f), false),
             'reason', coalesce((select value from public.app_settings where key = 'feature_off_reason_' || f), '')))
    from unnest(array['tasks','diffusion','campaigns','withdraw','messages','treasures']) f), '{}'::jsonb);
end;
$$;

create or replace function public.control_dismiss_suspect(p_user_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid := public.control_assert_admin();
begin
  insert into public.user_flags (user_id, status, note, reviewed_by, reviewed_at)
  values (p_user_id, 'dismissed', p_note, v_admin, now())
  on conflict (user_id) do update set status = 'dismissed', note = excluded.note, reviewed_by = excluded.reviewed_by, reviewed_at = now();
  perform public.control_log('suspect_ecarte', array[p_user_id], jsonb_build_object('note', p_note));
  return jsonb_build_object('success', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4) LECTURES
-- ─────────────────────────────────────────────────────────────────────

-- Vue d'ensemble
create or replace function public.control_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return jsonb_build_object(
    'users_total',        (select count(*) from public.profiles),
    'users_new_24h',      (select count(*) from public.profiles p where (to_jsonb(p) ->> 'created_at')::timestamptz > now() - interval '24 hours'),
    'users_new_7d',       (select count(*) from public.profiles p where (to_jsonb(p) ->> 'created_at')::timestamptz > now() - interval '7 days'),
    'online_now',         (select count(distinct user_id) from public.user_presence where last_seen > now() - interval '2 minutes'),
    'active_24h',         (select count(distinct user_id) from public.user_presence where last_seen > now() - interval '24 hours'),
    'premium',            (select count(*) from public.profiles where coalesce(is_premium, false)),
    'blocked',            (select count(*) from public.profiles where coalesce(is_blocked, false)),
    'restricted',         (select count(distinct user_id) from public.user_restrictions where active and feature <> 'account' and (expires_at is null or expires_at > now())),
    'suspended',          (select count(*) from auth.users where banned_until is not null and banned_until > now()),
    'balance_total',      (select coalesce(sum(balance), 0) from public.profiles),
    'coins_total',        (select coalesce(sum(coins_balance), 0) from public.profiles),
    'bonus_available',    (select coalesce(sum(amount), 0) from public.bonus_earnings where status = 'available'),
    'withdrawals_pending',        (select count(*) from public.withdrawals where status = 'pending'),
    'withdrawals_pending_amount', (select coalesce(sum(amount), 0) from public.withdrawals where status = 'pending'),
    'task_proofs_pending',(select count(*) from public.task_submissions where status = 'pending'),
    'ad_proofs_pending',  (select count(*) from public.ad_submissions where status = 'pending'),
    'campaigns_pending',  (select count(*) from public.campaigns where status = 'pending'),
    'payments_stuck',     (select count(*) from public.leekpay_payments lp where lp.status = 'pending' and (to_jsonb(lp) ->> 'created_at')::timestamptz < now() - interval '30 minutes'),
    'global_off',         coalesce((select jsonb_agg(replace(key, 'feature_off_', '')) from public.app_settings where key like 'feature\_off\_%' and key not like 'feature\_off\_reason\_%' and value = 'true'), '[]'::jsonb)
  );
end;
$$;

-- Santé du site (plan gratuit : base 500 Mo, stockage 1 Go)
create or replace function public.control_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_storage bigint := null;
begin
  perform public.control_assert_admin();
  begin
    select coalesce(sum((metadata ->> 'size')::bigint), 0) into v_storage from storage.objects;
  exception when others then v_storage := null;
  end;
  return jsonb_build_object(
    'db_size_bytes',      pg_database_size(current_database()),
    'storage_bytes',      v_storage,
    'rows', jsonb_build_object(
      'profiles',         (select count(*) from public.profiles),
      'messages',         (select count(*) from public.messages),
      'task_submissions', (select count(*) from public.task_submissions),
      'ad_submissions',   (select count(*) from public.ad_submissions),
      'notifications',    (select count(*) from public.notifications)),
    'withdrawals_over_72h', (select count(*) from public.withdrawals w where w.status = 'pending' and (to_jsonb(w) ->> 'created_at')::timestamptz < now() - interval '72 hours'),
    'proofs_over_24h',      (select count(*) from public.task_submissions s where s.status = 'pending' and (to_jsonb(s) ->> 'created_at')::timestamptz < now() - interval '24 hours')
                          + (select count(*) from public.ad_submissions a where a.status = 'pending' and (to_jsonb(a) ->> 'created_at')::timestamptz < now() - interval '24 hours'),
    'payments_stuck',       (select count(*) from public.leekpay_payments lp where lp.status = 'pending' and (to_jsonb(lp) ->> 'created_at')::timestamptz < now() - interval '30 minutes'),
    'server_time',          now()
  );
end;
$$;

-- Flux en direct
create or replace function public.control_live_feed(p_since timestamptz default null, p_limit integer default 60)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_since timestamptz := coalesce(p_since, now() - interval '24 hours');
begin
  perform public.control_assert_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(e) order by e.ts desc) from (
      select * from (
        select (to_jsonb(p) ->> 'created_at')::timestamptz as ts, 'signup'::text as kind, p.id as uid, p.full_name as user_name, 'Nouvelle inscription'::text as label
          from public.profiles p
        union all
        select (to_jsonb(s) ->> 'created_at')::timestamptz, 'task', s.user_id, pr.full_name, 'Preuve de tâche (' || coalesce(s.status, '?') || ') : ' || coalesce(t.title, '')
          from public.task_submissions s left join public.profiles pr on pr.id = s.user_id left join public.tasks t on t.id = s.task_id
        union all
        select (to_jsonb(a) ->> 'created_at')::timestamptz, 'diffusion', a.user_id, pr.full_name, 'Diffusion (' || coalesce(a.status, '?') || ')'
          from public.ad_submissions a left join public.profiles pr on pr.id = a.user_id
        union all
        select (to_jsonb(w) ->> 'created_at')::timestamptz, 'withdrawal', w.user_id, pr.full_name, 'Retrait ' || coalesce(w.amount::text, '?') || ' F (' || coalesce(w.status, '?') || ')'
          from public.withdrawals w left join public.profiles pr on pr.id = w.user_id
        union all
        select (to_jsonb(lp) ->> 'created_at')::timestamptz, 'payment', lp.user_id, pr.full_name, 'Paiement LeekPay ' || coalesce(lp.amount::text, '?') || ' F (' || coalesce(lp.status, '?') || ')'
          from public.leekpay_payments lp left join public.profiles pr on pr.id = lp.user_id
        union all
        select al.created_at, 'admin', al.target_user, pr.full_name, 'Admin : ' || al.action
          from public.admin_audit_log al left join public.profiles pr on pr.id = al.target_user
      ) u
      where u.ts is not null and u.ts > v_since
      order by u.ts desc
      limit greatest(1, least(coalesce(p_limit, 60), 200))
    ) e), '[]'::jsonb);
end;
$$;

-- Recherche / liste des utilisateurs
create or replace function public.control_search_users(
  p_query text default '', p_filter text default 'all', p_limit integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_q text := '%' || lower(trim(coalesce(p_query, ''))) || '%';
begin
  perform public.control_assert_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(x)) from (
      select * from (
        select p.id, p.full_name, p.phone, p.level, coalesce(p.is_premium, false) as is_premium, p.role,
               coalesce(p.balance, 0) as balance, coalesce(p.coins_balance, 0) as coins_balance,
               coalesce(p.is_blocked, false) as is_blocked,
               (to_jsonb(p) ->> 'created_at')::timestamptz as created_at,
               au.email, pr.last_seen,
               coalesce(pr.last_seen > now() - interval '2 minutes', false) as online,
               (au.banned_until is not null and au.banned_until > now()) as suspended,
               coalesce((select array_agg(r.feature) from public.user_restrictions r
                          where r.user_id = p.id and r.active and (r.expires_at is null or r.expires_at > now())), '{}') as restrictions
        from public.profiles p
        left join auth.users au on au.id = p.id
        left join lateral (select max(last_seen) as last_seen from public.user_presence where user_id = p.id) pr on true
      ) u
      where (trim(coalesce(p_query, '')) = ''
             or lower(coalesce(u.full_name, '')) like v_q or coalesce(u.phone, '') like v_q
             or lower(coalesce(u.email, '')) like v_q or u.id::text like v_q)
        and case coalesce(p_filter, 'all')
              when 'online'     then u.online
              when 'restricted' then cardinality(u.restrictions) > 0
              when 'blocked'    then u.is_blocked or u.suspended
              when 'premium'    then u.is_premium
              when 'new24h'     then u.created_at > now() - interval '24 hours'
              else true end
      order by u.online desc, u.last_seen desc nulls last, u.created_at desc nulls last
      limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0)
    ) x), '[]'::jsonb);
end;
$$;

-- Fiche utilisateur 360°
create or replace function public.control_user_360(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  perform public.control_assert_admin();
  select jsonb_build_object(
    'id', p.id, 'full_name', p.full_name, 'phone', p.phone, 'email', au.email, 'role', p.role, 'level', p.level,
    'is_premium', coalesce(p.is_premium, false), 'is_blocked', coalesce(p.is_blocked, false),
    'balance', coalesce(p.balance, 0), 'coins_balance', coalesce(p.coins_balance, 0),
    'created_at', (to_jsonb(p) ->> 'created_at')::timestamptz,
    'last_seen', (select max(last_seen) from public.user_presence where user_id = p.id),
    'banned_until', au.banned_until,
    'referred_by', p.referred_by,
    'referred_by_name', (select full_name from public.profiles where id = p.referred_by),
    'referrals', (select count(*) from public.profiles where referred_by = p.id),
    'same_phone_accounts', (select count(*) from public.profiles o
                             where o.id <> p.id and length(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')) >= 8
                               and regexp_replace(coalesce(o.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(p.phone, ''), '\D', '', 'g')),
    'tasks', jsonb_build_object(
        'approved', (select count(*) from public.task_submissions where user_id = p.id and status = 'approved'),
        'rejected', (select count(*) from public.task_submissions where user_id = p.id and status = 'rejected'),
        'pending',  (select count(*) from public.task_submissions where user_id = p.id and status = 'pending')),
    'ads', jsonb_build_object(
        'validated', (select count(*) from public.ad_submissions where user_id = p.id and status = 'validated'),
        'rejected',  (select count(*) from public.ad_submissions where user_id = p.id and status = 'rejected'),
        'pending',   (select count(*) from public.ad_submissions where user_id = p.id and status in ('pending', 'en_attente_proof'))),
    'campaigns', (select count(*) from public.campaigns where user_id = p.id),
    'messages_24h', (select count(*) from public.messages where sender_id = p.id and (to_jsonb(messages) ->> 'created_at')::timestamptz > now() - interval '24 hours'),
    'restrictions', coalesce((select jsonb_agg(jsonb_build_object('feature', r.feature, 'reason', r.reason, 'expires_at', r.expires_at, 'created_at', r.created_at) order by r.created_at desc)
                               from public.user_restrictions r where r.user_id = p.id and r.active and (r.expires_at is null or r.expires_at > now())), '[]'::jsonb),
    'withdrawals', coalesce((select jsonb_agg(jsonb_build_object('amount', w.amount, 'status', w.status, 'created_at', (to_jsonb(w) ->> 'created_at')::timestamptz) order by (to_jsonb(w) ->> 'created_at')::timestamptz desc)
                              from (select * from public.withdrawals where user_id = p.id order by (to_jsonb(withdrawals) ->> 'created_at')::timestamptz desc nulls last limit 10) w), '[]'::jsonb),
    'timeline', coalesce((
        select jsonb_agg(to_jsonb(e) order by e.ts desc) from (
          select * from (
            select (to_jsonb(s) ->> 'created_at')::timestamptz as ts, 'task'::text as kind, 'Preuve de tâche (' || coalesce(s.status, '?') || ')' as label from public.task_submissions s where s.user_id = p.id
            union all
            select (to_jsonb(a) ->> 'created_at')::timestamptz, 'diffusion', 'Diffusion (' || coalesce(a.status, '?') || ')' from public.ad_submissions a where a.user_id = p.id
            union all
            select (to_jsonb(w) ->> 'created_at')::timestamptz, 'withdrawal', 'Retrait ' || coalesce(w.amount::text, '?') || ' F (' || coalesce(w.status, '?') || ')' from public.withdrawals w where w.user_id = p.id
            union all
            select al.created_at, 'admin', 'Admin : ' || al.action || coalesce(' — ' || (al.details ->> 'motif'), '') from public.admin_audit_log al where al.target_user = p.id
          ) u where u.ts is not null order by u.ts desc limit 30) e), '[]'::jsonb)
  ) into v
  from public.profiles p left join auth.users au on au.id = p.id
  where p.id = p_user_id;

  return coalesce(v, jsonb_build_object('error', 'Utilisateur introuvable'));
end;
$$;

-- Comptes qui partagent une même adresse IP de connexion (≥ 4 comptes). Sans effet si l'information n'est pas disponible.
create or replace function public.control_shared_ip_map()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.user_id, 'n', t.n))
    from (
      select s.user_id, count(*) over (partition by s.ip) as n
      from (select distinct user_id, ip::text as ip from auth.sessions where ip is not null) s
    ) t
    where t.n >= 4), '[]'::jsonb);
exception when others then
  return '[]'::jsonb;
end;
$$;

-- Comptes suspects (score de risque)
create or replace function public.control_suspects_core(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce((
    with prof as (
      select p.id, p.full_name, p.phone, p.referred_by, coalesce(p.balance, 0) as balance,
             regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') as phone_d,
             (to_jsonb(p) ->> 'created_at')::timestamptz as created
      from public.profiles p
      where not coalesce(p.is_blocked, false) and coalesce(p.role, '') <> 'admin'
    ),
    shared_phone as (
      select id, count(*) over (partition by phone_d) - 1 as others from prof where length(phone_d) >= 8
    ),
    ref_burst as (
      select referred_by as id, count(*) as n from prof
       where referred_by is not null and created > now() - interval '24 hours'
       group by referred_by having count(*) >= 5
    ),
    fresh_wd as (
      select w.user_id as id, count(*) as n from public.withdrawals w join prof p on p.id = w.user_id
       where (to_jsonb(w) ->> 'created_at')::timestamptz < p.created + interval '48 hours'
       group by w.user_id
    ),
    flood as (
      select s.user_id as id, count(*) as n from public.task_submissions s
       where (to_jsonb(s) ->> 'created_at')::timestamptz > now() - interval '2 hours'
       group by s.user_id having count(*) >= 10
    ),
    rejects as (
      select s.user_id as id, count(*) as total, count(*) filter (where s.status = 'rejected') as rej
        from public.task_submissions s group by s.user_id
      having count(*) >= 5 and count(*) filter (where s.status = 'rejected') >= 0.6 * count(*)
    ),
    pend_wd as (
      select user_id as id, count(*) as n from public.withdrawals where status = 'pending' group by user_id having count(*) >= 3
    ),
    wd as (
      select w.user_id, regexp_replace(coalesce(to_jsonb(w) ->> 'phone', to_jsonb(w) ->> 'phone_number', ''), '\D', '', 'g') as pd from public.withdrawals w
    ),
    wd_shared as (
      select user_id as id, count(*) as n from wd
       where length(pd) >= 8 and pd in (select pd from wd where length(pd) >= 8 group by pd having count(distinct user_id) > 1)
       group by user_id
    ),
    idle_refs as (
      select r.referred_by as id, count(*) as n
        from prof r
       where r.referred_by is not null
       group by r.referred_by
      having count(*) >= 8
         and count(*) filter (where not exists (select 1 from public.task_submissions ts where ts.user_id = r.id)) >= 0.8 * count(*)
    ),
    shared_ip as (
      select (e ->> 'id')::uuid as id, (e ->> 'n')::int as n from jsonb_array_elements(public.control_shared_ip_map()) e
    ),
    scored as (
      select p.id, p.full_name, p.phone, p.balance, p.created,
        (case when sp.others > 0 then 40 else 0 end) + (case when rb.id is not null then 35 else 0 end)
        + (case when fw.id is not null then 30 else 0 end) + (case when fl.id is not null then 30 else 0 end)
        + (case when rj.id is not null then 25 else 0 end) + (case when pw.id is not null then 20 else 0 end)
        + (case when ws.id is not null then 40 else 0 end) + (case when ir.id is not null then 25 else 0 end)
        + (case when si.id is not null then 20 else 0 end) as score,
        array_remove(array[
          case when sp.others > 0 then 'Même numéro que ' || sp.others || ' autre(s) compte(s)' end,
          case when rb.id is not null then rb.n || ' filleuls inscrits en 24 h' end,
          case when fw.id is not null then 'Retrait demandé moins de 48 h après l''inscription' end,
          case when fl.id is not null then fl.n || ' preuves de tâches en 2 h' end,
          case when rj.id is not null then rj.rej || ' preuves rejetées sur ' || rj.total end,
          case when pw.id is not null then pw.n || ' retraits en attente' end,
          case when ws.id is not null then 'Même numéro de paiement que d''autres comptes' end,
          case when ir.id is not null then 'Filleuls sans aucune activité (' || ir.n || ' filleuls)' end,
          case when si.id is not null then 'Même adresse IP que ' || (si.n - 1) || ' autre(s) compte(s)' end
        ], null) as reasons
      from prof p
      left join shared_phone sp on sp.id = p.id
      left join ref_burst rb on rb.id = p.id
      left join fresh_wd fw on fw.id = p.id
      left join flood fl on fl.id = p.id
      left join rejects rj on rj.id = p.id
      left join pend_wd pw on pw.id = p.id
      left join wd_shared ws on ws.id = p.id
      left join idle_refs ir on ir.id = p.id
      left join shared_ip si on si.id = p.id
    )
    select jsonb_agg(to_jsonb(s) order by s.score desc, s.created desc) from (
      select * from scored sc
       where sc.score >= 30
         and not exists (select 1 from public.user_flags f where f.user_id = sc.id and f.status = 'dismissed' and f.reviewed_at > now() - interval '30 days')
       order by sc.score desc, sc.created desc
       limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) s
  ), '[]'::jsonb);
end;
$$;

create or replace function public.control_suspects(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return public.control_suspects_core(p_limit);
end;
$$;

create or replace function public.control_audit_log(p_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.control_assert_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(x)) from (
      select a.created_at, a.action, a.details, a.admin_id, ap.full_name as admin_name, a.target_user, tp.full_name as target_name
        from public.admin_audit_log a
        left join public.profiles ap on ap.id = a.admin_id
        left join public.profiles tp on tp.id = a.target_user
       order by a.created_at desc
       limit greatest(1, least(coalesce(p_limit, 100), 500))
    ) x), '[]'::jsonb);
end;
$$;

-- Pour l'utilisateur : ses propres restrictions (afficher un bandeau d'information)
create or replace function public.get_my_restrictions()
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
    'restrictions', coalesce((select jsonb_agg(jsonb_build_object('feature', r.feature, 'reason', r.reason, 'expires_at', r.expires_at))
                               from public.user_restrictions r
                              where r.user_id = uid and r.active and r.feature <> 'account' and (r.expires_at is null or r.expires_at > now())), '[]'::jsonb),
    'global_off', coalesce((select jsonb_agg(replace(key, 'feature_off_', '')) from public.app_settings
                             where key like 'feature\_off\_%' and key not like 'feature\_off\_reason\_%' and value = 'true'), '[]'::jsonb));
end;
$$;

-- Fonctions internes : jamais appelables depuis l'app
revoke all on function public.control_suspects_core(integer) from public, anon, authenticated;
revoke all on function public.control_shared_ip_map()        from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5) DROITS
-- ─────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and p.proname in ('control_set_restriction','control_ban_users','control_unban_users','control_force_logout',
                               'control_set_global_feature','control_get_global_features','control_dismiss_suspect',
                               'control_overview','control_health','control_live_feed','control_search_users',
                               'control_user_360','control_suspects','control_audit_log','get_my_restrictions')
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 6) RETRAIT DE JETONS : afficher le vrai motif quand il est bloqué
--    (même fonction que dans 07, avec un traitement à part des blocages de la tour de contrôle)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.request_coin_withdrawal(p_user_id uuid, p_coins integer, p_method text, p_phone text)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  uid           uuid := auth.uid();
  rates         jsonb := public.get_coin_rates();
  v_rate        numeric := (rates ->> 'fcfa_per_coin')::numeric;
  v_min_fcfa    numeric := (rates ->> 'min_withdraw_fcfa')::numeric;
  v_coins       integer;
  v_fcfa        integer;
  v_phone       text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_withdrawal  text;
begin
  if uid is null or p_user_id is distinct from uid then
    return json_build_object('success', false, 'error', 'Action non autorisée.');
  end if;
  if p_coins is null or p_coins < 1 then
    return json_build_object('success', false, 'error', 'Montant invalide.');
  end if;
  if p_coins > 100000000 then
    return json_build_object('success', false, 'error', 'Montant trop élevé.');
  end if;
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    return json_build_object('success', false, 'error', 'Numéro de téléphone invalide.');
  end if;
  if length(trim(coalesce(p_method, ''))) < 2 or length(p_method) > 50 then
    return json_build_object('success', false, 'error', 'Moyen de retrait invalide.');
  end if;

  v_fcfa := floor(p_coins * v_rate)::integer;
  if v_fcfa < v_min_fcfa then
    return json_build_object('success', false,
      'error', 'Minimum ' || round(v_min_fcfa)::bigint || ' FCFA (soit ' || ceil(v_min_fcfa / v_rate)::bigint || ' jetons).');
  end if;

  select coins_balance into v_coins from public.profiles where id = uid for update;
  if v_coins is null then
    return json_build_object('success', false, 'error', 'Utilisateur introuvable.');
  end if;
  if v_coins < p_coins then
    return json_build_object('success', false, 'error', 'Solde de jetons insuffisant.');
  end if;

  insert into public.withdrawals (user_id, amount, method, phone, status, type)
  values (uid, v_fcfa, trim(p_method), v_phone, 'pending', 'coins_exchange')
  returning id::text into v_withdrawal;

  update public.profiles set coins_balance = coins_balance - p_coins where id = uid;

  insert into public.notifications (user_id, title, message, link)
  values (uid, 'Demande de retrait envoyée',
          'Ta demande de ' || v_fcfa || ' FCFA est en cours de traitement.', '/dashboard/historique');

  return json_build_object('success', true, 'fcfa_amount', v_fcfa, 'withdrawal_id', v_withdrawal);
exception
  when sqlstate 'XA001' then
    return json_build_object('success', false, 'error', sqlerrm);
  when others then
    raise warning 'request_coin_withdrawal: %', sqlerrm;
    return json_build_object('success', false, 'error', 'Une erreur est survenue. Réessaie.');
end;
$function$;

revoke all on function public.request_coin_withdrawal(uuid, integer, text, text) from public, anon;
grant execute on function public.request_coin_withdrawal(uuid, integer, text, text) to authenticated;
