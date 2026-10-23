-- =====================================================================
-- [초안 / 아직 실행하지 마세요]  profiles 테이블 설계
-- ---------------------------------------------------------------------
-- 목적: Figma 회원가입 2단계(이름 · 지역)와 마이페이지 정보를 저장
-- 실행: 검토가 끝나면 Supabase 대시보드 > SQL Editor 에서 실행하거나
--       supabase/migrations/ 로 옮겨 CLI 로 적용하세요.
--
-- 원칙
--  - 비밀번호는 절대 여기 저장하지 않습니다. (Supabase Auth 가 auth.users 에 해시로 보관)
--  - 이메일도 auth.users 에 이미 있으므로 중복 저장하지 않습니다.
--  - RLS 로 "본인 행만" 읽고/수정할 수 있게 합니다.
-- =====================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text,
  region      text,                       -- 예: '서울특별시 강남구' (추후 지역 코드 테이블로 분리 검토)
  avatar_url  text,
  onboarded   boolean not null default false, -- 이름·지역 입력(회원가입 2단계) 완료 여부
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint nickname_length check (nickname is null or char_length(nickname) between 2 and 20)
);

comment on table public.profiles is 'PRICEX 사용자 프로필 (auth.users 1:1)';

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "본인 프로필 조회"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "본인 프로필 수정"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- insert 정책은 두지 않습니다. 아래 트리거가 가입 시 자동으로 행을 만듭니다.
-- delete 는 auth.users 삭제 시 cascade 로 처리됩니다.

-- ---------------------------------------------------------------------
-- updated_at 자동 갱신
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 회원가입 시 profiles 행 자동 생성
--  - 이메일 가입: 빈 프로필 생성 → 앱의 2단계 화면에서 nickname/region 업데이트
--  - 소셜 가입(Google/Kakao): 제공자가 준 이름/사진을 기본값으로 사용
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider_name text := left(
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    20
  );
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    -- 길이 제약(2~20자)에 맞지 않으면 비워 두고 앱에서 입력받음 → 가입 자체가 실패하지 않도록
    case when char_length(provider_name) >= 2 then provider_name else null end,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 검토 포인트
--  1) 닉네임 중복 허용 여부 → 불허하려면: create unique index on public.profiles (lower(nickname));
--  2) 트리거가 실패하면 회원가입 전체가 실패하므로, 트리거 수정 시 제약 조건과 꼭 함께 확인
--  3) region 을 자유 텍스트로 둘지, 시군구 코드 테이블을 만들지 결정 필요
--  4) Figma 의 휴대폰 본인인증 화면을 쓸 경우 phone 컬럼은 auth.users.phone 활용 권장
-- =====================================================================
