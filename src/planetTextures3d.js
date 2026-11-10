(function (global) {
  'use strict';

  const THREE = global.THREE;

  function createSeededRandom(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // ==================== 3D Seamless Spherical Noise (Zero Seams) ====================

  function hash3(ix, iy, iz, seed) {
    let n = (ix * 374761393 + iy * 668265263 + iz * 1274126177 + seed * 1597334677) | 0;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return (n >>> 0) / 4294967295;
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function valueNoise3D(x, y, z, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = smoothstep(x - ix);
    const fy = smoothstep(y - iy);
    const fz = smoothstep(z - iz);

    const n000 = hash3(ix, iy, iz, seed);
    const n100 = hash3(ix + 1, iy, iz, seed);
    const n010 = hash3(ix, iy + 1, iz, seed);
    const n110 = hash3(ix + 1, iy + 1, iz, seed);
    const n001 = hash3(ix, iy, iz + 1, seed);
    const n101 = hash3(ix + 1, iy, iz + 1, seed);
    const n011 = hash3(ix, iy + 1, iz + 1, seed);
    const n111 = hash3(ix + 1, iy + 1, iz + 1, seed);

    const nx00 = lerp(n000, n100, fx);
    const nx10 = lerp(n010, n110, fx);
    const nx01 = lerp(n001, n101, fx);
    const nx11 = lerp(n011, n111, fx);

    const nxy0 = lerp(nx00, nx10, fy);
    const nxy1 = lerp(nx01, nx11, fy);

    return lerp(nxy0, nxy1, fz);
  }

  function fbm3(x, y, z, seed, octaves = 4) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      val += amp * valueNoise3D(x * freq, y * freq, z * freq, seed + i * 97);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return val / norm;
  }

  function createBufferCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    return { canvas, ctx, img, data: img.data };
  }

  function finalizeTexture(buf, isColor) {
    buf.ctx.putImageData(buf.img, 0, 0);
    const tex = new THREE.CanvasTexture(buf.canvas);
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  }

  function setPixel(data, idx, r, g, b, a = 255) {
    data[idx] = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    data[idx + 1] = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    data[idx + 2] = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    data[idx + 3] = a < 0 ? 0 : a > 255 ? 255 : a | 0;
  }

  /**
   * วนลูปพิกัดทรงกลม 3 มิติไร้รอยต่อสำหรับแผนที่พื้นผิวดาวเคราะห์
   */
  function forEachSpherePixel(w, h, fn) {
    for (let py = 0; py < h; py++) {
      const v = (py + 0.5) / h;
      const phi = v * Math.PI;
      const sinPhi = Math.sin(phi);
      const sy = Math.cos(phi);

      for (let px = 0; px < w; px++) {
        const u = (px + 0.5) / w;
        const theta = u * Math.PI * 2;
        const sx = sinPhi * Math.cos(theta);
        const sz = sinPhi * Math.sin(theta);
        const idx = (py * w + px) * 4;
        fn(idx, sx, sy, sz, u, v);
      }
    }
  }

  /**
   * สร้างชุด Texture สมจริงของโลก (สีพื้นผิว, ความนูน, ความเงาผิวน้ำ, ไฟเมืองกลางคืน, ชั้นเมฆ)
   */
  function buildEarthMaps() {
    const w = 512;
    const h = 256;
    const colorBuf = createBufferCanvas(w, h);
    const bumpBuf = createBufferCanvas(w, h);
    const roughBuf = createBufferCanvas(w, h);
    const nightBuf = createBufferCanvas(w, h);
    const cloudBuf = createBufferCanvas(w, h);

    forEachSpherePixel(w, h, (idx, sx, sy, sz) => {
      const lat = Math.abs(sy);
      // Domain warping ให้แนวชายฝั่งทวีปดูเป็นธรรมชาติ
      const wx = fbm3(sx * 2.2, sy * 2.2, sz * 2.2, 101, 3);
      const wy = fbm3(sx * 2.2 + 4.1, sy * 2.2, sz * 2.2, 202, 3);
      const elev = fbm3((sx + wx * 0.35) * 2.6, (sy + wy * 0.25) * 2.6, sz * 2.6, 303, 5);
      const detail = fbm3(sx * 9.5, sy * 9.5, sz * 9.5, 404, 3);

      const iceLine = 0.86 + (detail - 0.5) * 0.08;
      if (lat > iceLine) {
        // น้ำแข็งขั้วโลก
        setPixel(colorBuf.data, idx, 236, 244, 252);
        setPixel(bumpBuf.data, idx, 165, 165, 165);
        setPixel(roughBuf.data, idx, 210, 210, 210);
        setPixel(nightBuf.data, idx, 0, 0, 0);
      } else if (elev > 0.515) {
        // แผ่นดิน (ป่าไม้, ทุ่งหญ้า, ทะเลทรายเขตอบอุ่น, ยอดเขาหิมะ)
        const hNorm = clamp01((elev - 0.515) / 0.35);
        const arid = clamp01(1 - Math.abs(lat - 0.36) * 4.5) * clamp01((detail - 0.35) * 2.2);
        let r = lerp(42, 198, arid);
        let g = lerp(118, 164, arid);
        let b = lerp(64, 106, arid);

        if (hNorm > 0.62) {
          const rock = clamp01((hNorm - 0.62) / 0.38);
          r = lerp(r, 155, rock);
          g = lerp(g, 148, rock);
          b = lerp(b, 142, rock);
        }

        const shade = 0.85 + detail * 0.3;
        setPixel(colorBuf.data, idx, r * shade, g * shade, b * shade);
        const bumpVal = 135 + hNorm * 120;
        setPixel(bumpBuf.data, idx, bumpVal, bumpVal, bumpVal);
        setPixel(roughBuf.data, idx, 225, 225, 225);

        // แสงไฟเมืองตามแนวชายฝั่งและที่ราบ
        const coastFactor = clamp01(1 - Math.abs(elev - 0.54) * 14) * clamp01(1 - lat * 1.15);
        const cityCluster = fbm3(sx * 18, sy * 18, sz * 18, 707, 2);
        const cityGlow = cityCluster > 0.57 ? coastFactor * clamp01((cityCluster - 0.57) * 5.2) : 0;
        setPixel(nightBuf.data, idx, 255 * cityGlow, 198 * cityGlow, 105 * cityGlow);
      } else {
        // มหาสมุทร: น้ำตื้นชายฝั่งสีฟ้าใส -> น้ำลึกสีน้ำเงินเข้ม
        const depth = clamp01((0.515 - elev) / 0.25);
        const r = lerp(34, 9, depth);
        const g = lerp(138, 42, depth);
        const b = lerp(196, 118, depth);
        setPixel(colorBuf.data, idx, r, g, b);
        setPixel(bumpBuf.data, idx, 100, 100, 100);
        // น้ำทะเลสะท้อนแสงอาทิตย์แวววาว (Roughness ต่ำ)
        setPixel(roughBuf.data, idx, 56, 56, 56);
        setPixel(nightBuf.data, idx, 0, 0, 0);
      }

      // ชั้นเมฆพายุหมุน
      const swirl = fbm3(sx * 3.1, sy * 4.5, sz * 3.1, 808, 4);
      const cloudN = fbm3(sx * 4.5 + swirl * 0.65, sy * 5.2, sz * 4.5, 909, 4);
      const cloudAlpha = clamp01((cloudN - 0.49) * 4.2) * 235;
      setPixel(cloudBuf.data, idx, 248, 252, 255, cloudAlpha);
    });

    return {
      map: finalizeTexture(colorBuf, true),
      bumpMap: finalizeTexture(bumpBuf, false),
      roughnessMap: finalizeTexture(roughBuf, false),
      nightMap: finalizeTexture(nightBuf, true),
      cloudMap: finalizeTexture(cloudBuf, true)
    };
  }

  /**
   * สร้าง Texture ดาวเคราะห์หินมีหลุมอุกกาบาต (ดาวพุธ, ดวงจันทร์)
   */
  function buildCrateredMaps(seed, baseRgb, darkRgb) {
    const w = 384;
    const h = 192;
    const colorBuf = createBufferCanvas(w, h);
    const bumpBuf = createBufferCanvas(w, h);

    // สุ่มหลุมอุกกาบาต 3 มิติบนทรงกลม
    const rand = createSeededRandom(seed);
    const craters = [];
    for (let i = 0; i < 65; i++) {
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      craters.push({
        cx: Math.sin(ph) * Math.cos(th),
        cy: Math.cos(ph),
        cz: Math.sin(ph) * Math.sin(th),
        rad: 0.04 + rand() * 0.14
      });
    }

    forEachSpherePixel(w, h, (idx, sx, sy, sz) => {
      const n = fbm3(sx * 4.2, sy * 4.2, sz * 4.2, seed, 4);
      let craterDepth = 0;
      let rimBoost = 0;

      for (const c of craters) {
        const d = Math.hypot(sx - c.cx, sy - c.cy, sz - c.cz);
        if (d < c.rad) {
          const t = d / c.rad;
          if (t < 0.78) {
            craterDepth = Math.max(craterDepth, (1 - (t / 0.78) ** 2) * 0.55);
          } else {
            rimBoost = Math.max(rimBoost, Math.sin(((t - 0.78) / 0.22) * Math.PI) * 0.35);
          }
        }
      }

      const shade = clamp01(n + rimBoost - craterDepth * 0.5);
      const r = lerp(darkRgb[0], baseRgb[0], shade);
      const g = lerp(darkRgb[1], baseRgb[1], shade);
      const b = lerp(darkRgb[2], baseRgb[2], shade);
      setPixel(colorBuf.data, idx, r, g, b);

      const bump = clamp01(0.5 + (n - 0.5) * 0.4 + rimBoost - craterDepth) * 255;
      setPixel(bumpBuf.data, idx, bump, bump, bump);
    });

    return {
      map: finalizeTexture(colorBuf, true),
      bumpMap: finalizeTexture(bumpBuf, false)
    };
  }

  /**
   * สร้าง Texture ดาวอังคาร (ฝุ่นเหล็กสีแดง หุบเขาลึก และน้ำแข็งขั้วโลก)
   */
  function buildMarsMaps() {
    const w = 512;
    const h = 256;
    const colorBuf = createBufferCanvas(w, h);
    const bumpBuf = createBufferCanvas(w, h);

    forEachSpherePixel(w, h, (idx, sx, sy, sz) => {
      const lat = Math.abs(sy);
      const terrain = fbm3(sx * 3.1, sy * 3.1, sz * 3.1, 505, 5);
      const fine = fbm3(sx * 11, sy * 11, sz * 11, 606, 3);

      if (lat > 0.89 + (fine - 0.5) * 0.05) {
        setPixel(colorBuf.data, idx, 245, 248, 252);
        setPixel(bumpBuf.data, idx, 180, 180, 180);
      } else {
        const darkBasalt = clamp01((0.52 - terrain) * 3.2);
        const r = lerp(218, 118, darkBasalt) * (0.88 + fine * 0.24);
        const g = lerp(104, 48, darkBasalt) * (0.88 + fine * 0.24);
        const b = lerp(62, 34, darkBasalt) * (0.88 + fine * 0.24);
        setPixel(colorBuf.data, idx, r, g, b);
        const bump = clamp01(terrain * 0.7 + fine * 0.3) * 255;
        setPixel(bumpBuf.data, idx, bump, bump, bump);
      }
    });

    return {
      map: finalizeTexture(colorBuf, true),
      bumpMap: finalizeTexture(bumpBuf, false)
    };
  }

  /**
   * สร้าง Texture ดาวเคราะห์แก๊สและน้ำแข็งยักษ์ (แถบพายุหมุนเกลียว FBM)
   */
  function buildGasGiantMap(body) {
    const w = 512;
    const h = 256;
    const buf = createBufferCanvas(w, h);

    const palettes = {
      venus: [
        [192, 134, 62],
        [235, 194, 128],
        [248, 224, 178],
        [214, 162, 92]
      ],
      jupiter: [
        [218, 176, 136],
        [168, 94, 56],
        [244, 228, 204],
        [196, 126, 84],
        [236, 206, 172],
        [148, 76, 44],
        [245, 229, 207]
      ],
      saturn: [
        [204, 168, 108],
        [236, 209, 154],
        [246, 226, 182],
        [186, 146, 88],
        [228, 196, 142]
      ],
      uranus: [
        [135, 232, 245],
        [102, 212, 232],
        [172, 244, 252]
      ],
      neptune: [
        [28, 64, 178],
        [46, 98, 226],
        [34, 78, 198],
        [68, 132, 248]
      ]
    };

    const stops = palettes[body.id] || palettes.saturn;

    forEachSpherePixel(w, h, (idx, sx, sy, sz, u, v) => {
      const turb = fbm3(sx * 4.5, sy * 7.5, sz * 4.5, body.order * 137 + 19, 4);
      const eddy = fbm3(sx * 10, sy * 16, sz * 10, body.order * 251 + 7, 3);

      const bandScale = body.id === 'jupiter' ? 7.5 : body.id === 'saturn' ? 6.0 : 3.2;
      const warpedY = clamp01(v + (turb - 0.5) * (body.id === 'venus' ? 0.24 : 0.085) + (eddy - 0.5) * 0.03);
      const pos = warpedY * bandScale * (stops.length - 1) * 0.22;
      const baseIdx = Math.floor(pos) % stops.length;
      const nextIdx = (baseIdx + 1) % stops.length;
      const frac = smoothstep(pos - Math.floor(pos));

      let r = lerp(stops[baseIdx][0], stops[nextIdx][0], frac);
      let g = lerp(stops[baseIdx][1], stops[nextIdx][1], frac);
      let b = lerp(stops[baseIdx][2], stops[nextIdx][2], frac);

      // จุดแดงใหญ่บนดาวพฤหัสบดี (Great Red Spot) พร้อมวงวนพายุ
      if (body.id === 'jupiter') {
        const du = (u - 0.62) * 1.4;
        const dv = (v - 0.64) * 3.1;
        const dSpot = Math.hypot(du, dv);
        if (dSpot < 0.14) {
          const tSpot = 1 - dSpot / 0.14;
          const swirl = Math.sin(dSpot * 58 + turb * 6) * 0.15;
          r = lerp(r, 206 + swirl * 40, smoothstep(tSpot));
          g = lerp(g, 76 + swirl * 20, smoothstep(tSpot));
          b = lerp(b, 48, smoothstep(tSpot));
        }
      }

      // แถบเมฆขาวจางๆ ของดาวเนปจูน
      if (body.id === 'neptune' && eddy > 0.66) {
        const wisp = clamp01((eddy - 0.66) * 3.5);
        r = lerp(r, 215, wisp * 0.65);
        g = lerp(g, 235, wisp * 0.65);
        b = lerp(b, 255, wisp * 0.65);
      }

      const micro = 0.92 + eddy * 0.16;
      setPixel(buf.data, idx, r * micro, g * micro, b * micro);
    });

    return { map: finalizeTexture(buf, true) };
  }

  /**
   * สร้าง Texture ดาวพลูโต (น้ำแข็งไนโตรเจนและพื้นที่รูปหัวใจ)
   */
  function buildPlutoMaps() {
    const w = 384;
    const h = 192;
    const colorBuf = createBufferCanvas(w, h);
    const bumpBuf = createBufferCanvas(w, h);

    forEachSpherePixel(w, h, (idx, sx, sy, sz, u, v) => {
      const n = fbm3(sx * 3.8, sy * 3.8, sz * 3.8, 919, 4);
      let r = lerp(132, 208, n);
      let g = lerp(104, 182, n);
      let b = lerp(88, 158, n);

      // แอ่งน้ำแข็ง Tombaugh Regio
      const dHeart = Math.hypot((u - 0.5) * 1.6, (v - 0.5) * 2.2);
      if (dHeart < 0.24) {
        const t = smoothstep(1 - dHeart / 0.24);
        r = lerp(r, 242, t * 0.82);
        g = lerp(g, 232, t * 0.82);
        b = lerp(b, 220, t * 0.82);
      }

      setPixel(colorBuf.data, idx, r, g, b);
      const bump = clamp01(n) * 255;
      setPixel(bumpBuf.data, idx, bump, bump, bump);
    });

    return {
      map: finalizeTexture(colorBuf, true),
      bumpMap: finalizeTexture(bumpBuf, false)
    };
  }

  function createPlanetMaps(body) {
    if (body.id === 'earth') return buildEarthMaps();
    if (body.id === 'mercury') return buildCrateredMaps(111, [182, 184, 188], [86, 88, 94]);
    if (body.id === 'mars') return buildMarsMaps();
    if (body.id === 'pluto') return buildPlutoMaps();
    if (body.id === 'venus' || body.id === 'jupiter' || body.id === 'saturn' || body.id === 'uranus' || body.id === 'neptune') {
      return buildGasGiantMap(body);
    }
    return { map: null };
  }

  function createMoonMaps() {
    return buildCrateredMaps(333, [224, 226, 230], [116, 120, 128]);
  }

  // ==================== Shaders (Sun Plasma, Atmosphere Fresnel, Saturn Ring Shadow, Earth Night) ====================

  function createSunPlasmaMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vObjPos;
        varying vec3 vViewDir;
        void main() {
          vObjPos = normalize(position);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vObjPos;
        varying vec3 vViewDir;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }

        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = p * 2.04 + vec3(1.7, 9.2, 4.3);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 p = vObjPos * 4.6 + vec3(uTime * 0.08, -uTime * 0.05, uTime * 0.06);
          float q = fbm(p);
          float cells = fbm(p * 1.8 + vec3(q * 2.1) - vec3(uTime * 0.07));
          float heat = clamp(cells * 1.18 + 0.1, 0.0, 1.0);

          vec3 sunspotCol = vec3(0.75, 0.18, 0.02);
          vec3 plasmaOrange = vec3(1.0, 0.52, 0.06);
          vec3 plasmaYellow = vec3(1.0, 0.88, 0.36);
          vec3 plasmaWhite = vec3(1.0, 0.99, 0.88);

          vec3 col = mix(sunspotCol, plasmaOrange, smoothstep(0.22, 0.52, heat));
          col = mix(col, plasmaYellow, smoothstep(0.48, 0.78, heat));
          col = mix(col, plasmaWhite, smoothstep(0.78, 0.98, heat));

          // Limb darkening + ขอบเปลวสว่าง
          float ndv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
          float limb = pow(ndv, 0.38);
          col *= mix(0.68, 1.15, limb);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
  }

  function createAtmosphereMaterial(hexColor, intensity = 0.75, power = 3.6) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(hexColor) },
        uIntensity: { value: intensity },
        uPower: { value: power },
        uOpacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uPower;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          // บนทรงกลม BackSide ค่า -dot จะเป็น 0 ที่ขอบนอกสุดพอดี และเพิ่มขึ้นเข้าหาขอบผิวดาว
          float rim = pow(max(0.0, -dot(normalize(vNormal), normalize(vViewDir))), uPower);
          gl_FragColor = vec4(uColor, clamp(rim * uIntensity * uOpacity, 0.0, 1.0));
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
  }

  function createEarthNightLightsMaterial(nightMap) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uNightMap: { value: nightMap },
        uOpacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uNightMap;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 toSun = normalize(-vWorldPos);
          float ndl = dot(normalize(vWorldNormal), toSun);
          // สว่างเฉพาะฝั่งกลางคืนของโลก (หันหนีจากดวงอาทิตย์)
          float nightMask = smoothstep(0.12, -0.25, ndl);
          vec3 lights = texture2D(uNightMap, vUv).rgb * 1.45;
          gl_FragColor = vec4(lights * nightMask, nightMask * uOpacity);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
  }

  /**
   * วัสดุวงแหวนดาวเสาร์ที่คำนวณเงามืดของตัวดาวพาดบนวงแหวนแบบ Real-time Analytic Shadow
   */
  function createSaturnRingShadowMaterial(ringTex, planetRadius) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uRingTex: { value: ringTex },
        uPlanetPos: { value: new THREE.Vector3() },
        uPlanetRadius: { value: planetRadius },
        uOpacity: { value: 0.94 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uRingTex;
        uniform vec3 uPlanetPos;
        uniform float uPlanetRadius;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vec4 tex = texture2D(uRingTex, vUv);
          if (tex.a < 0.02) discard;

          // ทดสอบว่าลำแสงจากจุดบนวงแหวนไปยังดวงอาทิตย์ (0,0,0) ถูกทรงกลมดาวเสาร์บังหรือไม่
          vec3 ro = vWorldPos - uPlanetPos;
          vec3 rd = normalize(-vWorldPos);
          float b = dot(ro, rd);
          float c = dot(ro, ro) - uPlanetRadius * uPlanetRadius;
          float h = b * b - c;

          float shadow = 1.0;
          // b < 0 หมายถึงตัวดาวเสาร์อยู่คั่นระหว่างจุดบนวงแหวนกับดวงอาทิตย์
          if (b < 0.0 && h > -uPlanetRadius) {
            float penumbra = smoothstep(-uPlanetRadius, uPlanetRadius, h);
            shadow = mix(1.0, 0.12, penumbra);
          }

          gl_FragColor = vec4(tex.rgb * shadow, tex.a * uOpacity);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false
    });
  }

  global.SolarTextures3D = {
    createSeededRandom,
    createPlanetMaps,
    createMoonMaps,
    createSunPlasmaMaterial,
    createAtmosphereMaterial,
    createEarthNightLightsMaterial,
    createSaturnRingShadowMaterial
  };
})(typeof window !== 'undefined' ? window : globalThis);
