const t = new Map(),  rev = new Map();
export const has = c => t.has(c);
export const get = c => t.get(c);
export const toChar = j => rev.get(j);

try {
  const td = new TextDecoder("shift_jis", {fatal: true});
  const dv = new DataView(new ArrayBuffer(2));
  const putSjis = code => {
    dv.setUint16(0, code, false);
    try {
      const ch = td.decode(dv);
      t.set(ch, code);
      rev.set(code, ch);
    } catch (err) {}
  };
  for (let code = 0x8140; code <= 0x9ffc; code++) putSjis(code);
  for (let code = 0xe040; code <= 0xebbf; code++) putSjis(code);
} catch (error) {
  console.info("[INFO] cp2sjis.js depends on SJIS supported TextDecoer, but");
  console.info(error);
}


