// TripFilter 화면용 도메인 — API 계약 타입과 표시 전용 상수·헬퍼.
// 추천 계산과 mock 후보는 tripfilter-backend가 소유함. 여기서는 응답을 그대로 표시함.
// ponytail: 타입 정의가 tripfilter-backend/src/tripfilter.ts와 이원화됨. 멀티레포 분리의 비용이며
// 계약 정본은 docs/architecture/api-contract.md임. 드리프트는 live-check.mjs가 잡음.

export type Interest = "food" | "view" | "culture" | "nature" | "shopping" | "activity";

export const INTERESTS: { id: Interest; label: string }[] = [
  { id: "food", label: "맛집" },
  { id: "view", label: "야경·전망" },
  { id: "culture", label: "문화·역사" },
  { id: "nature", label: "자연·바다" },
  { id: "shopping", label: "쇼핑" },
  { id: "activity", label: "체험·액티비티" },
];

// 사용자 입력(제안서 4p 1단계). 위치는 MVP에서 부산 권역 라벨로 단순화함.
export interface FilterInput {
  area: string; // 출발 권역(예: "해운대")
  timeHours: number; // 2~10
  budget: number; // 1인 예산(원)
  partySize: number;
  interests: Interest[];
  exclude: Interest[];
}

// TourAPI areaBasedList2/detailCommon2 형태를 본뜬 관광 후보. mapx/mapy는 WGS84(경도/위도).
export interface Place {
  contentId: string;
  title: string;
  area: string;
  addr: string;
  mapx: number; // 경도(WGS84)
  mapy: number; // 위도(WGS84)
  interest: Interest;
  avgCost: number; // 1인 예상 비용(원). 무료는 0
  dwellMin: number; // 평균 체류 시간(분)
  indoor: boolean;
  rating: number; // 외부 평판 0~5
  reviewCount: number;
  safetyBadge: "verified" | "info" | "caution"; // 안전·검증 신호
  source: "TourAPI" | "TourAPI+Kakao"; // 데이터 출처(신뢰도)
}

// 추천 근거 카드 3줄(제안서 5단계).
export interface Reason {
  budget: string;
  time: string;
  safety: string;
}

export interface Course {
  id: string;
  title: string;
  places: Place[];
  totalCost: number; // 1인 합계
  totalMin: number; // 이동 포함 소요(분)
  score: number; // 0~100
  reason: Reason;
}


// 지도앱 바로가기 딥링크(제안서 6단계). 좌표는 WGS84.
export function mapLinks(p: Place) {
  const q = encodeURIComponent(p.title);
  return {
    kakao: `https://map.kakao.com/link/map/${q},${p.mapy},${p.mapx}`,
    naver: `https://map.naver.com/v5/search/${q}`,
    google: `https://www.google.com/maps/search/?api=1&query=${p.mapy},${p.mapx}`,
  };
}

export const DEFAULT_INPUT: FilterInput = {
  area: "해운대",
  timeHours: 5,
  budget: 70000,
  partySize: 2,
  interests: ["food", "view"],
  exclude: [],
};
