# tripfilter-frontend

부산 트립필터의 화면 레포. 입력·결과·코스 상세 3화면을 제공하고, 추천 계산은 `tripfilter-backend`에 위임한다.

- 스택: Next.js 15 App Router, React 19, TypeScript
- 화면 간 상태: `sessionStorage`(`tf-input`, `tf-courses`). 서버 영속 상태 없음

## 실행

```bash
npm install
npm run dev        # 3000
```

`tripfilter-backend`가 5100에 떠 있어야 `/result`가 동작한다. 주소를 바꾸려면 `.env.example`을 `.env.local`로 복사해 `NEXT_PUBLIC_API_BASE_URL`을 채운다.

## 검증

```bash
npm run typecheck
npm run build
```

## 문서

요구사항·아키텍처·ADR·RTM 정본은 워크스페이스 `../docs/`다(`../docs/INDEX.md`가 진입점). 이 레포에 `docs/`를 만들지 않는다.
AI 에이전트 작업 규칙은 `../AGENTS.md` 참조.
