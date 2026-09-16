import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "부산 트립필터 — TripFilter",
  description: "예산·시간·관심사로 부산 여행 코스를 걸러주는 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        {/* 출처 표기는 공공누리 이용 조건상 전 화면 노출 의무임 (D-5, NFR-DAT-001, ADR-002) */}
        <footer className="attribution">데이터 제공: 한국관광공사 한국관광콘텐츠랩</footer>
      </body>
    </html>
  );
}
