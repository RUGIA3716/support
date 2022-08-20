import * as cp2sjis from "./cp2sjis.js";

// utilities
export const range = n => [...Array(n).keys()];
export const chunking = (a, n) => range(Math.ceil(a.length / n)).map(
  i => a.slice(i * n, (i + 1) * n));

// data length varied by version
const lengthBitTable = [
  // version: 1<=>9, 10<=>26, 27<=>40
  [10, 12, 14], // Numbers
  [ 9, 11, 13], // AlphaNums
  [ 8, 16, 16], // Bytes
  [ 8, 10, 12], // Kanjis
];
const maxLengthTable = lengthBitTable.map(l => l.map(b => 2 ** b));

export const lengthBit = (mode, version) => {
  console.assert(1 <= version && version <= 40, "invalid version", version);
  return lengthBitTable[mode][version <= 9 ? 0 : version <= 26 ? 1 : 2];
};
export const maxLength = (mode, version) => {
  console.assert(1 <= version && version <= 40, "invalid version", version);
  return maxLengthTable[mode][version <= 9 ? 0 : version <= 26 ? 1 : 2];
};

// 0. terminateor
export const addTerminator = (bitwriter) => {
  bitwriter.write(0, 4);
  return bitwriter;
};
export const bitTerminator = () => 4;
// last padding
export const addPads = (bitwriter, totalLength) => {
  const pad = totalLength - bitwriter.byteLength();
  bitwriter.writeBytes(range(pad).map(k => (k & 1) ? 0b00010001 : 0b11101100));
  return bitwriter;
};
export const terminateData = (bitwriter, totalLength) => {
  if (totalLength - bitwriter.byteLength()) addTerminator(bitwriter); 
  return addPads(bitwriter, totalLength);
};

// 1. numbers
export const regExpNumbers = (version, least = 1) =>
  RegExp(`^\\d{${least},${maxLength(0, version)}}$`);
export const addNumbers = (bitwriter, version, text) => {
  console.assert(regExpNumbers(version).test(text), "invalid numbers", text);
  bitwriter.write(1 << 0, 4);
  bitwriter.write(text.length, lengthBit(0, version));
  const chunks = chunking(text, 3);
  const last = chunks[chunks.length - 1].length !== 3 ? chunks.pop() : "";
  for (const chunk of chunks) bitwriter.write(+chunk, 10);
  if (last.length === 2) bitwriter.write(+last, 7);
  else if (last.length === 1) bitwriter.write(+last, 4);
  return bitwriter;
};
export const bitNumbers = (version, len) => {
  if (maxLength(0, version) < len) return -1;
  const rem = len % 3, c3 = (len - rem) / 3;
  return 4 + lengthBit(0, version) + 10 * c3 +
    (rem === 2 ? 7 : rem === 1 ? 4 : 0);
};

// 2. alphanums
export const alphaNumTable = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
//console.assert(alphaNumTable.length === 45);
export const regExpAlphaNums = (version, least = 1) =>
  RegExp(`^[${alphaNumTable}]{${least},${maxLength(1, version)}}$`);
export const addAlphaNums = (bitwriter, version, text) => {
  console.assert(regExpAlphaNums(version).test(text), "invalid alphanums", text);
  bitwriter.write(1 << 1, 4);
  bitwriter.write(text.length, lengthBit(1, version));
  const chunks = chunking(text, 2);
  const last = chunks[chunks.length - 1].length !== 2 ? chunks.pop() : "";
  for (const chunk of chunks) bitwriter.write(
    45 * alphaNumTable.indexOf(chunk[0]) + alphaNumTable.indexOf(chunk[1]), 11);
  if (last.length === 1) bitwriter.write(alphaNumTable.indexOf(last), 6);
  return bitwriter;
};
export const bitAlphaNums = (version, len) => {
  if (maxLength(1, version) < len) return -1;
  const rem = len % 2, c2 = (len - rem) / 2;
  return 4 + lengthBit(1, version) + 11 * c2 + (rem === 1 ? 6 : 0);
};

// 3. bytes
export const addBytes = (bitwriter, version, text) => {
  const chunks = new TextEncoder().encode(text);
  console.assert(chunks.length <= maxLength(2, version), "invalid length bytes", text);
  bitwriter.write(1 << 2, 4);
  bitwriter.write(chunks.length, lengthBit(2, version));
  for (const chunk of chunks) bitwriter.write(chunk, 8);
  return bitwriter;
};

export const bitBytes = (version, len) => {
  // NOTE: `len` as  byte count (not character count)
  if (maxLength(2, version) < len) return -1;
  return 4 + lengthBit(2, version) + 8 * len;
};

// 4. Kanjis: SJIS 2-byte code numbers except for ASCII, half-width KATAKANA
export const addKanjis = (bitwriter, version, text) => {
  const kanjiArray = [...text].map(ch => cp2sjis.get(ch));
  console.assert(kanjiArray.every(
    c => 0x8140 <= c && c <= 0x9ffc || 0xe040 <= c && c <= 0xebbf) &&
                 kanjiArray.length <= maxLength(3, version));
  bitwriter.write(1 << 3, 4);
  bitwriter.write(kanjiArray.length, lengthBit(3, version));
  for (const c of kanjiArray) {
    const o = c - (c <= 0x9ffc ? 0x8140 : 0xc140);
    bitwriter.write((o >> 8) * 0xc0 + (o & 0xff), 13);
  }
  return bitwriter;
};
export const bitKanjis = (version, len) => {
  // NOTE: `len` as character counts (not byte count)
  if (maxLength(3, version) < len) return -1;
  return 4 + lengthBit(3, version) + 13 * len;
};
