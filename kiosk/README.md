# 이서당 녹화 앱 키오스크 디자인

이서당 녹화 앱 3.0.7 키오스크 화면(세로 1080×1920, 노트북용 가로 1600×900)의 디자인 개선 자료입니다. 변경 항목은 C1~C20입니다.

## 파일

| 경로 | 내용 |
|---|---|
| `DESIGN.md` | 디자인 기준서: 색, 여백, 둥글기, 글자, 아이콘, 버튼, 컴포넌트, 움직임, 변수 |
| `handoff/apply-design.mjs` | 자동 적용 파일. 앱 폴더(eseodang30-app)에서 `node apply-design.mjs` 한 번 실행하면 C1~C20 적용 |
| `handoff/README.txt` | 적용 방법 |
| `preview/preview-prototype.html` | 브라우저로 여는 클릭형 미리보기(변경 모두 반영) |
| `assets/eseodang-symbol.svg` | 헤더 왼쪽 이서당 심볼 |

## 적용 방법 (개발자)

1. `handoff/apply-design.mjs`를 eseodang30-app 폴더 맨 위에 복사
2. `node apply-design.mjs` 실행 (여러 번 실행해도 안전, 이미 적용된 항목은 건너뜀)
3. `git diff`로 확인 후 앱을 실행해 화면 확인
4. "✗"로 표시된 항목이 있으면 그 줄을 디자이너에게 전달

스크립트가 새로 만드는 파일: `src/renderer/src/design/` 아래 LevelMeter.tsx(C9), StepIndicator.tsx(C13), PreviewStatus.tsx(C18), BrandMark.tsx(C19)

## 온라인 자료 (Claude, 공유 설정 필요)

- 디자인 캔버스(전체 화면): https://claude.ai/artifact/RGEyn164FKN2XMeF9FpZ6Y
- 인계 문서(항목별 전/후): https://claude.ai/artifact/941cG3KGkDPiQm55V947ac
- 디자인 시스템(컴포넌트 미리보기): https://claude.ai/artifact/QwYdg8426FmnKCrGoWc4KF
