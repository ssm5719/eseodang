# Dialog

되돌리기 어려운 동작 전에 띄우는 확인 창입니다. `.scrim` 안에 `.dialog`, 그 안에 `.dialog-head`, `.dialog-body`, `.dialog-foot`.

- 뒤를 검정 32% 막(`scrim`)으로 덮고, 창은 `surface` 바탕 + 라운드 8px + `shadow-xl`. 블러는 쓰지 않습니다.
- 폭 500px. 머리 높이 60px · 좌우 24px, 제목 20px 700(`t-dialog`).
- 본문은 결과를 미리 말합니다: "1~2분 동안 녹화할 수 없습니다."
- 아래 오른쪽에 [취소 `.btn`] [실행 `.btn.danger` 또는 `.btn.primary`] 순서.
