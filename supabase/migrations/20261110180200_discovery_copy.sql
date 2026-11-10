begin;
update public.goods_posts set sale_info='괴담출근 최솔 회지의 현장수령·통판 선입금 공지입니다. 안내 기간은 11월 8일 00:01~21일 23:59이며, TMM 폼과 선입금 특전 안내가 있습니다. 현재 참여 가능 여부는 원문을 확인해 주세요.' where source_kind='x_discovery' and source_url='https://x.com/i/status/2119106208238117232';
update public.goods_posts set sale_info='괴담출근과 리제로 굿즈를 함께 안내하는 통판 공지입니다. 안내 기간은 11월 6일 18:00~12일 23:59입니다. 전체 품목과 현재 참여 가능 여부는 원문의 폼을 확인해 주세요.' where source_kind='x_discovery' and source_url='https://x.com/i/status/2118313611873632386';
commit;
