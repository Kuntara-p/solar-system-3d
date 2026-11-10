(function (global) {
  'use strict';

  const {
    CATEGORY_META,
    SOLAR_BODIES,
    ASTEROID_BELT_INFO,
    QUIZ_QUESTIONS,
    calculateWeightOnBody,
    calculateAgeOnBody,
    getOrbitalPosition
  } = global.SolarData;

  const {
    drawPlanetArtwork,
    renderSolarScene,
    renderSizeComparison
  } = global.SolarRenderer;

  // DOM Elements
  const canvas = document.getElementById('solarCanvas');
  const ctx = canvas.getContext('2d');
  const canvas3d = document.getElementById('solar3DCanvas');
  const labels3dCanvas = document.getElementById('labels3DCanvas');
  const stageEl = document.querySelector('.canvas-stage');
  const clockEl = document.getElementById('simClockDisplay');
  const hintBanner = document.getElementById('hintBanner');
  const hoverTooltip = document.getElementById('hoverTooltip');
  const planetDock = document.getElementById('planetDock');

  const btnMode3D = document.getElementById('btnMode3D');
  const btnMode2D = document.getElementById('btnMode2D');
  const cameraPresets3D = document.getElementById('cameraPresets3D');
  const wrapChkAxes3D = document.getElementById('wrapChkAxes3D');
  const chkAxes3D = document.getElementById('chkAxes3D');

  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnResetView = document.getElementById('btnResetView');

  const chkOrbits = document.getElementById('chkOrbits');
  const chkLabels = document.getElementById('chkLabels');
  const chkAsteroids = document.getElementById('chkAsteroids');
  const chkExtras = document.getElementById('chkExtras');

  const detailDrawer = document.getElementById('detailDrawer');
  const previewCanvas = document.getElementById('previewPlanetCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const btnPrevBody = document.getElementById('btnPrevBody');
  const btnNextBody = document.getElementById('btnNextBody');
  const btnFollowBody = document.getElementById('btnFollowBody');

  const inputEarthWeight = document.getElementById('inputEarthWeight');
  const inputEarthAge = document.getElementById('inputEarthAge');
  const calcResults = document.getElementById('calcResults');

  const compareModal = document.getElementById('compareModal');
  const compareCanvas = document.getElementById('compareSizeCanvas');
  const compareCtx = compareCanvas.getContext('2d');
  const compareSelectA = document.getElementById('compareSelectA');
  const compareSelectB = document.getElementById('compareSelectB');
  const duelSummary = document.getElementById('duelSummary');
  const duelGrid = document.getElementById('duelGrid');

  const quizModal = document.getElementById('quizModal');
  const quizBody = document.getElementById('quizBody');
  const guideModal = document.getElementById('guideModal');

  // Application State
  const state = {
    viewMode: '3d',
    preset3D: 'perspective',
    isPlaying: true,
    daysPerSecond: 30,
    elapsedDays: 0,
    animTimeSec: 0,
    filterGroup: 'all',
    showOrbits: true,
    showLabels: true,
    showAsteroids: true,
    showExtras: true,
    showAxes3D: true,
    selectedId: null,
    hoveredId: null,
    followSelected: false,
    cameraX: 0,
    cameraY: 45,
    zoom: 0.72,
    targetCameraX: 0,
    targetCameraY: 45,
    targetZoom: 0.72,
    isCameraAnimating: false,
    compareScaleMode: 'planets',
    quizIndex: 0,
    quizScore: 0,
    quizAnswered: false,
    quizSelectedOption: null
  };

  let engine3D = null;
  let canvasWidth = 800;
  let canvasHeight = 600;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let lastHitMap = [];
  let lastFrameTime = performance.now();

  // Pointer & Drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let camStartX = 0;
  let camStartY = 0;
  let pointerMovedDist = 0;

  function getBodyById(id) {
    if (id === ASTEROID_BELT_INFO.id) return ASTEROID_BELT_INFO;
    return SOLAR_BODIES.find((b) => b.id === id) || null;
  }

  function getVisibleBodies() {
    const list = SOLAR_BODIES.filter((b) => state.showExtras || !b.isOptionalExtra);
    if (state.showAsteroids) {
      const marsIdx = list.findIndex((b) => b.id === 'mars');
      if (marsIdx !== -1) {
        list.splice(marsIdx + 1, 0, ASTEROID_BELT_INFO);
      } else {
        list.push(ASTEROID_BELT_INFO);
      }
    }
    return list;
  }

  /**
   * คำนวณระดับการซูมที่เหมาะสมเพื่อให้เห็นทั้งระบบสุริยะเหนือแถบควบคุมด้านล่าง
   */
  function computeFitView() {
    const availW = Math.max(300, canvasWidth - 48);
    const availH = Math.max(260, canvasHeight - 148);
    const span = state.showExtras ? 1020 : 940;
    const fitZoom = Math.max(0.32, Math.min(1.15, Math.min(availW / span, availH / span)));
    // ขยับจุดศูนย์กลางกล้องลงเล็กน้อยเพื่อให้ระบบสุริยะอยู่กึ่งกลางพื้นที่ว่างเหนือแถบ dock
    const offsetY = 34 / fitZoom;
    return { x: 0, y: offsetY, zoom: fitZoom };
  }

  function resetCameraView(immediate = false) {
    state.followSelected = false;
    updateFollowButton();

    if (state.viewMode === '3d' && engine3D && engine3D.supported) {
      state.preset3D = 'perspective';
      document.querySelectorAll('.preset-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.preset === 'perspective');
      });
      engine3D.setCameraPreset('perspective', immediate);
      return;
    }

    const fit = computeFitView();
    state.targetCameraX = fit.x;
    state.targetCameraY = fit.y;
    state.targetZoom = fit.zoom;
    if (immediate) {
      state.cameraX = fit.x;
      state.cameraY = fit.y;
      state.zoom = fit.zoom;
      state.isCameraAnimating = false;
    } else {
      state.isCameraAnimating = true;
    }
  }

  function resizeMainCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = stageEl.clientWidth || window.innerWidth;
    canvasHeight = stageEl.clientHeight || window.innerHeight - 64;
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (engine3D && engine3D.supported) {
      engine3D.resize(canvasWidth, canvasHeight);
    }

    if (!compareModal.classList.contains('hidden')) {
      renderCompareCanvas();
    }
  }

  function showBodyTooltip(body, clientX, clientY) {
    state.hoveredId = body ? body.id : null;
    if (!body) {
      hoverTooltip.classList.add('hidden');
      return;
    }
    const rect = stageEl.getBoundingClientRect();
    hoverTooltip.innerHTML = `<strong>${body.nameTh} (${body.nameEn})</strong><span>${body.subtitle}</span>`;
    const tipX = Math.min(canvasWidth - 250, clientX - rect.left + 16);
    const tipY = Math.max(12, clientY - rect.top - 12);
    hoverTooltip.style.left = `${tipX}px`;
    hoverTooltip.style.top = `${tipY}px`;
    hoverTooltip.classList.remove('hidden');
  }

  function ensure3DEngine() {
    if (engine3D) return engine3D;
    if (!global.SolarRenderer3D) return { supported: false };
    engine3D = global.SolarRenderer3D.createEngine({
      canvas3d,
      labelCanvas: labels3dCanvas,
      onSelectBody: (bodyId) => selectBody(bodyId, { focusCamera: false }),
      onHoverBody: (bodyId, clientX, clientY) => {
        showBodyTooltip(bodyId ? getBodyById(bodyId) : null, clientX, clientY);
      }
    });
    if (engine3D.supported) {
      engine3D.resize(canvasWidth, canvasHeight);
      engine3D.setCameraPreset(state.preset3D, true);
    }
    return engine3D;
  }

  function setViewMode(mode) {
    if (mode === '3d') {
      const eng = ensure3DEngine();
      if (!eng.supported) {
        mode = '2d';
        btnMode3D.disabled = true;
        btnMode3D.title = 'อุปกรณ์นี้ไม่รองรับ WebGL 3D';
      }
    }

    state.viewMode = mode;
    const is3D = mode === '3d';

    btnMode3D.classList.toggle('active', is3D);
    btnMode2D.classList.toggle('active', !is3D);

    canvas.classList.toggle('hidden', is3D);
    canvas3d.classList.toggle('hidden', !is3D);
    labels3dCanvas.classList.toggle('hidden', !is3D);
    cameraPresets3D.classList.toggle('hidden', !is3D);
    wrapChkAxes3D.classList.toggle('hidden', !is3D);

    hintBanner.textContent = is3D
      ? '💡 คลิกที่ดวงดาวเพื่อดูข้อมูล • ลากซ้ายเพื่อหมุน 360° • คลิกขวาเพื่อเลื่อน • หมุนลูกกลิ้งเพื่อซูม'
      : '💡 คลิกที่ดวงดาวเพื่อดูข้อมูลและคำนวณน้ำหนัก • ลากเพื่อเลื่อนฉาก • หมุนลูกกลิ้งเพื่อซูม';

    showBodyTooltip(null, 0, 0);

    if (is3D && engine3D && engine3D.supported) {
      engine3D.resize(canvasWidth, canvasHeight);
      if (state.followSelected && state.selectedId) {
        engine3D.focusBody(state.selectedId, state.elapsedDays);
      }
    } else if (!is3D) {
      if (state.followSelected && state.selectedId) {
        const body = getBodyById(state.selectedId);
        if (body) {
          const pos = getOrbitalPosition(body, state.elapsedDays);
          state.targetCameraX = pos.x;
          state.targetCameraY = pos.y;
          state.isCameraAnimating = true;
        }
      } else {
        resetCameraView(true);
      }
    }
  }

  /**
   * สร้างแถบเลือกดาวด่วนด้านล่าง
   */
  function buildPlanetDock() {
    const bodies = getVisibleBodies();
    planetDock.innerHTML = '';

    for (const body of bodies) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'planet-pill' + (body.id === state.selectedId ? ' active' : '');
      btn.dataset.bodyId = body.id;

      const dot = document.createElement('span');
      dot.className = body.isBelt ? 'planet-dot belt-dot' : 'planet-dot';
      if (!body.isBelt) {
        dot.style.background = body.color;
      }

      const label = document.createElement('span');
      label.textContent = body.nameTh;

      btn.appendChild(dot);
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        selectBody(body.id, { focusCamera: true, enableFollow: body.id !== 'sun' && !body.isBelt });
      });

      planetDock.appendChild(btn);
    }
  }

  function syncDockActiveState() {
    const pills = planetDock.querySelectorAll('.planet-pill');
    pills.forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.bodyId === state.selectedId);
    });
  }

  function updateFollowButton() {
    if (!state.selectedId) {
      btnFollowBody.classList.remove('active');
      return;
    }
    if (state.selectedId === ASTEROID_BELT_INFO.id) {
      btnFollowBody.classList.remove('active');
      btnFollowBody.textContent = '🎯 จัดมุมกล้องดูทั้งแถบดาวเคราะห์น้อย';
      return;
    }
    btnFollowBody.classList.toggle('active', state.followSelected);
    btnFollowBody.textContent = state.followSelected
      ? '🎯 กำลังติดตามกล้อง (คลิกเพื่อปล่อยอิสระ)'
      : '🎯 ติดตามกล้องที่ดาวดวงนี้';
  }

  /**
   * เลือกวัตถุและเปิดแผงข้อมูลด้านข้าง
   */
  function selectBody(bodyId, options = {}) {
    const body = getBodyById(bodyId);
    if (!body) return;

    state.selectedId = body.id;
    hintBanner.classList.add('hidden');
    syncDockActiveState();
    renderDetailDrawer(body);
    detailDrawer.classList.remove('hidden');

    if (options.focusCamera) {
      if (state.viewMode === '3d' && engine3D && engine3D.supported) {
        engine3D.focusBody(body.id, state.elapsedDays);
      } else if (body.isBelt) {
        state.targetCameraX = 0;
        state.targetCameraY = 0;
        state.targetZoom = Math.min(1.2, Math.max(0.75, Math.min(canvasWidth, canvasHeight - 140) / 560));
        state.isCameraAnimating = true;
      } else {
        const pos = getOrbitalPosition(body, state.elapsedDays);
        state.targetCameraX = pos.x;
        state.targetCameraY = pos.y;
        const desiredZoom = body.visualRadiusPx < 10 ? Math.max(state.zoom, 1.35) : Math.max(state.zoom, 0.95);
        state.targetZoom = Math.min(2.6, desiredZoom);
        state.isCameraAnimating = true;
      }
      state.followSelected = !body.isBelt && Boolean(options.enableFollow);
    } else if (state.followSelected && !body.isBelt) {
      if (state.viewMode === '3d' && engine3D && engine3D.supported) {
        engine3D.focusBody(body.id, state.elapsedDays);
      } else {
        // หากเปิดโหมดติดตามอยู่แล้ว ให้ย้ายไปติดตามดาวที่เพิ่งคลิกทันที
        const pos = getOrbitalPosition(body, state.elapsedDays);
        state.targetCameraX = pos.x;
        state.targetCameraY = pos.y;
        state.isCameraAnimating = true;
      }
    } else if (body.isBelt) {
      state.followSelected = false;
    }

    updateFollowButton();
  }

  function closeDetailDrawer() {
    detailDrawer.classList.add('hidden');
    state.selectedId = null;
    state.followSelected = false;
    syncDockActiveState();
    updateFollowButton();
  }

  function renderDetailDrawer(body) {
    const catMeta = CATEGORY_META[body.category] || CATEGORY_META.rocky;

    const badge = document.getElementById('detailCategory');
    badge.textContent = catMeta.label;
    badge.style.color = catMeta.badgeColor;

    document.getElementById('detailNameTh').textContent = body.nameTh;
    document.getElementById('detailNameEn').textContent = body.nameEn;
    document.getElementById('detailSubtitle').textContent = body.subtitle;

    // วาดภาพตัวอย่างดาวลงใน Preview Canvas
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const previewRadius = body.hasRings ? 16 : body.isBelt ? 19 : body.isComet ? 9 : 25;
    const drawX = body.isComet ? 28 : 42;
    drawPlanetArtwork(previewCtx, body, drawX, 42, previewRadius, {
      sunX: body.isComet ? 0 : -40,
      sunY: body.isComet ? 42 : 0,
      showShadow: body.id !== 'sun' && !body.isComet && !body.isBelt,
      showMoon: false,
      animTimeSec: 0.4
    });

    // ข้อมูลสำคัญ 6 ช่อง
    const metricsGrid = document.getElementById('detailMetrics');
    const metrics = [
      {
        label: 'ระยะห่างจากดวงอาทิตย์',
        value: body.distanceText
          ? body.distanceText
          : body.distanceMillionKm === 0
            ? '0 กม. (ศูนย์กลาง)'
            : `${body.distanceMillionKm.toLocaleString('th-TH')} ล้าน กม. (${body.distanceAU} AU)`
      },
      {
        label: 'ขนาดเทียบกับโลก',
        value: body.sizeText
          ? body.sizeText
          : body.id === 'earth'
            ? '1.0 เท่า (12,742 กม.)'
            : `${body.relativeEarthSize} เท่าของโลก`
      },
      {
        label: '1 วัน (หมุนรอบตัวเอง)',
        value: body.rotationText
      },
      {
        label: '1 ปี (โคจรรอบดวงอาทิตย์)',
        value: body.orbitalPeriodText
      },
      {
        label: 'อุณหภูมิโดยประมาณ',
        value: body.tempText
      },
      {
        label: body.moonsLabel || 'ดวงจันทร์บริวาร',
        value: body.moonsText
      }
    ];

    metricsGrid.innerHTML = metrics
      .map(
        (m) => `
        <div class="metric-card">
          <span class="metric-label">${m.label}</span>
          <span class="metric-value">${m.value}</span>
        </div>`
      )
      .join('');

    // จุดเด่นน่ารู้
    const highlightsList = document.getElementById('detailHighlights');
    highlightsList.innerHTML = body.highlights.map((h) => `<li>${h}</li>`).join('');

    // เกร็ดหลักสูตร
    document.getElementById('detailTip').textContent = `💡 ${body.curriculumTip}`;

    updateAstroCalculator(body);
  }

  function updateAstroCalculator(bodyArg) {
    const body = bodyArg || getBodyById(state.selectedId);
    if (!body) return;

    const wVal = parseFloat(inputEarthWeight.value);
    const aVal = parseFloat(inputEarthAge.value);
    const weight = Number.isFinite(wVal) && wVal > 0 ? wVal : 35;
    const age = Number.isFinite(aVal) && aVal > 0 ? aVal : 10;

    const planetWeight = calculateWeightOnBody(weight, body);
    const planetAge = calculateAgeOnBody(age, body);

    let weightText = `${planetWeight.toFixed(1)} กก.`;
    if (body.id === 'comet') {
      weightText = `${planetWeight.toFixed(4)} กก.`;
    } else if (body.isBelt) {
      weightText = `${planetWeight.toFixed(2)} กก.`;
    }

    let weightNote = `แรงโน้มถ่วง ${body.gravityFactor}× ของโลก`;
    if (body.category === 'gas' || body.category === 'ice') {
      weightNote += ' (วัดที่ระดับชั้นเมฆ ไม่มีพื้นแข็งให้ยืน)';
    } else if (body.id === 'sun') {
      weightNote = 'แรงโน้มถ่วงมหาศาล ~27.9× ของโลก (ร้อนจัดมาก)';
    } else if (body.isBelt) {
      weightNote = 'อ้างอิงจากดาวเคราะห์แคระเซเรสในแถบ (แรงโน้มถ่วง ~0.029× ของโลก)';
    }

    let ageText = '—';
    let ageNote = 'ดวงอาทิตย์เป็นศูนย์กลางของระบบสุริยะ';
    if (planetAge !== null) {
      if (planetAge >= 10) {
        ageText = `${planetAge.toFixed(1)} ปี`;
      } else if (planetAge >= 0.1) {
        ageText = `${planetAge.toFixed(2)} ปี`;
      } else {
        ageText = `${planetAge.toFixed(3)} ปี`;
      }
      ageNote = planetAge < 1
        ? 'ยังไม่ครบ 1 รอบปีของดาวนี้เลย!'
        : `ผ่านวันเกิดบนดาวนี้มาแล้ว ${Math.floor(planetAge)} รอบ`;
    }

    calcResults.innerHTML = `
      <div class="calc-box">
        <span class="calc-k">น้ำหนักบน${body.nameTh}</span>
        <span class="calc-v">${weightText}</span>
        <span class="calc-note">${weightNote}</span>
      </div>
      <div class="calc-box">
        <span class="calc-k">อายุบน${body.nameTh}</span>
        <span class="calc-v">${ageText}</span>
        <span class="calc-note">${ageNote}</span>
      </div>
    `;
  }

  function stepSelectedBody(direction) {
    const list = getVisibleBodies();
    if (!list.length) return;
    const currentIdx = list.findIndex((b) => b.id === state.selectedId);
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + direction + list.length) % list.length;
    const nextBody = list[nextIdx];
    selectBody(nextBody.id, { focusCamera: true, enableFollow: nextBody.id !== 'sun' });
  }

  // ==================== Compare Lab ====================

  function initCompareLab() {
    const comparableBodies = SOLAR_BODIES.filter((b) => !b.isComet);
    const optionsHtml = comparableBodies
      .map((b) => `<option value="${b.id}">${b.nameTh} (${b.nameEn})</option>`)
      .join('');
    compareSelectA.innerHTML = optionsHtml;
    compareSelectB.innerHTML = optionsHtml;
    compareSelectA.value = 'earth';
    compareSelectB.value = 'jupiter';
    updateCompareDuel();
  }

  function renderCompareCanvas() {
    const wrap = compareCanvas.parentElement;
    const w = wrap.clientWidth || 860;
    const h = wrap.clientHeight || 255;
    compareCanvas.width = Math.round(w * dpr);
    compareCanvas.height = Math.round(h * dpr);
    compareCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderSizeComparison(compareCtx, w, h, state.compareScaleMode);
  }

  function updateCompareDuel() {
    const bodyA = getBodyById(compareSelectA.value);
    const bodyB = getBodyById(compareSelectB.value);
    if (!bodyA || !bodyB) return;

    const bigger = bodyA.relativeEarthSize >= bodyB.relativeEarthSize ? bodyA : bodyB;
    const smaller = bigger === bodyA ? bodyB : bodyA;
    const sizeRatio = bigger.relativeEarthSize / Math.max(0.01, smaller.relativeEarthSize);

    if (bodyA.id === bodyB.id) {
      duelSummary.textContent = `กำลังเลือก ${bodyA.nameTh} ทั้งสองฝั่ง — ลองเลือกดาวต่างดวงกันเพื่อเปรียบเทียบ!`;
    } else {
      duelSummary.innerHTML = `<strong>${bigger.nameTh}</strong> มีเส้นผ่านศูนย์กลางกว้างกว่า <strong>${smaller.nameTh}</strong> ประมาณ <strong>${sizeRatio >= 10 ? sizeRatio.toFixed(0) : sizeRatio.toFixed(1)} เท่า</strong>`;
    }

    const buildCard = (b) => {
      const cat = CATEGORY_META[b.category] || CATEGORY_META.rocky;
      const sampleWeight = calculateWeightOnBody(35, b).toFixed(1);
      return `
        <div class="duel-card">
          <h4>${b.nameTh} <span style="font-size:12px; color:${cat.badgeColor}">(${cat.shortLabel})</span></h4>
          <div class="duel-row"><span>ขนาดเทียบโลก</span><span>${b.relativeEarthSize}× โลก</span></div>
          <div class="duel-row"><span>ระยะห่างดวงอาทิตย์</span><span>${b.distanceMillionKm === 0 ? 'ศูนย์กลาง' : `${b.distanceMillionKm.toLocaleString('th-TH')} ล้าน กม.`}</span></div>
          <div class="duel-row"><span>1 วัน (หมุนรอบตัวเอง)</span><span>${b.rotationText}</span></div>
          <div class="duel-row"><span>1 ปี (โคจรรอบดวงอาทิตย์)</span><span>${b.orbitalPeriodText}</span></div>
          <div class="duel-row"><span>อุณหภูมิ</span><span>${b.tempText}</span></div>
          <div class="duel-row"><span>เด็กหนัก 35 กก. จะหนัก</span><span>${sampleWeight} กก.</span></div>
        </div>
      `;
    };

    duelGrid.innerHTML = buildCard(bodyA) + buildCard(bodyB);
  }

  // ==================== Quiz Mission ====================

  function startQuiz() {
    state.quizIndex = 0;
    state.quizScore = 0;
    state.quizAnswered = false;
    state.quizSelectedOption = null;
    renderQuizView();
  }

  function renderQuizView() {
    const total = QUIZ_QUESTIONS.length;

    if (state.quizIndex >= total) {
      const pct = Math.round((state.quizScore / total) * 100);
      let rank = '🔭 นักเรียนอวกาศมือใหม่ (ลองสำรวจดาวอีกครั้งนะ!)';
      if (state.quizScore >= 9) {
        rank = '🏆 ผู้บัญชาการอวกาศระดับสูงสุด';
      } else if (state.quizScore >= 7) {
        rank = '🌟 นักดาราศาสตร์ตัวจริง';
      } else if (state.quizScore >= 5) {
        rank = '🛸 นักสำรวจอวกาศฝึกหัด';
      }

      quizBody.innerHTML = `
        <div class="quiz-result-card">
          <div class="quiz-rank-badge">${rank}</div>
          <div class="quiz-score-big">${state.quizScore} / ${total} คะแนน (${pct}%)</div>
          <p style="color: var(--text-secondary); margin-bottom: 18px;">
            เยี่ยมมาก! สามารถกลับไปหมุนดูแบบจำลองระบบสุริยะหรือทบทวนข้อที่สนใจเพิ่มเติมได้ทุกเมื่อ
          </p>
          <button id="btnRetryQuiz" class="action-btn accent" type="button">🔄 ทำภารกิจอีกครั้ง</button>
        </div>
      `;

      document.getElementById('btnRetryQuiz').addEventListener('click', startQuiz);
      return;
    }

    const q = QUIZ_QUESTIONS[state.quizIndex];
    const progressPct = ((state.quizIndex + (state.quizAnswered ? 1 : 0)) / total) * 100;
    const letters = ['ก', 'ข', 'ค', 'ง'];

    const optionsHtml = q.options
      .map((opt, idx) => {
        let cls = 'quiz-option-btn';
        if (state.quizAnswered) {
          if (idx === q.correctIndex) cls += ' correct';
          else if (idx === state.quizSelectedOption) cls += ' wrong';
        }
        return `<button class="${cls}" data-opt="${idx}" type="button" ${state.quizAnswered ? 'disabled' : ''}>${letters[idx]}. ${opt}</button>`;
      })
      .join('');

    let feedbackHtml = '';
    if (state.quizAnswered) {
      const isRight = state.quizSelectedOption === q.correctIndex;
      feedbackHtml = `
        <div class="quiz-feedback ${isRight ? 'ok' : 'bad'}">
          <strong>${isRight ? '✅ ถูกต้อง!' : '❌ ยังไม่ใช่นะ'}</strong> — ${q.explanation}
        </div>
        <div class="quiz-footer">
          <button id="btnQuizNext" class="action-btn accent" type="button">
            ${state.quizIndex === total - 1 ? 'ดูผลคะแนนสรุป →' : 'ข้อถัดไป →'}
          </button>
        </div>
      `;
    }

    quizBody.innerHTML = `
      <div class="quiz-progress-row">
        <span>ข้อที่ ${state.quizIndex + 1} จาก ${total}</span>
        <span>คะแนนสะสม: ${state.quizScore}</span>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${progressPct}%"></div>
      </div>
      <h3 class="quiz-question">${q.question}</h3>
      <div class="quiz-options">${optionsHtml}</div>
      ${feedbackHtml}
    `;

    quizBody.querySelectorAll('.quiz-option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.quizAnswered) return;
        const chosen = parseInt(btn.dataset.opt, 10);
        state.quizAnswered = true;
        state.quizSelectedOption = chosen;
        if (chosen === q.correctIndex) {
          state.quizScore += 1;
        }
        renderQuizView();
      });
    });

    const btnNext = document.getElementById('btnQuizNext');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        state.quizIndex += 1;
        state.quizAnswered = false;
        state.quizSelectedOption = null;
        renderQuizView();
      });
    }
  }

  // ==================== Modal Helpers ====================

  function openModal(modalEl) {
    modalEl.classList.remove('hidden');
  }

  function closeModal(modalEl) {
    modalEl.classList.add('hidden');
  }

  // ==================== Canvas Hit Testing & Zoom ====================

  function findBodyAtScreenPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    let best = null;
    let bestDist = Infinity;

    for (const item of lastHitMap) {
      const dist = Math.hypot(sx - item.screenX, sy - item.screenY);
      if (dist <= item.hitRadius) {
        // หากซ้อนทับกัน ให้ความสำคัญกับวัตถุขนาดเล็กก่อน (หรือระยะใกล้สุด)
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      }
    }
    if (best) return best.body;

    // ตรวจจับการคลิกหรือชี้บนแนวแถบดาวเคราะห์น้อยในโหมด 2D
    if (state.showAsteroids) {
      const worldX = state.cameraX + (sx - canvasWidth / 2) / state.zoom;
      const worldY = state.cameraY + (sy - canvasHeight / 2) / state.zoom;
      const rFromSun = Math.hypot(worldX, worldY);
      const padWorld = Math.max(8, 10 / state.zoom);
      if (
        rFromSun >= ASTEROID_BELT_INFO.innerOrbitPx - padWorld &&
        rFromSun <= ASTEROID_BELT_INFO.outerOrbitPx + padWorld
      ) {
        return ASTEROID_BELT_INFO;
      }
    }

    return null;
  }

  function applyZoomAroundScreenPoint(factor, screenX, screenY) {
    const oldZoom = state.zoom;
    const newZoom = Math.max(0.28, Math.min(3.5, oldZoom * factor));
    if (Math.abs(newZoom - oldZoom) < 0.0001) return;

    if (!state.followSelected) {
      const worldX = state.cameraX + (screenX - canvasWidth / 2) / oldZoom;
      const worldY = state.cameraY + (screenY - canvasHeight / 2) / oldZoom;
      state.cameraX = worldX - (screenX - canvasWidth / 2) / newZoom;
      state.cameraY = worldY - (screenY - canvasHeight / 2) / newZoom;
      state.targetCameraX = state.cameraX;
      state.targetCameraY = state.cameraY;
    }

    state.zoom = newZoom;
    state.targetZoom = newZoom;
    state.isCameraAnimating = false;
  }

  // ==================== Event Bindings ====================

  function bindEvents() {
    window.addEventListener('resize', resizeMainCanvas);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(resizeMainCanvas).observe(stageEl);
    }

    // Play / Pause
    btnPlayPause.addEventListener('click', () => {
      state.isPlaying = !state.isPlaying;
      btnPlayPause.textContent = state.isPlaying ? '⏸ หยุดชั่วคราว' : '▶ เล่นต่อ';
      btnPlayPause.classList.toggle('paused', !state.isPlaying);
    });

    // Speed Presets
    document.querySelectorAll('.speed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.daysPerSecond = parseFloat(btn.dataset.speed);
      });
    });

    // Classification Filters
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.filterGroup = btn.dataset.filter;
      });
    });

    // Layer Checkboxes
    chkOrbits.addEventListener('change', () => {
      state.showOrbits = chkOrbits.checked;
    });
    chkLabels.addEventListener('change', () => {
      state.showLabels = chkLabels.checked;
    });
    chkAsteroids.addEventListener('change', () => {
      state.showAsteroids = chkAsteroids.checked;
      buildPlanetDock();
      if (!state.showAsteroids && state.selectedId === ASTEROID_BELT_INFO.id) {
        closeDetailDrawer();
      }
    });
    chkExtras.addEventListener('change', () => {
      state.showExtras = chkExtras.checked;
      buildPlanetDock();
      if (!state.showExtras && state.selectedId) {
        const selected = getBodyById(state.selectedId);
        if (selected && selected.isOptionalExtra) {
          closeDetailDrawer();
        }
      }
    });

    // 2D / 3D Mode Switcher & 3D Camera Presets
    btnMode3D.addEventListener('click', () => setViewMode('3d'));
    btnMode2D.addEventListener('click', () => setViewMode('2d'));

    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.viewMode !== '3d' || !engine3D || !engine3D.supported) return;
        state.followSelected = false;
        updateFollowButton();
        state.preset3D = btn.dataset.preset;
        document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        engine3D.setCameraPreset(state.preset3D, false);
      });
    });

    chkAxes3D.addEventListener('change', () => {
      state.showAxes3D = chkAxes3D.checked;
    });

    // Zoom & Reset
    btnZoomIn.addEventListener('click', () => {
      if (state.viewMode === '3d' && engine3D && engine3D.supported) {
        engine3D.zoomBy(1.25);
      } else {
        applyZoomAroundScreenPoint(1.25, canvasWidth / 2, canvasHeight / 2);
      }
    });
    btnZoomOut.addEventListener('click', () => {
      if (state.viewMode === '3d' && engine3D && engine3D.supported) {
        engine3D.zoomBy(0.8);
      } else {
        applyZoomAroundScreenPoint(0.8, canvasWidth / 2, canvasHeight / 2);
      }
    });
    btnResetView.addEventListener('click', () => resetCameraView(false));

    // Canvas Pointer Pan / Click / Hover
    canvas.addEventListener('pointerdown', (e) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      camStartX = state.cameraX;
      camStartY = state.cameraY;
      pointerMovedDist = 0;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      if (isDragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        pointerMovedDist = Math.hypot(dx, dy);

        if (pointerMovedDist > 4) {
          if (state.followSelected) {
            state.followSelected = false;
            updateFollowButton();
          }
          state.isCameraAnimating = false;
          state.cameraX = camStartX - dx / state.zoom;
          state.cameraY = camStartY - dy / state.zoom;
          state.targetCameraX = state.cameraX;
          state.targetCameraY = state.cameraY;
          hoverTooltip.classList.add('hidden');
          return;
        }
      }

      // Hover hit-test
      const hovered = findBodyAtScreenPos(e.clientX, e.clientY);
      canvas.style.cursor = hovered ? 'pointer' : isDragging ? 'grabbing' : 'grab';
      showBodyTooltip(hovered, e.clientX, e.clientY);
    });

    canvas.addEventListener('pointerup', (e) => {
      if (isDragging && pointerMovedDist < 6) {
        const clicked = findBodyAtScreenPos(e.clientX, e.clientY);
        if (clicked) {
          selectBody(clicked.id, { focusCamera: false });
        }
      }
      isDragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener('pointerleave', () => {
      state.hoveredId = null;
      hoverTooltip.classList.add('hidden');
    });

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const factor = e.deltaY < 0 ? 1.14 : 0.88;
        applyZoomAroundScreenPoint(factor, e.clientX - rect.left, e.clientY - rect.top);
      },
      { passive: false }
    );

    // Detail Drawer controls
    btnCloseDrawer.addEventListener('click', closeDetailDrawer);
    btnPrevBody.addEventListener('click', () => stepSelectedBody(-1));
    btnNextBody.addEventListener('click', () => stepSelectedBody(1));

    btnFollowBody.addEventListener('click', () => {
      if (!state.selectedId) return;
      if (state.selectedId === ASTEROID_BELT_INFO.id) {
        selectBody(ASTEROID_BELT_INFO.id, { focusCamera: true, enableFollow: false });
        return;
      }
      state.followSelected = !state.followSelected;
      if (state.followSelected) {
        if (state.viewMode === '3d' && engine3D && engine3D.supported) {
          engine3D.focusBody(state.selectedId, state.elapsedDays);
        } else {
          const body = getBodyById(state.selectedId);
          const pos = getOrbitalPosition(body, state.elapsedDays);
          state.targetCameraX = pos.x;
          state.targetCameraY = pos.y;
          state.isCameraAnimating = true;
        }
      }
      updateFollowButton();
    });

    inputEarthWeight.addEventListener('input', () => updateAstroCalculator());
    inputEarthAge.addEventListener('input', () => updateAstroCalculator());

    // Modals
    document.getElementById('btnOpenCompare').addEventListener('click', () => {
      openModal(compareModal);
      requestAnimationFrame(renderCompareCanvas);
    });

    document.getElementById('btnScalePlanets').addEventListener('click', (e) => {
      state.compareScaleMode = 'planets';
      e.currentTarget.classList.add('active');
      document.getElementById('btnScaleSun').classList.remove('active');
      renderCompareCanvas();
    });

    document.getElementById('btnScaleSun').addEventListener('click', (e) => {
      state.compareScaleMode = 'sun';
      e.currentTarget.classList.add('active');
      document.getElementById('btnScalePlanets').classList.remove('active');
      renderCompareCanvas();
    });

    compareSelectA.addEventListener('change', updateCompareDuel);
    compareSelectB.addEventListener('change', updateCompareDuel);

    document.getElementById('btnOpenQuiz').addEventListener('click', () => {
      startQuiz();
      openModal(quizModal);
    });

    document.getElementById('btnOpenGuide').addEventListener('click', () => {
      openModal(guideModal);
    });

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById(btn.dataset.closeModal);
        if (modal) closeModal(modal);
      });
    });

    [compareModal, quizModal, guideModal].forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop);
        }
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        btnPlayPause.click();
      } else if (e.key === 'r' || e.key === 'R') {
        resetCameraView(false);
      } else if (e.key === 'Escape') {
        [compareModal, quizModal, guideModal].forEach(closeModal);
      } else if (e.key >= '0' && e.key <= '8') {
        const order = parseInt(e.key, 10);
        const target = SOLAR_BODIES.find((b) => b.order === order);
        if (target) {
          selectBody(target.id, { focusCamera: true, enableFollow: target.id !== 'sun' });
        }
      }
    });
  }

  // ==================== Animation Loop ====================

  function tick(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    state.animTimeSec += dt;

    if (state.isPlaying) {
      state.elapsedDays += dt * state.daysPerSecond;
    }

    // อัปเดตตำแหน่งกล้องถ้ากำลังติดตามดาวหรือกำลังซูมกลับ (เฉพาะโหมด 2D; โหมด 3D จัดการใน engine3D)
    if (state.viewMode === '2d') {
      if (state.followSelected && state.selectedId) {
        const body = getBodyById(state.selectedId);
        if (body) {
          const pos = getOrbitalPosition(body, state.elapsedDays);
          state.cameraX += (pos.x - state.cameraX) * Math.min(1, dt * 8);
          state.cameraY += (pos.y - state.cameraY) * Math.min(1, dt * 8);
          state.zoom += (state.targetZoom - state.zoom) * Math.min(1, dt * 6);
        }
      } else if (state.isCameraAnimating) {
        const factor = Math.min(1, dt * 7);
        state.cameraX += (state.targetCameraX - state.cameraX) * factor;
        state.cameraY += (state.targetCameraY - state.cameraY) * factor;
        state.zoom += (state.targetZoom - state.zoom) * factor;
        if (
          Math.hypot(state.targetCameraX - state.cameraX, state.targetCameraY - state.cameraY) < 0.4 &&
          Math.abs(state.targetZoom - state.zoom) < 0.004
        ) {
          state.cameraX = state.targetCameraX;
          state.cameraY = state.targetCameraY;
          state.zoom = state.targetZoom;
          state.isCameraAnimating = false;
        }
      }
    }

    // อัปเดตนาฬิกาเวลาโลก
    const totalDaysRounded = Math.floor(state.elapsedDays);
    const earthYears = (state.elapsedDays / 365.25).toFixed(2);
    clockEl.textContent = `เวลาผ่านไป: ${totalDaysRounded.toLocaleString('th-TH')} วัน (${earthYears} ปีโลก)`;

    if (state.viewMode === '3d' && engine3D && engine3D.supported) {
      engine3D.renderFrame(state);
    } else {
      lastHitMap = renderSolarScene(ctx, canvasWidth, canvasHeight, state);
    }
    requestAnimationFrame(tick);
  }

  // Bootstrap
  function init() {
    resizeMainCanvas();
    resetCameraView(true);
    buildPlanetDock();
    initCompareLab();
    bindEvents();
    setViewMode('3d');
    requestAnimationFrame(tick);
  }

  init();
})(window);
