import {range, PF2Poly, GF2n, Polynomial} from "./qrgf.js";
import {RSCode} from "./qrrscode.js";

// Reed-Solomon encode on GF(2^8) with a^8+a^4+a^3+a^2+1=0
// - https://www.thonky.com/qr-code-tutorial/error-correction-coding
export const gf = Object.freeze(GF2n(8, 0b100011101));
export const poly = Object.freeze(Polynomial(gf));

// message encode
// - https://www.thonky.com/qr-code-tutorial/structure-final-message
export const quarities = "LMQH";
const blockTable = [
  // each version has at most two block;
  //    parity byte length is same, data length b2 is b1 + 1
  // quarities L/M/Q/H has different parity different block counts
  // - https://www.thonky.com/qr-code-tutorial/error-correction-table
  [[/*L: parity, b1 bytes, b1 count, b2 count,*/], [/*M*/], [/*Q*/], [/*H*/],],
  [[7, 19, 1, 0], [10, 16, 1, 0], [13, 13, 1, 0], [17, 9, 1, 0]],    // 1
  [[10, 34, 1, 0], [16, 28, 1, 0], [22, 22, 1, 0], [28, 16, 1, 0]],  // 2
  [[15, 55, 1, 0], [26, 44, 1, 0], [18, 17, 2, 0], [22, 13, 2, 0]],  // 3
  [[20, 80, 1, 0], [18, 32, 2, 0], [26, 24, 2, 0], [16, 9, 4, 0]],   // 4 
  [[26, 108, 1, 0], [24, 43, 2, 0], [18, 15, 2, 2], [22, 11, 2, 2]], // 5
  [[18, 68, 2, 0], [16, 27, 4, 0], [24, 19, 4, 0], [28, 15, 4, 0]],  // 6

  [[20, 78, 2, 0], [18, 31, 4, 0], [18, 14, 2, 4], [26, 13, 4, 1]],   // 7
  [[24, 97, 2, 0], [22, 38, 2, 2], [22, 18, 4, 2], [26, 14, 4, 2]],   // 8
  [[30, 116, 2, 0], [22, 36, 3, 2], [20, 16, 4, 4], [24, 12, 4, 4]],  // 9
  [[18, 68, 2, 2], [26, 43, 4, 1], [24, 19, 6, 2], [28, 15, 6, 2]],   //10
  [[20, 81, 4, 0], [30, 50, 1, 4], [28, 22, 4, 4], [24, 12, 3, 8]],   //11
  [[24, 92, 2, 2], [22, 36, 6, 2], [26, 20, 4, 6], [28, 14, 7, 4]],   //12 
  [[26, 107, 4, 0], [22, 37, 8, 1], [24, 20, 8, 4], [22, 11, 12, 4]], //13

  [[30, 115, 3, 1], [24, 40, 4, 5], [20, 16, 11, 5], [24, 12, 11, 5]],   //14
  [[22, 87, 5, 1], [24, 41, 5, 5], [30, 24, 5, 7], [24, 12, 11, 7]],     //15
  [[24, 98, 5, 1], [28, 45, 7, 3], [24, 19, 15, 2], [30, 15, 3, 13]],    //16
  [[28, 107, 1, 5], [28, 46, 10, 1], [28, 22, 1, 15], [28, 14, 2, 17]],  //17
  [[30, 120, 5, 1], [26, 43, 9, 4], [28, 22, 17, 1], [28, 14, 2, 19]],   //18
  [[28, 113, 3, 4], [26, 44, 3, 11], [26, 21, 17, 4], [26, 13, 9, 16]],  //19
  [[28, 107, 3, 5], [26, 41, 3, 13], [30, 24, 15, 5], [28, 15, 15, 10]], //20

  [[28, 116, 4, 4], [26, 42, 17, 0], [28, 22, 17, 6], [30, 16, 19, 6]],   //21
  [[28, 111, 2, 7], [28, 46, 17, 0], [30, 24, 7, 16], [24, 13, 34, 0]],   //22
  [[30, 121, 4, 5], [28, 47, 4, 14], [30, 24, 11, 14], [30, 15, 16, 14]], //23
  [[30, 117, 6, 4], [28, 45, 6, 14], [30, 24, 11, 16], [30, 16, 30, 2]],  //24
  [[26, 106, 8, 4], [28, 47, 8, 13], [30, 24, 7, 22], [30, 15, 22, 13]],  //25
  [[28, 114, 10, 2], [28, 46, 19, 4], [28, 22, 28, 6], [30, 16, 33, 4]],  //26
  [[30, 122, 8, 4], [28, 45, 22, 3], [30, 23, 8, 26], [30, 15, 12, 28]],  //27
  
  [[30, 117, 3, 10], [28, 45, 3, 23], [30, 24, 4, 31], [30, 15, 11, 31]],  //28
  [[30, 116, 7, 7], [28, 45, 21, 7], [30, 23, 1, 37], [30, 15, 19, 26]],   //29
  [[30, 115, 5, 10], [28, 47, 19, 10], [30, 24, 15, 25], [30, 15, 23, 25]],//30
  [[30, 115, 13, 3], [28, 46, 2, 29], [30, 24, 42, 1], [30, 15, 23, 28]],  //31
  [[30, 115, 17, 0], [28, 46, 10, 23], [30, 24, 10, 35], [30, 15, 19, 35]],//32
  [[30, 115, 17, 1], [28, 46, 14, 21], [30, 24, 29, 19], [30, 15, 11, 46]],//33
  [[30, 115, 13, 6], [28, 46, 14, 23], [30, 24, 44, 7], [30, 16, 59, 1]],  //34

  [[30, 121, 12, 7], [28, 47, 12, 26], [30, 24, 39, 14], [30, 15, 22, 41]],//35
  [[30, 121, 6, 14], [28, 47, 6, 34], [30, 24, 46, 10], [30, 15, 2, 64]],  //36
  [[30, 122, 17, 4], [28, 46, 29, 14], [30, 24, 49, 10], [30, 15, 24, 46]],//37
  [[30, 122, 4, 18], [28, 46, 13, 32], [30, 24, 48, 14], [30, 15, 42, 32]],//38
  [[30, 117, 20, 4], [28, 47, 40, 7], [30, 24, 43, 22], [30, 15, 10, 67]], //39
  [[30, 118, 19, 6], [28, 47, 18, 31], [30, 24, 34, 34], [30, 15, 20, 61]],//40
];

export const blockInfo = (version, qi) => blockTable[version][qi].slice();
export const quarityIndex = c => quarities.indexOf(c);
export const codeBytes = (version, qindex) => {
  const [parity, b1data, b1count, b2count] = blockTable[version][qindex];
  return (parity + b1data) * b1count + (parity + b1data + 1) * b2count;
};
export const dataBytes = (version, qindex) => {
  const [parity, b1data, b1count, b2count] = blockTable[version][qindex];
  return b1data * b1count + (b1data + 1) * b2count;
};

export const splitBlocks = (bytes, b1data, b1count, b2count) => {
  const b2data = b1data + 1, b2offs = b1data * b1count;
  const b1blocks = range(b1count).map(
    i => bytes.slice(i * b1data, (i + 1) * b1data));
  const b2blocks = range(b2count).map(
    i => bytes.slice(b2offs + i * b2data, b2offs + (i + 1) * b2data));
  return [...b1blocks, ...b2blocks];
};

export const transpose = m => range(m[0].length).map(i => m.map(l => l[i]));

export const interleaveBlocks = (blocks, b1data, b1count) => {
  const former = transpose(blocks.map(b => b.slice(0, b1data))).flat();
  const latter = blocks.slice(b1count).flatMap(b => b[b.length - 1]);
  return [...former, ...latter];
};

export const encodeMessage = (bytes, version, qindex) => {
  console.assert(bytes.length === dataBytes(version, qindex));
  const [paritySize, b1data, b1count, b2count] = blockTable[version][qindex];
  const rscode = RSCode(poly, paritySize);
  const blocks = splitBlocks(Array.from(bytes), b1data, b1count, b2count);
  const parities = blocks.map(block => rscode.parity(block));
  const iblocks = interleaveBlocks(blocks, b1data, b1count);
  const iparities = transpose(parities).flat();
  return [...iblocks, ...iparities];
};

// BCH encode
// - https://www.thonky.com/qr-code-tutorial/format-version-information
const pf2poly = PF2Poly();
const formatBit = 15, formatCarry = 10, formatGen = 0b10100110111;

const quarityBits = [1, 0, 3, 2];
export const formatMask = 0b101010000010010;
export const formatValue = (qIndex, maskId) => {
  const data = pf2poly.carry((quarityBits[qIndex] << 3) | maskId, formatCarry);
  return pf2poly.sub(data, pf2poly.mod(data, formatGen));
};
export const formatBits = (qIndex, maskId) => {
  const coded = formatValue(qIndex, maskId) ^ formatMask;
  return range(formatBit).map(k => (coded >>> k) & 1).reverse();
};

// Version bits uses Extended BCH code (18, 6) such as
// - Use primitive element a an GF2n(11, 0b101011100011)
// - the versionGen is (x-a^0)*...*(x-a^2^11) => 0b11 * 0b101011100011
// - error posistion k is of e^2^k (not e^k as usual BCH code)
const versionBit = 18, versionCarry = 12, versionGen = 0b1111100100101;
export const versionBits = (version) => {
  const data = pf2poly.carry(version, versionCarry);
  const coded = pf2poly.sub(data, pf2poly.mod(data, versionGen));
  return range(formatBit).map(k => (coded >>> k) & 1);
};
