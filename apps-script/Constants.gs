// 시트 이름
var SHEET = {
  CONFIG: '설정',
  COLUMN_MAP: '컬럼매핑',
  ITEM_MASTER: '품목마스터',
  REFUND_REASON: 'CS환불규정',
  ORDERS_GMAIL: '주문_Gmail',
  ORDERS_KAKAO: '주문_카카오톡',
  ORDERS_PLATFORM: '주문_발주플랫폼',
  ORDERS_ALL: '통합주문',
  REFUNDS: 'CS환불내역',
  INBOUND_RAW: '원물입고내역',
  INBOUND_BOX: '박스입고내역',
  BASELINE_RAW: '원물기초재고',
  BASELINE_BOX: '박스기초재고',
  STOCK_RAW: '재고_원물현황',
  STOCK_BOX: '재고_박스현황',
  ORDER_DETAIL_CALC: '주문상세계산',
  PROFIT: '순이익_품목별옵션별',
  DASHBOARD: '대시보드',
  COURIER_MAP: '택배사매핑',
  WORKER_MASTER: '인력마스터',
  ATTENDANCE: '근무기록',
  LABOR_CALENDAR: '근무캘린더',
  PLATFORM_UPLOAD_MAP: '업로드양식매핑'
};

// 그린모먼트 관리자페이지에 주문을 올릴 때 쓰는 업로드 양식 헤더 ("관리자페이지 파일.xlsx" 그대로)
var PLATFORM_UPLOAD_HEADERS = [
  '주문자', '주문자연락처1', '주문자주소', '수령인', '주소', '우편번호',
  '수령인연락처1', '수령인연락처2', '수량', '상품명', '배송메모',
  '택배사', '운송장번호', '거래처주문번호', '상품주문번호'
];

// 업로드양식매핑 시트: 소스별로 "원본컬럼명 -> 관리자업로드양식 컬럼명" 매핑을 등록
var PLATFORM_UPLOAD_MAP_HEADERS = ['소스', '원본컬럼명', '업로드양식컬럼명'];

var WORKER_MASTER_HEADERS = ['이름', '기본일당', '활성여부', '비고'];
var ATTENDANCE_HEADERS = ['등록일시', '근무일자', '이름', '일당', '비고'];
// 근무캘린더는 고정 헤더가 아니라 달력 그리드라 buildLaborCalendarSheet_()에서 직접 구성한다.
var LABOR_CALENDAR_MAX_WORKERS = 30;

// 어드민 양식(업로드용 표준 배송 서식) 헤더 - 실제 greenmoment 업로드 양식 그대로
var ADMIN_FORM_HEADERS = [
  '보내는사람', '보내는분전화번호', '받는고객', '받는고객전체주소', '우편번호',
  '받는고객전화번호', '받는고객핸드폰번호', '박스수량', '품명01', '배송메세지',
  '운송장번호', '주문번호'
];

// 택배사매핑 시트: 택배사별로 "원본컬럼명 -> 어드민양식 컬럼명" 매핑을 등록
var COURIER_MAP_HEADERS = ['택배사', '원본컬럼명', '어드민양식컬럼명'];

// 표준 주문 스키마 (세 채널 공통, 이 순서 그대로 시트 헤더에 반영됨)
var ORDER_HEADERS = [
  '수집일시', '소스', '원본식별자', '주문일시', '주문번호',
  '거래처명', '품목명', '옵션명', '수량', '단위',
  '판매단가', '공급단가', '비고'
];

var REFUND_HEADERS = [
  '등록일시', '환불일시', '주문번호', '품목명', '옵션명',
  '환불수량', '환불사유', '환불금액', '원물회수여부', '소스', '비고'
];

var ITEM_MASTER_HEADERS = [
  '품목코드', '품목명', '옵션코드', '옵션명', '박스종류', '매입처명',
  '판매단가', '매입원가_단위당',
  '원물환산계수', '박스환산계수', '활성여부'
];

var REFUND_REASON_HEADERS = ['환불사유코드', '환불사유명', '환불유형', '원물손실여부', '비고'];

var INBOUND_RAW_HEADERS = ['입고일자', '품목명', '입고량', '단위', '매입처', '매입단가', '비고'];
var INBOUND_BOX_HEADERS = ['입고일자', '박스종류', '입고수량', '매입처', '매입단가', '비고'];

var BASELINE_RAW_HEADERS = ['품목명', '기준일자', '기초재고량'];
var BASELINE_BOX_HEADERS = ['박스종류', '기준일자', '기초재고량'];

// 컬럼매핑 시트: 각 소스별로 "원본 파일의 헤더 텍스트" -> "표준 필드명" 매핑을 등록
var COLUMN_MAP_HEADERS = ['소스', '원본컬럼명', '표준필드명'];

// 설정 시트: key-value
var CONFIG_HEADERS = ['설정키', '값', '설명'];
var CONFIG_KEYS = {
  GMAIL_SEARCH_QUERY: 'GMAIL_SEARCH_QUERY',
  GMAIL_PROCESSED_LABEL: 'GMAIL_PROCESSED_LABEL',
  KAKAO_FOLDER_ID: 'KAKAO_FOLDER_ID',
  KAKAO_DONE_FOLDER_ID: 'KAKAO_DONE_FOLDER_ID',
  PLATFORM_FOLDER_ID: 'PLATFORM_FOLDER_ID',
  PLATFORM_DONE_FOLDER_ID: 'PLATFORM_DONE_FOLDER_ID',
  REFRESH_INTERVAL_MINUTES: 'REFRESH_INTERVAL_MINUTES',
  COURIER_SOURCE_FOLDER_ID: 'COURIER_SOURCE_FOLDER_ID',
  COURIER_DONE_FOLDER_ID: 'COURIER_DONE_FOLDER_ID',
  COURIER_OUTPUT_FOLDER_ID: 'COURIER_OUTPUT_FOLDER_ID',
  PLATFORM_UPLOAD_SOURCE_FOLDER_ID: 'PLATFORM_UPLOAD_SOURCE_FOLDER_ID',
  PLATFORM_UPLOAD_DONE_FOLDER_ID: 'PLATFORM_UPLOAD_DONE_FOLDER_ID',
  PLATFORM_UPLOAD_OUTPUT_FOLDER_ID: 'PLATFORM_UPLOAD_OUTPUT_FOLDER_ID',
  PLATFORM_UPLOAD_DEFAULT_SOURCE: 'PLATFORM_UPLOAD_DEFAULT_SOURCE',
  COURIER_DEFAULT_SOURCE: 'COURIER_DEFAULT_SOURCE'
};

var SOURCE = {
  GMAIL: 'Gmail',
  KAKAO: '카카오톡',
  PLATFORM: '발주플랫폼'
};
