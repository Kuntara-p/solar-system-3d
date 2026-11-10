import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SolarData = require('../src/solarData.js');

const {
  CATEGORY_META,
  SOLAR_BODIES,
  ASTEROID_BELT_INFO,
  QUIZ_QUESTIONS,
  calculateWeightOnBody,
  calculateAgeOnBody,
  getOrbitEllipseParams,
  getOrbitalPosition,
  getOrbitalPosition3D,
  getOrbitalCurvePoints3D,
  getCometTailDirection3D,
  getCometTailAngle,
  matchesFilter
} = SolarData;

test('SOLAR_BODIES contains Sun, 8 ordered planets, Pluto, and Comet with valid metadata', () => {
  assert.equal(SOLAR_BODIES.length, 11);

  const planets = SOLAR_BODIES.filter((b) => b.order >= 1 && b.order <= 8);
  assert.equal(planets.length, 8);

  const expectedIds = [
    'mercury',
    'venus',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune'
  ];
  assert.deepEqual(planets.map((p) => p.id), expectedIds);

  for (let i = 1; i < planets.length; i++) {
    assert.ok(
      planets[i].orbitRadiusPx > planets[i - 1].orbitRadiusPx,
      `${planets[i].id} should orbit farther than ${planets[i - 1].id}`
    );
    assert.ok(
      planets[i].orbitalPeriodDays > planets[i - 1].orbitalPeriodDays,
      `${planets[i].id} should have longer period than ${planets[i - 1].id}`
    );
  }

  for (const body of SOLAR_BODIES) {
    assert.ok(CATEGORY_META[body.category], `Unknown category for ${body.id}`);
    assert.ok(body.nameTh.length > 0);
    assert.ok(body.nameEn.length > 0);
    assert.ok(body.visualRadiusPx > 0);
    assert.ok(Array.isArray(body.highlights) && body.highlights.length >= 3);
    assert.ok(body.curriculumTip.length > 0);
  }
});

test('Weight and age calculations handle planets, Sun, and invalid inputs accurately', () => {
  const earth = SOLAR_BODIES.find((b) => b.id === 'earth');
  const mercury = SOLAR_BODIES.find((b) => b.id === 'mercury');
  const jupiter = SOLAR_BODIES.find((b) => b.id === 'jupiter');
  const sun = SOLAR_BODIES.find((b) => b.id === 'sun');

  assert.equal(calculateWeightOnBody(35, earth), 35);
  assert.ok(Math.abs(calculateWeightOnBody(35, jupiter) - 35 * 2.53) < 1e-6);
  assert.equal(calculateWeightOnBody(-5, earth), 0);
  assert.equal(calculateWeightOnBody(Number.NaN, earth), 0);

  assert.ok(Math.abs(calculateAgeOnBody(10, earth) - 10) < 1e-6);
  assert.ok(Math.abs(calculateAgeOnBody(10, mercury) - (3652.5 / 88)) < 1e-6);
  assert.equal(calculateAgeOnBody(10, sun), null);
  assert.equal(calculateAgeOnBody(-1, earth), null);
});

test('getOrbitalPosition keeps Sun at origin and points stay on Kepler ellipse', () => {
  const sun = SOLAR_BODIES.find((b) => b.id === 'sun');
  assert.deepEqual(getOrbitalPosition(sun, 500), { x: 0, y: 0, angleRad: 0 });

  for (const body of SOLAR_BODIES) {
    if (body.id === 'sun') continue;
    const { a, b, e, tilt } = getOrbitEllipseParams(body);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    for (const day of [0, 100, 1234, 15000]) {
      const pos = getOrbitalPosition(body, day);
      // หมุนย้อนกลับมาในกรอบวงรีของดาวดวงนี้
      const ux = pos.x * cosT + pos.y * sinT;
      const uy = -pos.x * sinT + pos.y * cosT;
      const lhs = ((ux + a * e) / a) ** 2 + (uy / b) ** 2;
      assert.ok(
        Math.abs(lhs - 1) < 1e-6,
        `${body.id} at day ${day} deviated from ellipse: ${lhs}`
      );
    }
  }
});

test('Comet tail angle always points directly away from Sun at (0, 0)', () => {
  const comet = SOLAR_BODIES.find((b) => b.id === 'comet');
  for (const day of [0, 500, 3000, 9000, 18000]) {
    const pos = getOrbitalPosition(comet, day);
    const angle = getCometTailAngle(pos.x, pos.y);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const dist = Math.hypot(pos.x, pos.y);
    const dot = dirX * pos.x + dirY * pos.y;
    assert.ok(Math.abs(dot - dist) < 1e-6, `Tail should point radially outward at day ${day}`);
  }
});

test('matchesFilter handles inner, outer, small, and all groups properly', () => {
  const sun = SOLAR_BODIES.find((b) => b.id === 'sun');
  const mars = SOLAR_BODIES.find((b) => b.id === 'mars');
  const saturn = SOLAR_BODIES.find((b) => b.id === 'saturn');
  const pluto = SOLAR_BODIES.find((b) => b.id === 'pluto');

  assert.equal(matchesFilter(mars, 'inner'), true);
  assert.equal(matchesFilter(saturn, 'inner'), false);
  assert.equal(matchesFilter(saturn, 'outer'), true);
  assert.equal(matchesFilter(pluto, 'small'), true);
  assert.equal(matchesFilter(sun, 'inner'), true);
  assert.equal(matchesFilter(mars, 'all'), true);
});

test('QUIZ_QUESTIONS are complete and well-formed', () => {
  assert.equal(QUIZ_QUESTIONS.length, 10);
  for (const q of QUIZ_QUESTIONS) {
    assert.ok(q.question.length > 0);
    assert.equal(q.options.length, 4);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    assert.ok(q.explanation.length > 0);
  }
});

test('3D orbital math preserves radial distance, inclination, and outward comet tail vector', () => {
  const earth = SOLAR_BODIES.find((b) => b.id === 'earth');
  const pluto = SOLAR_BODIES.find((b) => b.id === 'pluto');
  const comet = SOLAR_BODIES.find((b) => b.id === 'comet');

  // โลกอยู่ในระนาบสุริยวิถี (y = 0)
  const earthPos = getOrbitalPosition3D(earth, 200);
  assert.equal(earthPos.y, 0);

  // พลูโตและดาวหางต้องขยับขึ้นลงนอกระนาบ y = 0 และรักษาระยะรัศมี 3D เท่ากับ 2D
  const pluto2D = getOrbitalPosition(pluto, 20000);
  const pluto3D = getOrbitalPosition3D(pluto, 20000);
  assert.ok(Math.abs(pluto3D.y) > 1, 'Pluto should move out of ecliptic plane in 3D');
  const dist2D = Math.hypot(pluto2D.x, pluto2D.y);
  const dist3D = Math.hypot(pluto3D.x, pluto3D.y, pluto3D.z);
  assert.ok(Math.abs(dist2D - dist3D) < 1e-6);

  const curvePts = getOrbitalCurvePoints3D(comet, 120);
  assert.equal(curvePts.length, 121);

  const cometPos = getOrbitalPosition3D(comet, 3500);
  const dir = getCometTailDirection3D(cometPos.x, cometPos.y, cometPos.z);
  const mag = Math.hypot(dir.x, dir.y, dir.z);
  assert.ok(Math.abs(mag - 1) < 1e-6);
  const dot = dir.x * cometPos.x + dir.y * cometPos.y + dir.z * cometPos.z;
  assert.ok(dot > 0, '3D comet tail must point outward away from the Sun');
});

test('ASTEROID_BELT_INFO provides complete inspectable metadata and calculations', () => {
  assert.equal(ASTEROID_BELT_INFO.id, 'asteroid-belt');
  assert.ok(CATEGORY_META[ASTEROID_BELT_INFO.category]);
  assert.ok(ASTEROID_BELT_INFO.highlights.length >= 3);
  assert.equal(matchesFilter(ASTEROID_BELT_INFO, 'small'), true);
  assert.equal(matchesFilter(ASTEROID_BELT_INFO, 'inner'), false);
  assert.ok(calculateWeightOnBody(35, ASTEROID_BELT_INFO) > 0);
  assert.ok(calculateAgeOnBody(10, ASTEROID_BELT_INFO) > 1);
});
