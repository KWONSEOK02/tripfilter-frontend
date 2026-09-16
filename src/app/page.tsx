"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { INTERESTS, DEFAULT_INPUT, type FilterInput, type Interest } from "@/lib/tripfilter";

// 권역 목록은 서버가 정본임 (ADR-005 Decision 4). 조회 실패 시에만 아래 폴백을 씀.
type Area = { key: string; label: string };
const FALLBACK_AREAS: Area[] = [
  { key: "해운대", label: "해운대" },
  { key: "광안리", label: "광안리" },
  { key: "남포동", label: "남포동" },
  { key: "전포", label: "서면·전포" },
  { key: "영도", label: "영도" },
];
const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5100";

export default function HomePage() {
  const router = useRouter();
  const [v, setV] = useState<FilterInput>(DEFAULT_INPUT);
  const [areas, setAreas] = useState<Area[]>(FALLBACK_AREAS);
  const [error, setError] = useState<string | null>(null);
  // 같은 오류로 다시 제출해도 새 노드로 넣어 보조기기가 다시 읽게 함. 문구가 같으면 DOM 이 안 바뀌어 무음이었음 (2026-09-16 NVDA 실측)
  const [errorSeq, setErrorSeq] = useState(0);
  const showError = (message: string) => {
    setError(message);
    setErrorSeq((n) => n + 1);
  };
  // 이동이 끝나기 전 재클릭과 Enter 반복을 막음. 결과 화면이 API를 호출하므로 여기서 막지 않으면 중복 요청이 됨
  const [busy, setBusy] = useState(false);

  // 권역 목록을 서버에서 받아 화면 하드코딩을 대체함 (D-10). 실패해도 추천은 계속 가능함.
  useEffect(() => {
    fetch(`${API}/api/v1/areas`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.areas) && d.areas.length) setAreas(d.areas);
      })
      .catch(() => {
        // 폴백 목록을 그대로 씀
      });
  }, []);

  // 직전 조건을 복원함 (D-3, WCAG 2.2 3.3.7 중복 입력 Level A).
  // useState 초기값으로 읽지 않는 이유는 서버 렌더에 sessionStorage가 없어 하이드레이션이 어긋나기 때문임.
  useEffect(() => {
    try {
      // 저장소 읽기 자체가 막힌 환경도 기본값으로 진행함
      const raw = sessionStorage.getItem("tf-input");
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<FilterInput>;
      setV((cur) => ({
        ...cur,
        ...saved,
        // 배열 필드는 저장본이 배열일 때만 채택함
        interests: Array.isArray(saved.interests) ? saved.interests : cur.interests,
        exclude: Array.isArray(saved.exclude) ? saved.exclude : cur.exclude,
      }));
    } catch {
      // 저장본이 깨졌으면 기본값을 유지함
    }
  }, []);

  function toggle(list: "interests" | "exclude", id: Interest) {
    setV((s) => {
      const has = s[list].includes(id);
      const next = has ? s[list].filter((x) => x !== id) : [...s[list], id];
      // 관심사와 제외는 상호배타
      const other = list === "interests" ? "exclude" : "interests";
      return { ...s, [list]: next, [other]: s[other].filter((x) => x !== id) };
    });
  }

  // 서버 검증과 같은 규칙을 화면에서 먼저 적용함 (D-4).
  // 이걸 두지 않으면 빈 칸이 0으로 전송돼 400이 나고, 그 400이 결과 화면에서 "코스 없음"으로 흡수된다.
  function validate(x: FilterInput): string | null {
    if (!(x.timeHours >= 2 && x.timeHours <= 10)) return "가용 시간은 2시간에서 10시간 사이로 입력해주세요.";
    if (!(x.budget > 0)) return "1인 예산은 1원 이상 입력해주세요.";
    if (!(x.partySize >= 1)) return "인원은 1명 이상 입력해주세요.";
    return null;
  }

  function submit() {
    // disabled 속성과 별개로 핸들러에서도 재진입을 막음. 키보드 실행은 속성만으로 충분하지 않음
    if (busy) return;
    const problem = validate(v);
    if (problem) {
      showError(problem);
      return;
    }
    setError(null);
    try {
      sessionStorage.setItem("tf-input", JSON.stringify(v));
    } catch {
      // 저장소를 쓸 수 없으면 결과 화면이 조건을 읽지 못하므로 이동하지 않고 알림. busy 를 켜기 전에 처리해 버튼 고착을 막음
      showError("이 브라우저에서는 조건을 저장할 수 없어요. 사생활 보호 모드를 끄고 다시 시도해주세요.");
      return;
    }
    setBusy(true);
    router.push("/result");
  }

  return (
    <main>
      <h1>부산 트립필터</h1>
      <p className="sub">지도앱 열기 전에, 예산·시간·관심사로 코스를 먼저 걸러보세요.</p>

      <div className="card">
        <label htmlFor="f-area">출발 권역</label>
        <select id="f-area" value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })}>
          {areas.map((a) => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
        {/* ponytail: 기준점이 mock-centroid 인 동안의 고정 문구임. 법정동 기준 전환 회차에 문구도 바꿈 (UI-D1, ADR-005 Decision 4) */}
        <p className="muted">역이나 특정 지점이 아니라 이 권역 후보 장소들의 평균 위치를 출발점으로 계산해요.</p>

        <div className="row">
          <div>
            <label htmlFor="f-time">가용 시간 (시간)</label>
            <input id="f-time" type="number" min={2} max={10} value={v.timeHours}
              onChange={(e) => setV({ ...v, timeHours: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="f-budget">1인 예산 (원)</label>
            <input id="f-budget" type="number" min={0} step={5000} value={v.budget}
              onChange={(e) => setV({ ...v, budget: Number(e.target.value) })} />
          </div>
        </div>

        <label htmlFor="f-party">인원</label>
        <input id="f-party" type="number" min={1} max={10} value={v.partySize}
          onChange={(e) => setV({ ...v, partySize: Number(e.target.value) })} />
        {/* 1인 비용과 예산 양쪽에 인원이 곱해져 순위에서 약분됨. 가중치를 넣지 않고 표시 전용임을 밝힘 (UI-A4) */}
        <p className="muted">전체 금액 표시에만 쓰이고, 코스 순위에는 영향을 주지 않아요.</p>

        <label id="f-interests">관심사 (탭하여 선택)</label>
        {/* 칩 묶음은 label 이 가리킬 단일 컨트롤이 없어 group 과 aria-labelledby 로 이름을 붙임 (B-2) */}
        <div className="chips" role="group" aria-labelledby="f-interests">
          {INTERESTS.map((i) => (
            <button key={i.id} type="button" className="chip"
              data-on={v.interests.includes(i.id)} aria-pressed={v.interests.includes(i.id)} onClick={() => toggle("interests", i.id)}>
              {i.label}
            </button>
          ))}
        </div>

        <label id="f-exclude">제외할 관심사</label>
        <div className="chips" role="group" aria-labelledby="f-exclude">
          {INTERESTS.map((i) => (
            <button key={i.id} type="button" className="chip"
              data-ex={v.exclude.includes(i.id)} aria-pressed={v.exclude.includes(i.id)} onClick={() => toggle("exclude", i.id)}>
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* 입력 오류를 보조기기에도 알림 (D-11, WCAG 2.2 4.1.3) */}
      <div role="alert" aria-live="assertive">
        {error && <p key={errorSeq} className="inputerror">{error}</p>}
      </div>

      <button className="primary" onClick={submit} disabled={busy} aria-busy={busy}>
        {busy ? "코스 고르는 중" : "코스 추천 받기"}
      </button>
    </main>
  );
}
