-- 농산물 유통 재고·순이익 관리 시스템 — Supabase 스키마
-- Supabase 프로젝트 생성 후 SQL Editor에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록 IF NOT EXISTS / OR REPLACE를 사용합니다.
-- (이미 한 번 실행한 적이 있어도, 업데이트된 전체 내용을 다시 붙여넣고 실행하면 됩니다 — 기존 테이블/데이터는 그대로 유지됩니다.)

create table if not exists items (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null check (category in ('원물', '박스', '부자재')),
  unit text not null default '개',
  sale_price numeric not null default 0,
  cost_price numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 부자재(포장재, 소모품 등) 카테고리 추가 (기존 테이블에 이미 있던 제약을 새로 교체)
alter table items drop constraint if exists items_category_check;
alter table items add constraint items_category_check check (category in ('원물', '박스', '부자재'));

-- 택배 업로드/손익 고도화용 컬럼 (중량, 상품별 택배비 오버라이드, 포장비, 기타비용, 매입처)
alter table items add column if not exists weight_kg numeric;
alter table items add column if not exists shipping_fee_override numeric;
alter table items add column if not exists packing_fee numeric not null default 0;
alter table items add column if not exists misc_fee numeric not null default 0;
alter table items add column if not exists vendor text;

create unique index if not exists items_name_category_key on items (name, category);

-- KG구간별 기본 택배비표 (상품에 shipping_fee_override가 없으면 이 표를 적용)
create table if not exists shipping_fee_tiers (
  id bigint generated always as identity primary key,
  max_weight_kg numeric not null,
  fee numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists shipping_fee_tiers_weight_key on shipping_fee_tiers (max_weight_kg);

-- 택배/주문 파일의 상품명 표기가 제각각이라, 한 번 확정한 매칭을 별칭으로 저장해 다음부터 자동 인식
create table if not exists item_aliases (
  id bigint generated always as identity primary key,
  item_id bigint not null references items(id) on delete cascade,
  alias_text text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists item_aliases_text_key on item_aliases (alias_text);

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

-- 품목관리에서 재고 수량을 직접 고칠 때는 "조정" 건에 마이너스 값도 허용 (그 외 유형은 0 이상만)
alter table stock_movements drop constraint if exists stock_movements_quantity_check;
alter table stock_movements add constraint stock_movements_quantity_check check (quantity >= 0 or movement_type = '조정');

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

-- 택배비 등 품목에 안 걸리는 기타 비용 (일자별)
create table if not exists daily_costs (
  id bigint generated always as identity primary key,
  cost_date date not null,
  cost_type text not null default '택배비',
  amount numeric not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists daily_costs_date_idx on daily_costs (cost_date);

-- 이모님 등 일당제 근무자 마스터
create table if not exists workers (
  id bigint generated always as identity primary key,
  name text not null,
  daily_wage numeric not null default 0,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

-- 근무 기록 (근무자 + 날짜 1쌍당 1건, 중복 체크 방지)
create table if not exists work_logs (
  id bigint generated always as identity primary key,
  work_date date not null,
  worker_id bigint not null references workers(id) on delete restrict,
  wage_paid numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (work_date, worker_id)
);

create index if not exists work_logs_date_idx on work_logs (work_date);
create index if not exists work_logs_worker_idx on work_logs (worker_id);

-- 파일 업로드 1회 = 배치 1건. 업로드한 파일 단위로 나중에 통째로 되돌릴 수 있게 배치를 남겨둠.
create table if not exists upload_batches (
  id bigint generated always as identity primary key,
  source text not null check (source in ('admin', 'cj')),
  row_count integer not null default 0,
  uploaded_at timestamptz not null default now()
);

-- 택배/주문 파일 업로드로 쌓이는 출고 원장. 매칭된 행은 저장 시 stock_movements에도 '출하' 건을
-- 같이 기록해서 재고/원가 계산이 수기 입력 없이도 자동 반영되게 함.
create table if not exists shipments (
  id bigint generated always as identity primary key,
  shipped_date date not null,
  source text not null check (source in ('admin', 'cj')),
  order_no text,
  tracking_no text,
  item_id bigint references items(id) on delete set null,
  raw_product_name text not null,
  quantity numeric not null default 1,
  weight_kg numeric,
  courier_fee numeric,
  vendor text,
  note text,
  batch_id bigint references upload_batches(id) on delete set null,
  fee_batch_id bigint references upload_batches(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table shipments add column if not exists batch_id bigint references upload_batches(id) on delete set null;
alter table shipments add column if not exists fee_batch_id bigint references upload_batches(id) on delete set null;

-- (일반 유니크 인덱스로 둠 — Postgres는 NULL끼리는 원래 유니크 충돌로 안 봐서 order_no/tracking_no가
-- 없는 행끼리는 자유롭게 허용되고, PostgREST의 upsert(onConflict) 부분 인덱스는 인식 못 하므로 이렇게 함)
create unique index if not exists shipments_source_order_key on shipments (source, order_no);
create unique index if not exists shipments_tracking_key on shipments (tracking_no);
create index if not exists shipments_date_idx on shipments (shipped_date);
create index if not exists shipments_item_idx on shipments (item_id);
create index if not exists shipments_batch_idx on shipments (batch_id);
create index if not exists shipments_fee_batch_idx on shipments (fee_batch_id);

alter table stock_movements add column if not exists batch_id bigint references upload_batches(id) on delete set null;
create index if not exists stock_movements_batch_idx on stock_movements (batch_id);

-- 품목별 현재 재고 = 입고 - 출하 - 폐기 (+조정은 그대로 더함, 마이너스로 넣으면 차감됨)
drop view if exists v_stock_current;
create view v_stock_current as
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

-- 날짜별 매출 / 비용 항목별 / 순이익
-- 순이익 = 매출 - 원물출하원가 - 박스비 - 부자재비 - 포장비 - 기타상품비용 - 폐기손실 - 택배비 - 인건비 - 기타비용
-- 기존 v_daily_summary가 다른 컬럼 구성(예: cogs)으로 이미 만들어져 있을 수 있어서,
-- CREATE OR REPLACE 대신 먼저 지우고 다시 만듭니다 (뷰는 컬럼 이름/개수를 OR REPLACE로 바꿀 수 없음).
drop view if exists v_daily_summary;
create view v_daily_summary as
with revenue as (
  select revenue_date as date, sum(amount) as revenue
  from daily_revenue
  group by revenue_date
),
raw_cogs as (
  select sm.movement_date as date, sum(sm.quantity * coalesce(sm.unit_cost, i.cost_price)) as raw_cogs
  from stock_movements sm
  join items i on i.id = sm.item_id
  where sm.movement_type = '출하' and i.category = '원물'
  group by sm.movement_date
),
box_cost as (
  select sm.movement_date as date, sum(sm.quantity * coalesce(sm.unit_cost, i.cost_price)) as box_cost
  from stock_movements sm
  join items i on i.id = sm.item_id
  where sm.movement_type = '출하' and i.category = '박스'
  group by sm.movement_date
),
supply_cost as (
  select sm.movement_date as date, sum(sm.quantity * coalesce(sm.unit_cost, i.cost_price)) as supply_cost
  from stock_movements sm
  join items i on i.id = sm.item_id
  where sm.movement_type = '출하' and i.category = '부자재'
  group by sm.movement_date
),
packing_cost as (
  select sm.movement_date as date, sum(sm.quantity * i.packing_fee) as packing_cost
  from stock_movements sm
  join items i on i.id = sm.item_id
  where sm.movement_type = '출하'
  group by sm.movement_date
),
item_misc_cost as (
  select sm.movement_date as date, sum(sm.quantity * i.misc_fee) as item_misc_cost
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
manual_shipping as (
  select cost_date as date, sum(amount) as manual_shipping_cost
  from daily_costs
  where cost_type = '택배비'
  group by cost_date
),
shipment_shipping as (
  select shipped_date as date, sum(coalesce(courier_fee, 0)) as shipment_shipping_cost
  from shipments
  group by shipped_date
),
other_costs as (
  select cost_date as date, sum(amount) as other_cost
  from daily_costs
  where cost_type <> '택배비'
  group by cost_date
),
labor as (
  select work_date as date, sum(wage_paid) as labor_cost
  from work_logs
  group by work_date
),
dates as (
  select date from revenue
  union select date from raw_cogs
  union select date from box_cost
  union select date from supply_cost
  union select date from packing_cost
  union select date from item_misc_cost
  union select date from waste
  union select date from manual_shipping
  union select date from shipment_shipping
  union select date from other_costs
  union select date from labor
)
select
  d.date,
  coalesce(r.revenue, 0) as revenue,
  coalesce(rc.raw_cogs, 0) as raw_cogs,
  coalesce(bc.box_cost, 0) as box_cost,
  coalesce(sc.supply_cost, 0) as supply_cost,
  coalesce(pc.packing_cost, 0) as packing_cost,
  coalesce(imc.item_misc_cost, 0) as item_misc_cost,
  coalesce(w.waste_cost, 0) as waste_cost,
  coalesce(ms.manual_shipping_cost, 0) + coalesce(ss.shipment_shipping_cost, 0) as shipping_cost,
  coalesce(oc.other_cost, 0) as other_cost,
  coalesce(l.labor_cost, 0) as labor_cost,
  coalesce(r.revenue, 0)
    - coalesce(rc.raw_cogs, 0)
    - coalesce(bc.box_cost, 0)
    - coalesce(sc.supply_cost, 0)
    - coalesce(pc.packing_cost, 0)
    - coalesce(imc.item_misc_cost, 0)
    - coalesce(w.waste_cost, 0)
    - coalesce(ms.manual_shipping_cost, 0) - coalesce(ss.shipment_shipping_cost, 0)
    - coalesce(oc.other_cost, 0)
    - coalesce(l.labor_cost, 0) as net_profit
from dates d
left join revenue r on r.date = d.date
left join supply_cost sc on sc.date = d.date
left join raw_cogs rc on rc.date = d.date
left join box_cost bc on bc.date = d.date
left join packing_cost pc on pc.date = d.date
left join item_misc_cost imc on imc.date = d.date
left join waste w on w.date = d.date
left join manual_shipping ms on ms.date = d.date
left join shipment_shipping ss on ss.date = d.date
left join other_costs oc on oc.date = d.date
left join labor l on l.date = d.date
order by d.date;

-- 월별 근무자별 근무일수/총 지급액 (근무캘린더용)
drop view if exists v_worker_monthly;
create view v_worker_monthly as
select
  worker_id,
  date_trunc('month', work_date)::date as month,
  count(*) as work_days,
  sum(wage_paid) as total_wage
from work_logs
group by worker_id, date_trunc('month', work_date)::date;

-- V1 보안 참고: anon key가 클라이언트 JS에 노출되므로, RLS를 켜지 않으면 URL을 아는 누구나 읽기/쓰기가 가능합니다.
-- 지금은 "URL 비공개" 수준으로 운영하고, 필요해지면 Supabase Auth(이메일 로그인)로 강화하세요.
alter table items enable row level security;
alter table stock_movements enable row level security;
alter table daily_revenue enable row level security;
alter table daily_costs enable row level security;
alter table workers enable row level security;
alter table work_logs enable row level security;
alter table shipping_fee_tiers enable row level security;
alter table item_aliases enable row level security;
alter table shipments enable row level security;
alter table upload_batches enable row level security;

drop policy if exists "public read/write items" on items;
create policy "public read/write items" on items for all using (true) with check (true);

drop policy if exists "public read/write stock_movements" on stock_movements;
create policy "public read/write stock_movements" on stock_movements for all using (true) with check (true);

drop policy if exists "public read/write daily_revenue" on daily_revenue;
create policy "public read/write daily_revenue" on daily_revenue for all using (true) with check (true);

drop policy if exists "public read/write daily_costs" on daily_costs;
create policy "public read/write daily_costs" on daily_costs for all using (true) with check (true);

drop policy if exists "public read/write workers" on workers;
create policy "public read/write workers" on workers for all using (true) with check (true);

drop policy if exists "public read/write work_logs" on work_logs;
create policy "public read/write work_logs" on work_logs for all using (true) with check (true);

drop policy if exists "public read/write shipping_fee_tiers" on shipping_fee_tiers;
create policy "public read/write shipping_fee_tiers" on shipping_fee_tiers for all using (true) with check (true);

drop policy if exists "public read/write item_aliases" on item_aliases;
create policy "public read/write item_aliases" on item_aliases for all using (true) with check (true);

drop policy if exists "public read/write shipments" on shipments;
create policy "public read/write shipments" on shipments for all using (true) with check (true);

drop policy if exists "public read/write upload_batches" on upload_batches;
create policy "public read/write upload_batches" on upload_batches for all using (true) with check (true);
