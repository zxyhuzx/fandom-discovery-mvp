begin;
alter table public.goods_posts add column genre_name text not null default '' check(char_length(genre_name)<=80);
grant select(genre_name) on public.goods_posts to anon;
grant insert(genre_name) on public.goods_posts to authenticated;
notify pgrst,'reload schema';
commit;
