-- 농산물 유통 재고·순이익 관리 시스템 — Supabase 스키마
-- Supabase 프로젝트 생성 후 SQL Editor에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록 IF NOT EXISTS / OR REPLACE를 사용합니다.

create table if not exists items (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null check (category in ('원물', '박스')),
  unit text not null default '개',
  sale_price numeric not null default 0,
  cost_price numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists items_name_category_key on items (name, category);

create table if not exists stock_movements (
  id bigint generated always as identity primary key,
  movement_date date not null default current_date,
  item_id bigint not null references items(id) on delete restrict,
  movement_type text not null check (movement_type in ('입고', '출하', '폐기', '조정')),
  quantity numeric not null check (quantity >= 0),
  unit_cost numeric,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_date_idx on stock_movements (movement_date);
create index if not exists stock_movements_item_idx on stock_movements (item_id);

create table if not exists daily_revenue (
  id bigint generated always as identity primary key,
  revenue_date date not null,
  amount numeric not null check (amount >= 0),
  channel text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists daily_revenue_date_idx on daily_revenue (revenue_date);

-- 품목별 현재 재고 = 입고 - 출하 - 폐기 (+조정은 그대로 더함, 마이너스로 넣으면 차감됨)
create or replace view v_stock_current as
select
  i.id as item_id,
  i.name,
  i.category,
  i.unit,
  coalesce(sum(case
    when sm.movement_type = '입고' then sm.quantity
    when sm.movement_type = '조정' then sm.quantity
    when sm.movement_type in ('출하', '폐기') then -sm.quantity
    else 0
  end), 0) as current_stock
from items i
left join stock_movements sm on sm.item_id = i.id
where i.active
group by i.id, i.name, i.category, i.unit;

-- 날짜별 매출 / 원가(COGS) / 폐기손실 / 순이익
create or replace view v_daily_summary as
with revenue as (
  select revenue_date as date, sum(amount) as revenue
  from daily_revenue
  group by revenue_date
),
cogs as (
  select sm.movement_date as date, sum(sm.quantity * coalesce(sm.unit_cost, i.cost_price)) as cogs
  from stock_movements sm
  join items i on i.id = sm.item_id
  where sm.movement_type = '출하'
  group by sm.movement_date
),
waste as (
  select sm.movement_date as date, sum(sm.quantity * coalesce(sm.unit_cost, i.cost_price)) as waste_cost
  from stock_movements sm
  join items i on i.id = sm.item_id
  where sm.movement_type = '폐기'
  group by sm.movement_date
),
dates as (
  select date from revenue
  union
  select date from cogs
  union
  select date from waste
)
select
  d.date,
  coalesce(r.revenue, 0) as revenue,
  coalesce(c.cogs, 0) as cogs,
  coalesce(w.waste_cost, 0) as waste_cost,
  coalesce(r.revenue, 0) - coalesce(c.cogs, 0) - coalesce(w.waste_cost, 0) as net_profit
from dates d
left join revenue r on r.date = d.date
left join cogs c on c.date = d.date
left join waste w on w.date = d.date
order by d.date;

-- V1 보안 참고: anon key가 클라이언트 JS에 노출되므로, RLS를 켜지 않으면 URL을 아는 누구나 읽기/쓰기가 가능합니다.
-- 지금은 "URL 비공개" 수준으로 운영하고, 필요해지면 Supabase Auth(이메일 로그인)로 강화하세요.
alter table items enable row level security;
alter table stock_movements enable row level security;
alter table daily_revenue enable row level security;

drop policy if exists "public read/write items" on items;
create policy "public read/write items" on items for all using (true) with check (true);

drop policy if exists "public read/write stock_movements" on stock_movements;
create policy "public read/write stock_movements" on stock_movements for all using (true) with check (true);

drop policy if exists "public read/write daily_revenue" on daily_revenue;
create policy "public read/write daily_revenue" on daily_revenue for all using (true) with check (true);
