# WattWise Architecture

## 설계 목표

WattWise는 Next.js 화면, Python 시계열 모델, 로컬 Ollama를 한 저장소에서 실행합니다.
서로 다른 런타임이 직접 얽히지 않도록 다음 경계를 사용합니다.

1. 페이지는 사용자 입력과 화면 조합을 담당합니다.
2. `src/features`는 기능별 타입·설정·순수 계산을 담당합니다.
3. `src/server`는 외부 프로세스와 파일 시스템 접근을 담당합니다.
4. API 라우트는 입력 검증과 HTTP 응답 변환만 담당합니다.
5. Python 모듈은 데이터 검증·전처리·추론 결과를 JSON으로 제공합니다.

## 의존성 방향

```text
app pages ───────▶ features ───────▶ lib
   │                  │
   └─ app/api ───▶ server ───▶ Python CLI
                              ├─ dashboard
                              └─ household_chronos2
```

- `features`는 Next.js 서버 구현에 의존하지 않습니다.
- `lib`의 요금·거래·태양광 계산은 가능한 한 순수 함수로 유지합니다.
- 클라이언트 컴포넌트는 Python 파일이나 로컬 데이터 경로를 알지 못합니다.
- Python 실행 파일은 stdout에 JSON만 출력하고 진단 로그는 stderr를 사용해야 합니다.

## 기능 모듈

### Appliances / Deploy

- `src/features/appliances/config.ts`: 지원 가전 ID와 표시 이름의 단일 원천
- `src/features/deploy/types.ts`: 실측·예측 API와 화면이 공유하는 계약
- `dashboard/data_store.py`: Parquet 경로 및 필수 열 검증
- `dashboard/series_export.py`: NaN을 포함하지 않는 strict JSON 출력

### Solar

- `src/features/solar/calculator.ts`: 소비량 추정, 설치 가능 면적, 패널 수, 견적,
  보조금, 발전량과 회수기간을 계산
- `src/app/(portal)/solar/page.tsx`: 입력 상태, 주소 검색, 지도와 결과 시각화

복잡한 수식이 JSX 렌더링과 분리되어 입력값 기반 단위 테스트를 추가하기 쉽습니다.

### Analytics

- `src/features/analytics/benchmark.ts`: 기간 정규화와 시간대·요일·일별·히트맵 집계
- `src/app/(portal)/analytics/page.tsx`: API 데이터 로딩과 차트 구성

### Households

- `src/features/households/model.ts`: 가전 카탈로그, 직접 입력 시뮬레이션,
  이상 점수 계산 및 공유 타입
- `src/app/(portal)/households/page.tsx`: 실제 모델 API 호출과 두 진단 모드의 UI

실제 Chronos-2/오토인코더 결과와 직접 입력 기반 간이 계산을 코드 경계에서 구분합니다.

## 실측 데이터 흐름

```text
실측 2/*.csv (Git 제외)
  └─ measurement_pipeline.py
      ├─ 스키마·채널·가구ID·중복 시각 검증
      ├─ 분 단위 Wh → 시간 단위 kWh 집계
      ├─ 수집률 80% 미만 행 표시
      └─ dashboard/data/*/*.parquet (Git 추적)
          ├─ series_export.py → 실측 탐색 API
          ├─ usage_summary.py → 상담 grounding
          └─ inference.py → Chronos-2 입력
```

기존 결과 파일은 검증이 끝난 후 임시 파일에서 원자적으로 교체합니다. 원본 CSV와
Ollama 모델은 저장소 외부에 남고, 재현 가능한 코드와 정제 결과만 커밋합니다.

## 서버와 Python 계약

`src/server/python.ts`는 다음 책임을 한 곳에서 처리합니다.

- 프로젝트 루트와 Python 인터프리터 탐색
- 작업 디렉터리, timeout, 출력 버퍼 설정
- stdout JSON 파싱과 일관된 오류 변환

새 Python 기능을 API에 연결할 때 라우트에서 `child_process`를 직접 사용하지 않고
`runPython` 또는 `runPythonJson`을 사용합니다.

## 테스트 전략

- `tests/*.test.cjs`: 요금·거래·가구 계산·벤치마크 집계 같은 순수 로직 회귀 테스트
- `dashboard/test_measurement_pipeline.py`: 원본 검증, 시간 집계, Parquet 계약 테스트
- `npm run check`: Node 테스트 → ESLint → TypeScript/Next.js 프로덕션 빌드

모델 체크포인트를 매번 로드하는 추론 테스트는 빠른 기본 검증에서 제외합니다.
발표 전에는 별도로 실제 모델 API smoke test를 수행합니다.

## 후속 확장 원칙

- 화면 전용 마크업은 의미 있는 재사용이 생길 때 컴포넌트로 추출합니다.
- 계산과 데이터 변환은 JSX 안에 추가하지 않고 해당 feature의 순수 함수로 둡니다.
- API 요청·응답 타입은 페이지 내부에 중복 선언하지 않습니다.
- 운영 배포로 전환할 때는 `src/lib/store.ts`의 JSON 저장소와 데모 인증을 DB 및
  정식 세션 계층으로 교체합니다.
