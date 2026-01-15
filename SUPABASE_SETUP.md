# Supabase 연동 가이드

## 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Supabase 프로젝트 정보 확인 방법

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. Settings > API 메뉴로 이동
4. 다음 정보를 복사:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`에 사용
   - **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 사용

## 2. 데이터베이스 스키마 생성

1. Supabase Dashboard에서 **SQL Editor** 메뉴로 이동
2. `supabase/schema.sql` 파일의 전체 내용을 복사
3. SQL Editor에 붙여넣고 **Run** 버튼 클릭
4. 성공 메시지 확인

### 생성되는 테이블

- **users**: 유저 정보 및 도전권 관리
- **referrals**: 추천인-피추천인 관계 관리

## 3. 연결 테스트

### 방법 1: API 엔드포인트로 테스트

개발 서버 실행 후 브라우저에서 다음 URL 접속:
```
http://localhost:3000/api/test/db
```

성공 시:
```json
{
  "success": true,
  "message": "Supabase 연결 성공!",
  "data": {
    "users": {
      "count": 0,
      "sample": []
    },
    "referrals": {
      "count": 0,
      "sample": []
    }
  }
}
```

실패 시:
- 환경 변수 미설정: `환경 변수가 설정되지 않았습니다` 오류
- 테이블 미생성: `테이블 조회 실패` 오류 (스키마를 먼저 실행해야 함)
- 연결 오류: Supabase URL/Key 확인 필요

### 방법 2: 실제 게임에서 테스트

1. 게임 시작 화면에서 "시작하기" 클릭
2. 게임 완료 후 기록 화면 확인
3. 브라우저 개발자 도구 > Network 탭에서 API 호출 확인
4. Supabase Dashboard > Table Editor에서 데이터 확인

## 4. Row Level Security (RLS) 설정

Supabase는 기본적으로 RLS가 활성화되어 있습니다. 다음 정책을 설정해야 합니다:

### users 테이블 정책

```sql
-- 모든 사용자가 읽기 가능
CREATE POLICY "Users are viewable by everyone"
ON users FOR SELECT
USING (true);

-- 모든 사용자가 자신의 레코드 생성 가능
CREATE POLICY "Users can insert their own record"
ON users FOR INSERT
WITH CHECK (true);

-- 모든 사용자가 자신의 레코드 업데이트 가능
CREATE POLICY "Users can update their own record"
ON users FOR UPDATE
USING (true);
```

### referrals 테이블 정책

```sql
-- 모든 사용자가 읽기 가능
CREATE POLICY "Referrals are viewable by everyone"
ON referrals FOR SELECT
USING (true);

-- 모든 사용자가 레코드 생성 가능
CREATE POLICY "Referrals can be inserted by anyone"
ON referrals FOR INSERT
WITH CHECK (true);
```

### RLS 정책 적용 방법

1. Supabase Dashboard > Authentication > Policies
2. 각 테이블에 대해 위 정책 생성
3. 또는 SQL Editor에서 위 SQL 실행

## 5. 문제 해결

### 오류: "Missing Supabase environment variables"
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 정확한지 확인
- 개발 서버 재시작 필요

### 오류: "relation does not exist"
- `supabase/schema.sql`을 실행했는지 확인
- Supabase Dashboard > Table Editor에서 테이블 존재 확인

### 오류: "new row violates row-level security policy"
- RLS 정책이 설정되었는지 확인
- 위의 RLS 정책을 적용했는지 확인

### 데이터가 저장되지 않음
- 브라우저 개발자 도구 > Console에서 오류 확인
- Network 탭에서 API 응답 확인
- Supabase Dashboard > Logs에서 서버 로그 확인
