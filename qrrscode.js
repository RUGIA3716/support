const range = n => [...Array(n).keys()];

export const findLinearRecurrence = (poly, s) => {
  // Berlekamp-Massey algorithm
  // NOTE: s as [s0, s1, ...]
  const {K, one, add, sub, scale, carry, mul, coef} = poly;
  let cx = one, cl = 1, bx = one, bl = 1, b = K.one, m = 0;
  for (let i = 0; i < s.length; i++) {
    const d = K.sum(range(cl).map(k => K.mul(coef(cx, k), s[i - k])));
    m++;
    if (K.isZero(d)) continue;
    const tx = cx, tl = cl;
    cx = sub(cx, scale(carry(bx, m), K.div(d, b)));
    cl = Math.max(cl, bl + m);
    if (cl > tl) [bx, bl, b, m] = [tx, tl, d, 0];
  }
  return cx;
};

export const RSCode = (poly, d, b = 0) => {
  const {
    K, add, sub, carry, mul, mod, sum, prod, monomial, apply, diff} = poly;
  
  const gen = prod(range(d).map(
    k => add(monomial(K.one, 1), monomial(K.alpha(b + k), 0))));
  const parity = msg => mod(carry(msg, d), gen);
  
  const decode = rx => {
    const N = rx.length;
    // NOTE: synds as [s0, s1, ...]
    const synds = range(d).map(k => apply(rx, K.alpha(b + k)));
    if (synds.every(si => K.isZero(si))) return rx;
    
    const lx = findLinearRecurrence(poly, synds);
    if (lx.length - 1 > (d >>> 1)) throw Error(
      "RSCode.decode: too many errors");
    // NOTE: positions as power of a: index of cx as cx[N - 1 - k]
    const pos = range(N).filter(k => K.isZero(apply(lx, K.alpha(-k))));
    
    const sx = sum(synds.map((sk, k ) => monomial(sk, k)));
    const ox = mod(mul(sx, lx), monomial(K.one, d));
    const dlx = diff(lx);
    // NOTE: errors index is same as positions index (not array index)
    const errors = pos.map(k => {
      const akinv = K.alpha(-k);
      const oAkinv = apply(ox, akinv);
      const dlAkinv = apply(dlx, akinv);
      const ak1b = K.alpha(k * (1 - b));
      return K.neg(K.mul(ak1b, K.div(oAkinv, dlAkinv)));
    });
    const ex = sum(pos.map((k, i) => monomial(errors[i], k)));
    return sub(rx, ex);
  };
  
  return {poly, b, d, gen, parity, decode};
};
