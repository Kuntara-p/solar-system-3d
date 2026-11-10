(function (global) {
  'use strict';

  const THREE = global.THREE;
  const {
    SOLAR_BODIES,
    ASTEROID_BELT_INFO,
    getOrbitalPosition3D,
    getOrbitalCurvePoints3D,
    getCometTailDirection3D,
    matchesFilter
  } = global.SolarData;

  const {
    createSeededRandom,
    createPlanetMaps,
    createMoonMaps,
    createSunPlasmaMaterial,
    createAtmosphereMaterial,
    createEarthNightLightsMaterial,
    createSaturnRingShadowMaterial
  } = global.SolarTextures3D;

  /**
   * สร้าง Texture วงแหวนดาวเสาร์ตามแนวรัศมี (u = 0 ขอบใน -> u = 1 ขอบนอก)
   */
  function createSaturnRingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(180, 150, 100, 0)');
    grad.addColorStop(0.12, 'rgba(210, 180, 128, 0.55)');
    grad.addColorStop(0.35, 'rgba(244, 224, 180, 0.88)');
    grad.addColorStop(0.56, 'rgba(222, 190, 134, 0.82)');
    grad.addColorStop(0.62, 'rgba(30, 30, 40, 0.14)'); // ช่องว่างแคสสินี
    grad.addColorStop(0.67, 'rgba(235, 206, 152, 0.78)');
    grad.addColorStop(0.88, 'rgba(215, 185, 135, 0.5)');
    grad.addColorStop(1, 'rgba(200, 170, 120, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 16);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * สร้าง Texture แสงฟุ้งวงกลมสำหรับ Corona ดวงอาทิตย์และโคม่าดาวหาง
   */
  function createRadialGlowTexture(innerColor, midColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.35, midColor);
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * สร้าง Texture ไล่ระดับความโปร่งใสสำหรับหางดาวหาง 3 มิติ (สว่างที่หัว -> จางหายที่ปลาย)
   */
  function createCometTailGradientTexture(headColor, tailColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    // ใน ConeGeometry หลัง rotateX(PI): UV v=0 คือปลายบาน, v=1 คือยอดแหลมที่หัวดาวหาง
    grad.addColorStop(0, tailColor);
    grad.addColorStop(0.55, headColor);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createEngine({ canvas3d, labelCanvas, onSelectBody, onHoverBody }) {
    if (!THREE || !THREE.WebGLRenderer) {
      return { supported: false };
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas3d,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch {
      return { supported: false };
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040713');

    const camera = new THREE.PerspectiveCamera(45, 1, 1, 9000);
    camera.position.set(0, 380, 740);

    const controls = new THREE.OrbitControls(camera, canvas3d);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 24;
    controls.maxDistance = 2400;
    controls.target.set(0, -25, 0);

    // แสงสว่าง: Ambient พอเหมาะให้เห็นสีพื้นผิวชัดเจน + PointLight ที่ดวงอาทิตย์สำหรับเงากลางวัน-กลางคืน
    const ambientLight = new THREE.AmbientLight('#94a3b8', 1.25);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight('#fff6db', 3.2, 0, 0);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const roundDotTex = createRadialGlowTexture(
      'rgba(255, 255, 255, 1)',
      'rgba(255, 255, 255, 0.7)',
      'rgba(255, 255, 255, 0)'
    );

    // 1. ท้องฟ้าดวงดาว 3 มิติ (Starfield Sphere)
    const starRand = createSeededRandom(20261110);
    const starCount = 1300;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPalette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#dbeafe'),
      new THREE.Color('#fef3c7'),
      new THREE.Color('#e0f2fe')
    ];

    for (let i = 0; i < starCount; i++) {
      const theta = starRand() * Math.PI * 2;
      const phi = Math.acos(2 * starRand() - 1);
      const radius = 2400 + starRand() * 1400;
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const col = starPalette[Math.floor(starRand() * starPalette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    const starPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 8.5,
        map: roundDotTex,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      })
    );
    scene.add(starPoints);

    // 2. แถบดาวเคราะห์น้อย 3 มิติด้วยก้อนหินทรงเหลี่ยม (InstancedMesh 460 ก้อนหมุนคว้างจริง)
    const astRand = createSeededRandom(424242);
    const astCount = 460;
    const astBase = [];
    const { innerOrbitPx, outerOrbitPx } = ASTEROID_BELT_INFO;

    for (let i = 0; i < astCount; i++) {
      const r = innerOrbitPx + astRand() * (outerOrbitPx - innerOrbitPx);
      const ang = astRand() * Math.PI * 2;
      const y = (astRand() - 0.5) * 14;
      const periodDays = 1250 + ((r - innerOrbitPx) / (outerOrbitPx - innerOrbitPx)) * 750;
      const baseScale = 0.85 + astRand() * 1.45;
      astBase.push({
        r,
        ang,
        y,
        periodDays,
        sx: baseScale * (0.75 + astRand() * 0.6),
        sy: baseScale * (0.65 + astRand() * 0.55),
        sz: baseScale * (0.75 + astRand() * 0.6),
        spinX: (astRand() - 0.5) * 0.8,
        spinY: (astRand() - 0.5) * 1.1,
        phase: astRand() * Math.PI * 2
      });
    }

    const astRockGeo = new THREE.IcosahedronGeometry(1, 0);
    const astRockMat = new THREE.MeshStandardMaterial({
      color: '#b8b0a6',
      emissive: '#334155',
      emissiveIntensity: 0.18,
      roughness: 0.92,
      metalness: 0.08,
      transparent: true,
      opacity: 0.95
    });
    const asteroidMesh = new THREE.InstancedMesh(astRockGeo, astRockMat, astCount);
    scene.add(asteroidMesh);

    const astMatrix = new THREE.Matrix4();
    const astPosVec = new THREE.Vector3();
    const astScaleVec = new THREE.Vector3();
    const astEuler = new THREE.Euler();
    const astQuat = new THREE.Quaternion();

    // แถบไฮไลต์และตัวตรวจจับการคลิกของแถบดาวเคราะห์น้อยใน 3 มิติ
    const beltHighlightRing = new THREE.Mesh(
      new THREE.RingGeometry(innerOrbitPx, outerOrbitPx, 96, 1),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    beltHighlightRing.rotation.x = Math.PI / 2;
    beltHighlightRing.visible = false;
    scene.add(beltHighlightRing);

    const makeBeltBoundaryLine = (rad) => {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(rad * Math.cos(a), 0, rad * Math.sin(a)));
      }
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.75 })
      );
      line.visible = false;
      scene.add(line);
      return line;
    };
    const beltInnerLine = makeBeltBoundaryLine(innerOrbitPx);
    const beltOuterLine = makeBeltBoundaryLine(outerOrbitPx);

    const beltHitMesh = new THREE.Mesh(
      new THREE.RingGeometry(innerOrbitPx - 8, outerOrbitPx + 8, 72, 1),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false })
    );
    beltHitMesh.rotation.x = Math.PI / 2;
    beltHitMesh.userData.bodyId = ASTEROID_BELT_INFO.id;
    scene.add(beltHitMesh);

    // 3. วัตถุในระบบสุริยะ 3 มิติ
    const bodyEntries = new Map();
    const orbitEntries = new Map();
    const hitMeshes = [];

    const sunGlowTex = createRadialGlowTexture(
      'rgba(255, 248, 210, 0.95)',
      'rgba(255, 162, 0, 0.45)',
      'rgba(255, 100, 0, 0)'
    );
    const cometGlowTex = createRadialGlowTexture(
      'rgba(255, 255, 255, 0.95)',
      'rgba(120, 240, 245, 0.6)',
      'rgba(120, 240, 245, 0)'
    );
    const saturnRingTex = createSaturnRingTexture();
    const moonMaps = createMoonMaps();
    const ionTailTex = createCometTailGradientTexture('rgba(103, 232, 249, 0.55)', 'rgba(56, 189, 248, 0)');
    const dustTailTex = createCometTailGradientTexture('rgba(254, 240, 138, 0.35)', 'rgba(253, 224, 71, 0)');

    const atmoConfigs = {
      venus: { color: '#fbbf24', intensity: 2.3, power: 2.5, scale: 1.15 },
      earth: { color: '#38bdf8', intensity: 2.8, power: 2.5, scale: 1.16 },
      mars: { color: '#fb923c', intensity: 1.65, power: 2.7, scale: 1.13 },
      jupiter: { color: '#f59e0b', intensity: 1.15, power: 2.9, scale: 1.1 },
      saturn: { color: '#fde68a', intensity: 1.05, power: 2.9, scale: 1.1 },
      uranus: { color: '#67e8f9', intensity: 1.5, power: 2.7, scale: 1.12 },
      neptune: { color: '#60a5fa', intensity: 1.85, power: 2.7, scale: 1.13 }
    };

    for (const body of SOLAR_BODIES) {
      const anchor = new THREE.Group();
      scene.add(anchor);

      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = ((body.axialTiltDeg || 0) * Math.PI) / 180;
      anchor.add(tiltGroup);

      const r = body.visualRadiusPx;
      const sphereGeo = new THREE.SphereGeometry(r, body.id === 'sun' ? 48 : 44, 32);

      let material;
      let sunMat = null;
      let cloudMesh = null;
      let nightMat = null;
      let atmoMat = null;
      let saturnRingMat = null;

      if (body.id === 'sun') {
        sunMat = createSunPlasmaMaterial();
        material = sunMat;
      } else {
        const maps = createPlanetMaps(body);
        const stdOpts = {
          roughness: body.id === 'earth' ? 0.92 : 0.82,
          metalness: body.id === 'earth' ? 0.08 : 0.03,
          transparent: true,
          opacity: 1
        };
        if (maps.map) {
          stdOpts.map = maps.map;
          stdOpts.emissive = new THREE.Color('#ffffff');
          stdOpts.emissiveMap = maps.map;
          stdOpts.emissiveIntensity = body.id === 'earth' ? 0.12 : 0.15;
        } else {
          stdOpts.color = body.color;
        }
        if (maps.bumpMap) {
          stdOpts.bumpMap = maps.bumpMap;
          stdOpts.bumpScale = body.id === 'mercury' ? 0.65 : 0.42;
        }
        if (maps.roughnessMap) {
          stdOpts.roughnessMap = maps.roughnessMap;
        }
        material = new THREE.MeshStandardMaterial(stdOpts);

        // ชั้นเพิ่มเติมสำหรับโลก: ไฟเมืองฝั่งกลางคืน + ชั้นเมฆหมุนแยก
        if (body.id === 'earth' && maps.nightMap && maps.cloudMap) {
          nightMat = createEarthNightLightsMaterial(maps.nightMap);
          const nightMesh = new THREE.Mesh(new THREE.SphereGeometry(r * 1.004, 44, 32), nightMat);
          // ผูกไว้กับ planetMesh หลังสร้างเพื่อให้แสงไฟเมืองหมุนไปกับทวีป
          tiltGroup.userData.pendingNightMesh = nightMesh;

          cloudMesh = new THREE.Mesh(
            new THREE.SphereGeometry(r * 1.024, 44, 32),
            new THREE.MeshStandardMaterial({
              map: maps.cloudMap,
              transparent: true,
              opacity: 0.88,
              roughness: 0.95,
              depthWrite: false
            })
          );
          tiltGroup.add(cloudMesh);
        }

        // ขอบบรรยากาศเรืองแสง Fresnel
        if (atmoConfigs[body.id]) {
          const cfg = atmoConfigs[body.id];
          atmoMat = createAtmosphereMaterial(cfg.color, cfg.intensity, cfg.power);
          const atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(r * cfg.scale, 36, 24), atmoMat);
          tiltGroup.add(atmoMesh);
        }
      }

      const planetMesh = new THREE.Mesh(sphereGeo, material);
      if (tiltGroup.userData.pendingNightMesh) {
        planetMesh.add(tiltGroup.userData.pendingNightMesh);
        delete tiltGroup.userData.pendingNightMesh;
      }
      tiltGroup.add(planetMesh);

      // แกนหมุน (Axis Rod) สำหรับแสดงความเอียงแกนดาวเคราะห์ใน 3 มิติ
      let axisRod = null;
      if (body.id !== 'sun' && !body.isComet) {
        const rodLen = r * 3.1;
        const rodGeo = new THREE.CylinderGeometry(0.28, 0.28, rodLen, 8);
        const rodMat = new THREE.MeshBasicMaterial({
          color: body.id === 'uranus' ? '#7dd3fc' : '#f8fafc',
          transparent: true,
          opacity: 0.65
        });
        axisRod = new THREE.Mesh(rodGeo, rodMat);
        tiltGroup.add(axisRod);
      }

      // องค์ประกอบพิเศษเฉพาะดาว
      let sunSprite = null;
      if (body.id === 'sun') {
        sunSprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: sunGlowTex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
          })
        );
        sunSprite.scale.set(r * 4.2, r * 4.2, 1);
        anchor.add(sunSprite);
      }

      if (body.hasRings) {
        const innerR = r * 1.35;
        const outerR = r * 2.38;
        const ringGeo = new THREE.RingGeometry(innerR, outerR, 96, 1);
        const posAttr = ringGeo.attributes.position;
        const uvAttr = ringGeo.attributes.uv;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
          v3.fromBufferAttribute(posAttr, i);
          const rad = v3.length();
          uvAttr.setXY(i, (rad - innerR) / (outerR - innerR), 0.5);
        }
        saturnRingMat = createSaturnRingShadowMaterial(saturnRingTex, r * 0.96);
        const ringMesh = new THREE.Mesh(ringGeo, saturnRingMat);
        ringMesh.rotation.x = Math.PI / 2;
        tiltGroup.add(ringMesh);
      }

      if (body.hasVerticalRing) {
        const ringGeo = new THREE.RingGeometry(r * 1.45, r * 1.68, 64, 1);
        const ringMat = new THREE.MeshBasicMaterial({
          color: '#bae6fd',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.42
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        tiltGroup.add(ringMesh);
      }

      // ดวงจันทร์บริวารของโลก
      let moonMesh = null;
      let moonOrbitRadius = 0;
      if (body.hasMoon) {
        moonOrbitRadius = r * 2.3;
        const moonOrbitPts = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          moonOrbitPts.push(new THREE.Vector3(moonOrbitRadius * Math.cos(a), 0, moonOrbitRadius * Math.sin(a)));
        }
        const moonOrbitLine = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(moonOrbitPts),
          new THREE.LineBasicMaterial({ color: '#94a3b8', transparent: true, opacity: 0.3 })
        );
        anchor.add(moonOrbitLine);

        moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(Math.max(2.3, r * 0.27), 24, 18),
          new THREE.MeshStandardMaterial({
            map: moonMaps.map,
            bumpMap: moonMaps.bumpMap,
            bumpScale: 0.45,
            roughness: 0.92
          })
        );
        anchor.add(moonMesh);
      }

      // หางดาวหาง 3 มิติ (2 ชั้น: หางไอออนสีฟ้า + หางฝุ่นสีทองขาว)
      let cometTailGroup = null;
      if (body.isComet) {
        const coma = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: cometGlowTex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
          })
        );
        coma.scale.set(r * 5, r * 5, 1);
        anchor.add(coma);

        cometTailGroup = new THREE.Group();
        anchor.add(cometTailGroup);

        // ConeGeometry ปลายชี้ไป +Y จากจุดกำเนิด เราจึงขยับฐานมาที่ (0, len/2, 0) แล้วหมุนให้ชี้จากหัวไปหาง
        const ionGeo = new THREE.ConeGeometry(r * 1.15, 1, 16, 1, true);
        ionGeo.translate(0, -0.5, 0);
        ionGeo.rotateX(Math.PI); // ฐาน/ยอด: ยอดแคบอยู่ที่ origin (0,0,0), บานออกทาง +Y
        const ionTail = new THREE.Mesh(
          ionGeo,
          new THREE.MeshBasicMaterial({
            map: ionTailTex,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        cometTailGroup.add(ionTail);

        const dustGeo = new THREE.ConeGeometry(r * 2.1, 0.85, 16, 1, true);
        dustGeo.translate(0, -0.425, 0);
        dustGeo.rotateX(Math.PI);
        const dustTail = new THREE.Mesh(
          dustGeo,
          new THREE.MeshBasicMaterial({
            map: dustTailTex,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        dustTail.rotation.z = 0.08;
        cometTailGroup.add(dustTail);
      }

      // วงแหวนเป้าชี้เมื่อถูกเลือก (Selection Torus)
      const selectRadius = body.hasRings ? r * 2.65 : r + 5;
      const selectRing = new THREE.Mesh(
        new THREE.TorusGeometry(selectRadius, 0.42, 8, 56),
        new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.88 })
      );
      selectRing.rotation.x = Math.PI / 2;
      selectRing.visible = false;
      anchor.add(selectRing);

      // Hit Mesh โปร่งใสขนาดใหญ่กว่าตัวดาวเล็กน้อยเพื่อให้คลิกง่ายใน 3D
      const hitMesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(12, r * 1.45), 12, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.userData.bodyId = body.id;
      anchor.add(hitMesh);
      hitMeshes.push(hitMesh);

      bodyEntries.set(body.id, {
        body,
        anchor,
        tiltGroup,
        planetMesh,
        material,
        sunMat,
        cloudMesh,
        nightMat,
        atmoMat,
        saturnRingMat,
        axisRod,
        sunSprite,
        moonMesh,
        moonOrbitRadius,
        cometTailGroup,
        selectRing,
        currentPos: new THREE.Vector3()
      });

      // เส้นวงโคจร 3 มิติ
      if (body.orbitRadiusPx > 0) {
        const pts = getOrbitalCurvePoints3D(body, 180).map((p) => new THREE.Vector3(p.x, p.y, p.z));
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const orbitMat = new THREE.LineBasicMaterial({
          color: body.isOptionalExtra ? '#94a3b8' : '#64748b',
          transparent: true,
          opacity: 0.35
        });
        const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
        scene.add(orbitLine);
        orbitEntries.set(body.id, { line: orbitLine, material: orbitMat, body });
      }
    }

    // Raycasting สำหรับ Hover & Click
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let isPointerDown = false;
    let width = 800;
    let height = 600;
    let lastSelectedFollowId = null;
    let prevTrackedPos = new THREE.Vector3();
    let cameraFlyGoal = null;

    function updateNdc(clientX, clientY) {
      const rect = canvas3d.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pickBodyAt(clientX, clientY) {
      updateNdc(clientX, clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const visibleHits = hitMeshes.filter((m) => {
        const entry = bodyEntries.get(m.userData.bodyId);
        return entry && entry.anchor.visible;
      });
      if (asteroidMesh.visible) {
        visibleHits.push(beltHitMesh);
      }
      const hits = raycaster.intersectObjects(visibleHits, false);
      if (hits.length === 0) return null;
      // ให้ความสำคัญกับตัวดาวเคราะห์/ดวงอาทิตย์ก่อน หากคลิกไม่โดนดาวจึงเลือกแถบดาวเคราะห์น้อย
      const nonBelt = hits.find((h) => h.object.userData.bodyId !== ASTEROID_BELT_INFO.id);
      return nonBelt ? nonBelt.object.userData.bodyId : hits[0].object.userData.bodyId;
    }

    const onPointerDown = (e) => {
      isPointerDown = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      // ยกเลิกอนิเมชันบินกล้องอัตโนมัติเมื่อผู้ใช้จับหมุนเอง
      cameraFlyGoal = null;
    };

    const onPointerMove = (e) => {
      if (isPointerDown) return;
      const bodyId = pickBodyAt(e.clientX, e.clientY);
      canvas3d.style.cursor = bodyId ? 'pointer' : 'grab';
      if (onHoverBody) onHoverBody(bodyId, e.clientX, e.clientY);
    };

    const onPointerUp = (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 6) {
        const bodyId = pickBodyAt(e.clientX, e.clientY);
        if (bodyId && onSelectBody) {
          onSelectBody(bodyId);
        }
      }
    };

    const onPointerLeave = () => {
      isPointerDown = false;
      if (onHoverBody) onHoverBody(null, 0, 0);
    };

    canvas3d.addEventListener('pointerdown', onPointerDown);
    canvas3d.addEventListener('pointermove', onPointerMove);
    canvas3d.addEventListener('pointerup', onPointerUp);
    canvas3d.addEventListener('pointerleave', onPointerLeave);

    function resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);

      labelCanvas.width = Math.round(width * dpr);
      labelCanvas.height = Math.round(height * dpr);
      const lctx = labelCanvas.getContext('2d');
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setCameraPreset(preset, immediate = false) {
      lastSelectedFollowId = null;
      let goal;
      if (preset === 'top') {
        goal = {
          pos: new THREE.Vector3(0, 1080, 45),
          target: new THREE.Vector3(0, 0, 0)
        };
      } else if (preset === 'side') {
        goal = {
          pos: new THREE.Vector3(0, 40, 900),
          target: new THREE.Vector3(0, -15, 0)
        };
      } else {
        goal = {
          pos: new THREE.Vector3(0, 380, 740),
          target: new THREE.Vector3(0, -25, 0)
        };
      }

      if (immediate) {
        camera.position.copy(goal.pos);
        controls.target.copy(goal.target);
        controls.update();
        cameraFlyGoal = null;
      } else {
        cameraFlyGoal = goal;
      }
    }

    function focusBody(bodyId, elapsedDays) {
      if (bodyId === ASTEROID_BELT_INFO.id) {
        lastSelectedFollowId = null;
        cameraFlyGoal = {
          pos: new THREE.Vector3(0, 390, 410),
          target: new THREE.Vector3(0, -15, 0)
        };
        return;
      }

      const entry = bodyEntries.get(bodyId);
      if (!entry) return;
      const p = getOrbitalPosition3D(entry.body, elapsedDays);
      const targetVec = new THREE.Vector3(p.x, p.y, p.z);
      const offsetDist = entry.body.id === 'sun'
        ? 220
        : entry.body.hasRings
          ? Math.max(85, entry.body.visualRadiusPx * 5.8)
          : Math.max(58, entry.body.visualRadiusPx * 5.2);
      cameraFlyGoal = {
        bodyId,
        pos: targetVec.clone().add(new THREE.Vector3(offsetDist * 0.65, offsetDist * 0.68, offsetDist * 0.92)),
        target: targetVec
      };
      prevTrackedPos.copy(targetVec);
      lastSelectedFollowId = bodyId;
    }

    function zoomBy(factor) {
      cameraFlyGoal = null;
      const dir = camera.position.clone().sub(controls.target);
      const dist = dir.length();
      const newDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, dist / factor));
      dir.setLength(newDist);
      camera.position.copy(controls.target).add(dir);
    }

    const upVec = new THREE.Vector3(0, 1, 0);
    const projVec = new THREE.Vector3();

    function renderFrame(state) {
      const {
        elapsedDays,
        animTimeSec,
        selectedId,
        hoveredId,
        followSelected,
        filterGroup,
        showOrbits,
        showLabels,
        showAsteroids,
        showExtras,
        showAxes3D
      } = state;

      // 1. อัปเดตตำแหน่งและมุมหมุนของก้อนหิน 3 มิติในแถบดาวเคราะห์น้อย
      const isBeltSelected = selectedId === ASTEROID_BELT_INFO.id;
      const isBeltHovered = hoveredId === ASTEROID_BELT_INFO.id;
      const isBeltMatch = matchesFilter(ASTEROID_BELT_INFO, filterGroup);
      asteroidMesh.visible = showAsteroids;
      beltHighlightRing.visible = showAsteroids && (isBeltSelected || isBeltHovered);
      beltInnerLine.visible = beltHighlightRing.visible;
      beltOuterLine.visible = beltHighlightRing.visible;

      const labelQueue = [];

      if (showAsteroids) {
        for (let i = 0; i < astCount; i++) {
          const rock = astBase[i];
          const ang = rock.ang - (elapsedDays / rock.periodDays) * Math.PI * 2;
          astPosVec.set(rock.r * Math.cos(ang), rock.y, rock.r * Math.sin(ang));
          astEuler.set(
            rock.phase + animTimeSec * rock.spinX,
            rock.phase + animTimeSec * rock.spinY,
            rock.phase * 0.5
          );
          astQuat.setFromEuler(astEuler);
          astScaleVec.set(rock.sx, rock.sy, rock.sz);
          astMatrix.compose(astPosVec, astQuat, astScaleVec);
          asteroidMesh.setMatrixAt(i, astMatrix);
        }
        asteroidMesh.instanceMatrix.needsUpdate = true;
        astRockMat.color.set(isBeltSelected ? '#7dd3fc' : '#b8b0a6');
        astRockMat.opacity = isBeltSelected || isBeltHovered ? 1 : !isBeltMatch ? 0.18 : 0.95;

        if (beltHighlightRing.visible) {
          const hlColor = isBeltSelected ? '#38bdf8' : '#e2e8f0';
          beltHighlightRing.material.color.set(hlColor);
          beltHighlightRing.material.opacity = isBeltSelected ? 0.18 : 0.1;
          beltInnerLine.material.color.set(hlColor);
          beltOuterLine.material.color.set(hlColor);
        }

        if (showLabels && (isBeltMatch || isBeltSelected || isBeltHovered)) {
          labelQueue.push({
            body: ASTEROID_BELT_INFO,
            worldPos: new THREE.Vector3(0, 8, -outerOrbitPx),
            isSelected: isBeltSelected,
            isHovered: isBeltHovered
          });
        }
      }

      // 2. อัปเดตตำแหน่ง/การหมุนรอบตัวเองของดาวทุกดวงและเส้นวงโคจร
      for (const [id, entry] of bodyEntries) {
        const {
          body,
          anchor,
          planetMesh,
          material,
          sunMat,
          cloudMesh,
          nightMat,
          atmoMat,
          saturnRingMat,
          axisRod,
          sunSprite,
          moonMesh,
          moonOrbitRadius,
          cometTailGroup,
          selectRing
        } = entry;
        const visible = showExtras || !body.isOptionalExtra;
        anchor.visible = visible;

        const orbitEntry = orbitEntries.get(id);
        if (orbitEntry) {
          orbitEntry.line.visible = visible && showOrbits;
          const isMatch = matchesFilter(body, filterGroup);
          const isHl = id === selectedId || id === hoveredId;
          orbitEntry.material.color.set(isHl ? body.color : body.isOptionalExtra ? '#94a3b8' : '#64748b');
          orbitEntry.material.opacity = isHl ? 0.92 : isMatch ? 0.36 : 0.08;
        }

        if (!visible) continue;

        const pos = getOrbitalPosition3D(body, elapsedDays);
        entry.currentPos.set(pos.x, pos.y, pos.z);
        anchor.position.copy(entry.currentPos);

        // การหมุนรอบตัวเอง (เคารพทิศทางหมุนสวนทาง Retrograde ของดาวศุกร์/ยูเรนัส)
        const spinDir = body.retrograde ? -1 : 1;
        const rotDays = Math.max(0.4, body.rotationDays || 1);
        planetMesh.rotation.y = spinDir * (animTimeSec * 0.75 / Math.pow(rotDays, 0.35));

        if (sunMat) {
          sunMat.uniforms.uTime.value = animTimeSec;
        }

        if (cloudMesh) {
          cloudMesh.rotation.y = planetMesh.rotation.y * 1.18 + animTimeSec * 0.04;
        }

        if (axisRod) {
          axisRod.visible = Boolean(showAxes3D);
        }

        if (sunSprite) {
          const pulse = body.visualRadiusPx * (4.15 + Math.sin(animTimeSec * 2.2) * 0.18);
          sunSprite.scale.set(pulse, pulse, 1);
        }

        // ดวงจันทร์โคจรรอบโลก
        if (moonMesh) {
          const moonAng = -(elapsedDays / 27.32) * Math.PI * 2;
          moonMesh.position.set(
            moonOrbitRadius * Math.cos(moonAng),
            Math.sin(moonAng) * 1.8,
            moonOrbitRadius * Math.sin(moonAng)
          );
          moonMesh.rotation.y = -moonAng;
        }

        // หางดาวหางชี้หนีออกจากดวงอาทิตย์ (0,0,0) ใน 3 มิติเสมอ
        if (cometTailGroup) {
          const dir = getCometTailDirection3D(pos.x, pos.y, pos.z);
          const dist = Math.hypot(pos.x, pos.y, pos.z);
          const proximity = Math.max(0.28, Math.min(1.45, 240 / Math.max(70, dist)));
          const tailLength = body.visualRadiusPx * 13 * proximity;
          const tailVec = new THREE.Vector3(dir.x, dir.y, dir.z);
          cometTailGroup.quaternion.setFromUnitVectors(upVec, tailVec);
          cometTailGroup.scale.set(1, tailLength, 1);
        }

        const isMatch = matchesFilter(body, filterGroup);
        const isSelected = id === selectedId;
        const isHovered = id === hoveredId;
        const targetOpacity = isMatch || isSelected ? 1 : 0.25;
        if (body.id !== 'sun') {
          material.opacity = targetOpacity;
        }
        if (cloudMesh) {
          cloudMesh.material.opacity = targetOpacity * 0.88;
        }
        if (nightMat) {
          nightMat.uniforms.uOpacity.value = targetOpacity;
        }
        if (atmoMat) {
          atmoMat.uniforms.uOpacity.value = targetOpacity;
        }
        if (saturnRingMat) {
          saturnRingMat.uniforms.uPlanetPos.value.copy(entry.currentPos);
          saturnRingMat.uniforms.uOpacity.value = targetOpacity * 0.94;
        }

        selectRing.visible = isSelected || isHovered;
        if (selectRing.visible) {
          selectRing.material.color.set(isSelected ? '#38bdf8' : '#e2e8f0');
          selectRing.lookAt(camera.position);
        }

        if (showLabels && (isMatch || isSelected || isHovered)) {
          labelQueue.push({ body, worldPos: entry.currentPos, isSelected, isHovered });
        }
      }

      // 3. กล้องติดตามดาวหรือบินไปยังจุดที่กำหนด
      if (cameraFlyGoal) {
        if (cameraFlyGoal.bodyId && bodyEntries.has(cameraFlyGoal.bodyId)) {
          const movingPos = bodyEntries.get(cameraFlyGoal.bodyId).currentPos;
          const delta = movingPos.clone().sub(prevTrackedPos);
          cameraFlyGoal.pos.add(delta);
          cameraFlyGoal.target.add(delta);
          prevTrackedPos.copy(movingPos);
        }
        camera.position.lerp(cameraFlyGoal.pos, 0.08);
        controls.target.lerp(cameraFlyGoal.target, 0.08);
        if (
          camera.position.distanceTo(cameraFlyGoal.pos) < 1.2 &&
          controls.target.distanceTo(cameraFlyGoal.target) < 0.8
        ) {
          cameraFlyGoal = null;
        }
      } else if (followSelected && selectedId && bodyEntries.has(selectedId)) {
        const currentPos = bodyEntries.get(selectedId).currentPos;
        if (lastSelectedFollowId === selectedId) {
          const delta = currentPos.clone().sub(prevTrackedPos);
          camera.position.add(delta);
          controls.target.add(delta);
        } else {
          controls.target.copy(currentPos);
          lastSelectedFollowId = selectedId;
        }
        prevTrackedPos.copy(currentPos);
      } else {
        lastSelectedFollowId = null;
      }

      controls.update();
      renderer.render(scene, camera);

      // 4. วาดป้ายชื่อ 3 มิติลงบน Overlay Canvas 2 มิติเพื่อความคมชัดสูงสุด
      const lctx = labelCanvas.getContext('2d');
      lctx.clearRect(0, 0, width, height);

      if (showLabels) {
        lctx.save();
        lctx.font = '600 12px "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
        lctx.textAlign = 'center';
        lctx.textBaseline = 'top';

        const placedBoxes = [];
        const overlapsPlaced = (box) =>
          placedBoxes.some(
            (b) =>
              box.x < b.x + b.w + 4 &&
              box.x + box.w + 4 > b.x &&
              box.y < b.y + b.h + 3 &&
              box.y + box.h + 3 > b.y
          );

        for (const item of labelQueue) {
          const { body, worldPos, isSelected, isHovered } = item;
          projVec.copy(worldPos).project(camera);
          if (projVec.z > 1 || projVec.z < -1) continue;

          const sx = (projVec.x * 0.5 + 0.5) * width;
          const sy = (-projVec.y * 0.5 + 0.5) * height;
          if (sx < -60 || sx > width + 60 || sy < -40 || sy > height + 40) continue;

          // ประมาณขนาดรัศมีบนหน้าจอตามระยะห่างจากกล้อง
          const camDist = camera.position.distanceTo(worldPos);
          const screenR = Math.max(5, Math.min(48, (body.visualRadiusPx / Math.max(40, camDist)) * height * 1.1));

          const labelText = body.nameTh;
          const textW = lctx.measureText(labelText).width;
          const padX = 7;
          const padY = 3;
          const pillW = textW + padX * 2;
          const pillH = 18;
          const belowY = sy + screenR + 6;
          const aboveY = sy - screenR - 22;

          let labelY = belowY;
          const belowBox = { x: sx - pillW / 2, y: belowY - padY, w: pillW, h: pillH };
          const aboveBox = { x: sx - pillW / 2, y: aboveY - padY, w: pillW, h: pillH };

          if (!isSelected && !isHovered && overlapsPlaced(belowBox)) {
            if (!overlapsPlaced(aboveBox)) {
              labelY = aboveY;
            } else {
              continue; // ซ่อนป้ายที่ทับซ้อนกันหนาแน่นในระยะไกล
            }
          }

          const finalBox = { x: sx - pillW / 2, y: labelY - padY, w: pillW, h: pillH };
          placedBoxes.push(finalBox);

          lctx.fillStyle = isSelected ? 'rgba(14, 116, 144, 0.9)' : 'rgba(15, 23, 42, 0.78)';
          lctx.beginPath();
          if (lctx.roundRect) {
            lctx.roundRect(finalBox.x, finalBox.y, pillW, pillH, 6);
          } else {
            lctx.rect(finalBox.x, finalBox.y, pillW, pillH);
          }
          lctx.fill();

          lctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
          lctx.fillText(labelText, sx, labelY);
        }
        lctx.restore();
      }
    }

    return {
      supported: true,
      resize,
      renderFrame,
      setCameraPreset,
      focusBody,
      zoomBy
    };
  }

  global.SolarRenderer3D = { createEngine };
})(typeof window !== 'undefined' ? window : globalThis);
