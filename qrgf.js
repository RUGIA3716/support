// Tiny GF2n and Polynomial
export const range = n => [...Array(n).keys()];

export const PF2Poly = () => {
  const order = e => Math.max(0, 31 - Math.clz32(e));
  const neg = e => e;
  const add = (a, b) => a ^ b;
  const sub = (a, b) => a ^ b;
  const carry = (e, k) => e << k;
  const mul = (a, b) => {
    let r = 0;
    for (; b > 0; b >>>= 1, a <<= 1) if (b & 1) r ^= a;
    return r;
  };
  const mod = (a, b) => {
    const ma = order(a), mb = order(b);
    for (let i = ma - mb, m = 1 << ma; i >= 0; i--, m >>>= 1) {
      if (a & m) a ^= b << i;
    }
    return a;
  };
  const times = (e, k) => k % 2 === 0 ? 0 : e;
  return {order, neg, add, sub, carry, mul, mod, times};
};

export const GF2n = (n, f) => {
  const poly = Object.freeze(PF2Poly());
  const pn = 2 ** n, pn1 = pn - 1;
  const modpn1 = k => (pn1 + k % pn1) % pn1;
  
  const zero = 0, one = 1, a = 2, isZero = e => e === 0;
  
  const {add, sub, neg, times} = poly;
  const sum = es => es.reduce((r, e) => add(r, e), zero);
  const mul0 = (a, b) => poly.mod(poly.mul(a, b), f);
  
  const powList = [one];
  for (let i = 1; i < pn1; i++) {
    powList.push(mul0(powList[powList.length - 1], a));
  }
  const expoList = range(pn).map(e => e === 0 ? NaN : powList.indexOf(e));

  const exponent = e => expoList[e];
  const mul = (a, b) => a === 0 || b === 0 ? 0 :
        powList[modpn1(exponent(a) + exponent(b))];
  const pow = (e, k) => e === 0 ? 0 : k === 1 ? e :
        powList[modpn1(exponent(e) * k)];
  const inv = e => e === 0 ? NaN : powList[modpn1(-exponent(e))];
  const div = (a, b) => b === 0 ? NaN : a === 0 ? 0 :
        powList[modpn1(exponent(a) - exponent(b))];
  const alpha = (k = 1) => pow(a, k);
  
  return {
    n, f, pn, neg, zero, one, a, isZero,
    add, sub, times, sum, mul, pow, inv, div, exponent, alpha,
  };
};

// Polynomial as reversed array 
export const Polynomial = K => {
  // convert index and order
  const deg = (e, i) => i < 0 ? 0 : e.length - 1 - i;
  
  const zero = Object.freeze([K.zero]), one = Object.freeze([K.one]);
  const add = (a, b) => {
    const [A, B] = a.length >= b.length ? [a, b] : [b, a];
    const offs = A.length - B.length;
    return A.map((c, i) => i < offs ? c : K.add(c, B[i - offs])); 
  };
  
  const neg = e => e.map(c => K.neg(c));
  const scale = (e, c) => e.map(ci => K.mul(ci, c));
  const sub = (a, b) => add(a, neg(b));
  const sum = es => es.reduce((r, e) => add(r, e), zero);
  const carry = (e, k) => e.concat(Array(k).fill(K.zero));
  const mul = (a, b) => sum(b.map(
    (bi, i) => carry(scale(a, bi), deg(b, i))));
  const prod = es => es.reduce((r, e) => mul(r, e), one);
  const order = e => deg(e, e.findIndex(ek => !K.isZero(ek)));
  const mod = (a, b) => {
    const ma = order(a), mb = order(b);
    if (ma < mb) return a.slice(-mb);
    const f = K.div(a[0], b[0]);
    return mod(sub(a, carry(scale(b, f), ma - mb)).slice(1), b);
  };
  const coef = (e, k) => e[deg(e, k)] || K.zero;
  const monomial = (c, k) => carry([c], k);
  const diff = e => e.map((c, i) => K.times(c, deg(e, i))).slice(0, -1);
  const apply = (e, v) => K.sum(
    e.map((c, i) => K.mul(c, K.pow(v, deg(e, i)))));
  
  return {
    K, zero, one, neg, scale, add, sub, sum, carry, mul, order, mod, prod,
    coef, monomial, diff, apply,
  };
};

