// 이서당 키오스크 디자인 변경 자동 적용
// 사용법: eseodang30-app 폴더에서  node apply-design.mjs
// 여러 번 실행해도 안전합니다(이미 적용된 항목은 건너뜀). 끝나면 git diff 로 확인하세요.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'

const SRC = 'src/renderer/src'

// 여백 변수 (styles.css 의 :root 에 들어감)
const TOKENS = {
  'space-2': '2px', 'space-4': '4px', 'space-6': '6px', 'space-8': '8px',
  'space-10': '10px', 'space-12': '12px', 'space-14': '14px', 'space-16': '16px',
  'space-18': '18px', 'space-20': '20px', 'space-24': '24px', 'space-28': '28px',
  'space-32': '32px', 'space-36': '36px', 'space-40': '40px', 'space-64': '64px',
  // [C8] 라운드 단계 (--r-sm·--r-md·--r-lg 는 이 값을 가리키는 별칭)
  'r-3': '3px', 'r-6': '6px', 'r-8': '8px', 'r-10': '10px', 'r-12': '12px', 'r-14': '14px',
  'r-16': '16px', 'r-18': '18px', 'r-20': '20px', 'r-28': '28px', 'r-pill': '999px',
  // [C9] 마이크 레벨 막대 색
  'meter-ok': '#3a9e78', 'meter-track': 'var(--deck-2)',
  // [C13] 진행 단계 원·연결선 색
  'step-done': '#34215f',
  // [C20] 앞으로 쓸 변수 (지금 화면 모양은 바뀌지 않음)
  'ok-soft': 'rgba(61, 220, 151, 0.16)', 'pause-soft': 'rgba(245, 181, 68, 0.16)', 'scrim': 'rgba(6, 4, 16, 0.62)', 'focus-ring': 'var(--violet-hi)', 'text-on-color': '#ffffff',
  'focus-ring-width': '3px', 'opacity-disabled': '0.38', 'touch-min': '56px',
  'icon-sm': '24px', 'icon-md': '28px', 'icon-lg': '32px', 'icon-xl': '48px', 'icon-rec': '52px',
  'dur-fast': '120ms', 'dur-base': '240ms', 'dur-slow': '400ms', 'dur-ambient': '4s',
  'ease-standard': 'cubic-bezier(0.2, 0, 0, 1)', 'ease-in-out': 'cubic-bezier(0.6, 0, 0.4, 1)',
  'z-overlay': '100', 'z-sheet': '200', 'z-keyboard': '300', 'z-toast': '400', 'z-remote': '9999'
}

// 변경 목록: find 는 코드 전체에서 정확히 1곳만 맞아야 합니다.
const CHANGES = [
  {
    id: 'C1', desc: '헤더 좌우 여백 40px (세로 배치)',
    find: /(["'`])0 20px 0 32px\1/,
    replace: (q) => `${q}0 var(--space-40)${q}`,
    done: /["'`]0 var\(--space-40\)["'`]/
  },
  {
    id: 'C2', desc: '미리보기·마이크 패널 묶음 좌우 여백 40px',
    find: /(["'`])24px 24px 0\1/,
    replace: (q) => `${q}var(--space-24) var(--space-40) 0${q}`,
    done: /["'`]var\(--space-24\) var\(--space-40\) 0["'`]/
  },
  {
    id: 'C3', desc: '시작 화면 로그인 버튼 사이 간격 20 → 24px',
    find: /(height:\s*(["'`])100%\2,\s*gap:\s*)20\b/,
    replace: (pre) => `${pre}'var(--space-24)'`,
    done: /height:\s*["'`]100%["'`],\s*gap:\s*["'`]var\(--space-24\)["'`]/
  },
  {
    id: 'C6', desc: '처음으로(집) 아이콘을 버튼 정가운데로 (1px 위로)',
    find: /M4 11\.5 12 5l8 6\.5V20a1 1 0 0 1-1 1h-4\.5v-6h-5v6H5a1 1 0 0 1-1-1z/,
    replace: () => 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
    done: /M4 10\.5 12 4l8 6\.5V19a1 1 0 0 1-1 1h-4\.5v-6h-5v6H5a1 1 0 0 1-1-1z|M2\ 10\.125L12\ 2l10\ 8\.125V20\.75a1\.25\ 1\.25\ 0\ 0\ 1\-1\.25\ 1\.25h\-5\.625v\-7\.5h\-6\.25v7\.5H3\.25a1\.25\ 1\.25\ 0\ 0\ 1\-1\.25\-1\.25z|M2\.545\ 10\.227L12\ 2\.545l9\.455\ 7\.682V20\.273a1\.182\ 1\.182\ 0\ 0\ 1\-1\.182\ 1\.182h\-5\.318v\-7\.091h\-5\.91v7\.091H3\.727a1\.182\ 1\.182\ 0\ 0\ 1\-1\.182\-1\.182z/
  }
]

// [C7] 아이콘 그림 크기 통일: 모든 아이콘을 24칸 격자 안쪽 20칸(2~22)에 가운데 맞춤
//      스피커 켜기/끄기/음량, 화살표 4종은 같이 바뀌도록 한 묶음 기준으로 맞춤
//      면적이 큰 모양(집·네모·원·창·폴더·새로고침)은 설정 톱니와 같은 면적이 되도록 조금 줄임(눈으로 보는 크기 보정)
const ICONS = [
  { id: 'home', el: 'path', from: ["M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z", "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z", "M2 10.125L12 2l10 8.125V20.75a1.25 1.25 0 0 1-1.25 1.25h-5.625v-7.5h-6.25v7.5H3.25a1.25 1.25 0 0 1-1.25-1.25z"], to: "M2.545 10.227L12 2.545l9.455 7.682V20.273a1.182 1.182 0 0 1-1.182 1.182h-5.318v-7.091h-5.91v7.091H3.727a1.182 1.182 0 0 1-1.182-1.182z" },
  { id: 'settings.1', el: 'circle', from: [{"cx": "12", "cy": "12", "r": "3.2"}], to: {"cx": "12", "cy": "12", "r": "2.909"} },
  { id: 'settings.2', el: 'path', from: ["M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"], to: "M18.727 14.727a1.545 1.545 0 0 0 0.273 1.637l0.091 0.091a1.818 1.818 0 1 1-2.546 2.545l-0.09-0.091a1.545 1.545 0 0 0-1.637-0.273 1.545 1.545 0 0 0-0.909 1.364V20.182a1.818 1.818 0 1 1-3.636 0v-0.091a1.545 1.545 0 0 0-1-1.455 1.545 1.545 0 0 0-1.637 0.273l-0.091 0.091a1.818 1.818 0 1 1-2.545-2.545l0.091-0.091a1.545 1.545 0 0 0 0.273-1.637 1.545 1.545 0 0 0-1.364-0.909H3.818a1.818 1.818 0 1 1 0-3.636h0.091a1.545 1.545 0 0 0 1.455-1 1.545 1.545 0 0 0-0.273-1.637l-0.091-0.09a1.818 1.818 0 1 1 2.545-2.546l0.091 0.091a1.545 1.545 0 0 0 1.637 0.273H9.273a1.545 1.545 0 0 0 0.909-1.364V3.818a1.818 1.818 0 1 1 3.636 0v0.091a1.545 1.545 0 0 0 0.909 1.364 1.545 1.545 0 0 0 1.637-0.273l0.091-0.091a1.818 1.818 0 1 1 2.545 2.546l-0.091 0.09a1.545 1.545 0 0 0-0.273 1.637V9.273a1.545 1.545 0 0 0 1.364 0.909H20.182a1.818 1.818 0 1 1 0 3.636h-0.091a1.545 1.545 0 0 0-1.364 0.909z" },
  { id: 'close', el: 'path', from: ["M6 6l12 12M18 6 6 18"], to: "M2 2l20 20M22 2L2 22" },
  { id: 'minimize', el: 'path', from: ["M5 12h14"], to: "M2 12h20" },
  { id: 'plus', el: 'path', from: ["M12 5v14M5 12h14"], to: "M12 2v20M2 12h20" },
  { id: 'maximize', el: 'rect', from: [{"x": "5", "y": "5", "width": "14", "height": "14", "rx": "2"}, {"x": "2", "y": "2", "width": "20", "height": "20", "rx": "2.857"}], to: {"x": "3.881", "y": "3.881", "width": "16.238", "height": "16.238", "rx": "2.32"} },
  { id: 'back', el: 'path', from: ["M15 5l-7 7 7 7"], to: "M16.286 2l-10 10 10 10" },
  { id: 'chevron', el: 'path', from: ["M9 5l7 7-7 7"], to: "M7.714 2l10 10-10 10" },
  { id: 'up', el: 'path', from: ["M5 15l7-7 7 7"], to: "M2 16.286l10-10 10 10" },
  { id: 'down', el: 'path', from: ["M5 9l7 7 7-7"], to: "M2 7.714l10 10 10-10" },
  { id: 'cloud', el: 'path', from: ["M7 18h10.5a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.6 8.2 5 5 0 0 0 7 18z"], to: "M6.396 19.137h10.922a4.681 4.681 0 0 0 0.624-9.32A6.241 6.241 0 0 0 5.98 8.943 5.201 5.201 0 0 0 6.396 19.137z" },
  { id: 'qr.1', el: 'rect', from: [{"x": "4", "y": "4", "width": "6", "height": "6", "rx": "1"}], to: {"x": "2", "y": "2", "width": "7.5", "height": "7.5", "rx": "1.25"} },
  { id: 'qr.2', el: 'rect', from: [{"x": "14", "y": "4", "width": "6", "height": "6", "rx": "1"}], to: {"x": "14.5", "y": "2", "width": "7.5", "height": "7.5", "rx": "1.25"} },
  { id: 'qr.3', el: 'rect', from: [{"x": "4", "y": "14", "width": "6", "height": "6", "rx": "1"}], to: {"x": "2", "y": "14.5", "width": "7.5", "height": "7.5", "rx": "1.25"} },
  { id: 'qr.4', el: 'path', from: ["M14 14h2v2h-2zM18 14h2M14 18h2v2M18 18h2v2h-2"], to: "M14.5 14.5h2.5v2.5h-2.5zM19.5 14.5h2.5M14.5 19.5h2.5v2.5M19.5 19.5h2.5v2.5h-2.5" },
  { id: 'record', el: 'circle', from: [{"cx": "12", "cy": "12", "r": "6"}, {"cx": "12", "cy": "12", "r": "10"}], to: {"cx": "12", "cy": "12", "r": "9.149"} },
  { id: 'pause', el: 'path', from: ["M9 6v12M15 6v12"], to: "M7 2v20M17 2v20" },
  { id: 'stop', el: 'rect', from: [{"x": "6.5", "y": "6.5", "width": "11", "height": "11", "rx": "2"}, {"x": "2", "y": "2", "width": "20", "height": "20", "rx": "3.636"}], to: {"x": "3.801", "y": "3.801", "width": "16.398", "height": "16.398", "rx": "2.981"} },
  // [C16] 재생(이어서 녹화) 화살표: 모서리를 둥글게, 높이를 줄이고 무게중심이 버튼 가운데 오도록 오른쪽으로 보정
  { id: 'play', el: 'path', from: ["M8 5.5v13l10.5-6.5z", "M3.923 2v20l16.154-10z"], to: "M8.414 4.585L19.586 10.915Q21.5 12 19.586 13.085L8.414 19.415Q6.5 20.5 6.5 18.3L6.5 5.7Q6.5 3.5 8.414 4.585Z" },
  { id: 'mic.1', el: 'rect', from: [{"x": "9", "y": "3", "width": "6", "height": "11", "rx": "3"}], to: {"x": "8.667", "y": "2", "width": "6.667", "height": "12.222", "rx": "3.333"} },
  { id: 'mic.2', el: 'path', from: ["M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"], to: "M4.778 10.889a7.222 7.222 0 0 0 14.444 0M12 18.111V22" },
  { id: 'speaker', el: 'path', from: ["M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"], to: "M2 9.059h4.118L11.412 4.353v15.294l-5.294-4.706H2zM15.529 8.471a4.706 4.706 0 0 1 0 7.058M18.471 5.529a8.824 8.824 0 0 1 0 12.942" },
  { id: 'mute', el: 'path', from: ["M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5"], to: "M2 9.059h4.118L11.412 4.353v15.294l-5.294-4.706H2zM16.118 9.059l5.882 5.882M22 9.059l-5.882 5.882" },
  { id: 'keyboard.1', el: 'rect', from: [{"x": "2.5", "y": "6", "width": "19", "height": "12", "rx": "2"}], to: {"x": "2", "y": "5.684", "width": "20", "height": "12.632", "rx": "2.105"} },
  { id: 'keyboard.2', el: 'path', from: ["M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7 14h10"], to: "M5.684 9.895h0.011M9.368 9.895h0.011M13.053 9.895h0.01M16.737 9.895h0.01M6.737 14.105h10.526" },
  { id: 'edit', el: 'path', from: ["M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"], to: "M2 22h5.333L22 7.333l-5.333-5.333L2 16.667zM14.667 4l5.333 5.333" },
  { id: 'youtube.1', el: 'rect', from: [{"x": "2.5", "y": "5.5", "width": "19", "height": "13", "rx": "4"}], to: {"x": "2", "y": "5.158", "width": "20", "height": "13.684", "rx": "4.211"} },
  { id: 'youtube.2', el: 'path', from: ["M10 9.2v5.6l4.8-2.8z"], to: "M9.895 9.053v5.894l5.052-2.947z" },
  { id: 'volume', el: 'path', from: ["M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6"], to: "M2 9.059h4.118L11.412 4.353v15.294l-5.294-4.706H2zM15.529 8.471a4.706 4.706 0 0 1 0 7.058" },
  { id: 'reboot', el: 'path', from: ["M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5", "M22 12.008a10 10 0 1 1-2.925-7.075M22 2.008v5.625h-5.625"], to: "M21.029 12.007a9.029 9.029 0 1 1-2.641-6.388M21.029 2.978v5.079h-5.079" },
  { id: 'window.1', el: 'rect', from: [{"x": "3", "y": "4.5", "width": "18", "height": "15", "rx": "2"}, {"x": "2", "y": "3.667", "width": "20", "height": "16.667", "rx": "2.222"}], to: {"x": "3.147", "y": "4.622", "width": "17.706", "height": "14.755", "rx": "1.967"} },
  { id: 'window.2', el: 'path', from: ["M3 8.5h18", "M2 8.111h20"], to: "M3.147 8.557h17.706" },
  { id: 'sliders', el: 'path', from: ["M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4"], to: "M2 5.75h12.5M19.5 5.75h2.5M2 18.25h5M12 18.25h10M14.5 3.25v5M7 15.75v5" },
  { id: 'upload', el: 'path', from: ["M12 16V5M7 10l5-5 5 5M5 19h14"], to: "M12 17.714V2M4.857 9.143l7.143-7.143 7.143 7.143M2 22h20" },
  { id: 'check', el: 'path', from: ["M5 12.5l4.5 4.5L19 7.5"], to: "M2 12.357l6.429 6.429L22 5.214" },
  { id: 'alert', el: 'path', from: ["M12 8v5M12 16.5h.01M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"], to: "M12 7.99v5.172M12 16.782h0.01M10.242 4.06L2.277 17.816A2.069 2.069 0 0 0 4.036 20.919h15.928a2.069 2.069 0 0 0 1.759-3.103L13.758 4.06a2.069 2.069 0 0 0-3.516 0z" },
  { id: 'headset', el: 'path', from: ["M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2zM20 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM17 17c0 2-2 3-5 3"], to: "M2 15.75v-3.75a10 10 0 0 1 20 0v3.75M2 15.75a2.5 2.5 0 0 0 2.5 2.5h1.25v-6.25H4.5a2.5 2.5 0 0 0-2.5 2.5zM22 15.75a2.5 2.5 0 0 1-2.5 2.5h-1.25v-6.25h1.25a2.5 2.5 0 0 1 2.5 2.5zM18.25 18.25c0 2.5-2.5 3.75-6.25 3.75" },
  { id: 'link', el: 'path', from: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"], to: "M9.446 14.554a5.108 5.108 0 0 0 7.228 0l3.831-3.831a5.108 5.108 0 0 0-7.228-7.228l-1.277 1.277M14.554 9.446a5.108 5.108 0 0 0-7.228 0l-3.831 3.831a5.108 5.108 0 0 0 7.228 7.228l1.277-1.277" },
  { id: 'folder', el: 'path', from: ["M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z", "M2 6.118a2.353 2.353 0 0 1 2.353-2.353h4.706l2.353 2.941h8.235a2.353 2.353 0 0 1 2.353 2.353V17.882a2.353 2.353 0 0 1-2.353 2.353h-15.294a2.353 2.353 0 0 1-2.353-2.353z"], to: "M2.6 6.471a2.212 2.212 0 0 1 2.212-2.212h4.423l2.212 2.765h7.741a2.212 2.212 0 0 1 2.212 2.211V17.529a2.212 2.212 0 0 1-2.212 2.212h-14.376a2.212 2.212 0 0 1-2.212-2.212z" },
]
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const Q = `["'\`]`
const attrRe = (o) => new RegExp(Object.entries(o).map(([k, v], i) =>
  `${i ? `(${Q}?\\s*\\}?[\\s,]+)` : '(\\b)'}${k}(\\s*[=:]\\s*\\{?\\s*${Q}?)${esc(v)}(?![\\d.])`).join(''))
for (const ic of ICONS) {
  if (ic.el === 'path') {
    CHANGES.push({
      id: `C7 ${ic.id}`, desc: '아이콘 그림 크기 통일',
      find: new RegExp(`(${Q})(${ic.from.map(esc).join('|')})\\1`),
      replace: (q) => `${q}${ic.to}${q}`,
      done: new RegExp(`${Q}${esc(ic.to)}${Q}`)
    })
  } else {
    const vals = Object.values(ic.to)
    ic.from.forEach((fr, j) => {
      const others = [ic.to, ...ic.from.filter((_, x) => x !== j)].map(attrRe)
      CHANGES.push({
        id: `C7 ${ic.id}${j ? ' (보정)' : ''}`, desc: '아이콘 그림 크기 통일',
        find: attrRe(fr),
        replace: (...g) => Object.keys(ic.to).map((k, i) => `${g[2 * i]}${k}${g[2 * i + 1]}${vals[i]}`).join(''),
        done: { test: (t) => others.some((r) => r.test(t)) }
      })
    })
  }
}

// [C8] 라운드를 변수로: 큰 상자(영상·패널·정보 표·시작 화면 버튼)는 --r-lg 하나로 묶고 24 → 18px
const R = (n) => (n === '24' ? 'var(--r-lg)' : n === '21' ? 'var(--r-pill)' : n === '999' ? 'var(--r-pill)' : `var(--r-${n})`)
const RV = ['3', '6', '8', '10', '12', '14', '16', '18', '20', '21', '24', '28', '999']
for (const [k, n] of [['sm', '12'], ['md', '16'], ['lg', '24']]) {
  CHANGES.push({
    id: `C8 --r-${k}`, desc: `라운드 별칭 --r-${k} → 단계 변수`,
    find: new RegExp(`(--r-${k}:\\s*)${n}px`),
    replace: (pre) => `${pre}var(--r-${k === 'lg' ? '18' : n})`,
    done: new RegExp(`--r-${k}:\\s*var\\(--r-`)
  })
}
CHANGES.push({
  id: 'C8 borderRadius', desc: '코드 안 숫자 라운드 → 변수', all: true,
  find: new RegExp(`(borderRadius\\s*:\\s*)(${RV.join('|')})(?![\\d.])`),
  replace: (pre, n) => `${pre}'${R(n)}'`,
  done: { test: () => true }
})
CHANGES.push({
  id: 'C8 border-radius', desc: 'CSS 숫자 라운드 → 변수', all: true,
  find: new RegExp(`(border-radius\\s*:\\s*)(${RV.join('|')})px`),
  replace: (pre, n) => `${pre}${R(n)}`,
  done: { test: () => true }
})

// [C10] 창·큰 버튼·입력칸 라운드를 큰 상자와 같은 --r-lg(18px)로
for (const [cls, old] of [['dialog', 'var\\(--r-28\\)|28px'], ['btn-lg', 'var\\(--r-20\\)|20px'], ['field-box', 'var\\(--r-md\\)|var\\(--r-16\\)|16px']]) {
  CHANGES.push({
    id: `C10 .${cls}`, desc: "라운드 → var(--r-lg)",
    find: new RegExp(`(\\.${cls}\\s*\\{[^}]*?border-radius\\s*:\\s*)(?:${old})`),
    replace: (pre) => `${pre}var(--r-lg)`,
    done: new RegExp(`\\.${cls}\\s*\\{[^}]*?border-radius\\s*:\\s*var\\(--r-lg\\)`)
  })
}

// [C11] 확인 창 바깥 여백을 메인 화면 가로 여백(40px)에 맞춤
//      닫기(X) 버튼은 64px 상자 안에 아이콘이 있어 오른쪽 24px(상자 안 여백 16px 포함 40), 제목 글자 윗선이 40px이 되도록 위 32px
for (const [cls, v] of [
  ['dialog-head', 'var(--space-32) var(--space-24) var(--space-8) var(--space-40)'],
  ['dialog-body', 'var(--space-16) var(--space-40) var(--space-8)'],
  ['dialog-foot', 'var(--space-24) var(--space-40) var(--space-40)']
]) {
  const ev = v.replace(/[()]/g, '\\$&')
  CHANGES.push({
    id: `C11 .${cls}`, desc: '확인 창 여백 40px',
    find: new RegExp(`(\\.${cls}\\s*\\{[^}]*?padding\\s*:\\s*)(?!${ev})[^;}]+`),
    replace: (pre) => `${pre}${v}`,
    done: new RegExp(`\\.${cls}\\s*\\{[^}]*?padding\\s*:\\s*${ev}`)
  })
}

// [C14] 강좌 목록 줄 라운드 18 → 14px (아래 큰 버튼 18px보다 한 단계 작게)
CHANGES.push({
  id: 'C14 강좌 목록', desc: '강좌 목록 줄 라운드 → var(--r-14)',
  find: /(role\s*[=:]\s*["']option["'][\s\S]{0,400}?borderRadius\s*:\s*)(?:'var\(--r-18\)'|"var\(--r-18\)"|18\b)/,
  replace: (pre) => `${pre}'var(--r-14)'`,
  done: /role\s*[=:]\s*["']option["'][\s\S]{0,400}?borderRadius\s*:\s*["']var\(--r-14\)["']/
})

// [C15] 녹화 중 조작 버튼(일시정지·이어서 녹화·녹화 종료)을 모두 132px로, 둘레에 버튼 색 발광 추가
CHANGES.push({
  id: 'C15 버튼 크기', desc: '조작 버튼 크기 112/132 → 132', all: true,
  find: /[\w.]*?big\s*\?\s*132\s*:\s*112/,
  replace: () => '132',
  done: { test: () => true }
})
CHANGES.push({
  id: 'C15 아이콘 크기', desc: '조작 버튼 아이콘 44/52 → 52',
  find: /[\w.]*?big\s*\?\s*52\s*:\s*44/,
  replace: () => '52',
  done: /size\s*[:=]\s*\{?\s*52\b/
})
CHANGES.push({
  id: 'C15 발광', desc: '조작 버튼 둘레 발광(버튼 색, 회색 버튼은 --text-3)',
  find: /(background\s*:\s*)([\w.]*tone)(\s*,[\s\S]{0,160}?)boxShadow\s*:\s*(["'`])0 12px 32px rgba\(0,\s*0,\s*0,\s*\.35\)\4/,
  replace: (pre, tone, mid) => {
    const g = `\${${tone} === 'var(--deck-3)' ? 'var(--text-3)' : ${tone}}`
    return `${pre}${tone}${mid}boxShadow: \`0 0 0 6px color-mix(in srgb, ${g} 30%, transparent), 0 0 40px 8px color-mix(in srgb, ${g} 45%, transparent), 0 12px 32px rgba(0,0,0,.35)\``
  },
  done: /boxShadow\s*:\s*`0 0 0 6px color-mix\(in srgb, \$\{/
})

// [C17] 남은 라운드 정리: 소리 버튼 18 → 14px, QR 로그인 창 안내 이미지 20 → 14px
CHANGES.push({
  id: 'C17 소리 버튼', desc: '소리 켜기/끄기 버튼 라운드 → var(--r-14)',
  find: /(width\s*:\s*64\s*,\s*height\s*:\s*64\s*,\s*background\s*:\s*["']var\(--deck-2\)["']\s*,\s*borderRadius\s*:\s*)(?:'var\(--r-18\)'|"var\(--r-18\)"|18\b)/,
  replace: (pre) => `${pre}'var(--r-14)'`,
  done: /width\s*:\s*64\s*,\s*height\s*:\s*64\s*,\s*background\s*:\s*["']var\(--deck-2\)["']\s*,\s*borderRadius\s*:\s*["']var\(--r-14\)["']/
})
CHANGES.push({
  id: 'C17 QR 안내 이미지', desc: 'QR 로그인 창 안내 이미지 라운드 → var(--r-14)',
  find: /(v20_qr_001["']\)[\s\S]{0,120}?borderRadius\s*:\s*)(?:'var\(--r-20\)'|"var\(--r-20\)"|20\b)/,
  replace: (pre) => `${pre}'var(--r-14)'`,
  done: /v20_qr_001["']\)[\s\S]{0,120}?borderRadius\s*:\s*["']var\(--r-14\)["']/
})

// CSS 묶음: styles.css 맨 끝에 붙습니다 ([번호] 표시로 중복 방지)
const CSS_BLOCKS = [
  {
    id: 'C4', desc: '아이콘 크기(헤더·푸터 24, 내용 32)와 선 굵기(화면에서 2px) 통일',
    css: `
/* [C4] 아이콘: 헤더·푸터 24px, 내용 32px, 선 굵기는 크기와 상관없이 화면에서 2px */
svg[viewBox="0 0 24 24"] { stroke-width: 2; }
svg[width="18"] { stroke-width: 2.667; }
svg[width="20"] { stroke-width: 2.4; }
svg[width="22"] { stroke-width: 2.182; }
svg[width="26"] { stroke-width: 1.846; }
svg[width="40"] { stroke-width: 1.2; }
svg[width="44"] { stroke-width: 1.091; }
svg[width="48"] { stroke-width: 1; }
svg[width="52"] { stroke-width: 0.923; }
svg[width="56"] { stroke-width: 0.857; }
svg:is([width="28"], [width="30"], [width="32"], [width="34"], [width="36"]) { width: 32px; height: 32px; stroke-width: 1.5; }
:is(header, footer) svg[width] { width: 24px; height: 24px; stroke-width: 2; }
`
  },
  {
    id: 'C5', desc: '헤더 아이콘(처음으로·설정) 28px',
    css: `
/* [C5] 헤더 아이콘(처음으로·설정)은 28px, 선은 화면에서 2px */
header svg[width] { width: 28px; height: 28px; stroke-width: 1.714; }
`
  },
  {
    id: 'C12', desc: '창 안의 입력칸·버튼 라운드 14px',
    css: `
/* [C12] 창 안의 입력칸·버튼은 창(18px)보다 한 단계 작은 라운드 */
.dialog :is(.btn, .field-box) { border-radius: var(--r-14); }
`
  },
  {
    id: 'C17', desc: '중간 버튼 18px, 아이콘 버튼 14px',
    css: `
/* [C17] 중간 버튼(고객센터 등)은 창 밖 버튼과 같은 18px, 아이콘 버튼은 14px (창 안 버튼은 C12 규칙으로 14px) */
.btn-md { border-radius: var(--r-lg); }
.icon-btn { border-radius: var(--r-14); }
`
  },
  { id: 'C18', desc: '프리뷰 빈 상태(연결 중·다시 연결 중·연결 안 됨)', css: "/* [C18] 프리뷰가 비어 있을 때 상태 (design/PreviewStatus.tsx) */\n.pv-status { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-12); text-align: center; overflow: hidden; color: var(--text-3); background: radial-gradient(120% 100% at 50% 50%, #1a1535 0%, #0b0918 100%); --pv-glow: var(--violet); }\n.pv-status > * { position: relative; }\n.pv-status::before { content: \"\"; position: absolute; top: 50%; left: 0; width: 70%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--pv-glow) 42%, transparent) 0%, transparent 62%); filter: blur(24px); opacity: 0; animation: pv-sweep 4s ease-in-out infinite; }\n.pv-status.retry { --pv-glow: color-mix(in srgb, var(--pause) 75%, var(--violet)); }\n.pv-status.off::before { display: none; }\n.pv-icon { flex: none; }\n.pv-status.wait .pv-icon { animation: pv-spin 1.2s linear infinite; }\n.pv-status.retry .pv-icon { animation: pv-spin 1.6s cubic-bezier(.6, 0, .4, 1) infinite; }\n@keyframes pv-spin { to { transform: rotate(360deg); } }\n.pv-title { font-size: 26px; font-weight: 700; color: var(--text); }\n.pv-sub { font-size: 18px; font-weight: 500; color: var(--text-2); }\n@keyframes pv-sweep {\n  0% { transform: translate(-90%, -50%); opacity: 0; }\n  25% { opacity: 1; }\n  75% { opacity: 1; }\n  100% { transform: translate(140%, -50%); opacity: 0; }\n}\n@media (prefers-reduced-motion: reduce) { .pv-status::before { animation: none; opacity: 0.7; transform: translate(20%, -50%); } .pv-icon { animation: none !important; } }\n" }
]

const files = []
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?|css)$/.test(n)) files.push(p)
  }
}
walk(SRC)
const text = Object.fromEntries(files.map((f) => [f, readFileSync(f, 'utf8')]))
const changed = new Set()
let failed = 0

// 1) 변수 넣기
const css = files.find((f) => f.endsWith('styles.css') && /:root\s*\{/.test(text[f]))
if (!css) { console.error('✗ :root 가 있는 styles.css 를 찾지 못했습니다'); process.exit(1) }
const missing = Object.entries(TOKENS).filter(([k]) => !text[css].includes(`--${k}:`))
if (missing.length) {
  const block = '\n  /* 여백 단계 */\n' + missing.map(([k, v]) => `  --${k}: ${v};`).join('\n') + '\n'
  text[css] = text[css].replace(/:root\s*\{/, (m) => m + block)
  changed.add(css)
  console.log(`✓ 변수 ${missing.length}개 추가 → ${css}`)
} else console.log('· 변수: 이미 있음')

// 2) CSS 묶음 붙이기
for (const b of CSS_BLOCKS) {
  if (text[css].includes(`[${b.id}]`)) { console.log(`· ${b.id} 이미 적용됨`); continue }
  text[css] = text[css].replace(/\s*$/, '\n\n') + b.css.trim() + '\n'
  changed.add(css)
  console.log(`✓ ${b.id} ${b.desc} → ${css}`)
}

// 3) 변경 적용
for (const c of CHANGES) {
  const hits = files.flatMap((f) => [...text[f].matchAll(new RegExp(c.find, 'g'))].map(() => f))
  if (c.all) {
    for (const f of new Set(hits)) {
      text[f] = text[f].replace(new RegExp(c.find, 'g'), (m, ...g) => c.replace(...g))
      changed.add(f)
    }
    console.log(hits.length ? `✓ ${c.id} ${c.desc} ${hits.length}곳` : `· ${c.id} 이미 적용됨`)
  } else if (hits.length === 1) {
    const f = hits[0]
    text[f] = text[f].replace(c.find, (m, ...g) => c.replace(...g))
    changed.add(f)
    console.log(`✓ ${c.id} ${c.desc} → ${f}`)
  } else if (hits.length === 0 && files.some((f) => c.done.test(text[f]))) {
    console.log(`· ${c.id} 이미 적용됨`)
  } else {
    failed++
    console.error(`✗ ${c.id} ${c.desc}: 맞는 곳이 ${hits.length}곳이라 건너뜀 ${hits.join(', ')}`)
  }
}

// 4) [C9] 마이크 레벨: 칸 모양은 그대로, 색·움직임을 바꾼 새 컴포넌트(design/LevelMeter.tsx)로 교체
const LEVEL_METER = "// [C9] 마이크 입력 레벨 (디자인 인계 스크립트가 추가한 파일)\n// - 칸 모양은 기존과 같음: 높이 18px, 칸 사이 4px\n// - 정상 구간은 차분한 초록(--meter-ok), 꺼진 칸은 패널에 묻히는 색(--meter-track)\n// - 올라갈 땐 바로, 내려갈 땐 천천히(1.5초에 바닥까지). 최고점 칸은 1초 켜진 채 머문 뒤 내려옴\nimport { useEffect, useRef } from 'react'\n\nconst RISE_MS = 40\nconst FALL_FULL_MS = 1500\nconst PEAK_HOLD_MS = 1000\nconst PEAK_FALL_FULL_MS = 2000\n\nconst zone = (i: number, total: number): string =>\n  i >= total * 0.85 ? 'var(--rec)' : i >= total * 0.65 ? 'var(--pause)' : 'var(--meter-ok)'\n\nexport function LevelMeter({ lit, total }: { lit: number; total: number }) {\n  const target = total > 0 ? Math.max(0, Math.min(1, lit / total)) : 0\n  const s = useRef({ target, v: target, peak: target, peakAt: 0 })\n  s.current.target = target\n  const cells = useRef<(HTMLSpanElement | null)[]>([])\n\n  useEffect(() => {\n    let raf = 0\n    let last = performance.now()\n    const step = (now: number): void => {\n      const dt = Math.min(100, now - last)\n      last = now\n      const m = s.current\n      m.v = m.target > m.v ? m.v + (m.target - m.v) * Math.min(1, dt / RISE_MS) : Math.max(m.target, m.v - dt / FALL_FULL_MS)\n      if (m.v >= m.peak) {\n        m.peak = m.v\n        m.peakAt = now\n      } else if (now - m.peakAt > PEAK_HOLD_MS) {\n        m.peak = Math.max(m.v, m.peak - dt / PEAK_FALL_FULL_MS)\n      }\n      const on = Math.round(m.v * total)\n      const peakCell = Math.round(m.peak * total) - 1\n      cells.current.forEach((el, i) => {\n        if (el) el.style.background = i < on || i === peakCell ? zone(i, total) : 'var(--meter-track)'\n      })\n      raf = requestAnimationFrame(step)\n    }\n    raf = requestAnimationFrame(step)\n    return () => cancelAnimationFrame(raf)\n  }, [total])\n\n  return (\n    <div\n      role=\"meter\"\n      aria-label=\"마이크 입력 레벨\"\n      aria-valuemin={0}\n      aria-valuemax={100}\n      aria-valuenow={Math.round(target * 100)}\n      style={{ display: 'flex', gap: 4, height: 18 }}\n    >\n      {Array.from({ length: total }, (_, i) => (\n        <span\n          key={i}\n          ref={(el) => {\n            cells.current[i] = el\n          }}\n          style={{ flex: 1, borderRadius: 'var(--r-3)', background: i < lit ? zone(i, total) : 'var(--meter-track)' }}\n        />\n      ))}\n    </div>\n  )\n}\n"
{
  const target = join(SRC, 'design', 'LevelMeter.tsx')
  mkdirSync(dirname(target), { recursive: true })
  if (!existsSync(target) || readFileSync(target, 'utf8') !== LEVEL_METER) {
    writeFileSync(target, LEVEL_METER)
    console.log(`✓ C9 레벨 막대 파일 → ${target}`)
  } else console.log('· C9 레벨 막대 파일 이미 있음')
  const re = /<div\b[^<>]*?aria-label=["']마이크 입력 레벨["'][^<>]*>([\s\S]*?)<\/div>/
  const hits = files.filter((f) => f.endsWith('.tsx') && f !== target && re.test(text[f]))
  if (hits.length === 1) {
    const f = hits[0]
    const body = text[f].match(re)[1]
    const total = body.match(/length\s*:\s*([\w.]+)/)?.[1]
    const lit = body.match(/\(\s*\w+\s*,\s*(\w+)\s*\)\s*=>[\s\S]*?\b\1\s*<\s*([\w.]+)/)?.[2]
    if (!total || !lit) {
      failed++
      console.error(`✗ C9 레벨 막대: ${f} 에서 칸 수·켜진 칸 변수를 찾지 못함`)
    } else {
      let rel = relative(dirname(f), target).replace(/\\/g, '/').replace(/\.tsx$/, '')
      if (!rel.startsWith('.')) rel = './' + rel
      text[f] = `import { LevelMeter } from '${rel}'\n` + text[f].replace(re, `<LevelMeter lit={${lit}} total={${total}} />`)
      changed.add(f)
      console.log(`✓ C9 레벨 막대 교체 (lit=${lit}, total=${total}) → ${f}`)
    }
  } else if (hits.length === 0 && files.some((f) => f !== target && /<LevelMeter\b/.test(text[f]))) {
    console.log('· C9 레벨 막대 이미 적용됨')
  } else {
    failed++
    console.error(`✗ C9 레벨 막대: 맞는 곳이 ${hits.length}곳이라 건너뜀`)
  }
}

// 5) [C13] 진행 단계: 같은 폭 막대 3칸 → 번호 원 + 연결선 컴포넌트(design/StepIndicator.tsx)로 교체
const STEP_INDICATOR = "// [C13] 진행 단계 표시 (디자인 인계 스크립트가 추가한 파일)\n// - 번호 원 + 연결선. 탭처럼 보이지 않게 순서를 표현\n// - 지난 단계: 어두운 보라 원 + 체크 / 진행 중: 어두운 보라 원 + 번호 + 보라 빛 테두리 / 앞으로: 빈 원 + 번호\nimport { Fragment } from 'react'\n\nexport function StepIndicator({ steps, current }: { steps: readonly string[]; current: number }) {\n  return (\n    <ol aria-label=\"진행 단계\" style={{ display: 'flex', alignItems: 'center', gap: 16, listStyle: 'none', margin: 0, padding: 0 }}>\n      {steps.map((label, i) => {\n        const done = i < current\n        const now = i === current\n        return (\n          <Fragment key={label}>\n            {i > 0 && <li aria-hidden=\"true\" style={{ flex: 1, height: 2, background: i <= current ? 'var(--step-done)' : 'var(--deck-3)' }} />}\n            <li aria-current={now ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>\n              <span\n                style={{\n                  width: 40,\n                  height: 40,\n                  borderRadius: '50%',\n                  display: 'grid',\n                  placeItems: 'center',\n                  fontSize: 20,\n                  fontWeight: 800,\n                  background: done || now ? 'var(--step-done)' : 'transparent',\n                  boxShadow: now ? '0 0 0 6px rgba(144, 68, 235, 0.25)' : done ? 'none' : 'inset 0 0 0 2px var(--line)',\n                  color: done || now ? '#ffffff' : 'var(--text-3)'\n                }}\n              >\n                {done ? (\n                  <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2.6\" strokeLinecap=\"round\" strokeLinejoin=\"round\" aria-hidden=\"true\">\n                    <path d=\"M2 12.357l6.429 6.429L22 5.214\" />\n                  </svg>\n                ) : (\n                  i + 1\n                )}\n              </span>\n              <span style={{ fontSize: 20, fontWeight: now ? 700 : 500, color: now ? 'var(--text)' : done ? 'var(--text-2)' : 'var(--text-3)' }}>{label}</span>\n            </li>\n          </Fragment>\n        )\n      })}\n    </ol>\n  )\n}\n"
{
  const target = join(SRC, 'design', 'StepIndicator.tsx')
  mkdirSync(dirname(target), { recursive: true })
  if (!existsSync(target) || readFileSync(target, 'utf8') !== STEP_INDICATOR) {
    writeFileSync(target, STEP_INDICATOR)
    console.log(`✓ C13 진행 단계 파일 → ${target}`)
  } else console.log('· C13 진행 단계 파일 이미 있음')
  const re = /<ol\b[^<>]*?aria-label=["']진행 단계["'][^<>]*>([\s\S]*?)<\/ol>/
  const hits = files.filter((f) => f.endsWith('.tsx') && f !== target && re.test(text[f]))
  if (hits.length === 1) {
    const f = hits[0]
    const body = text[f].match(re)[1]
    const steps = body.match(/([\w.]+)\.map\(/)?.[1]
    const idx = body.match(/\.map\(\s*\(\s*\w+\s*,\s*(\w+)\s*\)/)?.[1]
    const cur = idx && (body.match(new RegExp(`\\b${idx}\\s*===\\s*([\\w.]+)`))?.[1] ?? body.match(new RegExp(`([\\w.]+)\\s*===\\s*${idx}\\b`))?.[1])
    if (!steps || !cur) {
      failed++
      console.error(`✗ C13 진행 단계: ${f} 에서 단계 목록·현재 단계 변수를 찾지 못함`)
    } else {
      let rel = relative(dirname(f), target).replace(/\\/g, '/').replace(/\.tsx$/, '')
      if (!rel.startsWith('.')) rel = './' + rel
      text[f] = `import { StepIndicator } from '${rel}'\n` + text[f].replace(re, `<StepIndicator steps={${steps}} current={${cur}} />`)
      changed.add(f)
      console.log(`✓ C13 진행 단계 교체 (steps=${steps}, current=${cur}) → ${f}`)
    }
  } else if (hits.length === 0 && files.some((f) => f !== target && /<StepIndicator\b/.test(text[f]))) {
    console.log('· C13 진행 단계 이미 적용됨')
  } else {
    failed++
    console.error(`✗ C13 진행 단계: 맞는 곳이 ${hits.length}곳이라 건너뜀`)
  }
}

// 6) [C18] 프리뷰 빈 상태: 스피너/링크 아이콘 + 한 줄 → 상태별 화면 컴포넌트(design/PreviewStatus.tsx)로 교체
const PREVIEW_STATUS = "// [C18] 프리뷰(영상 박스)가 비어 있을 때 보이는 상태 (디자인 인계 스크립트가 추가한 파일)\n// - wait : 프리뷰 연결 중      → 보라 빛이 천천히 지나감 + 도는 원호 아이콘\n// - retry: 프리뷰 다시 연결 중 → 같은 빛을 주의(노랑) 색으로 + 천천히 도는 새로고침 아이콘\n// - off  : 프리뷰 연결 안 됨   → 움직임 없이 경고(삼각형 느낌표) 아이콘 + 안내\n// 아이콘은 48px, 선은 화면에서 2px. 모양·움직임은 styles.css 의 .pv-* 규칙([C18])에 있습니다.\nexport type PreviewState = 'wait' | 'retry' | 'off'\n\nconst TEXT: Record<PreviewState, [string, string]> = {\n  wait: ['프리뷰 연결 중', '녹화기 화면을 불러오고 있습니다'],\n  retry: ['프리뷰 다시 연결 중', '잠시 후 자동으로 다시 연결합니다'],\n  off: ['프리뷰 연결 안 됨', '녹화기 연결 상태를 확인해 주세요']\n}\n\nconst ICON: Record<PreviewState, string> = {\n  wait: 'M21.149 12a9.149 9.149 0 1 1-6.323-8.702',\n  retry: 'M21.029 12.007a9.029 9.029 0 1 1-2.641-6.388M21.029 2.978v5.079h-5.079',\n  off: 'M12 7.99v5.172M12 16.782h0.01M10.242 4.06L2.277 17.816A2.069 2.069 0 0 0 4.036 20.919h15.928a2.069 2.069 0 0 0 1.759-3.103L13.758 4.06a2.069 2.069 0 0 0-3.516 0z'\n}\n\nexport function PreviewStatus({ state }: { state: PreviewState }) {\n  const [title, sub] = TEXT[state]\n  return (\n    <div className={`pv-status ${state}`} role=\"status\">\n      <svg className=\"pv-icon\" width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"1\" strokeLinecap=\"round\" strokeLinejoin=\"round\" aria-hidden=\"true\">\n        <path d={ICON[state]} />\n      </svg>\n      <span className=\"pv-title\">{title}</span>\n      <span className=\"pv-sub\">{sub}</span>\n    </div>\n  )\n}\n"
{
  const target = join(SRC, 'design', 'PreviewStatus.tsx')
  mkdirSync(dirname(target), { recursive: true })
  if (!existsSync(target) || readFileSync(target, 'utf8') !== PREVIEW_STATUS) {
    writeFileSync(target, PREVIEW_STATUS)
    console.log(`✓ C18 프리뷰 상태 파일 → ${target}`)
  } else console.log('· C18 프리뷰 상태 파일 이미 있음')
  // '프리뷰 연결 안 됨' 문구가 들어 있는 가장 안쪽 <div> … </div> 한 덩어리
  const re = /<div\b[^<>]*>(?:(?!<div\b)[\s\S])*?['"]프리뷰 연결 안 됨['"](?:(?!<div\b)[\s\S])*?<\/div>/
  const hits = files.filter((f) => f.endsWith('.tsx') && f !== target && re.test(text[f]))
  if (hits.length === 1) {
    const f = hits[0]
    const block = text[f].match(re)[0]
    // {주소 ? (상태 === 'failed' ? '…다시…' : '…연결 중') : '…안 됨'} 에서 주소·상태 변수 이름 찾기
    const m = block.match(/\{\s*(!?)\s*([\w.]+)\s*\?\s*\(?\s*([\w.]+)\s*===\s*['"]failed['"]/)
    if (!m || m[1]) {
      failed++
      console.error(`✗ C18 프리뷰 상태: ${f} 에서 주소·연결 상태 변수를 찾지 못함`)
    } else {
      const [, , url, status] = m
      let rel = relative(dirname(f), target).replace(/\\/g, '/').replace(/\.tsx$/, '')
      if (!rel.startsWith('.')) rel = './' + rel
      text[f] = `import { PreviewStatus } from '${rel}'\n` + text[f].replace(re, `<PreviewStatus state={!${url} ? 'off' : ${status} === 'failed' ? 'retry' : 'wait'} />`)
      changed.add(f)
      console.log(`✓ C18 프리뷰 상태 교체 (url=${url}, status=${status}) → ${f}`)
    }
  } else if (hits.length === 0 && files.some((f) => f !== target && /<PreviewStatus\b/.test(text[f]))) {
    console.log('· C18 프리뷰 상태 이미 적용됨')
  } else {
    failed++
    console.error(`✗ C18 프리뷰 상태: 맞는 곳이 ${hits.length}곳이라 건너뜀`)
  }
}

// 7) [C19] 헤더 왼쪽 로고: 보라 사각형 + 흰 점 → 이서당 심볼 컴포넌트(design/BrandMark.tsx)로 교체
const BRAND_MARK = "// [C19] 헤더 왼쪽 이서당 심볼 (디자인 인계 스크립트가 추가한 파일)\n// - 기존 보라 사각형 + 흰 점 로고를 대체. 크기는 기존과 같은 40px\n// - 크기는 style 로 고정해서 헤더 아이콘 규칙([C4]·[C5])에 줄어들지 않음\nimport { useId } from 'react'\n\nexport function BrandMark({ size = 40 }: { size?: number }) {\n  const id = useId().replace(/:/g, '')\n  return (\n    <svg className=\"brand-mark\" width={size} height={size} viewBox=\"0 0 36 36\" fill=\"none\" aria-hidden=\"true\" style={{ width: size, height: size, flex: 'none', display: 'block' }}>\n      <path d=\"M0.65625 27V9C0.65625 6.7871 1.53531 4.66482 3.10007 3.10007C4.66482 1.53531 6.7871 0.65625 9 0.65625C9.77665 0.65625 10.4062 1.28585 10.4062 2.0625C10.4062 2.83915 9.77665 3.46875 9 3.46875C7.53302 3.46875 6.12609 4.05147 5.08878 5.08878C4.05147 6.12609 3.46875 7.53302 3.46875 9V27C3.46875 28.467 4.05147 29.8739 5.08878 30.9112C6.12609 31.9485 7.53302 32.5312 9 32.5312H19.6875C20.4641 32.5312 21.0938 33.1609 21.0938 33.9375C21.0938 34.7141 20.4641 35.3438 19.6875 35.3438H9C6.7871 35.3438 4.66482 34.4647 3.10007 32.8999C1.53531 31.3352 0.65625 29.2129 0.65625 27Z\" fill={`url(#${id}a)`} />\n      <path d=\"M32.5312 27V9C32.5312 7.53302 31.9485 6.12609 30.9112 5.08878C29.8739 4.05147 28.467 3.46875 27 3.46875H17.8125C17.0358 3.46875 16.4062 2.83915 16.4062 2.0625C16.4062 1.28585 17.0358 0.65625 17.8125 0.65625H27C29.2129 0.65625 31.3352 1.53531 32.8999 3.10007C34.4647 4.66482 35.3438 6.7871 35.3438 9V27C35.3438 29.2129 34.4647 31.3352 32.8999 32.8999C31.3352 34.4647 29.2129 35.3438 27 35.3438C26.2233 35.3438 25.5938 34.7141 25.5938 33.9375C25.5938 33.1609 26.2233 32.5312 27 32.5312C28.467 32.5312 29.8739 31.9485 30.9112 30.9112C31.9485 29.8739 32.5312 28.467 32.5312 27Z\" fill={`url(#${id}b)`} />\n      <path d=\"M18 22.5C20.4853 22.5 22.5 20.4853 22.5 18C22.5 15.5147 20.4853 13.5 18 13.5C15.5147 13.5 13.5 15.5147 13.5 18C13.5 20.4853 15.5147 22.5 18 22.5Z\" fill=\"#FE645C\" />\n      <path d=\"M25.875 11.5312C27.0141 11.5312 27.9375 10.6078 27.9375 9.46875C27.9375 8.32966 27.0141 7.40625 25.875 7.40625C24.7359 7.40625 23.8125 8.32966 23.8125 9.46875C23.8125 10.6078 24.7359 11.5312 25.875 11.5312Z\" fill=\"#FE645C\" />\n      <defs>\n        <linearGradient id={`${id}a`} x1=\"2.0625\" y1=\"2.0625\" x2=\"26.4261\" y2=\"13.3844\" gradientUnits=\"userSpaceOnUse\">\n          <stop stopColor=\"#9044EB\" /><stop offset=\"0.5\" stopColor=\"#C24EAC\" /><stop offset=\"1\" stopColor=\"#FF6F61\" />\n        </linearGradient>\n        <linearGradient id={`${id}b`} x1=\"20.625\" y1=\"2.0625\" x2=\"43.2956\" y2=\"11.5308\" gradientUnits=\"userSpaceOnUse\">\n          <stop stopColor=\"#9044EB\" /><stop offset=\"0.5\" stopColor=\"#C24EAC\" /><stop offset=\"1\" stopColor=\"#FF6F61\" />\n        </linearGradient>\n      </defs>\n    </svg>\n  )\n}\n"
{
  const target = join(SRC, 'design', 'BrandMark.tsx')
  mkdirSync(dirname(target), { recursive: true })
  if (!existsSync(target) || readFileSync(target, 'utf8') !== BRAND_MARK) {
    writeFileSync(target, BRAND_MARK)
    console.log(`✓ C19 헤더 심볼 파일 → ${target}`)
  } else console.log('· C19 헤더 심볼 파일 이미 있음')
  // background 가 var(--brand) 인 <span> 안에 흰 점 <span /> 하나만 있는 덩어리 (헤더 로고)
  const re = /<span\b[^<>]*?background\s*:\s*['"]var\(--brand\)['"][^<>]*>\s*<span\b[^<>]*\/>\s*<\/span>/
  const hits = files.filter((f) => f.endsWith('.tsx') && f !== target && re.test(text[f]))
  if (hits.length === 1) {
    const f = hits[0]
    let rel = relative(dirname(f), target).replace(/\\/g, '/').replace(/\.tsx$/, '')
    if (!rel.startsWith('.')) rel = './' + rel
    text[f] = `import { BrandMark } from '${rel}'\n` + text[f].replace(re, '<BrandMark />')
    changed.add(f)
    console.log(`✓ C19 헤더 심볼 교체 → ${f}`)
  } else if (hits.length === 0 && files.some((f) => f !== target && /<BrandMark\b/.test(text[f]))) {
    console.log('· C19 헤더 심볼 이미 적용됨')
  } else {
    failed++
    console.error(`✗ C19 헤더 심볼: 맞는 곳이 ${hits.length}곳이라 건너뜀`)
  }
}

for (const f of changed) writeFileSync(f, text[f])
console.log(failed ? `\n${failed}개 항목은 직접 확인이 필요합니다` : '\n완료. git diff 로 확인하세요.')
process.exit(failed ? 1 : 0)
