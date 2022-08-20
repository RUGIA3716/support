const get = (frame, width, x, y) => frame[y * width + x];
const set = (image, x, y, p) => {
  if (p === null) return;
  const i = 4 * (y * image.width + x);
  image.data[i + 0] = image.data[i + 1] = image.data[i + 2] = p ? 0 : 255;
  image.data[i + 3] = 255;
};

// HTML 2D Canvas ImageData
export const renderWidth = width => width + 8;
export const render = (image, frame, width, scale) => {
  const pxwidth = (width + 8) * scale;
  console.assert(image.width >= pxwidth && image.height >= pxwidth);
  for (let x = 0; x < width + 8; x++) for (let y = 0; y < width + 8; y++) {
    const margin = x < 4 || width + 4 <= x || y < 4 || width + 4 <= y;
    const p = margin ? 0 : get(frame, width, x - 4, y - 4);
    for (let u = 0; u < scale; u++) for (let v = 0; v < scale; v++) {
      set(image, x * scale + u, y * scale + v, p);
    }
  }
  return image;
};

// SVG string
export const svg = (frame, width, scale) => {
  const darks = frame.map((b, i) => {
    if (b === 0) return "";
    const x = i % width, y = (i - x) / width;
    return `<rect x="${x + 4}" y="${y + 4}" width="1" height="1" />`;
  });
  const w = width + 8, size = w * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1"  
viewBox="0 0 ${w} ${w}" width="${size}px" height="${size}px">\
<rect x="0" y="0" width="${w}" height="${w}" fill="white" />\
${darks.join("")}</svg>`;
};
