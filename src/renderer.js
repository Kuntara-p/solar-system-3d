(function (global) {
  'use strict';

  const {
    SOLAR_BODIES,
    ASTEROID_BELT_INFO,
    getOrbitEllipseParams,
    getOrbitalPosition,
    getCometTailAngle,
    matchesFilter
  } = global.SolarData;

  /**
   * สร้างตัวสุ่มแบบกำหนดค่าเริ่มต้นคงที่เพื่อให้ดาวและแถบดาวเคราะห์น้อยคงตำแหน่งสวยงามทุกครั้ง
   */
  function createSeededRandom(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const STARFIELD = (function buildStars() {
    const rand = createSeededRandom(20261110);
    const stars = [];
    const tints = ['#ffffff', '#dbeafe', '#fef3c7', '#e0f2fe', '#fce7f3'];
    for (let i = 0; i < 280; i++) {
      stars.push({
        nx: rand(),
        ny: rand(),
        radius: 0.5 + rand() * 1.6,
        alpha: 0.25 + rand() * 0.7,
        twinkleSpeed: 0.8 + rand() * 2.4,
        phase: rand() * Math.PI * 2,
        tint: tints[Math.floor(rand() * tints.length)]
      });
    }
    return stars;
  })();

  const ASTEROIDS = (function buildAsteroids() {
    const rand = createSeededRandom(424242);
    const list = [];
    const { innerOrbitPx, outerOrbitPx } = ASTEROID_BELT_INFO;
    for (let i = 0; i < 240; i++) {
      const r = innerOrbitPx + rand() * (outerOrbitPx - innerOrbitPx);
      const angle = rand() * Math.PI * 2;
      // คาบประมาณ 3.5 - 5.5 ปีโลก
      const periodDays = 1250 + ((r - innerOrbitPx) / (outerOrbitPx - innerOrbitPx)) * 750;
      list.push({
        radiusPx: r,
        initialAngle: angle,
        periodDays,
        size: 0.9 + rand() * 1.7,
        alpha: 0.35 + rand() * 0.5,
        tone: rand() > 0.5 ? '#9ca3af' : '#b8a99a'
      });
    }
    return list;
  })();

  /**
   * วาดแสงเงาฝั่งกลางวัน-กลางคืนเทียบกับดวงอาทิตย์ที่ (sunX, sunY)
   */
  function drawSunlightShadow(ctx, x, y, r, sunX, sunY) {
    if (sunX === null || sunY === null) return;
    const dx = x - sunX;
    const dy = y - sunY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // ไล่ระดับจากด้านสว่าง (หันเข้าดวงอาทิตย์) ไปด้านมืด (หันออกจากดวงอาทิตย์)
    const grad = ctx.createLinearGradient(
      x - nx * r,
      y - ny * r,
      x + nx * r,
      y + ny * r
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(4, 7, 18, 0.62)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  /**
   * วาดพื้นผิวดาวแต่ละดวงอย่างมีเอกลักษณ์ (ใช้ร่วมกันทั้งในฉากหลักและหน้าเทียบขนาด)
   */
  function drawPlanetArtwork(ctx, body, x, y, r, opts = {}) {
    const {
      animTimeSec = 0,
      elapsedDays = 0,
      sunX = 0,
      sunY = 0,
      showShadow = true,
      showMoon = true,
      alpha = 1
    } = opts;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (body.id === 'sun') {
      drawSunArtwork(ctx, x, y, r, animTimeSec);
      ctx.restore();
      return;
    }

    if (body.isComet) {
      drawCometArtwork(ctx, body, x, y, r, sunX, sunY, animTimeSec);
      ctx.restore();
      return;
    }

    if (body.isBelt) {
      drawAsteroidBeltPreview(ctx, x, y, r);
      ctx.restore();
      return;
    }

    // วงแหวนด้านหลังของดาวเสาร์ (วาดก่อนตัวดาว)
    if (body.hasRings) {
      drawSaturnRingsHalf(ctx, x, y, r, true);
    }

    // วงแหวนแนวตั้งบางๆ ของดาวยูเรนัส
    if (body.hasVerticalRing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.42, r * 1.65, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = Math.max(1.2, r * 0.08);
      ctx.stroke();
      ctx.restore();
    }

    // ตัวดาวเคราะห์พื้นฐาน (Clipped Circle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    const baseGrad = ctx.createRadialGradient(
      x - r * 0.28,
      y - r * 0.28,
      r * 0.1,
      x,
      y,
      r * 1.05
    );
    baseGrad.addColorStop(0, body.secondaryColor || body.color);
    baseGrad.addColorStop(0.7, body.color);
    baseGrad.addColorStop(1, '#121826');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);

    // ลวดลายเฉพาะของดาวแต่ละดวง
    if (body.id === 'mercury') {
      ctx.fillStyle = 'rgba(55, 65, 81, 0.45)';
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.arc(x + r * 0.25, y + r * 0.28, r * 0.18, 0, Math.PI * 2);
      ctx.arc(x + r * 0.18, y - r * 0.35, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (body.id === 'venus') {
      ctx.strokeStyle = 'rgba(255, 237, 213, 0.38)';
      ctx.lineWidth = Math.max(1.2, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - r, y - r * 0.25);
      ctx.quadraticCurveTo(x, y - r * 0.48, x + r, y - r * 0.15);
      ctx.moveTo(x - r, y + r * 0.25);
      ctx.quadraticCurveTo(x, y + r * 0.05, x + r, y + r * 0.35);
      ctx.stroke();
    } else if (body.id === 'earth') {
      // แผ่นทวีปสีเขียว
      ctx.fillStyle = '#52b788';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.34, r * 0.28, 0.3, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.28, y + r * 0.18, r * 0.28, r * 0.32, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // เมฆขาวบางๆ
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.1, y - r * 0.45, r * 0.42, r * 0.12, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.18, y + r * 0.42, r * 0.35, r * 0.1, -0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (body.id === 'mars') {
      ctx.fillStyle = 'rgba(127, 29, 29, 0.42)';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.15, y + r * 0.1, r * 0.35, r * 0.24, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // น้ำแข็งขั้วดาว
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.88, r * 0.38, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (body.id === 'jupiter') {
      const bands = [
        { offset: -0.52, h: 0.18, color: 'rgba(244, 224, 198, 0.7)' },
        { offset: -0.22, h: 0.22, color: 'rgba(168, 92, 54, 0.65)' },
        { offset: 0.08, h: 0.2, color: 'rgba(245, 228, 204, 0.72)' },
        { offset: 0.36, h: 0.2, color: 'rgba(156, 82, 46, 0.68)' }
      ];
      for (const band of bands) {
        ctx.fillStyle = band.color;
        ctx.fillRect(x - r, y + r * band.offset, r * 2, r * band.h);
      }
      // จุดแดงใหญ่ (Great Red Spot)
      ctx.fillStyle = '#c84b31';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.28, y + r * 0.26, r * 0.24, r * 0.14, -0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (body.id === 'saturn') {
      ctx.fillStyle = 'rgba(254, 243, 199, 0.45)';
      ctx.fillRect(x - r, y - r * 0.3, r * 2, r * 0.22);
      ctx.fillStyle = 'rgba(180, 132, 62, 0.38)';
      ctx.fillRect(x - r, y + r * 0.08, r * 2, r * 0.22);
    } else if (body.id === 'neptune') {
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.55)';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y - r * 0.2);
      ctx.lineTo(x + r * 0.5, y - r * 0.25);
      ctx.moveTo(x - r * 0.4, y + r * 0.3);
      ctx.lineTo(x + r * 0.75, y + r * 0.24);
      ctx.stroke();
    } else if (body.id === 'pluto') {
      // แอ่งน้ำแข็งรูปหัวใจโดยประมาณ
      ctx.fillStyle = 'rgba(245, 235, 224, 0.65)';
      ctx.beginPath();
      ctx.arc(x - r * 0.08, y, r * 0.22, 0, Math.PI * 2);
      ctx.arc(x + r * 0.12, y - r * 0.04, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (showShadow) {
      drawSunlightShadow(ctx, x, y, r, sunX, sunY);
    }

    ctx.restore(); // สิ้นสุด Clip ตัวดาว

    // ขอบบรรยากาศจางๆ สำหรับโลก
    if (body.id === 'earth') {
      ctx.beginPath();
      ctx.arc(x, y, r + 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // วงแหวนด้านหน้าของดาวเสาร์ (วาดทับตัวดาว)
    if (body.hasRings) {
      drawSaturnRingsHalf(ctx, x, y, r, false);
    }

    // ดวงจันทร์โคจรรอบโลก
    if (body.hasMoon && showMoon) {
      const moonOrbitR = r * 2.15;
      const moonAngle = -(elapsedDays / 27.32) * Math.PI * 2;
      const mx = x + moonOrbitR * Math.cos(moonAngle);
      const my = y + moonOrbitR * Math.sin(moonAngle);

      ctx.beginPath();
      ctx.arc(x, y, moonOrbitR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mx, my, Math.max(2.2, r * 0.26), 0, Math.PI * 2);
      ctx.fillStyle = '#d1d5db';
      ctx.fill();
    }

    ctx.restore();
  }

  function drawAsteroidBeltPreview(ctx, x, y, r) {
    // วาดกลุ่มก้อนหินในแถบดาวเคราะห์น้อย + ดาวเคราะห์แคระเซเรสตรงกลาง
    const rocks = [
      { dx: 0, dy: 0, rad: r * 0.55, color: '#cbd5e1' },
      { dx: -r * 1.15, dy: -r * 0.55, rad: r * 0.32, color: '#94a3b8' },
      { dx: r * 1.1, dy: -r * 0.7, rad: r * 0.28, color: '#a8a29e' },
      { dx: -r * 0.85, dy: r * 0.9, rad: r * 0.25, color: '#d6d3d1' },
      { dx: r * 0.95, dy: r * 0.8, rad: r * 0.34, color: '#78716c' },
      { dx: -r * 0.15, dy: -r * 1.25, rad: r * 0.2, color: '#a1a1aa' },
      { dx: r * 0.25, dy: r * 1.25, rad: r * 0.22, color: '#a8a29e' }
    ];
    ctx.beginPath();
    ctx.arc(x, y, r * 1.55, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);

    for (const rk of rocks) {
      const grad = ctx.createRadialGradient(
        x + rk.dx - rk.rad * 0.3,
        y + rk.dy - rk.rad * 0.3,
        rk.rad * 0.1,
        x + rk.dx,
        y + rk.dy,
        rk.rad
      );
      grad.addColorStop(0, '#f1f5f9');
      grad.addColorStop(0.65, rk.color);
      grad.addColorStop(1, '#1e293b');
      ctx.beginPath();
      ctx.arc(x + rk.dx, y + rk.dy, rk.rad, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  function drawSaturnRingsHalf(ctx, x, y, r, isBackHalf) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.34);

    const startAngle = isBackHalf ? Math.PI : 0;
    const endAngle = isBackHalf ? Math.PI * 2 : Math.PI;

    // วงแหวนนอก
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.35, r * 0.68, 0, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(234, 206, 152, 0.62)';
    ctx.lineWidth = Math.max(2, r * 0.28);
    ctx.stroke();

    // ช่องว่างแคสสินี + วงแหวนใน
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.78, r * 0.5, 0, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(212, 178, 120, 0.75)';
    ctx.lineWidth = Math.max(1.5, r * 0.24);
    ctx.stroke();

    ctx.restore();
  }

  function drawSunArtwork(ctx, x, y, r, animTimeSec) {
    const pulse = 1 + Math.sin(animTimeSec * 2.2) * 0.04;

    // ชั้น Corona รอบนอก
    const corona = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.8 * pulse);
    corona.addColorStop(0, 'rgba(255, 224, 102, 0.95)');
    corona.addColorStop(0.32, 'rgba(255, 158, 0, 0.48)');
    corona.addColorStop(0.65, 'rgba(255, 109, 0, 0.14)');
    corona.addColorStop(1, 'rgba(255, 109, 0, 0)');

    ctx.beginPath();
    ctx.arc(x, y, r * 2.8 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = corona;
    ctx.fill();

    // ตัวดวงอาทิตย์
    const core = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
    core.addColorStop(0, '#fffbeb');
    core.addColorStop(0.35, '#ffd166');
    core.addColorStop(0.8, '#ff9f1c');
    core.addColorStop(1, '#e85d04');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();
  }

  function drawCometArtwork(ctx, body, x, y, r, sunX, sunY, animTimeSec) {
    const tailAngle = getCometTailAngle(x - (sunX || 0), y - (sunY || 0));
    const distFromSun = Math.hypot(x - (sunX || 0), y - (sunY || 0));
    // ยิ่งเข้าใกล้ดวงอาทิตย์ หางยิ่งยาวและสว่างชัดเจน
    const proximity = Math.max(0.25, Math.min(1.4, 240 / Math.max(70, distFromSun)));
    const tailLen = r * 14 * proximity;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tailAngle);

    // หางฝุ่น (Dust tail - สีทองขาวบานออกเล็กน้อย)
    const dustGrad = ctx.createLinearGradient(0, 0, tailLen, 0);
    dustGrad.addColorStop(0, 'rgba(254, 243, 199, 0.78)');
    dustGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.25)');
    dustGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');

    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.quadraticCurveTo(tailLen * 0.55, -r * 2.2, tailLen, -r * 2.8);
    ctx.lineTo(tailLen, r * 1.1);
    ctx.quadraticCurveTo(tailLen * 0.5, r * 0.8, 0, r * 0.65);
    ctx.closePath();
    ctx.fillStyle = dustGrad;
    ctx.fill();

    // หางไอออน (Ion tail - สีฟ้าตรงพุ่งหนีจากดวงอาทิตย์)
    const ionGrad = ctx.createLinearGradient(0, 0, tailLen * 1.15, 0);
    ionGrad.addColorStop(0, 'rgba(103, 232, 249, 0.85)');
    ionGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.beginPath();
    ctx.moveTo(0, -r * 0.45);
    ctx.lineTo(tailLen * 1.15, -r * 0.9);
    ctx.lineTo(tailLen * 1.15, r * 0.9);
    ctx.lineTo(0, r * 0.45);
    ctx.closePath();
    ctx.fillStyle = ionGrad;
    ctx.fill();

    // โคม่า (ก้อนฝุ่นก๊าซเรืองแสงรอบหัวดาวหาง)
    const pulse = 1 + Math.sin(animTimeSec * 4) * 0.08;
    const comaGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.5 * pulse);
    comaGrad.addColorStop(0, '#ffffff');
    comaGrad.addColorStop(0.45, 'rgba(144, 241, 239, 0.7)');
    comaGrad.addColorStop(1, 'rgba(144, 241, 239, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = comaGrad;
    ctx.fill();

    // นิวเคลียสดาวหาง
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = '#e0fbfc';
    ctx.fill();

    ctx.restore();
  }

  /**
   * วาดฉากระบบสุริยะหลักทั้งหมด และส่งกลับตำแหน่งหน้าจอของแต่ละดวงเพื่อตรวจจับการคลิก
   */
  function renderSolarScene(ctx, width, height, state) {
    const {
      cameraX,
      cameraY,
      zoom,
      elapsedDays,
      animTimeSec,
      selectedId,
      hoveredId,
      filterGroup,
      showOrbits,
      showLabels,
      showAsteroids,
      showExtras
    } = state;

    // 1. พื้นหลังอวกาศลึก
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      30,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.85
    );
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.55, '#070b19');
    bgGrad.addColorStop(1, '#03050d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. ดาวพื้นหลังระยิบระยับ
    for (const star of STARFIELD) {
      const sx = star.nx * width;
      const sy = star.ny * height;
      const twinkle = 0.65 + 0.35 * Math.sin(animTimeSec * star.twinkleSpeed + star.phase);
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = star.tint;
      ctx.beginPath();
      ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 3. เข้าสู่ระบบพิกัดโลกสุริยะ (World Transform)
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);

    const visibleBodies = SOLAR_BODIES.filter((b) => showExtras || !b.isOptionalExtra);

    // 3a. วาดเส้นวงโคจร
    if (showOrbits) {
      for (const body of visibleBodies) {
        if (body.orbitRadiusPx <= 0) continue;

        const isMatch = matchesFilter(body, filterGroup);
        const isHighlighted = body.id === selectedId || body.id === hoveredId;
        const { a, b, tilt, centerX, centerY } = getOrbitEllipseParams(body);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(tilt);

        ctx.beginPath();
        ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);

        if (isHighlighted) {
          ctx.strokeStyle = body.color;
          ctx.lineWidth = Math.max(1.8 / zoom, 1.5);
          ctx.globalAlpha = 0.85;
        } else if (isMatch) {
          ctx.strokeStyle = body.isOptionalExtra
            ? 'rgba(148, 163, 184, 0.35)'
            : 'rgba(148, 163, 184, 0.25)';
          ctx.lineWidth = Math.max(1 / zoom, 0.8);
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
          ctx.lineWidth = 0.8 / zoom;
          ctx.globalAlpha = 1;
        }

        if (body.isOptionalExtra) {
          ctx.setLineDash([6 / zoom, 5 / zoom]);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3b. วาดแถบดาวเคราะห์น้อย (ระหว่างดาวอังคารกับดาวพฤหัส)
    if (showAsteroids) {
      const isBeltSelected = selectedId === ASTEROID_BELT_INFO.id;
      const isBeltHovered = hoveredId === ASTEROID_BELT_INFO.id;
      const dimBelt = filterGroup !== 'all' && filterGroup !== 'small' && !isBeltSelected && !isBeltHovered;
      ctx.save();
      ctx.globalAlpha = dimBelt ? 0.22 : 0.95;

      if (isBeltSelected || isBeltHovered) {
        const midR = (ASTEROID_BELT_INFO.innerOrbitPx + ASTEROID_BELT_INFO.outerOrbitPx) / 2;
        const bandW = ASTEROID_BELT_INFO.outerOrbitPx - ASTEROID_BELT_INFO.innerOrbitPx;
        ctx.beginPath();
        ctx.arc(0, 0, midR, 0, Math.PI * 2);
        ctx.strokeStyle = isBeltSelected ? 'rgba(56, 189, 248, 0.24)' : 'rgba(226, 232, 240, 0.14)';
        ctx.lineWidth = bandW;
        ctx.stroke();

        ctx.setLineDash([6 / zoom, 5 / zoom]);
        ctx.strokeStyle = isBeltSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = (isBeltSelected ? 1.8 : 1.2) / zoom;
        ctx.beginPath();
        ctx.arc(0, 0, ASTEROID_BELT_INFO.innerOrbitPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, ASTEROID_BELT_INFO.outerOrbitPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const rock of ASTEROIDS) {
        const ang = rock.initialAngle - (elapsedDays / rock.periodDays) * Math.PI * 2;
        const rx = rock.radiusPx * Math.cos(ang);
        const ry = rock.radiusPx * Math.sin(ang);
        ctx.fillStyle = isBeltSelected ? '#e0f2fe' : rock.tone;
        ctx.beginPath();
        ctx.arc(rx, ry, rock.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 3c. คำนวณตำแหน่งและวาดวัตถุทุกดวง
    const screenHitMap = [];

    for (const body of visibleBodies) {
      const pos = getOrbitalPosition(body, elapsedDays);
      const isMatch = matchesFilter(body, filterGroup);
      const isSelected = body.id === selectedId;
      const isHovered = body.id === hoveredId;

      const bodyAlpha = isMatch || isSelected ? 1 : 0.24;

      // วงแหวนเป้าชี้เมื่อถูกเลือกหรือโฮเวอร์
      if (isSelected || isHovered) {
        const haloR = body.visualRadiusPx + (isSelected ? 8 : 6);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        if (isSelected) {
          ctx.rotate(animTimeSec * 0.7);
          ctx.setLineDash([5 / zoom, 4 / zoom]);
        }
        ctx.beginPath();
        ctx.arc(0, 0, haloR, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = (isSelected ? 2.2 : 1.4) / zoom;
        ctx.stroke();
        ctx.restore();
      }

      drawPlanetArtwork(ctx, body, pos.x, pos.y, body.visualRadiusPx, {
        animTimeSec,
        elapsedDays,
        sunX: 0,
        sunY: 0,
        showShadow: body.id !== 'sun',
        showMoon: true,
        alpha: bodyAlpha
      });

      // บันทึกพิกัดหน้าจอไว้ใช้ตอนคลิก/โฮเวอร์ และวาดป้ายชื่อคมชัด
      const screenX = width / 2 + (pos.x - cameraX) * zoom;
      const screenY = height / 2 + (pos.y - cameraY) * zoom;
      const hitRadius = Math.max(18, body.visualRadiusPx * zoom + 10);

      screenHitMap.push({
        body,
        worldX: pos.x,
        worldY: pos.y,
        screenX,
        screenY,
        hitRadius,
        isMatch,
        isSelected,
        isHovered
      });
    }

    ctx.restore();

    // 4. วาดป้ายชื่อในพิกัดหน้าจอเพื่อให้ตัวอักษรคมชัดขนาดสม่ำเสมอทุกระดับการซูม
    if (showLabels) {
      ctx.save();
      ctx.font = '600 12px "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const placedBoxes = [];
      const overlapsPlaced = (box) =>
        placedBoxes.some(
          (b) =>
            box.x < b.x + b.w + 4 &&
            box.x + box.w + 4 > b.x &&
            box.y < b.y + b.h + 3 &&
            box.y + box.h + 3 > b.y
        );

      // ป้ายแถบดาวเคราะห์น้อย
      const isBeltSelected = selectedId === ASTEROID_BELT_INFO.id;
      const isBeltHovered = hoveredId === ASTEROID_BELT_INFO.id;
      if (
        showAsteroids &&
        (zoom > 0.36 || isBeltSelected || isBeltHovered) &&
        (filterGroup === 'all' || filterGroup === 'small' || isBeltSelected || isBeltHovered)
      ) {
        const beltX = width / 2 + (0 - cameraX) * zoom;
        const beltY = height / 2 + (-ASTEROID_BELT_INFO.outerOrbitPx - cameraY) * zoom - 22;
        if (beltX > -80 && beltX < width + 80 && beltY > -20 && beltY < height + 20) {
          const beltLabel = ASTEROID_BELT_INFO.nameTh;
          const textW = ctx.measureText(beltLabel).width;
          const pillW = textW + 14;
          const pillH = 18;
          ctx.fillStyle = isBeltSelected
            ? 'rgba(14, 116, 144, 0.92)'
            : 'rgba(15, 23, 42, 0.72)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(beltX - pillW / 2, beltY - 3, pillW, pillH, 6);
          } else {
            ctx.rect(beltX - pillW / 2, beltY - 3, pillW, pillH);
          }
          ctx.fill();
          ctx.fillStyle = isBeltSelected ? '#ffffff' : 'rgba(203, 213, 225, 0.88)';
          ctx.fillText(beltLabel, beltX, beltY);
          placedBoxes.push({ x: beltX - pillW / 2, y: beltY - 3, w: pillW, h: pillH });
        }
      }

      for (const item of screenHitMap) {
        const { body, screenX, screenY, isMatch, isSelected, isHovered } = item;
        if (!isMatch && !isSelected && !isHovered) continue;

        const skipCrowded =
          zoom < 0.36 && (body.id === 'mercury' || body.id === 'venus') && !isSelected && !isHovered;
        if (skipCrowded) continue;

        // ข้ามป้ายที่อยู่นอกขอบจอไกลๆ เพื่อประสิทธิภาพ
        if (screenX < -80 || screenX > width + 80 || screenY < -80 || screenY > height + 80) {
          continue;
        }

        const labelText = body.nameTh;
        const textW = ctx.measureText(labelText).width;
        const padX = 7;
        const padY = 3;
        const pillW = textW + padX * 2;
        const pillH = 18;

        const belowY = screenY + body.visualRadiusPx * zoom + 8;
        const aboveY = screenY - body.visualRadiusPx * zoom - 22;
        let labelY = belowY;

        const belowBox = { x: screenX - pillW / 2, y: belowY - padY, w: pillW, h: pillH };
        const aboveBox = { x: screenX - pillW / 2, y: aboveY - padY, w: pillW, h: pillH };

        if (!isSelected && !isHovered && overlapsPlaced(belowBox)) {
          if (!overlapsPlaced(aboveBox)) {
            labelY = aboveY;
          }
        }

        const finalBox = { x: screenX - pillW / 2, y: labelY - padY, w: pillW, h: pillH };
        placedBoxes.push(finalBox);

        ctx.fillStyle = isSelected
          ? 'rgba(14, 116, 144, 0.9)'
          : 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(finalBox.x, finalBox.y, pillW, pillH, 6);
        } else {
          ctx.rect(finalBox.x, finalBox.y, pillW, pillH);
        }
        ctx.fill();

        ctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
        ctx.fillText(labelText, screenX, labelY);
      }
      ctx.restore();
    }

    return screenHitMap;
  }

  /**
   * วาดผังเปรียบเทียบขนาดจริงในโหมด Compare Lab
   * @param {'planets'|'sun'} scaleMode - เทียบดาวเคราะห์ด้วยกัน หรือ เทียบกับดวงอาทิตย์
   */
  function renderSizeComparison(ctx, width, height, scaleMode) {
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0b1120');
    bg.addColorStop(1, '#050814');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const planetsAndPluto = SOLAR_BODIES.filter((b) => !b.isComet && b.id !== 'sun');
    const centerY = height * 0.52;

    if (scaleMode === 'sun') {
      // โหมดเทียบกับดวงอาทิตย์ (ขนาดจริง 109 เท่าของโลก!)
      const earthPx = Math.max(1.8, Math.min(3.3, width / 350));
      const sunRadius = earthPx * 109;
      const sunCenterX = -sunRadius + Math.min(120, width * 0.14);

      drawSunArtwork(ctx, sunCenterX, centerY, sunRadius, 0.5);

      ctx.fillStyle = '#fef3c7';
      ctx.font = '700 13px "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ดวงอาทิตย์ (109× โลก)', 14, 24);

      const startX = Math.min(176, width * 0.22);
      const availW = width - startX - 28;
      const sunSlots = planetsAndPluto.map((body, idx) => {
        const pr = Math.max(1.2, earthPx * body.relativeEarthSize);
        const halfSpan = Math.max(18, body.hasRings ? pr * 2.45 : pr + 8);
        const gapAfter = idx < planetsAndPluto.length - 1 ? 10 : 0;
        return { body, pr, halfSpan, gapAfter };
      });
      const sunTotal = sunSlots.reduce((s, item) => s + item.halfSpan * 2 + item.gapAfter, 0);
      const sunFit = sunTotal > availW ? availW / sunTotal : 1;
      let sunCursorX = startX + (availW - sunTotal * sunFit) / 2;

      sunSlots.forEach((slot, idx) => {
        const halfSpan = slot.halfSpan * sunFit;
        const px = sunCursorX + halfSpan;
        const pr = slot.pr * sunFit;

        drawPlanetArtwork(ctx, slot.body, px, centerY, pr, {
          showShadow: false,
          showMoon: false
        });

        // เส้นชี้ + ชื่อสลับบนล่างเพื่อไม่ให้ทับกัน
        const isTop = idx % 2 === 0;
        const labelOffset = isTop ? -72 : 54;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, centerY + (isTop ? -pr - 4 : pr + 4));
        ctx.lineTo(px, centerY + (isTop ? -44 : 44));
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '600 11px "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(slot.body.nameTh, px, centerY + labelOffset);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 10px "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
        ctx.fillText(`${slot.body.relativeEarthSize}×`, px, centerY + labelOffset + 14);

        sunCursorX += halfSpan * 2 + slot.gapAfter * sunFit;
      });
      return;
    }

    // โหมดเทียบเฉพาะดาวเคราะห์ 8 ดวง + พลูโต (ขยายให้เห็นความแตกต่างชัดเจน)
    const maxDiameterUnits = 11.0; // ดาวพฤหัสบดี = 11× โลก
    const maxRadiusPx = Math.min(height * 0.25, width * 0.08);
    const unitPx = maxRadiusPx / maxDiameterUnits;

    const slots = planetsAndPluto.map((body, idx) => {
      const r = Math.max(3, body.relativeEarthSize * unitPx);
      const halfSpan = Math.max(20, body.hasRings ? r * 2.4 : r);
      const gapAfter = idx < planetsAndPluto.length - 1 ? 18 : 0;
      return { body, r, halfSpan, gapAfter };
    });

    const totalNeeded = slots.reduce((sum, s) => sum + s.halfSpan * 2 + s.gapAfter, 0);
    const scaleDown = totalNeeded > width - 56 ? (width - 56) / totalNeeded : 1;
    let cursorX = (width - totalNeeded * scaleDown) / 2;
    const planetY = centerY - 22;

    slots.forEach((slot, idx) => {
      const r = slot.r * scaleDown;
      const halfSpan = slot.halfSpan * scaleDown;
      const gapAfter = slot.gapAfter * scaleDown;
      const cx = cursorX + halfSpan;

      drawPlanetArtwork(ctx, slot.body, cx, planetY, r, {
        showShadow: false,
        showMoon: false
      });

      const staggerY = idx % 2 === 0 ? planetY + maxRadiusPx * scaleDown + 22 : planetY + maxRadiusPx * scaleDown + 54;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 12px "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(slot.body.nameTh, cx, staggerY);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
      ctx.fillText(`${slot.body.relativeEarthSize}× โลก`, cx, staggerY + 16);

      cursorX += halfSpan * 2 + gapAfter;
    });
  }

  global.SolarRenderer = {
    drawPlanetArtwork,
    renderSolarScene,
    renderSizeComparison
  };
})(typeof window !== 'undefined' ? window : globalThis);
