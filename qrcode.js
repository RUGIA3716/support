import {BitWriter} from "./bitstream.js";
import * as QRData from "./qrdata.js";
import {
  quarities, quarityIndex, dataBytes, encodeMessage,
} from "./qrmessage.js";
import {qrwidth} from "./qrframe.js";
import {buildFrame} from "./qrencode.js";
import {evaluate} from "./qrevaluation.js";
import {guess} from "./qrauto.js";

export {render, renderWidth, svg} from "./qrimagedata.js";

const range = n => [...Array(n).keys()];
export const quarityList = Object.freeze([...quarities]);
export const versionList = Object.freeze(range(40).map(k => k + 1));
export const maskIdList = Object.freeze(range(8));

// QR-Code builder auto data packing with minimum version
// - returns {frame, width, version, quarity, maskId} 
export const qrcode = (text, quarity = "Q", useKanji = true) => {
  if (!quarityList.includes(quarity)) throw TypeError(
    `invalid quarity: ${quarity}`);
  const qi = quarityIndex(quarity);
  const [bw, version] = guess(qi, text, useKanji);
  if (bw.byteLength() > dataBytes(version, qi)) throw Error(
    `Overflow text in version-${version}`);
  const coded = encodeMessage(bw.toBuffer(), version, qi);
  const width = qrwidth(version);
  const {frame, maskId} = buildBestFrame(coded, version, qi, width);
  return {frame, width, version, quarity, maskId};
};

export const buildBestFrame = (coded, version, qi, width) => {
  return maskIdList.map(maskId => {
    const frame = buildFrame(coded, version, qi, maskId);
    const penalty = evaluate(frame, width);
    return {penalty, frame, maskId};
  }).sort((a, b) => a.penalty - b.penalty)[0];
};

// QR-Code builder with specified version and quarity (and mask)
// 1. add each text with data type
// 2. then build a frame
export const qrbuilder = (version, quarity) => {
  if (!quarityList.includes(quarity)) throw TypeError(
    `invalid quarity: ${quarity}`);
  if (!versionList.includes(version)) throw TypeError(
    `invalid version: ${version}`);
  const bw = new BitWriter();
  const qi = quarityIndex(quarity);
  const dataLength = dataBytes(version, qi);

  // builder object
  let result = null;
  const self = {dataLength};
  return Object.freeze(Object.assign(self, {
    addNumbers: (text) => {
      QRData.addNumbers(bw, version, text);
      return self;
    },
    addAlphaNums: (text) => {
      QRData.addAlphaNums(bw, version, text);
      return self;
    },
    addBytes: (text) => {
      QRData.addBytes(bw, version, text);
      return self;
    },
    addKanjis: (text) => {
      QRData.addKanjis(bw, version, text);
      return self;
    },
    build: (maskId = null) => {
      if (result) return result;
      QRData.terminateData(bw, dataLength);
      if (bw.byteLength() > dataBytes(version)) throw Error(
        `Overflow text in version-${version}`);
      const coded = encodeMessage(bw.toBuffer(), version, qi);
      const width = qrwidth(version);
      const fm = maskId === null ? buildBestFrame(coded, version, qi, width) :
            {frame: buildFrame(coded, version, qi, maskId), maskId};
      return {frame: fm.frame, width, version, quarity, maskId: fm.maskId};
    },
  }));
};
