# Appliance forecasting dashboard bundle

이 폴더는 원본 프로젝트를 참조하지 않고도 가전별 다음 24시간 소비전력량을
예측할 수 있도록 만든 배포 묶음이다. 원본 파일은 삭제하거나 이동하지 않고
복사했다.

## 구성

```text
dashboard/
├── data_store.py
├── measurement_pipeline.py
├── series_export.py
├── inference.py
├── requirements.txt
├── data/<가전>/
│   ├── chronos_model_input.parquet
│   ├── chronos_hourly.parquet
│   └── preprocessing_summary.json
└── models/<가전>/checkpoint/
    ├── config.json
    └── model.safetensors
```

지원 가전은 `tv`, `에어컨`, `제습기`, `세탁기`다. 시계열 ID는 사람과
가전을 합친 값이다. 예: `정빈_tv`, `채연_제습기`.

## 설치

```bash
python3 -m venv .venv-dashboard
.venv-dashboard/bin/python -m pip install -r dashboard/requirements.txt
```

프로젝트 웹사이트는 `.venv-dashboard/bin/python`이 있으면 자동으로 이 환경을
사용한다. 다른 Python을 사용하려면 웹 서버를 실행하기 전에
`WATTWISE_PYTHON=/path/to/python`을 지정한다.

## 실측 CSV 전처리

원본 CSV는 저장소에 커밋하지 않고 로컬 `실측 2/` 폴더에 둔다. 다음 명령은
폴더 이름(`<사용자>_<가전>`)과 CSV 스키마·가구ID·채널ID·중복 시각을 검증한
뒤, 분 단위 전력량을 시간 단위 Parquet으로 변환한다. 모든 입력 검증이 끝난
후 임시 파일을 원자적으로 교체하므로 실패 시 기존 Parquet을 보존한다.

```bash
.venv-dashboard/bin/python dashboard/measurement_pipeline.py \
  --source "실측 2"
```

일부 가전만 다시 만들 수도 있다.

```bash
.venv-dashboard/bin/python dashboard/measurement_pipeline.py \
  --source "실측 2" \
  --appliance tv \
  --appliance 세탁기
```

시간당 유효 분 데이터가 80% 미만이면 `low_coverage=1`로 표시하고 모델 입력에서
제외한다. 임계값은 `--minimum-hourly-coverage`로 조정할 수 있다.

## 미래 24시간 예측

프로젝트 루트에서 실행:

```bash
keti/bin/python dashboard/inference.py \
  --subject 정빈 \
  --appliance tv \
  --device cpu
```

또는 ID를 직접 지정한다.

```bash
keti/bin/python dashboard/inference.py \
  --series-id 채연_제습기 \
  --appliance 제습기
```

기본적으로 최근 336시간을 context로 사용하고 다음 24시간을 예측한다.
결과는 `dashboard/predictions/`에 CSV로 저장된다.

## 웹에서 실행

프로젝트 루트에서 Next.js 개발 서버를 시작하고 `자취방 실증` 메뉴로 이동한다.

```bash
npm install
npm run dev
```

가전과 실측 시계열을 고른 뒤 `24시간 예측 실행`을 누르면 로컬 API가 해당
가전의 `model.safetensors`를 CPU에 로드한다. 최근 336시간 실측과 다음
24시간의 중앙 예측 및 10~90% 분위수 구간이 페이지에 표시된다. 외부 추론
API는 사용하지 않는다.

## 출력 열

- `appliance`: 가전
- `series_id`: 실측 대상과 가전의 고유 ID
- `timestamp`: 미래 예측 시각
- `prediction_kwh`: point forecast
- `0.1`, `0.5`, `0.9`: 제공되는 경우 예측 분위수

대시보드에서는 `prediction_kwh`를 선 그래프로, 분위수 0.1~0.9를 예측
구간으로 표시하면 된다.

## 현재 가능한 조합

| 사용자 | TV | 에어컨 | 제습기 | 세탁기 |
|---|---:|---:|---:|---:|
| 정빈 | O | O | X | O |
| 진규 | O | O | X | O |
| 채연 | O | O | O | O |

새 측정 데이터가 추가되면 기존 Parquet을 새 데이터로 갱신해야 한다.
`inference.py`는 선택한 시계열에서 결측이 없는 최신 336시간을 사용한다.
