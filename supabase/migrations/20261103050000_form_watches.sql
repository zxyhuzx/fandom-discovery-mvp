begin;
create table public.goods_form_watches (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 goods_post_id uuid not null references public.goods_posts(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (user_id,goods_post_id)
);
alter table public.goods_form_watches enable row level security;
revoke all on public.goods_form_watches from anon,authenticated;
grant select,insert,delete on public.goods_form_watches to authenticated;
create policy watches_own_read on public.goods_form_watches for select to authenticated using (user_id=(select auth.uid()));
create policy watches_own_insert on public.goods_form_watches for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.goods_posts p where p.id=goods_post_id and p.is_published and not p.is_test)
);
create policy watches_own_delete on public.goods_form_watches for delete to authenticated using (user_id=(select auth.uid()));
notify pgrst,'reload schema';
commit;
