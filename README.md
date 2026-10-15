# WattWise

가정에서 수집한 전력 데이터를 로컬에서 분석하고, 다음 24시간의 사용량 예측과
이상 징후 탐지, 전기요금·태양광 의사결정을 한 화면에 연결한 온디바이스 에너지
관리 프로젝트입니다. 2026 KETI AI 융합 응용기술 아이디어 경진대회를 위해
고려대학교 팀이 개발했습니다.

## 핵심 구현

- 라즈베리파이·CT 센서로 수집한 분 단위 데이터를 검증하고 시간 단위 Parquet으로 변환
- Chronos-2 체크포인트를 이용한 가전별·가구별 24시간 확률 예측
- 오토인코더 기반 가구 이상 사용 시나리오 분석
- 누진요금, 모의 전력 거래, 건물별 태양광 발전량·손익분기 계산
- Ollama `qwen2.5:1.5b`와 실측 사용량을 결합한 로컬 전력 상담

이 저장소는 단순 화면 목업과 실제 실행 경로를 구분합니다. 실측·예측 기능은 로컬
Python 프로세스와 모델 체크포인트가 필요하고, 정적 대시보드 자료는 `public/dash`에
독립적으로 보관합니다.

## 아키텍처

```text
브라우저
  └─ Next.js App Router
      ├─ src/features       도메인 설정과 API 계약
      ├─ src/components     여러 화면에서 재사용하는 UI
      ├─ src/lib            요금·태양광·거래 등 순수 도메인 로직
      ├─ src/server         서버 전용 Python 실행 어댑터
      └─ src/app/api        입력 검증과 HTTP 응답
              │
              ├─ dashboard              가전 실측 전처리·Chronos-2 추론
              └─ household_chronos2     가구 전체 예측·이상탐지
```

서버 API는 모델 구현을 직접 알지 않고 `src/server/python.ts`를 통해 JSON 계약으로
통신합니다. Python 쪽에서는 `dashboard/data_store.py`가 데이터 경로와 스키마를
관리하고, `measurement_pipeline.py`가 원본 검증과 Parquet 생성을 담당합니다.

## 저장소 구조

```text
src/
├── app/                    페이지와 API 라우트
├── components/             공용 UI 컴포넌트
├── features/               기능별 설정·공유 타입
├── lib/                    프레임워크 비의존 도메인 로직
└── server/                 서버 전용 인프라 어댑터
dashboard/                  가전 실측 데이터와 예측 파이프라인
household_chronos2/         가구 전체 모델 파이프라인
tests/                      TypeScript 도메인 회귀 테스트
public/dash/                정적 분석 결과물
```

## 로컬 실행

### 1. 웹 애플리케이션

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열고 데모 계정
`korea_03 / korea`로 로그인합니다.

### 2. Python 예측 환경

```bash
python3 -m venv .venv-dashboard
.venv-dashboard/bin/python -m pip install -r dashboard/requirements.txt
```

웹 서버는 `.venv-dashboard/bin/python`을 자동으로 사용합니다. 다른 인터프리터는
`WATTWISE_PYTHON` 환경 변수로 지정할 수 있습니다.

### 3. 로컬 상담 모델

```bash
brew install ollama
brew services start ollama
ollama pull qwen2.5:1.5b
```

기본 연결 주소는 `http://localhost:11434`입니다. 필요하면 `OLLAMA_URL`과
`WATTWISE_CHAT_MODEL`로 변경할 수 있습니다.

## 실측 데이터 갱신

원본 CSV는 개인정보와 용량 문제로 Git에 커밋하지 않습니다. 프로젝트 루트의
`실측 2/<사용자>_<가전>/*.csv`에 둔 뒤 다음 명령을 실행합니다.

```bash
.venv-dashboard/bin/python dashboard/measurement_pipeline.py \
  --source "실측 2"
```

파이프라인은 필수 열, 가구·채널 ID, 중복 시각, 시간별 수집률을 검사합니다. 모든
입력을 먼저 검증하고 임시 파일을 거쳐 `dashboard/data`의 Parquet을 교체합니다.
원본 폴더는 `.gitignore`에 포함되며 전처리 결과만 버전 관리합니다.

## 품질 검증

```bash
npm run check
.venv-dashboard/bin/python -m unittest dashboard.test_measurement_pipeline
```

`npm run check`는 도메인 테스트, ESLint, TypeScript 검사와 프로덕션 빌드를 순서대로
실행합니다. Python 테스트는 CSV 검증, 집계 단위, 저장 후 재로딩 계약을 확인합니다.

## 주요 기술 선택

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| Web | Next.js 14, TypeScript, Tailwind CSS | 서버 API와 시각화 UI를 하나의 프로젝트에서 관리 |
| Visualization | Recharts, deck.gl, MapLibre | 시계열·지도 기반 에너지 결과 표현 |
| Data | pandas, PyArrow, Parquet | 시간 단위 집계와 모델 입력의 재현성 확보 |
| Forecast | Chronos-2, PyTorch | 분위수 기반 24시간 확률 예측 |
| Local LLM | Ollama, Qwen 2.5 1.5B | 외부 전송 없는 로컬 상담 경로 |

## 현재 범위와 한계

- 모델 추론은 체크포인트와 Python 의존성이 준비된 로컬 환경에서 동작합니다.
- GitHub Pages의 정적 데모에서는 서버 API·Ollama 기능을 실행할 수 없습니다.
- 태양광 결과는 사전 타당성 검토용이며 구조·음영·시공 조건은 현장 실측이 필요합니다.
- 인증과 로컬 JSON 저장소는 발표용 단일 사용자 구성으로, 운영 배포용 인증·DB는 아닙니다.

세부 가전 파이프라인 사용법은 [`dashboard/README.md`](dashboard/README.md), 가구 모델
실행법은 [`household_chronos2/README.md`](household_chronos2/README.md)를 참고하세요.
모듈 경계와 데이터 흐름에 대한 자세한 설명은
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)에 정리되어 있습니다.
