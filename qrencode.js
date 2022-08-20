import {BitReader} from "./bitstream.js";
import * as QRMessage from "./qrmessage.js";
import {qrwidth, get, set, makeFrame} from "./qrframe.js";

export const buildEmptyFrame = (version, qi, maskId) => {
  const width = qrwidth(version);
  const frame = makeFrame(version);

  const formatBits = QRMessage.formatBits(qi, maskId);
  embedFormat(frame, width, formatBits);
  if (version >= 7) {
    const versionBits = QRMessage.versionBits(version);
    embedVersion(frame, width, versionBits);
  }
  return [frame, width];
};
export const buildFrame = (coded, version, qi, maskId) => {
  console.assert(coded.length === QRMessage.codeBytes(version, qi),
                 "Invalid data length");
  const [frame, width] = buildEmptyFrame(version, qi, maskId);
  embedCode(frame, width, coded, maskId);
  return frame;
};

// embedding code info
export const embedFormat = (frame, width, formatBits) => {
  // top left: go left then go up
  for (let i = 0; i < 6; i++) set(frame, width, i, 8, formatBits[i]);
  set(frame, width, 7, 8, formatBits[6]);
  set(frame, width, 8, 8, formatBits[7]);
  set(frame, width, 8, 7, formatBits[8]);
  for (let i = 9; i < 15; i++) set(frame, width, 8, 14 - i, formatBits[i]);

  // bottom-left: go left
  for (let i = 0; i < 7; i++) {
    set(frame, width, 8, width - 1 - i, formatBits[i]);
  }
  // top-right: go up
  for (let i = 7; i < 15; i++) {
    set(frame, width, width - 15 + i, 8, formatBits[i]);
  }
};
export const embedVersion = (frame, width, versionBits) => {
  for (let i = 0; i < 18; i++) {
    const rem = i % 3, u = (i - rem) / 3, v = (width - 11) + rem;
    set(frame, width, u, v, versionBits[i]); // bottom-left
    set(frame, width, v, u, versionBits[i]); // top-right
  }
};

// generator of zigzag scan [x, y] to set bit
export const makeScanner = function* (width) {
  let x = width - 1, y = width - 1, dy = -1;
  while (x >= 0) {
    yield [x, y];
    x--;
    yield [x, y];
    y += dy;
    if (0 <= y & y < width) {
      x++;
    } else {
      y -= dy;
      dy *= -1;
      x--;
      if (x === 6) x--;
    }
  }
};

// mask pattern
// - https://www.thonky.com/qr-code-tutorial/mask-patterns
const qrmaskTable = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => ((x - x % 3) / 3 + (y - y % 2) / 2) % 2 === 0,
  (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
  (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
  (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
];
export const qrmask = (maskId, x, y) => +qrmaskTable[maskId](x, y);

export const embedCode = (frame, width, coded, maskId) => {
  const br = new BitReader(coded);
  for (const [x, y] of makeScanner(width)) {
    if (get(frame, width, x, y) !== null) continue;
    const b = br.isEnd() ? 0 : br.readBit();
    const m = qrmask(maskId, x, y);
    set(frame, width, x, y, m ^ b);
  }
  console.assert(br.isEnd(), "incomplete read");
};
