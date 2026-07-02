// 활성 노선 (렌더 대상)
export const ACTIVE_LINES = [
  '1호선', '2호선', '3호선', '4호선', '5호선', '6호선', '7호선', '8호선', '9호선',
  '인천1호선', '인천2호선', '신분당선', '수인분당', '경의중앙', '공항철도',
  '경춘', '경강', '서해', '용인경전철', '김포골드라인', '신림선',
  '우이신설', '의정부경전철', 'GTX-A',
]

// dot 시각 크기
export const DOT_OUTER_R = 4
export const DOT_INNER_R = 2.4
export const TRANSFER_R = 4.5
export const TRANSFER_STROKE = 1.6

// 라벨
export const LABEL_FONT = 5
export const LABEL_DIST = DOT_OUTER_R + 2.5

// 종점 badge
export const BADGE_R = 7
export const BADGE_CORNER = 2.6
export const BADGE_OFFSET = BADGE_R + 8

// 환승 pill
export const TRANSFER_DIST = 30
export const TRANSFER_PILL_DOT_R = 2.4
export const TRANSFER_PILL_GAP = 1.6
export const TRANSFER_PILL_PAD = 1.6
export const TRANSFER_PILL_STROKE = 0.8

// 초기 줌 (TransformWrapper initialScale)
export const INITIAL_SCALE = 1.6

// 역 클릭 시 자동 줌 배율
export const FOCUS_SCALE = 2.5

// 자동 줌 애니메이션 시간(ms)
export const FOCUS_ANIM_MS = 300

// 상세 패널 너비 (vw)
export const PANEL_VW = 40

// 상세 패널 우측 여백 (px) — 뷰포트 오른쪽 가장자리와의 간격
export const PANEL_RIGHT_MARGIN_PX = 20
