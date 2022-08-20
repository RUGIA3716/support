export const range = n => [...Array(n).keys()];
export const qrwidth = version => 17 + version * 4;

export const blankFrame = width => Array(width ** 2).fill(null);

export const get = (frame, width, x, y) => frame[y * width + x];
export const set = (frame, width, x, y, value) => frame[y * width + x] = value;

// finder patterns
export const markFinder = (frame, width, cx, cy) => {
  for (let x = 0; x < 7; x++) for (let y = 0; y < 7; y++) {
    const b = x === 0 || x === 6 || y === 0 || y === 6 ||
          (2 <= x && x <= 4 && 2 <= y && y <= 4);
    set(frame, width, cx - 3 + x, cy - 3 + y, +b);
  }
};
export const markSeparator = (frame, width) => {
  for (let i = 0; i < 8; i++) {
    // top left
    set(frame, width, 7, i, 0); // v
    set(frame, width, i, 7, 0); // h
    // top right
    set(frame, width, width - 8, i, 0);     // v
    set(frame, width, width - 1 - i, 7, 0); // h
    // bottom left
    set(frame, width, 7, width - 1 - i, 0); // v
    set(frame, width, i, width - 8, 0);     // h
  }
};
export const markFinders = (frame, width) => {
  markFinder(frame, width, 3, 3);
  markFinder(frame, width, width - 4, 3);
  markFinder(frame, width, 3, width - 4);
  markSeparator(frame, width);
};

// alignment patterns
// - https://www.thonky.com/qr-code-tutorial/alignment-pattern-locations
const alignmentSpans = [
   0,  0,  0,  0,  0,  0,  0, // 1 <=> 6       
  16, 18, 20, 22, 24, 26, 28, // 7 <=> 13
  20, 22, 24, 24, 26, 28, 28, //14 <=> 20
  22, 24, 24, 26, 26, 28, 28, //21 <=> 27
  24, 24, 26, 26, 26, 28, 28, //28 <=> 34
  24, 26, 26, 26, 28, 28,     //35 <=> 40
];
export const alignmentIndexes = version => {
  if (version < 2) return [];
  const last = qrwidth(version) - 7;
  const count = Math.floor(version / 7) + 1;
  const span = alignmentSpans[version];
  return range(count).map(k => last - k * span).reverse();
};
export const markAlignment = (frame, width, cx, cy) => {
  for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
    const b = x === 0 || x === 4 || y === 0 || y === 4 || (x === 2 && y === 2);
    set(frame, width, cx - 2 + x, cy - 2 + y, +b);
  }
};
export const markAlignments = (frame, width, indexes) => {
  for (const cx of indexes) for (const cy of indexes) {
    markAlignment(frame, width, cx, cy);
  }
  for (const cx of indexes.slice(0, -1)) markAlignment(frame, width, cx, 6);
  for (const cy of indexes.slice(0, -1)) markAlignment(frame, width, 6, cy);
};

export const markTimings = (frame, width) => {
  for (let i = 8; i < width - 8; i++) {
    set(frame, width, 6, i, 1 - (i & 1)); // v-line
    set(frame, width, i, 6, 1 - (i & 1)); // h-line
  }
};

// non data frame
export const makeFrame = version => {
  const width = qrwidth(version);
  const frame = blankFrame(width);
  markFinders(frame, width);
  const indexes = alignmentIndexes(version);
  markAlignments(frame, width, indexes);
  markTimings(frame, width);
  set(frame, width, 8, width - 8, 1);
  return frame;
};
