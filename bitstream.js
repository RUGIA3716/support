// big endian bit stream
export class BitWriter {
  constructor(buf = [], byte = 0, pos = 7) {
    this.byte = byte;
    this.pos = pos;
    this.buf = Array.from(buf);
  }
  writeBit(b) {
    this.byte |= (b & 1) << this.pos;
    this.pos--;
    if (this.pos < 0) {
      this.buf.push(this.byte);
      this.byte = 0;
      this.pos = 7;
    }
  }
  write(value, n) {
    for (let i = n - 1; i >= 0; i--) this.writeBit((value >>> i) & 1);
  }
  writeBytes(bytes) {
    if (this.pos < 7) {
      this.buf.push(this.byte);
      this.byte = 0;
      this.pos = 7;
    }
    for (const v of bytes) this.buf.push(v);
  }
  toBuffer() {
    const bytes = this.buf.slice();
    if (this.pos < 7) bytes.push(this.byte);
    return new Uint8Array(bytes);
  }
  bitLength() {
    return this.buf.length * 8 + (7 - this.pos);
  }
  byteLength() {
    return this.buf.length + (this.pos === 7 ? 0 : 1);
  }
}

export class BitReader {
  constructor(buf, index = 0, pos = 7) {
    this.buf = Uint8Array.from(buf);
    this.index = index;
    this.pos = pos;
  }
  isEnd() {
    return this.index >= this.buf.length;
  }
  canReadBits(n) {
    const finished = this.index * 8 + 7 - this.pos;
    return finished + n <= this.buf.length * 8;
  }
  readBit() {
    if (this.isEnd()) throw Error(`no enough bytes`);
    const b = (this.buf[this.index] >>> this.pos) & 1;
    this.pos--;
    if (this.pos < 0) {
      this.pos = 7;
      this.index++;
    }
    return b;
  }
  read(n) {
    let r = 0;
    for (let i = n - 1; i >= 0; i--) r |= this.readBit() << i;
    return r;
  }
  readBytes(n = 1) {
    // drop incomplete reading byte
    if (this.pos < 7) {
      this.index++;
      this.pos = 7;
    }
    if (this.index + n > this.buf.length) throw Error(`no enough bytes`);
    const slice = this.buf.slice(this.index, this.index + n);
    this.index += n;
    return slice;
  }
}
