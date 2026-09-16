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
        {/* 출처 표기는 공공누리 이용 조건상 전 화면 노출 의무이고 출처 웹사이트 하이퍼링크를 요구함 (UI-A5, NFR-DAT-001).
            ponytail: 지금 데이터는 mock 이라 한국관광공사 제공으로 적지 않음. 실연동 회차에 계약 문서 12장의 공공누리 출처표시 문안으로 교체함 */}
        <footer className="attribution">
          표시 데이터는 시연용 예시입니다. 실연동 후 관광정보는{" "}
          <a href="https://api.visitkorea.or.kr/" target="_blank" rel="noreferrer">한국관광공사 TourAPI</a>에서 받아{" "}
          <a href="https://www.kogl.or.kr/info/license.do" target="_blank" rel="noreferrer">공공누리</a> 조건에 따라 출처를 표시합니다.
        </footer>
      </body>
    </html>
  );
}
