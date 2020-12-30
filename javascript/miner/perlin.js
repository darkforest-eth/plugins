import { spaceTypeHash, biomeHash } from '/miner/mimc.js';
import Fraction from '/miner/big-fraction.js';
import BigInt from '/vendor/big-integer.js';

const TRACK_LCM = false;

const spaceTypeRandom = (...args) => {
  return spaceTypeHash(...args)
    .remainder(16)
    .toJSNumber();
};

const biomeRandom = (...args) => {
  return biomeHash(...args)
    .remainder(16)
    .toJSNumber();
};

let vecs;
try {
  vecs = [
    [1000, 0],
    [923, 382],
    [707, 707],
    [382, 923],
    [0, 1000],
    [-383, 923],
    [-708, 707],
    [-924, 382],
    [-1000, 0],
    [-924, -383],
    [-708, -708],
    [-383, -924],
    [-1, -1000],
    [382, -924],
    [707, -708],
    [923, -383],
  ].map(([x, y]) => ({ x: new Fraction(x, 1000), y: new Fraction(y, 1000) }));
} catch (err) {
  console.error('Browser does not support BigInt.');
}

const getRandomGradientAt = (point, scale, randFn) => {
  const val =
    vecs[randFn(point.x.valueOf(), point.y.valueOf(), scale.valueOf())];
  return val;
};

const minus = (a, b) => {
  return {
    x: a.x.sub(b.x),
    y: a.y.sub(b.y),
  };
};

const dot = (a, b) => {
  return a.x.mul(b.x).add(a.y.mul(b.y));
};

const smoothStep = (x) => {
  // return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
  return x;
};

const scalarMultiply = (s, v) => ({
  x: v.x.mul(s),
  y: v.y.mul(s),
});

const getWeight = (corner, p) => {
  return smoothStep(new Fraction(1).sub(p.x.sub(corner.x).abs())).mul(
    smoothStep(new Fraction(1).sub(p.y.sub(corner.y).abs()))
  );
};

// p is in a scale x scale square. we scale down to a 1x1 square
const perlinValue = (corners, scale, p) => {
  let ret = new Fraction(0);
  for (const corner of corners) {
    const distVec = minus(p, corner.coords);
    ret = ret.add(
      getWeight(
        scalarMultiply(scale.inverse(), corner.coords),
        scalarMultiply(scale.inverse(), p)
      ).mul(dot(scalarMultiply(scale.inverse(), distVec), corner.gradient))
    );
  }
  return ret;
};

let runningLCM = BigInt(1);

const updateLCM = (oldLCM, newValue) => {
  if (!TRACK_LCM) {
    return oldLCM;
  }

  const newLCM = BigInt.lcm(oldLCM, newValue);
  if (newLCM !== oldLCM) {
    console.log('LCM updated to ', newLCM);
  }

  return newLCM;
};

// fractional mod
const realMod = (dividend, divisor) => {
  const temp = dividend.mod(divisor);
  // temp.s is sign
  if (temp.s.toString() === '-1') {
    return temp.add(divisor);
  }
  return temp;
};

const valueAt = (p, scale, randFn) => {
  const bottomLeftCoords = {
    x: p.x.sub(realMod(p.x, scale)),
    y: p.y.sub(realMod(p.y, scale)),
  };
  const bottomRightCoords = {
    x: bottomLeftCoords.x.add(scale),
    y: bottomLeftCoords.y,
  };
  const topLeftCoords = {
    x: bottomLeftCoords.x,
    y: bottomLeftCoords.y.add(scale),
  };
  const topRightCoords = {
    x: bottomLeftCoords.x.add(scale),
    y: bottomLeftCoords.y.add(scale),
  };

  const bottomLeftGrad = {
    coords: bottomLeftCoords,
    gradient: getRandomGradientAt(bottomLeftCoords, scale, randFn),
  };
  const bottomRightGrad = {
    coords: bottomRightCoords,
    gradient: getRandomGradientAt(bottomRightCoords, scale, randFn),
  };
  const topLeftGrad = {
    coords: topLeftCoords,
    gradient: getRandomGradientAt(topLeftCoords, scale, randFn),
  };
  const topRightGrad = {
    coords: topRightCoords,
    gradient: getRandomGradientAt(topRightCoords, scale, randFn),
  };

  const out = perlinValue(
    [bottomLeftGrad, bottomRightGrad, topLeftGrad, topRightGrad],
    scale,
    p
  );

  return out;
};

const MAX_PERLIN_VALUE = 32;

function perlin(p, floor = true, computingBiome = false) {
  const fractionalP = { x: new Fraction(p.x), y: new Fraction(p.y) };
  let ret = new Fraction(0);
  const pValues = [];
  for (let i = 12; i < 15; i += 1) {
    // we want 4096, 8192, 16384
    pValues.push(
      valueAt(
        fractionalP,
        new Fraction(2 ** i),
        computingBiome ? biomeRandom : spaceTypeRandom
      )
    );
  }
  ret = ret.add(pValues[0]);
  ret = ret.add(pValues[0]);
  ret = ret.add(pValues[1]);
  ret = ret.add(pValues[2]);

  ret = ret.div(4);
  runningLCM = updateLCM(runningLCM, BigInt(ret.d));

  ret = ret.mul(MAX_PERLIN_VALUE / 2);
  if (floor) ret = ret.floor();
  ret = ret.add(MAX_PERLIN_VALUE / 2);

  const out = ret.valueOf();
  return Math.floor(out * 100) / 100;
}

export default perlin;
