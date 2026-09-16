"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { mapLinks, type Course } from "@/lib/tripfilter";

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [missing, setMissing] = useState(false);
  // 복구 화면에서 같은 조건으로 다시 추천받기를 주 행동으로 보일지 판단함 (FR-008 수용 기준 4)
  const [hasInput, setHasInput] = useState(false);

  useEffect(() => {
    // 저장소 읽기 실패, 손상된 JSON, 잘못된 id 인코딩은 모두 복구 화면으로 보냄
    try {
      setHasInput(!!sessionStorage.getItem("tf-input"));
      const courses = JSON.parse(sessionStorage.getItem("tf-courses") ?? "[]") as Course[];
      const target = decodeURIComponent(id);
      const found = Array.isArray(courses) ? courses.find((c) => c?.id === target) : undefined;
      // 렌더가 쓰는 필드의 구조까지 확인함. 구조가 어긋난 저장값이 렌더 중 예외를 내지 않게 함
      if (found && Array.isArray(found.places) && found.reason) setCourse(found);
      else setMissing(true);
    } catch {
      setMissing(true);
    }
  }, [id]);

  // 상태 전환을 보조기기에 알림 (D-11, WCAG 2.2 4.1.3 상태 메시지 AA).
  // 결과 화면과 같은 규칙: 라이브 영역에는 짧은 메시지만 두고 상태마다 key 로 통째 교체함.
  // 링크를 영역 안에 두면 문구가 제자리에서 바뀐 뒤 링크가 붙으며 NVDA 가 두 번 읽음 (2026-09-16 실측)
  if (missing || !course) {
    return (
      <main>
        <div role="status" aria-live="polite">
          <div key={missing ? "missing" : "loading"}>
            <p className="sub">{missing ? "코스를 불러올 수 없어요. 링크가 오래됐거나 이 브라우저에 정보가 없어요." : "불러오는 중…"}</p>
          </div>
        </div>
        {missing && (
          <>
            {hasInput && (
              <Link className="maplink" href="/result">같은 조건으로 다시 추천받기</Link>
            )}
            <Link className="maplink" href="/">조건 새로 입력하기</Link>
          </>
        )}
      </main>
    );
  }

  const anyOutdoor = course.places.some((p) => !p.indoor);

  return (
    <main>
      <Link className="maplink" href="/result">← 추천 목록</Link>
      <h1>{course.title}</h1>
      <p className="sub">추천 점수 <span className="score">{course.score}점</span></p>

      <div className="card">
        <p className="reason">예산 · {course.reason.budget}</p>
        <p className="reason">시간 · {course.reason.time}</p>
        <p className="reason">데이터 안내 · {course.reason.safety}</p>
      </div>

      <div className="card">
        {course.places.map((p) => {
          const m = mapLinks(p);
          return (
            <div key={p.contentId} className="place">
              {/* 증빙 없는 수동 배지는 표시하지 않음 (ADR-008) */}
              <strong>{p.title}</strong>
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
