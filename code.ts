// 色見本ジェネレーターの配色で、選んだレイヤーの色を一括で置き換えるプラグイン。
// 流れ：UI（ui.html）に HEX を貼り付ける → このファイルが選択中のレイヤーの色を集めて、明るさの順に対応づけて置き換える

figma.showUI(__html__, { width: 320, height: 420, themeColors: true });

// UI から届くメッセージの形
type ReplaceMessage = { type: "replace"; hexes: string[] };

// ---- 色の変換 ----
// "#0B3954" → Figma の色（r, g, b がそれぞれ 0〜1）
function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

// 色を "#RRGGBB" にする（同じ色かどうかを比べるときの目印にも使う）
function rgbToHex({ r, g, b }: RGB): string {
  const part = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return ("#" + part(r) + part(g) + part(b)).toUpperCase();
}

// 明るさ（0 = 黒、1 = 白）。人の目は緑に敏感なので、緑を重めに数える
function brightness({ r, g, b }: RGB): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ---- レイヤーから色を集める ----
// 塗り（fills）と線（strokes）の、単色（SOLID）だけを対象にする
type Paintable = SceneNode & MinimalFillsMixin & MinimalStrokesMixin;

function hasPaints(node: SceneNode): node is Paintable {
  return "fills" in node && "strokes" in node;
}

// 選択したレイヤーと、その中のレイヤーを順番にたどる
function walk(nodes: readonly SceneNode[], visit: (node: SceneNode) => void) {
  for (const node of nodes) {
    visit(node);
    if ("children" in node) walk(node.children, visit);
  }
}

function solidColors(paints: readonly Paint[] | typeof figma.mixed): RGB[] {
  if (paints === figma.mixed) return [];
  return paints.flatMap((p) => (p.type === "SOLID" ? [p.color] : []));
}

// ---- 置き換え ----
// 使われている色を暗い順に並べ、パレットも暗い順に並べて、順番どうしで対応づける
function buildMapping(used: RGB[], palette: RGB[]): Map<string, RGB> {
  const byDark = (a: RGB, b: RGB) => brightness(a) - brightness(b);
  const usedSorted = [...used].sort(byDark);
  const paletteSorted = [...palette].sort(byDark);
  const map = new Map<string, RGB>();
  usedSorted.forEach((color, i) => {
    // 使われている色が 1 色だけのときは、パレットの真ん中の色にする
    const pos = usedSorted.length === 1 ? 0.5 : i / (usedSorted.length - 1);
    map.set(rgbToHex(color), paletteSorted[Math.round(pos * (paletteSorted.length - 1))]);
  });
  return map;
}

// 塗り（または線）の色を、対応表にそって書き換える。書き換える色が 1 つもなければ null を返す
function repaint(paints: readonly Paint[], map: Map<string, RGB>): Paint[] | null {
  let hit = false;
  // 不透明度（opacity）はそのまま残して、色だけ変える
  const next = paints.map((p) => {
    if (p.type !== "SOLID") return p;
    const color = map.get(rgbToHex(p.color));
    if (!color) return p;
    hit = true;
    return { ...p, color };
  });
  return hit ? next : null;
}

function replaceColors(hexes: string[]) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify("レイヤーを選んでから実行してください");
    return;
  }

  // UI から来た値は、もう一度ここでも確かめる（正しい #RRGGBB だけ使う）
  const palette = hexes.filter((h) => /^#[0-9A-Fa-f]{6}$/.test(h)).map(hexToRgb);
  if (palette.length < 2) {
    figma.notify("色を 2 色以上貼り付けてください");
    return;
  }

  // 1 回目：選択の中で使われている色を、重なりなく集める
  const seen = new Map<string, RGB>();
  walk(selection, (node) => {
    if (!hasPaints(node)) return;
    for (const c of [...solidColors(node.fills), ...solidColors(node.strokes)]) {
      seen.set(rgbToHex(c), c);
    }
  });
  if (seen.size === 0) {
    figma.notify("置き換えられる色（単色の塗りや線）が見つかりませんでした");
    return;
  }

  // 2 回目：対応表にそって書き換える
  const map = buildMapping([...seen.values()], palette);
  let changed = 0;
  walk(selection, (node) => {
    if (!hasPaints(node)) return;
    const fills = node.fills === figma.mixed ? null : repaint(node.fills, map);
    const strokes = node.strokes.length > 0 ? repaint(node.strokes, map) : null;
    if (fills) node.fills = fills;
    if (strokes) node.strokes = strokes;
    // 色を書き換えたレイヤーだけを数える（グラデーションや画像だけのレイヤーは数えない）
    if (fills || strokes) changed++;
  });
  figma.notify(`${seen.size} 色を、パレットの色に置き換えました（${changed} 個のレイヤー）`);
}

figma.ui.onmessage = (msg: ReplaceMessage) => {
  if (msg.type === "replace") replaceColors(msg.hexes);
};
