/**
 * Sound Matrix — 高级几何设计
 * 多元配色 · 精致图形 · 设计感
 */

const COLS = 12;
const rand = (a, b) => a + Math.random() * (b - a);
const randIn = arr => arr[Math.floor(Math.random() * arr.length)];
const ROWS = 3;
const TOTAL_CELLS = COLS * ROWS; // 36 cells, MIDI keyboard style

// 高级配色 — 深色背景：白/香槟金/暖白/古金/珍珠 (36)
const FG_ON_DARK = [
  '#FFFFFF', '#E8DCC8', '#FFF9F0', '#D4AF37', '#F5F0E8', '#FFFFFF', '#E8DCC8', '#FFFBF5', '#C9A227', '#F0EBE3',
  '#FFFFFF', '#D4AF37', '#E8DCC8', '#FFF9F0', '#C9A227', '#FFFFFF', '#E8DCC8', '#D4AF37', '#FFFBF5', '#F0EBE3',
  '#C9A227', '#FFFFFF', '#E8DCC8', '#FFF9F0', '#D4AF37', '#FFFFFF', '#C9A227', '#E8DCC8', '#FFFBF5', '#D4AF37',
  '#FFFFFF', '#E8DCC8', '#D4AF37', '#FFF9F0', '#C9A227', '#F0EBE3',
];
// 高级配色 — 浅色背景：黑/Navy/酒红/炭灰/深褐 (36)
const FG_ON_LIGHT = [
  '#0A1628', '#1C3A5C', '#000000', '#722F37', '#1A1A1A', '#0A1628', '#8B0000', '#1C3A5C', '#2C1810', '#000000',
  '#722F37', '#0A1628', '#1C3A5C', '#000000', '#8B0000', '#1A1A1A', '#0A1628', '#722F37', '#1C3A5C', '#2C1810',
  '#000000', '#0A1628', '#722F37', '#1C3A5C', '#8B0000', '#1A1A1A', '#0A1628', '#000000', '#1C3A5C', '#722F37',
  '#0A1628', '#1C3A5C', '#000000', '#722F37', '#8B0000', '#1A1A1A',
];

// 背景 — 高级：黑/白/暖白/Navy/米色
const BG_PALETTE = [
  '#000000', '#FFFBF5', '#0A1628', '#FFF8F0', '#0D0D0D', '#F8F4EF',
  '#1C3A5C', '#FFFFFF', '#0A0A0A', '#FFFDF8', '#0A1628', '#FAF6F1',
  '#1A1A1A', '#FFFFFF', '#1C3A5C', '#FFFBF5',
];
let bgIndex = 0;

// MIDI 键盘映射：Chromatic 半音阶，参考 Serum/Renoise/DAW 布局
// 每行 12 半音 = 1 个八度。Z 行=C3, A 行=C4, Q 行=C5
const KEY_TO_CELL = {
  'z': 0, 'x': 1, 'c': 2, 'v': 3, 'b': 4, 'n': 5, 'm': 6, ',': 7, '.': 8, '/': 9, '\\': 10, '`': 11,
  'a': 12, 's': 13, 'd': 14, 'f': 15, 'g': 16, 'h': 17, 'j': 18, 'k': 19, 'l': 20, ';': 21, "'": 22, '1': 23,
  'q': 24, 'w': 25, 'e': 26, 'r': 27, 't': 28, 'y': 29, 'u': 30, 'i': 31, 'o': 32, 'p': 33, '[': 34, ']': 35,
};

// Chromatic: cellIndex -> MIDI (C3=48, C4=60, C5=72)
function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playPlaceholderSound(index) {
  const midiNote = 48 + index;
  const baseFreq = midiToFreq(midiNote);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
  osc.type = ['sine', 'triangle', 'sine', 'triangle', 'square'][index % 5];
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.25);
}

// Two.js 场景
let two, shapes = [];
let isMouseDown = false;
let lastTriggeredCell = -1;
function init() {
  const container = document.getElementById('canvas-container');
  two = new Two({
    type: Two.Types.canvas,
    fullscreen: true,
    autostart: true,
  }).appendTo(container);

  createGridOverlay();
  bindEvents();
  two.bind('update', animate);
  cycleBackground(-1);
}

function createGridOverlay() {
  const grid = document.getElementById('grid-overlay');
  grid.innerHTML = '';

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    grid.appendChild(cell);
  }
}

function bindEvents() {
  const grid = document.getElementById('grid-overlay');

  grid.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    const cell = e.target.closest('.cell');
    if (cell) {
      const index = parseInt(cell.dataset.index, 10);
      triggerCell(index, e);
    }
  });

  document.addEventListener('mouseup', () => {
    isMouseDown = false;
    lastTriggeredCell = -1;
  });
  document.addEventListener('mouseleave', () => {
    isMouseDown = false;
    lastTriggeredCell = -1;
  });

  // 拖拽时进入新格子触发
  grid.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const index = parseInt(cell.dataset.index, 10);
    if (index !== lastTriggeredCell) {
      triggerCell(index, e);
    }
  });

  // 触摸支持
  grid.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isMouseDown = true;
    const touch = e.touches[0];
    const cell = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.cell');
    if (cell) {
      const index = parseInt(cell.dataset.index, 10);
      triggerCell(index, { clientX: touch.clientX, clientY: touch.clientY });
    }
  }, { passive: false });

  grid.addEventListener('touchmove', (e) => {
    if (!isMouseDown || !e.touches[0]) return;
    e.preventDefault();
    const touch = e.touches[0];
    const cell = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.cell');
    if (cell) {
      const index = parseInt(cell.dataset.index, 10);
      if (index !== lastTriggeredCell) {
        triggerCell(index, { clientX: touch.clientX, clientY: touch.clientY });
      }
    }
  }, { passive: false });

  grid.addEventListener('touchend', () => {
    isMouseDown = false;
    lastTriggeredCell = -1;
  });

  // 键盘 MIDI 映射
  const keysPressed = new Set();
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    const index = KEY_TO_CELL[key];
    if (index !== undefined && !keysPressed.has(key)) {
      keysPressed.add(key);
      e.preventDefault();
      triggerCell(index, { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
    }
  });
  document.addEventListener('keyup', (e) => {
    keysPressed.delete(e.key.toLowerCase());
  });
}

function getMousePos(e) {
  const rect = two.renderer.domElement.getBoundingClientRect();
  const scaleX = two.width / rect.width;
  const scaleY = two.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function triggerCell(index, e) {
  lastTriggeredCell = index;

  const nextBgIndex = (bgIndex + 1) % BG_PALETTE.length;
  const darkBgs = ['#000000', '#0A0A0A', '#0D0D0D', '#0A1628', '#1C3A5C', '#1A1A1A'];
  const isDarkBg = darkBgs.includes(BG_PALETTE[nextBgIndex]);
  const color = isDarkBg ? FG_ON_DARK[index] : FG_ON_LIGHT[index];
  // 效果居中于整个画面
  const cx = two.width / 2;
  const cy = two.height / 2;
  const pos = { x: cx, y: cy };

  const cell = document.querySelector(`.cell[data-index="${index}"]`);
  if (cell) {
    cell.classList.add('triggered');
    setTimeout(() => cell.classList.remove('triggered'), 400);
  }

  cycleBackground(index);
  playPlaceholderSound(index);

  // 同格点击：移除该格已有动画，重启动画而非叠加
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (shapes[i].cellIndex === index) {
      two.remove(shapes[i].obj);
      shapes.splice(i, 1);
    }
  }

  const MAX_SHAPES = 12;
  while (shapes.length >= MAX_SHAPES) {
    const s = shapes.shift();
    two.remove(s.obj);
  }
  ANIMATIONS[index](pos, color, index);
}

function cycleBackground(triggerIndex) {
  if (triggerIndex >= 0) bgIndex = (bgIndex + 1) % BG_PALETTE.length;
  const bg = BG_PALETTE[bgIndex];
  const container = document.getElementById('canvas-container');
  const body = document.body;
  if (container) container.style.background = bg;
  if (body) body.style.background = bg;
}

// 36 个独一无二的动画，按 index 直接调用
const ANIMATIONS = [
  anim0, anim1, anim2, anim3, anim4, anim5, anim6, anim7, anim8, anim9,
  anim10, anim11, anim12, anim13, anim14, anim15, anim16, anim17, anim18, anim19,
  anim20, anim21, anim22, anim23, anim24, anim25, anim26, anim27, anim28, anim29,
  anim30, anim31, anim32, anim33, anim34, anim35,
];

// 全屏尺寸系数 — 效果铺满整个画面
function size() {
  const w = two.width || 1920;
  const h = two.height || 1080;
  const min = Math.min(w, h);
  return { w, h, min, r: min * 0.45, l: min * 0.5 };
}

// ========== 30 个高级几何设计 ==========
// 每次微调 intro/outro，偏差小、不乱
const ENTER_OPTS = ['scale', 'fromCenter', 'burst', 'zoom'];
const EXIT_OPTS = ['scale', 'implode', 'explode', 'spinOut'];

function pushShape(obj, origin, opts = {}, cellIndex = -1) {
  const { enterType: oe, exitType: ox, baseScale: bs, enterEnd: ee, exitStart: es, baseRot: br, ...rest } = opts;
  const enterType = oe ?? randIn(ENTER_OPTS);
  const exitType = ox ?? randIn(EXIT_OPTS);
  const baseScale = bs ?? rand(0.99, 1.01);
  const enterEnd = ee ?? (0.14 + rand(0, 0.02));
  const exitStart = es ?? (0.74 + rand(0, 0.04));
  const baseRot = (br ?? 0) + rand(-0.06, 0.06);
  shapes.push({ obj, t: 0, originX: origin.x, originY: origin.y, enterType, exitType, baseRot, baseScale, rotOffset: rand(-0.02, 0.02), enterEnd, exitStart, cellIndex, ...rest });
}

// 楔形 — 黄金比例三角
function anim0(pos, color, cellIndex) {
  const s = size();
  const r = s.r * 0.88;
  const wedge = two.makePolygon(pos.x, pos.y, r, 3);
  wedge.rotation = Math.PI / 3;
  wedge.fill = color;
  wedge.noStroke();
  pushShape(wedge, pos, { baseRot: wedge.rotation, holdMotion: 'breathe' }, cellIndex);
}

// Chevron 阶梯 — 精致 V 形
function anim1(pos, color, cellIndex) {
  const s = size();
  const chevrons = [];
  const lw = Math.max(3, s.min * 0.005);
  for (let i = -2; i <= 2; i++) {
    const y = i * s.min * 0.14;
    const w = s.w * (0.36 - Math.abs(i) * 0.05);
    const l1 = two.makeLine(-w * 0.5, y + s.min * 0.04, 0, y - s.min * 0.04);
    const l2 = two.makeLine(0, y - s.min * 0.04, w * 0.5, y + s.min * 0.04);
    l1.stroke = l2.stroke = color;
    l1.linewidth = l2.linewidth = lw;
    chevrons.push(l1, l2);
  }
  const g = two.makeGroup(...chevrons);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 十字 + 对角 — 八向放射
function anim2(pos, color, cellIndex) {
  const s = size();
  const lw = Math.max(2, s.min * 0.004);
  const d = s.l * 0.44;
  const lines = [
    two.makeLine(-d, 0, d, 0),
    two.makeLine(0, -d, 0, d),
    two.makeLine(-d * 0.707, -d * 0.707, d * 0.707, d * 0.707),
    two.makeLine(-d * 0.707, d * 0.707, d * 0.707, -d * 0.707),
  ];
  lines.forEach(l => { l.stroke = color; l.linewidth = lw; });
  const g = two.makeGroup(...lines);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 阶梯三角 — 递进扇形
function anim3(pos, color, cellIndex) {
  const s = size();
  const steps = [];
  for (let i = 0; i < 4; i++) {
    const r = s.r * (0.22 + i * 0.22);
    const t = two.makePolygon(0, -r * 0.5, r * 0.55, 3);
    t.rotation = Math.PI / 2;
    t.fill = color;
    t.noStroke();
    steps.push(t);
  }
  const g = two.makeGroup(...steps);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// Sunburst 三角 — 精致放射
function anim4(pos, color, cellIndex) {
  const s = size();
  const tris = [];
  const n = 10;
  const rad = s.r * 0.78;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const t = two.makePolygon(Math.cos(a) * rad * 0.38, Math.sin(a) * rad * 0.38, rad * 0.42, 3);
    t.rotation = a + Math.PI / 2;
    t.fill = color;
    t.noStroke();
    tris.push(t);
  }
  const g = two.makeGroup(...tris);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 锤子 — 椭圆锤头 + 细柄
function anim5(pos, color, cellIndex) {
  const s = size();
  const head = two.makeEllipse(0, -s.r * 0.24, s.r * 0.42, s.r * 0.1);
  head.fill = color;
  head.noStroke();
  const lw = Math.max(4, s.min * 0.006);
  const handle = two.makeLine(0, -s.r * 0.16, 0, s.r * 0.6);
  handle.stroke = color;
  handle.linewidth = lw;
  const g = two.makeGroup(head, handle);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { enterType: 'slamDown', exitType: 'slamUp', holdMotion: 'breathe' }, cellIndex);
}

// 箭头楔形 — 方向张力
function anim6(pos, color, cellIndex) {
  const s = size();
  const tri = two.makePolygon(pos.x, pos.y, s.r * 0.85, 3);
  tri.rotation = Math.PI / 2;
  tri.fill = color;
  tri.noStroke();
  pushShape(tri, pos, { baseRot: tri.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 射线 — 细线 Sunburst
function anim7(pos, color, cellIndex) {
  const s = size();
  const rays = [];
  const n = 16;
  const lw = Math.max(2, s.min * 0.003);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const len = s.r * 0.86;
    const l = two.makeLine(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    l.stroke = color;
    l.linewidth = lw;
    rays.push(l);
  }
  const g = two.makeGroup(...rays);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 速度线 — 优雅递减
function anim8(pos, color, cellIndex) {
  const s = size();
  const lines = [];
  const n = 8;
  const lw = Math.max(2, s.min * 0.003);
  for (let i = 0; i < n; i++) {
    const dy = (i - (n - 1) / 2) * s.min * 0.1;
    const w = s.w * (0.42 - Math.abs(i - 3.5) * 0.04);
    const l = two.makeLine(-w * 0.5, dy, w * 0.5, dy);
    l.stroke = color;
    l.linewidth = lw;
    lines.push(l);
  }
  const g = two.makeGroup(...lines);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 锤子与镰刀 — 精致标志
function anim9(pos, color, cellIndex) {
  const s = size();
  const head = two.makeEllipse(0, -s.r * 0.22, s.r * 0.34, s.r * 0.1);
  head.fill = color;
  head.noStroke();
  const lw = Math.max(3, s.min * 0.005);
  const handle = two.makeLine(0, -s.r * 0.1, 0, s.r * 0.5);
  handle.stroke = color;
  handle.linewidth = lw;
  const sickle = two.makeArcSegment(s.r * 0.05, s.r * 0.03, s.r * 0.18, s.r * 0.44, Math.PI * 0.38, Math.PI * 0.85, 24);
  sickle.fill = color;
  sickle.noStroke();
  sickle.rotation = -Math.PI / 3.5;
  const g = two.makeGroup(head, handle, sickle);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { enterType: 'flipIn', exitType: 'flipOut', holdMotion: 'breathe' }, cellIndex);
}

// 五边形 — 盾形
function anim10(pos, color, cellIndex) {
  const s = size();
  const p = two.makePolygon(pos.x, pos.y, s.r * 0.8, 5);
  p.rotation = -Math.PI / 2;
  p.fill = color;
  p.noStroke();
  pushShape(p, pos, { baseRot: p.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 阶梯柱 — 三角堆叠
function anim11(pos, color, cellIndex) {
  const s = size();
  const steps = [];
  for (let i = 0; i < 4; i++) {
    const w = s.min * (0.1 + i * 0.06);
    const y = (i - 1.5) * s.h * 0.22;
    const t = two.makePolygon(0, y, w * 0.55, 3);
    t.rotation = Math.PI / 2;
    t.fill = color;
    t.noStroke();
    steps.push(t);
  }
  const g = two.makeGroup(...steps);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 射线 — 细线放射
function anim12(pos, color, cellIndex) {
  const s = size();
  const rays = [];
  const n = 18;
  const lw = Math.max(2, s.min * 0.003);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const len = s.l * 0.86;
    const l = two.makeLine(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    l.stroke = color;
    l.linewidth = lw;
    rays.push(l);
  }
  const g = two.makeGroup(...rays);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 大楔形 — 红楔变体
function anim13(pos, color, cellIndex) {
  const s = size();
  const tri = two.makePolygon(pos.x, pos.y, s.r * 1.05, 3);
  tri.rotation = Math.PI / 4;
  tri.fill = color;
  tri.noStroke();
  pushShape(tri, pos, { baseRot: tri.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 三角线框 — 精致轮廓
function anim14(pos, color, cellIndex) {
  const s = size();
  const tri = two.makePolygon(pos.x, pos.y, s.r * 0.82, 3);
  tri.stroke = color;
  tri.linewidth = Math.max(4, s.min * 0.006);
  tri.noFill();
  tri.rotation = Math.PI / 6;
  pushShape(tri, pos, { baseRot: tri.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 双箭头 — 对称
function anim15(pos, color, cellIndex) {
  const s = size();
  const t1 = two.makePolygon(-s.r * 0.42, 0, s.r * 0.42, 3);
  const t2 = two.makePolygon(s.r * 0.42, 0, s.r * 0.42, 3);
  t1.rotation = Math.PI / 2;
  t2.rotation = -Math.PI / 2;
  t1.fill = t2.fill = color;
  t1.noStroke();
  t2.noStroke();
  const g = two.makeGroup(t1, t2);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 双斜线 — 精致 X
function anim16(pos, color, cellIndex) {
  const s = size();
  const lw = Math.max(3, s.min * 0.005);
  const d = s.l * 0.84;
  const l1 = two.makeLine(-d, -d * 0.6, d, d * 0.6);
  const l2 = two.makeLine(-d, d * 0.6, d, -d * 0.6);
  l1.stroke = l2.stroke = color;
  l1.linewidth = l2.linewidth = lw;
  const g = two.makeGroup(l1, l2);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 水平 Chevron — 精致 V
function anim17(pos, color, cellIndex) {
  const s = size();
  const chevrons = [];
  const lw = Math.max(2, s.min * 0.004);
  for (let i = -2; i <= 2; i++) {
    const x = i * s.w * 0.18;
    const l1 = two.makeLine(x - s.w * 0.12, 0, x, s.h * 0.12);
    const l2 = two.makeLine(x, s.h * 0.12, x + s.w * 0.12, 0);
    l1.stroke = l2.stroke = color;
    l1.linewidth = l2.linewidth = lw;
    chevrons.push(l1, l2);
  }
  const g = two.makeGroup(...chevrons);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 三角扇 — 放射
function anim18(pos, color, cellIndex) {
  const s = size();
  const tris = [];
  const n = 6;
  const rad = s.r * 0.78;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 1.3;
    const t = two.makePolygon(Math.cos(a) * rad * 0.45, Math.sin(a) * rad * 0.45, rad * 0.5, 3);
    t.rotation = a + Math.PI / 2;
    t.fill = color;
    t.noStroke();
    tris.push(t);
  }
  const g = two.makeGroup(...tris);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 五边形 — 填充
function anim19(pos, color, cellIndex) {
  const s = size();
  const p = two.makePolygon(pos.x, pos.y, s.r * 0.8, 5);
  p.fill = color;
  p.noStroke();
  p.rotation = 0.15;
  pushShape(p, pos, { baseRot: p.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 大 Chevron — 山形 V
function anim20(pos, color, cellIndex) {
  const s = size();
  const lw = Math.max(4, s.min * 0.006);
  const l1 = two.makeLine(-s.w * 0.38, s.h * 0.28, 0, -s.h * 0.28);
  const l2 = two.makeLine(0, -s.h * 0.28, s.w * 0.38, s.h * 0.28);
  l1.stroke = l2.stroke = color;
  l1.linewidth = l2.linewidth = lw;
  const g = two.makeGroup(l1, l2);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 五角星线框 — 精致
function anim21(pos, color, cellIndex) {
  const s = size();
  const star = two.makeStar(pos.x, pos.y, s.r * 0.38, s.r * 0.78, 5);
  star.stroke = color;
  star.linewidth = Math.max(3, s.min * 0.005);
  star.noFill();
  star.rotation = -Math.PI / 2;
  pushShape(star, pos, { baseRot: star.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 三角叠扇
function anim22(pos, color, cellIndex) {
  const s = size();
  const tris = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 0.2 + (i / 5) * Math.PI * 0.6;
    const r = s.r * (0.45 + i * 0.12);
    const t = two.makePolygon(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.4, 3);
    t.rotation = a + Math.PI / 2;
    t.fill = color;
    t.noStroke();
    tris.push(t);
  }
  const g = two.makeGroup(...tris);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 八向三角 — 放射
function anim23(pos, color, cellIndex) {
  const s = size();
  const tris = [];
  const n = 8;
  const rad = s.r * 0.35;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const t = two.makePolygon(0, 0, rad, 3);
    t.rotation = a;
    t.fill = color;
    t.noStroke();
    tris.push(t);
  }
  const g = two.makeGroup(...tris);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 八边形 — 精致几何
function anim24(pos, color, cellIndex) {
  const s = size();
  const oct = two.makePolygon(pos.x, pos.y, s.r * 0.72, 8);
  oct.fill = color;
  oct.noStroke();
  oct.rotation = Math.PI / 8;
  pushShape(oct, pos, { baseRot: oct.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 垂直线 — 精致分割
function anim25(pos, color, cellIndex) {
  const s = size();
  const l = two.makeLine(0, -s.h * 0.44, 0, s.h * 0.44);
  l.stroke = color;
  l.linewidth = Math.max(3, s.min * 0.005);
  const g = two.makeGroup(l);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 三线交叉 — 精致放射
function anim26(pos, color, cellIndex) {
  const s = size();
  const d = s.l * 0.86;
  const lw = Math.max(3, s.min * 0.005);
  const l1 = two.makeLine(-d, -d * 0.5, d, d * 0.5);
  const l2 = two.makeLine(-d * 0.7, d * 0.5, d * 0.7, -d * 0.5);
  const l3 = two.makeLine(0, -d, 0, d);
  [l1, l2, l3].forEach(l => { l.stroke = color; l.linewidth = lw; });
  const g = two.makeGroup(l1, l2, l3);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 阶梯金字塔 — 精致几何
function anim27(pos, color, cellIndex) {
  const s = size();
  const steps = [];
  for (let row = 0; row < 4; row++) {
    const n = 4 - row;
    const y = (row - 1.5) * s.min * 0.22;
    const w = s.min * 0.2;
    for (let col = 0; col < n; col++) {
      const x = (col - (n - 1) / 2) * w * 1.1;
      const t = two.makePolygon(x, y, w * 0.45, 3);
      t.rotation = Math.PI / 2;
      t.fill = color;
      t.noStroke();
      steps.push(t);
    }
  }
  const g = two.makeGroup(...steps);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 五角星填充 — 精致
function anim28(pos, color, cellIndex) {
  const s = size();
  const star = two.makeStar(pos.x, pos.y, s.r * 0.42, s.r * 0.82, 5);
  star.fill = color;
  star.noStroke();
  star.rotation = -Math.PI / 2;
  pushShape(star, pos, { baseRot: star.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 四向箭头 — 结构主义
function anim29(pos, color, cellIndex) {
  const s = size();
  const arrows = [];
  const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  dirs.forEach((a) => {
    const tri = two.makePolygon(0, 0, s.r * 0.38, 3);
    tri.rotation = a;
    tri.fill = color;
    tri.noStroke();
    arrows.push(tri);
  });
  const g = two.makeGroup(...arrows);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 六边形 — 蜂巢
function anim30(pos, color, cellIndex) {
  const s = size();
  const hex = two.makePolygon(pos.x, pos.y, s.r * 0.75, 6);
  hex.fill = color;
  hex.noStroke();
  hex.rotation = Math.PI / 6;
  pushShape(hex, pos, { baseRot: hex.rotation, holdMotion: 'breathe' }, cellIndex);
}

// 双环 — 同心
function anim31(pos, color, cellIndex) {
  const s = size();
  const r1 = two.makeCircle(0, 0, s.r * 0.35);
  const r2 = two.makeCircle(0, 0, s.r * 0.65);
  r1.stroke = r2.stroke = color;
  r1.linewidth = r2.linewidth = Math.max(3, s.min * 0.005);
  r1.noFill();
  r2.noFill();
  const g = two.makeGroup(r1, r2);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 菱形网格 — 精致
function anim32(pos, color, cellIndex) {
  const s = size();
  const diamonds = [];
  const lw = Math.max(2, s.min * 0.003);
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const d = two.makePolygon(i * s.w * 0.2, j * s.h * 0.2, s.min * 0.08, 4);
      d.rotation = Math.PI / 4;
      d.stroke = color;
      d.linewidth = lw;
      d.noFill();
      diamonds.push(d);
    }
  }
  const g = two.makeGroup(...diamonds);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 扇形 — 半圆
function anim33(pos, color, cellIndex) {
  const s = size();
  const arc = two.makeArcSegment(0, 0, s.r * 0.3, s.r * 0.85, 0, Math.PI, 32);
  arc.stroke = color;
  arc.linewidth = Math.max(4, s.min * 0.006);
  arc.noFill();
  const g = two.makeGroup(arc);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 三线平行 — 速度感
function anim34(pos, color, cellIndex) {
  const s = size();
  const lines = [];
  const lw = Math.max(2, s.min * 0.003);
  [-1, 0, 1].forEach((i) => {
    const l = two.makeLine(-s.w * 0.4, i * s.h * 0.15, s.w * 0.4, i * s.h * 0.15);
    l.stroke = color;
    l.linewidth = lw;
    lines.push(l);
  });
  const g = two.makeGroup(...lines);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'breathe' }, cellIndex);
}

// 十字星 — 四向
function anim35(pos, color, cellIndex) {
  const s = size();
  const lw = Math.max(3, s.min * 0.005);
  const d = s.r * 0.8;
  const l1 = two.makeLine(-d, 0, d, 0);
  const l2 = two.makeLine(0, -d, 0, d);
  const l3 = two.makeLine(-d * 0.5, -d * 0.5, d * 0.5, d * 0.5);
  const l4 = two.makeLine(-d * 0.5, d * 0.5, d * 0.5, -d * 0.5);
  [l1, l2, l3, l4].forEach(l => { l.stroke = color; l.linewidth = lw; });
  const g = two.makeGroup(l1, l2, l3, l4);
  g.translation.set(pos.x, pos.y);
  pushShape(g, pos, { holdMotion: 'radiate', rotSpeed: 0.03 }, cellIndex);
}

// 缓动函数 — 苏联海报式强烈
const easeOutBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeInBack = t => { const c = 1.7; return t * t * ((c + 1) * t - c); };
const easeOutElastic = t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
const easeOutBounce = t => { const n = 7.5625, d = 2.75; return t < 1/d ? n*t*t : t < 2/d ? n*(t-=1.5/d)*t+0.75 : t < 2.5/d ? n*(t-=2.25/d)*t+0.9375 : n*(t-=2.625/d)*t+0.984375; };

function animate() {
  const now = Date.now() * 0.001;
  const w = two.width || window.innerWidth;
  const h = two.height || window.innerHeight;
  const dt = 0.016;
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    s.t += dt;
    const t = Math.min(s.t, 1);
    s.obj.opacity = 1;

    const enterEnd = s.enterEnd ?? 0.15;
    const exitStart = s.exitStart ?? 0.78;
    let scale = 1, tx = 0, ty = 0, rot = s.baseRot || 0;

    if (t < enterEnd) {
      const te = t / enterEnd;
      const e = s.enterType || 'scale';
      if (e === 'scale') scale = easeOutBack(te);
      else if (e === 'bounce') scale = easeOutBounce(te);
      else if (e === 'slideLeft') tx = -w * 0.3 * (1 - te);
      else if (e === 'slideRight') tx = w * 0.3 * (1 - te);
      else if (e === 'slideUp') ty = -h * 0.3 * (1 - te);
      else if (e === 'slideDown') ty = h * 0.3 * (1 - te);
      else if (e === 'zoom') scale = te * te;
      else if (e === 'rotate') { scale = te; rot = (1 - te) * Math.PI * 2; }
      else if (e === 'stretchH') scale = 0.1 + 0.9 * te;
      else if (e === 'stretchV') scale = 0.1 + 0.9 * te;
      else if (e === 'elastic') scale = easeOutElastic(te);
      else if (e === 'fromCenter') scale = te;
      else if (e === 'diagonal') { tx = -w * 0.2 * (1 - te); ty = -h * 0.2 * (1 - te); scale = te; }
      else if (e === 'whipIn') { scale = te; rot = (1 - te) * Math.PI; }
      else if (e === 'flipIn') { scale = te; rot = (1 - te) * Math.PI * 2; }
      else if (e === 'slamDown') { ty = -h * 0.4 * (1 - te); scale = easeOutBounce(te); }
      else if (e === 'burst') scale = easeOutElastic(te);
      else scale = te;
    } else if (t > exitStart) {
      const te = (t - exitStart) / (1 - exitStart);
      const e = s.exitType || 'scale';
      if (e === 'scale') scale = 1 - easeInBack(te);
      else if (e === 'bounceOut') scale = 1 - easeOutBounce(te);
      else if (e === 'slideLeft') tx = -w * 0.4 * te;
      else if (e === 'slideRight') tx = w * 0.4 * te;
      else if (e === 'slideUp') ty = -h * 0.4 * te;
      else if (e === 'slideDown') ty = h * 0.4 * te;
      else if (e === 'zoomOut') scale = 1 + te * 0.5;
      else if (e === 'rotateOut') { scale = 1 - te; rot = te * Math.PI * 3; }
      else if (e === 'explode') { scale = 1 + te * 0.8; rot = te * Math.PI; }
      else if (e === 'implode') scale = 1 - te;
      else if (e === 'collapse') scale = Math.max(0, 1 - te * 1.5);
      else if (e === 'flyRight') { tx = w * 0.5 * te; scale = 1 - te * 0.3; }
      else if (e === 'flyUp') { ty = -h * 0.5 * te; scale = 1 - te * 0.3; }
      else if (e === 'flyLeft') { tx = -w * 0.5 * te; scale = 1 - te * 0.3; }
      else if (e === 'spinOut') { scale = 1 - te; rot = te * Math.PI * 4; }
      else if (e === 'stretchOut') scale = 1 + te * 0.5;
      else if (e === 'whipOut') { scale = 1 - te; rot = te * Math.PI * 2; }
      else if (e === 'flipOut') { scale = 1 - te; rot = te * Math.PI * 3; }
      else if (e === 'slamUp') { ty = h * 0.5 * te; scale = 1 - te; }
      else scale = 1 - te;
    }

    if (s.obj._vx !== undefined && t > enterEnd && t < exitStart) {
      const velT = (t - enterEnd) / (exitStart - enterEnd);
      tx += (s.obj._vx || 0) * velT * 120;
      ty += (s.obj._vy || 0) * velT * 120;
    }

    // Hold 阶段持续运动 — 每个图形本身就在动
    const inHold = t > enterEnd && t < exitStart;
    const baseScale = s.baseScale ?? 1;
    let holdScale = 1, holdTx = 0, holdTy = 0, holdRot = 0;
    if (inHold) {
      const hm = s.holdMotion || (s.breathe ? 'breathe' : 'none');
      const phase = now + i * 0.5;
      if (hm === 'breathe' || hm === 'breatheRot') holdScale = 1 + Math.sin(phase * 1.5) * 0.02;
      if (hm === 'pulse' || hm === 'pulseDrift') holdScale = 1 + Math.sin(phase * 2) * 0.025;
      if (hm === 'drift' || hm === 'pulseDrift') { holdTx = Math.sin(phase * 0.8) * 8; holdTy = Math.cos(phase * 1) * 6; }
      if (hm === 'orbit') { holdTx = Math.cos(phase * 0.5) * 10; holdTy = Math.sin(phase * 0.5) * 10; }
      if (hm === 'float') { holdTy = Math.sin(phase * 1.2) * 6; holdScale = 1 + Math.sin(phase * 1.5) * 0.015; }
      if (hm === 'wave') holdScale = 1 + Math.sin(phase * 2.5 + i * 0.2) * 0.02;
      if (hm === 'expand') holdScale = 1 + ((t - enterEnd) / (exitStart - enterEnd)) * 0.04;
      if (hm === 'radiate') holdScale = 1 + Math.sin(phase * 1.8) * 0.02;
      if (['breatheRot', 'spin', 'radiate'].includes(hm)) holdRot = now * (s.rotSpeed ?? 0.04);
    }

    s.obj.scale = scale * baseScale * holdScale;
    s.obj.translation.set(s.originX + tx + holdTx, s.originY + ty + holdTy);
    const extraRot = (s.rot && !['breatheRot', 'spin', 'radiate'].includes(s.holdMotion)) ? now * 0.04 : 0;
    s.obj.rotation = rot + holdRot + extraRot + (s.rotOffset ?? 0);

    if (t >= 1) {
      two.remove(s.obj);
      shapes.splice(i, 1);
    }
  }
}

// 用户首次交互时解锁 AudioContext
document.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

init();
