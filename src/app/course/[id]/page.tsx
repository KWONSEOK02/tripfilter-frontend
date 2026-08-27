"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { mapLinks, type Course } from "@/lib/tripfilter";

const BADGE_LABEL = { verified: "검증됨", info: "정보", caution: "주의" } as const;

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("tf-courses");
    if (!raw) {
      setMissing(true);
      return;
    }
    const courses = JSON.parse(raw) as Course[];
    const found = courses.find((c) => c.id === decodeURIComponent(id));
    if (found) setCourse(found);
    else setMissing(true);
  }, [id]);

  // 상태 전환을 보조기기에 알림 (D-11, WCAG 2.2 4.1.3 상태 메시지 AA)
  if (missing) {
    return (
      <main>
        <div role="status" aria-live="polite">
          <p className="sub">코스를 불러올 수 없어요. 링크가 오래됐거나 이 브라우저에 정보가 없어요.</p>
          <Link className="maplink" href="/result">추천 목록으로</Link>
          <Link className="maplink" href="/">새로 추천받기</Link>
        </div>
      </main>
    );
  }
  if (!course) return <main><div role="status" aria-live="polite"><p className="sub">불러오는 중…</p></div></main>;

  const anyOutdoor = course.places.some((p) => !p.indoor);

  return (
    <main>
      <Link className="maplink" href="/result">← 추천 목록</Link>
      <h1>{course.title}</h1>
      <p className="sub">추천 점수 <span className="score">{course.score}점</span></p>

      <div className="card">
        <p className="reason">예산 · {course.reason.budget}</p>
        <p className="reason">시간 · {course.reason.time}</p>
        <p className="reason">안전 · {course.reason.safety}</p>
      </div>

      <div className="card">
        {course.places.map((p) => {
          const m = mapLinks(p);
          return (
            <div key={p.contentId} className="place">
              <div className="rowbetween">
                <strong>{p.title}</strong>
                <span className={`badge ${p.safetyBadge}`}>{BADGE_LABEL[p.safetyBadge]}</span>
              </div>
              <p className="muted">{p.addr} · {p.indoor ? "실내" : "실외"} · 체류 약 {p.dwellMin}분 · {p.avgCost === 0 ? "무료" : `${p.avgCost.toLocaleString()}원`}</p>
              <a className="maplink" href={m.kakao} target="_blank" rel="noreferrer">카카오맵</a>
              <a className="maplink" href={m.naver} target="_blank" rel="noreferrer">네이버지도</a>
              <a className="maplink" href={m.google} target="_blank" rel="noreferrer">구글맵</a>
            </div>
          );
        })}
      </div>

      <div className="card">
        <strong>안전 정보</strong>
        <p className="muted">{anyOutdoor ? "실외 일정이 있어요. 날씨에 따라 실내 대체 코스를 확인하세요." : "전부 실내 코스라 우천에도 진행 가능해요."}</p>
        <p className="emergency">긴급: 관광통역 1330 · 범죄 112 · 화재·구급 119</p>
        <p className="muted">가격이 다르거나 결제가 막히면 영수증·메뉴판을 캡처해 1330 관광불편신고로 연결하세요.</p>
      </div>
    </main>
  );
}
