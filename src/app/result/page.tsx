"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Course, FilterInput } from "@/lib/tripfilter";

// invalid는 입력값이 서버 검증에 걸린 경우로, 결과 0건(empty)과 구분함 (D-4).
type Status = "loading" | "ok" | "empty" | "invalid" | "error";
type State = { status: Status; courses: Course[]; message?: string };

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5100";

const INVALID_MESSAGE: Record<string, string> = {
  invalidTime: "가용 시간은 2시간에서 10시간 사이여야 해요.",
  invalidInput: "예산은 1원 이상, 인원은 1명 이상이어야 해요.",
};

export default function ResultPage() {
  const router = useRouter();
  const [s, setS] = useState<State>({ status: "loading", courses: [] });

  const load = useCallback(() => {
    const raw = sessionStorage.getItem("tf-input");
    if (!raw) {
      router.replace("/");
      return;
    }
    setS({ status: "loading", courses: [] });
    const input = JSON.parse(raw) as FilterInput;
    // 추천 API는 tripfilter-backend 소유임. 주소는 NEXT_PUBLIC_API_BASE_URL로 주입함.
    fetch(`${API}/api/v1/recommend`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
      .then(async (r) => ({ httpOk: r.ok, body: await r.json() }))
      .then(({ httpOk, body }) => {
        if (body.ok && body.courses?.length) {
          sessionStorage.setItem("tf-courses", JSON.stringify(body.courses));
          setS({ status: "ok", courses: body.courses });
        } else if (!httpOk) {
          // 400은 fetch가 reject하지 않으므로 상태 코드로 갈라야 함 (D-4)
          setS({ status: "invalid", courses: [], message: INVALID_MESSAGE[body.error] ?? "입력값을 다시 확인해주세요." });
        } else {
          setS({ status: "empty", courses: [] });
        }
      })
      .catch(() => setS({ status: "error", courses: [] }));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // 상태 전환을 보조기기에 알림 (D-11, WCAG 2.2 4.1.3 상태 메시지 AA)
  const live = (children: React.ReactNode) => (
    <main>
      <div role="status" aria-live="polite">
        {children}
      </div>
    </main>
  );

  if (s.status === "loading") {
    return live(<p className="sub">부산 관광 후보를 비교해 Top-3 코스를 고르는 중…</p>);
  }

  if (s.status === "invalid") {
    return live(
      <>
        <p className="sub">{s.message}</p>
        <Link className="maplink" href="/">
          조건 고치기
        </Link>
      </>
    );
  }

  if (s.status === "empty") {
    return live(
      <>
        <p className="sub">조건에 맞는 코스를 찾지 못했어요.</p>
        {/* 결과 0건에는 실행 가능한 복구 액션을 줌 (ADR-005 Decision 6) */}
        <p className="muted">이런 방법이 있어요.</p>
        <ul className="muted">
          <li>가용 시간이나 예산을 늘려보기</li>
          <li>제외한 관심사를 줄여보기</li>
          <li>후보가 더 많은 다른 출발 권역 골라보기</li>
        </ul>
        <Link className="maplink" href="/">
          조건 고치기
        </Link>
      </>
    );
  }

  if (s.status === "error") {
    return live(
      <>
        <p className="sub">추천을 불러오지 못했어요. 네트워크나 서버 상태를 확인해주세요.</p>
        {/* 조건은 그대로 두고 같은 요청을 다시 보냄 (D-6) */}
        <button className="primary" onClick={load}>
          다시 시도
        </button>
        <Link className="maplink" href="/">
          조건 고치기
        </Link>
      </>
    );
  }

  return (
    <main>
      <div role="status" aria-live="polite">
        <h1>추천 코스 Top-3</h1>
        <p className="sub">근거 카드를 확인하고, 마음에 드는 코스의 지도앱으로 이동하세요.</p>
      </div>
      {s.courses.map((c, i) => (
        <Link key={c.id} href={`/course/${encodeURIComponent(c.id)}`} className="card plain" style={{ display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>
              #{i + 1} {c.title}
            </strong>
            <span className="score">{c.score}점</span>
          </div>
          <p className="reason">예산 · {c.reason.budget}</p>
          <p className="reason">시간 · {c.reason.time}</p>
          <p className="reason">안전 · {c.reason.safety}</p>
        </Link>
      ))}
      <Link className="maplink" href="/">
        조건 다시 입력
      </Link>
    </main>
  );
}
