begin;
alter table public.goods_posts add column deleted_at timestamptz;
create index goods_posts_owner_live on public.goods_posts(created_by,created_at desc) where deleted_at is null;
drop policy goods_read on public.goods_posts;
drop policy goods_public_read on public.goods_posts;
drop policy goods_insert on public.goods_posts;
drop policy goods_publish on public.goods_posts;
create policy goods_read on public.goods_posts for select to authenticated using(deleted_at is null and (is_published or created_by=(select auth.uid())));
create policy goods_public_read on public.goods_posts for select to anon using(deleted_at is null and is_published);
create policy goods_insert on public.goods_posts for insert to authenticated with check(created_by=(select auth.uid()) and deleted_at is null);
create policy goods_owner_update on public.goods_posts for update to authenticated using(created_by=(select auth.uid()) and deleted_at is null) with check(created_by=(select auth.uid()) and deleted_at is null);
grant insert(created_by) on public.goods_posts to authenticated;
grant update(title,source_url,work_name,character_names,sale_status,sale_info,sale_start,sale_end,thumbnail_url,is_published,seller_name,platform_name,is_test,genre_name) on public.goods_posts to authenticated;
create function private.lock_goods_owner() returns trigger language plpgsql set search_path='' as $$
begin
 if auth.role()='authenticated' then
  if TG_OP='INSERT' and new.created_by is distinct from auth.uid() then raise exception 'Owner must be the signed-in user' using errcode='42501';end if;
  if TG_OP='UPDATE' and new.created_by is distinct from old.created_by then raise exception 'Owner cannot be changed' using errcode='42501';end if;
 end if;
 return new;
end $$;
create trigger lock_goods_owner before insert or update on public.goods_posts for each row execute function private.lock_goods_owner();
create function public.delete_my_goods(post_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501';end if;
 update public.goods_posts set is_published=false,deleted_at=now() where id=post_id and created_by=auth.uid() and deleted_at is null;
 if not found then raise exception 'No owned active post found' using errcode='42501';end if;
end $$;
revoke all on function public.delete_my_goods(uuid) from public,anon;
grant execute on function public.delete_my_goods(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
