import * as cp2sjis from "./cp2sjis.js";
import {BitWriter} from "./bitstream.js";
import {
  lengthBit, alphaNumTable, bitNumbers, bitAlphaNums, bitBytes, bitKanjis,
  terminateData, addNumbers, addAlphaNums, addBytes, addKanjis,
} from "./qrdata.js";
import {dataBytes} from "./qrmessage.js";

// find version to fit bytes
export const minVersion = (qi, bytes) => {
  for (let v = 1; v <= 40; v++) if (dataBytes(v, qi) >= bytes) return v;
  return -1; // overflow data
};

// heqp queue
export const heapPush = (queue, less, elem) => {
  queue.push(elem);
  let idx = queue.length - 1;
  while (idx > 0) {
    const parent = (idx - 1) >>> 1;
    if (less(elem, queue[parent])) {
      [queue[idx], queue[parent], idx] = [queue[parent], elem, parent];
    } else break;
  }
};
export const heapPop = (queue, less) => {
  const ret = queue[0], elem = queue.pop();
  if (queue.length === 0) return ret;
  queue[0] = elem;
  let idx = 0;
  for (let l = idx * 2 + 1; l < queue.length; l = idx * 2 + 1) {
    const r = l + 1;
    const child = (r < queue.length && less(queue[r], queue[l])) ? r : l;
    if (less(queue[child], elem)) {
      [queue[idx], queue[child], idx] = [queue[child], elem, child];
    } else break;
  }
  return ret;
};

// split runs of same type char in bytes
const nums = new Set(alphaNumTable.slice(0, 10));
const alphas = new Set(alphaNumTable.slice(10));
export const toRuns = (text, useKanji = true) => {
  const te = new TextEncoder();
  const r = [];
  let mode = -1, s = 0, i = 0, ts = 0, ti = 0;
  for (const ch of text) { // for surrogate pair
    const cmode = nums.has(ch) ? 0 : alphas.has(ch) ? 1 :
          useKanji && cp2sjis.has(ch) ? 3 : 2;
    if (cmode !== mode)  {
      if (mode >= 0) r.push({mode, s, e: i, ts, te: ti});
      [mode, s, ts] = [cmode, i, ti];
    }
    ti += ch.length; // for surrogate pair
    i += te.encode(ch).length;
  }
  if (mode >= 0) r.push({mode, s, e: i, ts, te: ti});
  return r;
};

// bit size as score of chunks
export const bits = (mode, version, len, tlen) => {
  if (mode === 0) return bitNumbers(version, len);
  if (mode === 1) return bitAlphaNums(version, len);
  if (mode === 2) return bitBytes(version, len);
  if (mode === 3) return bitKanjis(version, tlen);
  return bitBytes(version, len);
};
export const guessChunks = (qi, runs, v) => {
  //const maxlen = bytes.length;
  const maxlen = runs[runs.length - 1].e;
  // A*/Dijkstra-algorithm (heuristic distance: bytelen * 3)
  const chunk = (mode, s, e, ts, te, prev) => ({
    mode, s, e, ts, te, bits: prev.bits + bits(mode, v, e - s, te - ts)});
  const node = (head, mode, run, last) => {
    const prevs = mode !== last.mode ? head.chunks : head.chunks.slice(0, -1);
    const tail = mode !== last.mode ?
          chunk(mode, run.s, run.e, run.ts, run.te, last) :
          chunk(mode, last.s, run.e, last.ts, run.te,
                head.chunks[head.chunks.length - 2]);
    const score = tail.bits + (maxlen - run.e) * 3;
    return {cur: head.cur + 1, score, chunks: [...prevs, tail]};
  };
  
  const queue = [], less = (a, b) => a.score < b.score;
  const root = {mode: -1, s: 0, e: 0, bits: 0};
  queue.push({cur: 0, score: (maxlen - runs[0].s) * 3, chunks: [root]});
  while (queue.length > 0) {
    const head = heapPop(queue, less);
    if (head.cur === runs.length) return head.chunks.slice(1);
    const run = runs[head.cur];
    const last = head.chunks[head.chunks.length - 1];
    if (run.mode === 0) {
      heapPush(queue, less, node(head, 0, run, last));
      heapPush(queue, less, node(head, 1, run, last));
      if (last.mode === 2) heapPush(queue, less, node(head, 2, run, last));
    } else if (run.mode === 1) {
      heapPush(queue, less, node(head, 1, run, last));
      heapPush(queue, less, node(head, 2, run, last));
    } else if (run.mode === 3) {
      heapPush(queue, less, node(head, 3, run, last));
      heapPush(queue, less, node(head, 2, run, last));
    } else {
      heapPush(queue, less, node(head, 2, run, last));
    }
  }
  throw Error("never reached");
};

export const byteSize = (chunks, version) => chunks.reduce(
  (r, ch) => r + bits(ch.mode, version, ch.e - ch.s, ch.te - ch.ts), 0) / 8;

export const guessChunksRec = (qi, runs, v0, runSize = 19) => {
  const chunks = [];
  for (let i = 0; i < runs.length; i += runSize) {
    // guessChunks is O(run.length^2). Split shorter runs with runSize param
    const part = guessChunks(qi, runs.slice(i, i + runSize), v0);
    if (chunks.length > 0 && chunks[chunks.length - 1].mode === part[0].mode) {
      chunks[chunks.length - 1].e = part[0].e;
      chunks[chunks.length - 1].te = part[0].te;
      chunks.push(...part.slice(1));
    } else {
      chunks.push(...part);
    }
  }
  if (chunks.length === runs.length) return chunks;
  return guessChunksRec(qi, chunks, v0, runSize >= 11 ? runSize - 2 : 11);
};

export const guess = (qi, text, useKanji = true) => {
  if (text.length === 0) {
    const v = 1;
    const bw = new BitWriter();
    const datalen = dataBytes(v, qi);
    terminateData(bw, datalen);
    return [bw, v];
  }
  const max = dataBytes(40, qi);
  if (Math.ceil(bitNumbers(40, text.length) / 8) > max) throw Error(
    `text is too long: ${text.length}`);
  const runs = toRuns(text, useKanji);
  const bytelen = runs[runs.length - 1].e;
  const v0 = bytelen + 3 > max ? 40 : minVersion(qi, bytelen + 3);
  const chunks = guessChunksRec(qi, runs, v0);
  const size = byteSize(chunks, v0);
  if (size > max) throw Error(`Too large text: ${size}-byte (max: ${max})`);
  const v = minVersion(qi, size);
  const datalen = dataBytes(v, qi);
  const bw = new BitWriter();
  for (const {mode, s, e, ts, te} of chunks) {
    const str = text.slice(ts, te);
    if (mode === 0) addNumbers(bw, v, str);
    if (mode === 1) addAlphaNums(bw, v, str);
    if (mode === 3) addKanjis(bw, v, str);
    if (mode === 2) addBytes(bw, v, str);
  }
  terminateData(bw, datalen);
  return [bw, v];
};
