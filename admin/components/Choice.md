# Choice

체크박스(`input.check`)와 라디오(`input.radio`)입니다. 글자와 함께 `label.choice`로 감싸 글자를 눌러도 선택되게 합니다.

- 16px, 바탕 `bg` + 1px 안쪽 링 `line-input`. 선택되면 `violet` 채움 + 흰 표시. 체크박스 라운드 4px(`radius-xs`), 라디오는 원.
- 일부만 선택된 "전체 선택"은 `indeterminate`(가운데 가로선)로 보여 줍니다.
- 세로로 쌓을 땐 `.choice-group`, 가로로 늘어놓을 땐 `.choice-group.row`. 보충 설명은 `.choice-hint`.
- 켜고 끄는 즉시 반영되는 설정은 체크박스가 아니라 `.switch`를 씁니다. 체크박스는 저장 버튼을 눌러야 반영되는 폼 안에서만.
