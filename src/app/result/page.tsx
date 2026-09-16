"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  // 요청이 떠 있는 동안 재호출을 막음. 상태 갱신은 비동기라 status 로만 판정하면 연속 클릭이 통과함
  const inFlight = useRef(false);

  const load = useCallback(() => {
    if (inFlight.current) return;
    // 저장소 읽기 실패와 손상된 JSON 은 조건이 없는 경우와 같게 다룸. 예외가 화면을 멈추지 않게 함
    let input: FilterInput;
    try {
      const raw = sessionStorage.getItem("tf-input");
      if (!raw) throw new Error("no input");
      input = JSON.parse(raw) as FilterInput;
    } catch {
      router.replace("/");
      return;
    }
    inFlight.current = true;
    setS({ status: "loading", courses: [] });
    // 추천 API는 tripfilter-backend 소유임. 주소는 NEXT_PUBLIC_API_BASE_URL로 주입함.
    fetch(`${API}/api/v1/recommend`, {
      // 응답이 오지 않으면 로딩이 끝나지 않으므로 15초에서 끊고 통신 오류로 보냄
      signal: AbortSignal.timeout(15000),
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
      .then(async (r) => ({ httpOk: r.ok, status: r.status, body: await r.json() }))
      .then(({ httpOk, status, body }) => {
        if (status >= 500) {
          // 서버 오류를 입력 오류 문구로 보여주면 사용자를 탓하게 되므로 통신 오류로 보냄
          setS({ status: "error", courses: [] });
        } else if (body.ok && body.courses?.length) {
          sessionStorage.setItem("tf-courses", JSON.stringify(body.courses));
          setS({ status: "ok", courses: body.courses });
        } else if (!httpOk) {
          // 400은 fetch가 reject하지 않으므로 상태 코드로 갈라야 함 (D-4)
          setS({ status: "invalid", courses: [], message: INVALID_MESSAGE[body.error] ?? "입력값을 다시 확인해주세요." });
        } else {
          setS({ status: "empty", courses: [] });
        }
      })
      .catch(() => setS({ status: "error", courses: [] }))
      .finally(() => {
        inFlight.current = false;
      });
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
    return live(<p className="sub">부산 관광 후보를 비교해 코스를 고르는 중…</p>);
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
        {/* 조건은 그대로 두고 같은 요청을 다시 보냄 (D-6).
            이 분기는 status 가 error 일 때만 렌더되므로 버튼에 disabled 를 걸 조건이 없고,
            연속 클릭은 load 의 inFlight 가드가 막음 */}
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
        {/* 서버가 최대 3개를 주므로 고정 "Top-3" 대신 실제 개수를 씀 (UI-A3).
            부족한 이유는 진단 정보가 없어 추측하지 않음 */}
        <h1>추천 코스 {s.courses.length}개</h1>
        {s.courses.length < 3 && <p className="muted">현재 데이터와 조건에서 {s.courses.length}개를 찾았어요.</p>}
        <p className="sub">근거 카드를 확인하고, 마음에 드는 코스의 지도앱으로 이동하세요.</p>
      </div>
      {/* ponytail: 실연동 전까지 고정 고지임. fetchPlaces 가 TourAPI 로 바뀌는 회차에 제거함 (UI-A2) */}
      <p className="muted">표시 데이터는 시연용 예시예요. 장소 정보, 비용, 평점은 실제와 다를 수 있어요.</p>
      {/* 이동 시간의 출발점은 권역 후보 평균 좌표임. 대표 역처럼 읽히지 않게 밝힘 (UI-D1, ADR-005 Decision 4) */}
      <p className="muted">이동 시간은 출발 권역 후보 장소들의 평균 위치에서 계산했어요. 숙소에서 그곳까지 오는 시간은 빠져 있어요.</p>
      {s.courses.map((c, i) => (
        <Link key={c.id} href={`/course/${encodeURIComponent(c.id)}`} className="card plain">
          <div className="rowbetween">
            <strong>
              #{i + 1} {c.title}
            </strong>
            <span className="score">{c.score}점</span>
          </div>
          <p className="reason">예산 · {c.reason.budget}</p>
          <p className="reason">시간 · {c.reason.time}</p>
          <p className="reason">데이터 안내 · {c.reason.safety}</p>
        </Link>
      ))}
      <Link className="maplink" href="/">
        조건 다시 입력
      </Link>
    </main>
  );
}
