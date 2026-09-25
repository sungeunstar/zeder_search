# ZEDER Search

## 3D island homepage

The customer homepage now includes a real Three.js ocean/island scene, cinematic camera, explorer controls and depth-of-field. The marketer studio stays separate. **Run `npm install` before `npm run dev`**; the build vendors the pinned Three.js runtime locally. See [implementation and controls](docs/ISLAND.md).


**고객은 이야기하고, 마케터는 전략을 다듬습니다.**

대시보드부터 시작하던 흐름을 대화 우선 UX로 다시 만든 웹 앱입니다. Node.js 22+에서 `npm install` 후 실행합니다. Three.js 0.169.0을 같은 서버에서 제공합니다.

## 고객 경험

`한 문장으로 요청 → 대화로 맥락 정리 → 실행 전략과 도구 자동 제안 → 요청 확정 → 마케터 검토 → 고객 승인 → 실행 준비`

첫 화면은 입력창 하나입니다. 타깃·가설·예산 폼이나 도구 선택을 고객에게 요구하지 않습니다. 필요한 질문은 대화에서 한 번에 하나씩 합니다. LLM 모드에서는 정보가 충분한 첫 요청만으로도 바로 전략을 제안할 수 있습니다. 실행 경로는 사업 맥락에 따라 1~4개이며 특정 3개 채널로 고정하지 않습니다.

## 화면

| 경로 | 역할 |
|---|---|
| `/#/` | 고객 시작 화면: 대화 입력 |
| `/#/chat/:id` | 대화, 전략 버전, 실행 경로 및 도구 제안 |
| `/#/requests` | 이전 대화 및 요청 목록 |
| `/#/request/:id` | 요청 후 진행 상황, 검토본 확인, 수정 요청, 실행 준비 승인 |
| `/#/studio` | 마케터 요청함과 실제 로컬 요청 수 |
| `/#/studio/:id` | 고객 대화 맥락, 구조화된 전략 편집, 초안 저장 및 제출 |

## 실행 및 검증

```bash
npm install
npm run dev
# http://localhost:3000
npm test
npm run build
```

`npm run build`는 문법 검사와 Three.js 로컬 패키징 후 공개 파일을 `dist/`로 복사합니다. `api/chat.js`는 별도 서버 함수입니다.

```bash
node scripts/preview.mjs
# preview.html: 단일 파일 예시 프리뷰
python tests/ui_smoke.py
# 별도 설치된 Python Playwright와 Chromium 필요
```

## 실제 LLM 연결

`.env.example`을 `.env`로 복사하고 **서버에만** 다음을 설정하세요.

```dotenv
OPENAI_API_KEY=발급받은_API_키
OPENAI_MODEL=계정에서_사용_가능한_Structured_Outputs_지원_모델
ZEDER_PREVIEW_KEY=16자_이상의_무작위_비공개_테스트_접근_코드
```

값을 모두 설정한 뒤 서버를 다시 시작합니다. 웹 화면의 `LLM 연결`에서 **테스트 접근 코드**만 입력합니다. OpenAI API 키를 화면에 입력하거나 저장소에 커밋하지 마세요.

`POST /api/chat`은 서버에서 OpenAI Responses API와 엄격한 JSON Schema를 사용합니다. 브라우저는 응답을 전략 흐름으로 렌더링합니다. 모델 오류를 가짜 성공이나 예시 응답으로 바꾸지 않습니다. `store:false`, 출력 길이 제한, 입력 검증, 시간 제한, 미리보기 코드 확인, 기초 요청 빈도 제한을 적용했습니다.

모델 인증정보가 없으면 화면에 **예시 모드**가 표시됩니다. 이 모드의 응답은 규칙 기반 UX 시뮬레이션이지 실제 LLM 결과가 아닙니다.

## Vercel 웹 배포

GitHub에서 `sungeunstar/zeder_search`를 Import하고 Framework Preset은 `Other`를 사용합니다. 저장소의 `vercel.json`에 Build Command `npm run build`, Output Directory `dist`, 서버 함수 설정이 포함되어 있습니다. 서버 환경변수는 Vercel 프로젝트에서 별도로 설정합니다.

이 작업에서는 원격 저장소 반영까지 수행하며, 실제 Vercel 배포와 실모델 호출은 별도 검증 대상입니다. 환경변수를 비워 두면 비용이 발생하는 모델 호출 없이 예시 UX를 확인할 수 있습니다.

## 현재 구현 범위와 제한

- **구현:** 대화 우선 UI, 자동 도구 제안, 별도 마케터 스튜디오, 검토 초안/제출, 고객 수정 요청/승인, 전략 버전 보존, 템플릿 초안 생성/다운로드, 대화 JSON 내보내기, 모바일 레이아웃.
- **데이터:** 이 브라우저의 localStorage에 저장됩니다. 고객·마케터 화면은 같은 브라우저의 데이터를 공유하는 체험입니다. 계정 간 협업, 서버 DB, 로그인 및 실제 역할별 접근 제어는 아직 없습니다. 브라우저 데이터를 삭제하면 기록을 잃을 수 있으므로 중요한 대화는 내보내세요.
- **AI:** 서버 연결 코드는 구현했지만 실제 API 키가 제공되지 않아 라이브 모델 호출은 검증하지 않았습니다. 생성 전 ID와 pending 상태를 만들고 응답·모델·사용량을 브라우저에 보관합니다. 브라우저 종료 중 응답을 복구하는 서버 측 durable generation storage는 후속 과제입니다.
- **실행:** 고객 탐색·DM·이메일·광고·외부 게시·결제·정산·실제 전문가 매칭은 연결되지 않았습니다. 승인 후 만드는 결과는 명확히 표시된 템플릿입니다. 조회되지 않은 URL을 읽었다고 주장하지 않습니다.
- **보안:** 테스트 접근 코드는 로그인/RBAC가 아닙니다. 요청 빈도 제한은 프로세스 내부의 기초 보호입니다. 공개 상용 운영 전에 인증, 워크스페이스 격리, 영속 저장소, 분산 쿼터, 결제/개인정보 정책을 추가해야 합니다.

## 테스트 결과

Node 로직·스키마·저장소·HTTP·씬 테스트 **61개 통과**. 실제 Three.js/WebGL2 렌더링 및 앱 흐름의 로컬 브라우저 시나리오 **10개 통과**. 로컬 생성 환경은 브라우저 탐색 제한으로 self-contained HTML과 메모리 저장 어댑터를 사용합니다. 렌더러와 셰이더는 실제 Three.js이며 대체 렌더러가 아닙니다. GitHub CI는 별도로 실제 HTTP 접속·브라우저 저장소를 사용하는 `tests/browser.mjs`를 실행합니다. CI 성공 여부는 해당 실행 결과에서 확인하세요. 상세 검증 범위는 `docs/ISLAND.md`를 참고하세요.

## 주요 파일

- `public/app.js`: 화면·상태 전이·사용자 액션
- `public/styles.css`: 고객 대화 UI 및 분리된 마케터 작업 환경
- `public/domain.js`: 전략 검증·버전·요청/검토/승인·예시 응답·템플릿
- `public/store.js`: 브라우저 저장, 손상 데이터 비파괴 처리
- `lib/llm.js`: 대화 정책, JSON Schema, 서버 LLM 어댑터
- `api/chat.js`: 보호된 모델 요청 엔드포인트
- `docs/UX.md`: 디자인 의도 및 다음 개발 기준

## 구현 참고

- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Vercel Node.js Functions: https://vercel.com/docs/functions/runtimes/node-js
- Vercel Project Configuration: https://vercel.com/docs/project-configuration/vercel-json
