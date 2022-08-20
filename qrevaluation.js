import {get} from "./qrframe.js";

// mask evaluation
// - https://www.thonky.com/qr-code-tutorial/data-masking
export const evaluate1 = (frame, width) => {
  // longer line (len >= 5) as penalty len-2
  let score = 0;
  for (let y = 0; y < width; y++) {
    let len = 1, cur = get(frame, width, 0, y);
    for (let x = 1; x < width; x++) {
      const c = get(frame, width, x, y);
      if (c === cur) {
        len++;
        if (len === 5) score += 3;
        else if (len > 5) score++;
      } else {
        cur = c, len = 1;
      }
    }
  }

  for (let x = 0; x < width; x++) {
    let len = 1, cur = get(frame, width, x, 0);
    for (let y = 1; y < width; y++) {
      const c = get(frame, width, x, y);
      if (c === cur) {
        len++;
        if (len === 5) score += 3;
        else if (len > 5) score++;
      } else {
        cur = c, len = 1;
      }
    }
  }
  return score;
};

export const evaluate2 = (frame, width) => {
  // 2x2 square as penalty 3
  let score = 0;
  for (let y = 1; y < width; y++) {
    for (let x = 1; x < width; x++) {
      const c = get(frame, width, x, y);
      const up = get(frame, width, x, y - 1);
      if (c !== up) {
        x++;
        continue;
      }
      if (get(frame, width, x - 1, y - 1) === c &&
          get(frame, width, x - 1, y) === c) score += 3;
    }
  }
  return score;
};

export const evaluate3 = (frame, width) => {
  // 11-bit line pattern 10111010000 or 00001011101 as penalty 40
  const p1 = 0b10111010000, p2 = 0b00001011101, m = 0b11111111111;
  let score = 0;
  for (let y = 0; y < width; y++) {
    let scan = 0;
    for (let x = 0; x < 10; x++) scan = (scan << 1) | get(frame, width, x, y);
    for (let x = 10; x < width; x++) {
      scan = ((scan << 1) | get(frame, width, x, y)) & m;
      if (scan === p1 || scan === p2) score += 40;
    }
  }
  for (let x = 0; x < width; x++) {
    let scan = 0;
    for (let y = 0; y < 10; y++) scan = (scan << 1) | get(frame, width, x, y);
    for (let y = 10; y < width; y++) {
      scan = ((scan << 1) | get(frame, width, x, y)) & m;
      if (scan === p1 || scan === p2) score += 40;
    }
  }
  return score;
};

export const evaluate4 = (frame, width) => {
  // dark/light rate as penalty as 10 each 5% difeerence
  const total = frame.length, dark = frame.filter(b => b === 1).length;
  return Math.floor(Math.abs(dark * 100 / total - 50) / 5) * 10;
};

export const evaluate = (frame, width) =>
  evaluate1(frame, width) + evaluate2(frame, width) + evaluate3(frame, width) +
  evaluate4(frame, width);

