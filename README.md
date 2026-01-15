# 챌린저스 따라쓰기 이벤트

바이럴 마케팅을 위한 따라쓰기 게임 사이트입니다.

## 주요 기능

- **따라쓰기 게임**: 주어진 문장을 정확히 따라 쓰는 게임
- **실시간 오타 감지**: 입력 중 오타 발생 시 빨간색으로 표시
- **스탑워치**: 게임 시작부터 완료까지 시간 측정
- **도전권 시스템**: 유저당 기본 1회 도전, 공유 시 재도전 기회 획득 (최대 1개까지 누적)
- **공유 기능**: iOS 네이티브 공유, 카카오톡 브라우저 지원, 클립보드 복사

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 데이터베이스 설정

Supabase 대시보드에서 SQL Editor를 열고 `supabase/schema.sql` 파일의 내용을 실행하세요.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
├── app/
│   ├── api/
│   │   ├── referral/
│   │   │   └── process/        # 추천인 처리 API
│   │   └── user/
│   │       ├── init/          # 유저 초기화 API
│   │       ├── tickets/        # 도전권 조회/사용 API
│   │       └── complete/       # 완료 상태 업데이트 API
│   ├── globals.css             # 전역 스타일 및 애니메이션
│   ├── layout.tsx              # 루트 레이아웃
│   └── page.tsx               # 메인 게임 페이지
├── lib/
│   └── supabase.ts            # Supabase 클라이언트
└── supabase/
    └── schema.sql             # 데이터베이스 스키마
```

## 게임 플로우

1. **시작 화면**: 도전권 확인 및 게임 시작
2. **카운트다운**: 3초 카운트다운
3. **게임 진행**: 문장 표시 및 따라쓰기, 실시간 오타 감지, 스탑워치 작동
4. **결과 화면**: 기록 표시, 공유 버튼, 재도전 버튼 (도전권 있을 시)

## 도전권 시스템

- 유저당 기본 1회 도전권 제공
- 다른 유저가 공유한 링크로 접속하면 재도전 기회 획득
- 재도전 기회는 최대 1개까지만 누적
- 게임 완료 시 도전권 차감

## 공유 기능

- **iOS**: 네이티브 공유 시트 사용
- **카카오톡 브라우저**: 커스텀 공유 모달 표시
- **기타 브라우저**: 클립보드 복사

## 라이선스

이 프로젝트는 개인 사용을 위한 것입니다.
