(function (global) {
  'use strict';

  /**
   * กลุ่มประเภทวัตถุในระบบสุริยะ (ดาวเคราะห์ชั้นใน / ดาวเคราะห์ชั้นนอก / วัตถุอื่นๆ)
   */
  const CATEGORY_META = {
    star: {
      id: 'star',
      label: 'ดาวฤกษ์ศูนย์กลาง',
      shortLabel: 'ดาวฤกษ์',
      badgeColor: '#ffb703',
      description: 'แหล่งกำเนิดแสงสว่างและความร้อนของระบบสุริยะ'
    },
    rocky: {
      id: 'rocky',
      label: 'ดาวเคราะห์ชั้นใน (ดาวเคราะห์หิน)',
      shortLabel: 'ดาวเคราะห์ชั้นใน',
      badgeColor: '#fb8500',
      description: 'อยู่ใกล้ดวงอาทิตย์ มีพื้นผิวเป็นหินแข็ง ขนาดเล็กกว่ากลุ่มนอก'
    },
    gas: {
      id: 'gas',
      label: 'ดาวเคราะห์ชั้นนอก (แก๊สยักษ์)',
      shortLabel: 'ดาวเคราะห์ชั้นนอก',
      badgeColor: '#e09f3e',
      description: 'ขนาดใหญ่มาก ไม่มีพื้นแข็งให้ยืน มีวงแหวนและบริวารจำนวนมาก'
    },
    ice: {
      id: 'ice',
      label: 'ดาวเคราะห์ชั้นนอก (น้ำแข็งยักษ์)',
      shortLabel: 'ดาวเคราะห์ชั้นนอก',
      badgeColor: '#4cc9f0',
      description: 'อยู่ไกลและหนาวจัด เต็มไปด้วยน้ำ แอมโมเนีย และมีเทนในรูปน้ำแข็ง'
    },
    dwarf: {
      id: 'dwarf',
      label: 'ดาวเคราะห์แคระ',
      shortLabel: 'ดาวเคราะห์แคระ',
      badgeColor: '#b5838d',
      description: 'โคจรรอบดวงอาทิตย์และมีทรงกลม แต่ยังเคลียร์วัตถุอื่นในวงโคจรไม่หมด'
    },
    comet: {
      id: 'comet',
      label: 'วัตถุขนาดเล็ก (ดาวหาง)',
      shortLabel: 'ดาวหาง',
      badgeColor: '#72efdd',
      description: 'ก้อนน้ำแข็งและฝุ่นที่โคจรเป็นวงรีมาก มีหางพุ่งหนีดวงอาทิตย์เสมอ'
    },
    belt: {
      id: 'belt',
      label: 'แถบวัตถุหินและโลหะ',
      shortLabel: 'แถบดาวเคราะห์น้อย',
      badgeColor: '#cbd5e1',
      description: 'แนววัตถุหินและโลหะที่โคจรอยู่ระหว่างดาวอังคารและดาวพฤหัสบดี'
    }
  };

  /**
   * ข้อมูลวัตถุในระบบสุริยะ (ความเร็ว/ระยะห่างบนผืนผ้าใบใช้สเกลแบบ Classroom View เพื่อการเรียนรู้)
   */
  const SOLAR_BODIES = [
    {
      id: 'sun',
      order: 0,
      nameTh: 'ดวงอาทิตย์',
      nameEn: 'Sun',
      subtitle: 'ดาวฤกษ์ศูนย์กลางระบบสุริยะ',
      category: 'star',
      groupFilter: 'all',
      orbitRadiusPx: 0,
      eccentricity: 0,
      orbitInclinationOffset: 0,
      visualRadiusPx: 38,
      relativeEarthSize: 109,
      distanceMillionKm: 0,
      distanceAU: 0,
      rotationDays: 25.4,
      rotationText: '25.4 วันโลก (ที่เส้นศูนย์สูตร)',
      orbitalPeriodDays: 0,
      orbitalPeriodText: 'ศูนย์กลางของระบบ',
      tempText: 'ผิว ~5,500 °C (แกน ~15 ล้าน °C)',
      moonsText: 'มีดาวเคราะห์ 8 ดวงเป็นบริวาร',
      gravityFactor: 27.9,
      axialTiltDeg: 7.25,
      retrograde: false,
      color: '#ff9e00',
      secondaryColor: '#ffd166',
      initialAngleRad: 0,
      highlights: [
        'เป็นดาวฤกษ์เพียงดวงเดียวในระบบสุริยะ ผลิตแสงสว่างและความร้อนเองได้จากปฏิกิริยานิวเคลียร์ฟิวชัน',
        'มีมวลมากถึง 99.86% ของมวลทั้งระบบสุริยะ ทำให้มีแรงโน้มถ่วงดึงดูดดาวเคราะห์ทั้งหมดให้โคจรรอบ',
        'ใหญ่กว่าโลกมากถึง 109 เท่า ถ้านำโลกใส่เข้าไปข้างในจะใส่ได้มากกว่า 1 ล้านใบ'
      ],
      curriculumTip: 'จุดเน้นสำคัญ: ดาวฤกษ์มีแสงสว่างในตัวเอง ส่วนดาวเคราะห์ไม่มีแสงสว่างในตัวเอง แต่สะท้อนแสงจากดวงอาทิตย์'
    },
    {
      id: 'mercury',
      order: 1,
      nameTh: 'ดาวพุธ',
      nameEn: 'Mercury',
      subtitle: 'ดาวเคราะห์ที่เล็กที่สุดและใกล้ดวงอาทิตย์ที่สุด',
      category: 'rocky',
      groupFilter: 'inner',
      orbitRadiusPx: 74,
      eccentricity: 0.08,
      orbitalInclinationDeg: 7.0,
      orbitInclinationOffset: 0,
      visualRadiusPx: 6,
      relativeEarthSize: 0.38,
      distanceMillionKm: 57.9,
      distanceAU: 0.39,
      rotationDays: 58.6,
      rotationText: '58.6 วันโลก',
      orbitalPeriodDays: 88,
      orbitalPeriodText: '88 วันโลก',
      tempText: '-180 °C ถึง 430 °C',
      moonsText: '0 ดวง',
      gravityFactor: 0.38,
      axialTiltDeg: 0.03,
      retrograde: false,
      color: '#9e9e9e',
      secondaryColor: '#6c757d',
      initialAngleRad: -0.25,
      highlights: [
        'อยู่ใกล้ดวงอาทิตย์ที่สุดและโคจรเร็วที่สุด 1 ปีบนดาวพุธสั้นเพียง 88 วันโลก',
        'แทบไม่มีชั้นบรรยากาศห่อหุ้ม จึงเก็บความร้อนไม่ได้: กลางวันร้อนจัด 430 °C แต่กลางคืนหนาวจัด -180 °C',
        'พื้นผิวเต็มไปด้วยหลุมอุกกาบาต คล้ายกับดวงจันทร์ของโลก'
      ],
      curriculumTip: 'เกร็ดจำง่าย: แม้ดาวพุธจะอยู่ใกล้ดวงอาทิตย์ที่สุด แต่ไม่ใช่ดาวที่ร้อนที่สุด (ดาวศุกร์ร้อนกว่า!)'
    },
    {
      id: 'venus',
      order: 2,
      nameTh: 'ดาวศุกร์',
      nameEn: 'Venus',
      subtitle: 'ดาวเคราะห์ที่ร้อนที่สุดและสว่างที่สุดบนฟ้ายามค่ำ',
      category: 'rocky',
      groupFilter: 'inner',
      orbitRadiusPx: 108,
      eccentricity: 0.01,
      orbitalInclinationDeg: 3.39,
      orbitInclinationOffset: 0,
      visualRadiusPx: 9.5,
      relativeEarthSize: 0.95,
      distanceMillionKm: 108.2,
      distanceAU: 0.72,
      rotationDays: 243,
      rotationText: '243 วันโลก (หมุนสวนทาง)',
      orbitalPeriodDays: 224.7,
      orbitalPeriodText: '225 วันโลก',
      tempText: 'เฉลี่ย ~464 °C',
      moonsText: '0 ดวง',
      gravityFactor: 0.91,
      axialTiltDeg: 177.4,
      retrograde: true,
      color: '#e6b873',
      secondaryColor: '#c98a42',
      initialAngleRad: 1.78,
      highlights: [
        'ร้อนที่สุดในระบบสุริยะ (~464 °C) เพราะมีชั้นบรรยากาศก๊าซคาร์บอนไดออกไซด์หนาแน่น เกิดภาวะเรือนกระจกรุนแรง',
        'หมุนรอบตัวเองช้ามาก (243 วันโลก) จน 1 วันของดาวศุกร์ยาวนานกว่า 1 ปีของมันเอง (225 วันโลก)!',
        'หมุนรอบตัวเองสวนทางกับดาวเคราะห์ส่วนใหญ่ (หมุนจากตะวันออกไปตะวันตก) และคนไทยเรียก "ดาวประจำเมือง" หรือ "ดาวประกายพรึก"'
      ],
      curriculumTip: 'จุดสังเกต: ขนาดใกล้เคียงโลกมากจนได้ฉายาว่า "ฝาแฝดของโลก" แต่สภาพอากาศไม่เอื้อต่อสิ่งมีชีวิต'
    },
    {
      id: 'earth',
      order: 3,
      nameTh: 'โลก',
      nameEn: 'Earth',
      subtitle: 'ดาวเคราะห์สีน้ำเงิน บ้านของสิ่งมีชีวิต',
      category: 'rocky',
      groupFilter: 'inner',
      orbitRadiusPx: 148,
      eccentricity: 0.017,
      orbitalInclinationDeg: 0,
      orbitInclinationOffset: 0,
      visualRadiusPx: 10.5,
      relativeEarthSize: 1.0,
      distanceMillionKm: 149.6,
      distanceAU: 1.0,
      rotationDays: 1,
      rotationText: '24 ชั่วโมง (1 วันโลก)',
      orbitalPeriodDays: 365.25,
      orbitalPeriodText: '365.25 วัน (1 ปีโลก)',
      tempText: 'เฉลี่ย ~15 °C',
      moonsText: '1 ดวง (ดวงจันทร์)',
      gravityFactor: 1.0,
      axialTiltDeg: 23.44,
      retrograde: false,
      color: '#2b8cbe',
      secondaryColor: '#52b788',
      hasMoon: true,
      initialAngleRad: 3.7,
      highlights: [
        'อยู่ห่างจากดวงอาทิตย์ในระยะที่พอเหมาะ (เขตเอื้ออาศัย) ทำให้น้ำคงสภาพเป็นของเหลวได้',
        'พื้นผิวกว่า 71% ปกคลุมด้วยน้ำ และมีชั้นบรรยากาศที่มีก๊าซออกซิเจนเหมาะแก่สิ่งมีชีวิต',
        'แกนโลกเอียง 23.4 องศา ทำให้เกิดฤดูกาลต่างๆ ขณะโคจรรอบดวงอาทิตย์'
      ],
      curriculumTip: 'สังเกตบนจอ: ดวงจันทร์สีเทาขนาดเล็กกำลังโคจรรอบโลก พร้อมกับที่โลกโคจรรอบดวงอาทิตย์'
    },
    {
      id: 'mars',
      order: 4,
      nameTh: 'ดาวอังคาร',
      nameEn: 'Mars',
      subtitle: 'ดาวเคราะห์สีแดง ดาวเพื่อนบ้านแห่งการสำรวจ',
      category: 'rocky',
      groupFilter: 'inner',
      orbitRadiusPx: 192,
      eccentricity: 0.07,
      orbitalInclinationDeg: 1.85,
      orbitInclinationOffset: 0,
      visualRadiusPx: 7.8,
      relativeEarthSize: 0.53,
      distanceMillionKm: 227.9,
      distanceAU: 1.52,
      rotationDays: 1.03,
      rotationText: '24 ชม. 37 นาที',
      orbitalPeriodDays: 687,
      orbitalPeriodText: '687 วันโลก (~1.88 ปี)',
      tempText: 'เฉลี่ย ~ -65 °C',
      moonsText: '2 ดวง (โฟบอส, ดีมอส)',
      gravityFactor: 0.38,
      axialTiltDeg: 25.19,
      retrograde: false,
      color: '#d1492f',
      secondaryColor: '#9c2c1c',
      initialAngleRad: 5.2,
      highlights: [
        'มีสีแดงส้มเพราะดินบนพื้นผิวมีแร่เหล็กออกไซด์ (สนิมเหล็ก) ปกคลุมอยู่ทั่วดวงดาว',
        'มีภูเขาไฟที่สูงที่สุดในระบบสุริยะชื่อ "โอลิมปัสมอนส์" สูงกว่ายอดเขาเอเวอเรสต์เกือบ 3 เท่า',
        'มีน้ำแข็งอยู่ที่ขั้วดาวทั้งสองด้าน และ 1 วันยาวเกือบเท่าโลกมาก (24 ชั่วโมง 37 นาที)'
      ],
      curriculumTip: 'ถัดจากวงโคจรของดาวอังคารออกไป จะพบ "แถบดาวเคราะห์น้อย" คั่นระหว่างดาวเคราะห์หินและดาวเคราะห์แก๊ส'
    },
    {
      id: 'jupiter',
      order: 5,
      nameTh: 'ดาวพฤหัสบดี',
      nameEn: 'Jupiter',
      subtitle: 'ราชาแห่งดาวเคราะห์ ใหญ่ที่สุดในระบบสุริยะ',
      category: 'gas',
      groupFilter: 'outer',
      orbitRadiusPx: 274,
      eccentricity: 0.04,
      orbitalInclinationDeg: 1.3,
      orbitInclinationOffset: 0,
      visualRadiusPx: 22,
      relativeEarthSize: 11.0,
      distanceMillionKm: 778.5,
      distanceAU: 5.2,
      rotationDays: 0.41,
      rotationText: '9 ชม. 55 นาที (เร็วที่สุด)',
      orbitalPeriodDays: 4333,
      orbitalPeriodText: '11.86 ปีโลก',
      tempText: 'ยอดเมฆ ~ -110 °C',
      moonsText: '95 ดวง (ที่ยืนยันแล้ว)',
      gravityFactor: 2.53,
      axialTiltDeg: 3.13,
      retrograde: false,
      color: '#d8a47f',
      secondaryColor: '#b5653d',
      hasGreatRedSpot: true,
      initialAngleRad: 1.1,
      highlights: [
        'ใหญ่ที่สุดในระบบสุริยะ เส้นผ่านศูนย์กลางกว้างกว่าโลกถึง 11 เท่า',
        'เป็นดาวเคราะห์แก๊สยักษ์ (ไฮโดรเจนและฮีเลียม) ไม่มีพื้นผิวดินแข็งให้ยืน และหมุนรอบตัวเองเร็วที่สุด',
        'มี "จุดแดงใหญ่" (Great Red Spot) ซึ่งเป็นพายุหมุนขนาดมหึมาที่พัดต่อเนื่องมานานกว่า 300 ปี'
      ],
      curriculumTip: 'จุดเน้นสำคัญ: ดาวพฤหัสบดีมีแรงโน้มถ่วงสูงมาก ช่วยดึงดูดและเบี่ยงเบนอุกกาบาตบางส่วนไม่ให้พุ่งเข้าชนดาวชั้นใน'
    },
    {
      id: 'saturn',
      order: 6,
      nameTh: 'ดาวเสาร์',
      nameEn: 'Saturn',
      subtitle: 'ราชาแห่งวงแหวน ดาวเคราะห์ที่เบาจนลอยน้ำได้',
      category: 'gas',
      groupFilter: 'outer',
      orbitRadiusPx: 350,
      eccentricity: 0.05,
      orbitalInclinationDeg: 2.49,
      orbitInclinationOffset: 0,
      visualRadiusPx: 18,
      relativeEarthSize: 9.1,
      distanceMillionKm: 1434,
      distanceAU: 9.58,
      rotationDays: 0.45,
      rotationText: '10 ชม. 42 นาที',
      orbitalPeriodDays: 10759,
      orbitalPeriodText: '29.45 ปีโลก',
      tempText: 'ยอดเมฆ ~ -140 °C',
      moonsText: '146+ ดวง (มากที่สุด)',
      gravityFactor: 1.07,
      axialTiltDeg: 26.73,
      retrograde: false,
      color: '#e5c17b',
      secondaryColor: '#b89650',
      hasRings: true,
      initialAngleRad: 4.1,
      highlights: [
        'โดดเด่นด้วยระบบวงแหวนที่กว้างและเห็นชัดที่สุด ประกอบขึ้นจากก้อนน้ำแข็ง เศษหิน และฝุ่นนับล้านชิ้น',
        'ความหนาแน่นเฉลี่ยน้อยกว่าน้ำ (0.687 g/cm³) หากมีอ่างน้ำขนาดยักษ์ ดาวเสาร์จะลอยน้ำได้!',
        'มีดวงจันทร์บริวารมากที่สุดในระบบสุริยะ รวมถึง "ไททัน" ที่มีทะเลสาบมีเทนเหลว'
      ],
      curriculumTip: 'เกร็ดน่ารู้: แม้จะใหญ่เป็นอันดับ 2 รองจากดาวพฤหัส แต่แรงโน้มถ่วงบริเวณชั้นเมฆของดาวเสาร์ใกล้เคียงกับโลกมาก'
    },
    {
      id: 'uranus',
      order: 7,
      nameTh: 'ดาวยูเรนัส',
      nameEn: 'Uranus',
      subtitle: 'ดาวเคราะห์น้ำแข็งสีฟ้าอมเขียวที่หมุนตะแคงข้าง',
      category: 'ice',
      groupFilter: 'outer',
      orbitRadiusPx: 416,
      eccentricity: 0.04,
      orbitalInclinationDeg: 0.77,
      orbitInclinationOffset: 0,
      visualRadiusPx: 13.5,
      relativeEarthSize: 4.0,
      distanceMillionKm: 2871,
      distanceAU: 19.2,
      rotationDays: 0.72,
      rotationText: '17 ชม. 14 นาที (หมุนตะแคง)',
      orbitalPeriodDays: 30687,
      orbitalPeriodText: '84 ปีโลก',
      tempText: 'ยอดเมฆ ~ -195 °C',
      moonsText: '28 ดวง',
      gravityFactor: 0.89,
      axialTiltDeg: 97.77,
      retrograde: true,
      color: '#72d5e8',
      secondaryColor: '#48cae4',
      hasVerticalRing: true,
      initialAngleRad: 2.7,
      highlights: [
        'แกนหมุนเอียงมากถึงเกือบ 98 องศา ทำให้ดูเหมือน "นอนกลิ้ง" ไปตามวงโคจรรอบดวงอาทิตย์',
        'มีสีฟ้าอมเขียวสดใสเพราะก๊าซมีเทนในชั้นบรรยากาศดูดซับแสงสีแดงและสะท้อนแสงสีฟ้าออกมา',
        'มีวงแหวนบางๆ สีคล้ำวางตัวในแนวตั้งตามการเอียงของแกนดาว'
      ],
      curriculumTip: 'เกร็ดน่ารู้: 1 ปีบนดาวยูเรนัสเท่ากับ 84 ปีโลก ขั้วโลกหนึ่งจะได้รับแสงแดดยาวนานถึง 42 ปี แล้วมืดมิดอีก 42 ปี'
    },
    {
      id: 'neptune',
      order: 8,
      nameTh: 'ดาวเนปจูน',
      nameEn: 'Neptune',
      subtitle: 'ดาวเคราะห์สีน้ำเงินเข้ม แห่งกระแสลมแรงที่สุด',
      category: 'ice',
      groupFilter: 'outer',
      orbitRadiusPx: 476,
      eccentricity: 0.01,
      orbitalInclinationDeg: 1.77,
      orbitInclinationOffset: 0,
      visualRadiusPx: 13,
      relativeEarthSize: 3.9,
      distanceMillionKm: 4495,
      distanceAU: 30.1,
      rotationDays: 0.67,
      rotationText: '16 ชม. 6 นาที',
      orbitalPeriodDays: 60190,
      orbitalPeriodText: '164.8 ปีโลก',
      tempText: 'ยอดเมฆ ~ -200 °C',
      moonsText: '16 ดวง',
      gravityFactor: 1.14,
      axialTiltDeg: 28.32,
      retrograde: false,
      color: '#3a66e8',
      secondaryColor: '#2541b2',
      initialAngleRad: 5.8,
      highlights: [
        'อยู่ไกลดวงอาทิตย์มากที่สุดในบรรดาดาวเคราะห์ทั้ง 8 ดวง (ไกลกว่าโลก 30 เท่า)',
        'มีกระแสลมรุนแรงที่สุดในระบบสุริยะ ความเร็วลมสูงกว่า 2,000 กิโลเมตรต่อชั่วโมง',
        'โคจรรอบดวงอาทิตย์ 1 รอบใช้เวลานานถึง 164.8 ปีโลก (นับแต่ค้นพบในปี 1846 เพิ่งโคจรครบ 1 รอบในปี 2011)'
      ],
      curriculumTip: 'จุดเน้นสำคัญ: ยิ่งดาวเคราะห์อยู่ไกลดวงอาทิตย์มาก คาบการโคจรยิ่งนาน และความเร็วในการโคจรยิ่งช้าลง'
    },
    {
      id: 'pluto',
      order: 9,
      nameTh: 'ดาวพลูโต',
      nameEn: 'Pluto',
      subtitle: 'ดาวเคราะห์แคระในแถบไคเปอร์',
      category: 'dwarf',
      groupFilter: 'small',
      orbitRadiusPx: 535,
      eccentricity: 0.16,
      orbitalInclinationDeg: 17.16,
      orbitTiltRad: 0.38,
      visualRadiusPx: 5.5,
      relativeEarthSize: 0.19,
      distanceMillionKm: 5906,
      distanceAU: 39.5,
      rotationDays: 6.39,
      rotationText: '6.4 วันโลก',
      orbitalPeriodDays: 90560,
      orbitalPeriodText: '248 ปีโลก',
      tempText: 'เฉลี่ย ~ -229 °C',
      moonsText: '5 ดวง (ใหญ่สุดคือแครอน)',
      gravityFactor: 0.06,
      axialTiltDeg: 122.5,
      retrograde: true,
      color: '#d4b89c',
      secondaryColor: '#9c7c66',
      isOptionalExtra: true,
      initialAngleRad: 0.85,
      highlights: [
        'เคยถูกจัดเป็นดาวเคราะห์ดวงที่ 9 แต่ตั้งแต่ปี 2006 ถูกจัดใหม่เป็น "ดาวเคราะห์แคระ" (Dwarf Planet)',
        'มีขนาดเล็กกว่าดวงจันทร์ของโลกเสียอีก และมีพื้นที่ราบน้ำแข็งไนโตรเจนรูป "หัวใจ" อันโด่งดัง',
        'วงโคจรมีลักษณะรีมาก บางช่วงสามารถขยับเข้ามาใกล้ดวงอาทิตย์ยิ่งกว่าดาวเนปจูนได้ชั่วคราว'
      ],
      curriculumTip: 'เหตุผลที่พลูโตไม่ใช่ดาวเคราะห์: มีขนาดเล็กและไม่สามารถกวาดวัตถุน้ำแข็งขนาดใกล้เคียงกันในแถบไคเปอร์ให้ออกไปพ้นทางโคจรได้'
    },
    {
      id: 'comet',
      order: 10,
      nameTh: 'ดาวหาง',
      nameEn: 'Comet (Halley-type)',
      subtitle: 'ก้อนน้ำแข็งสกปรกที่มีหางชี้ออกจากดวงอาทิตย์เสมอ',
      category: 'comet',
      groupFilter: 'small',
      orbitRadiusPx: 320,
      eccentricity: 0.72,
      orbitalInclinationDeg: 24.0,
      orbitTiltRad: -0.45,
      visualRadiusPx: 5.5,
      relativeEarthSize: 0.001,
      distanceMillionKm: 2660,
      distanceAU: 17.8,
      rotationDays: 2.2,
      rotationText: '~2.2 วันโลก',
      orbitalPeriodDays: 27400,
      orbitalPeriodText: 'ราว 75 ปีโลก (แบบดาวหางฮัลเลย์)',
      tempText: '-200 °C ถึงมากกว่า 70 °C (เมื่อใกล้ดวงอาทิตย์)',
      moonsText: 'ไม่มีบริวาร',
      gravityFactor: 0.0001,
      axialTiltDeg: 0,
      retrograde: false,
      color: '#90f1ef',
      secondaryColor: '#ffd6e0',
      isOptionalExtra: true,
      isComet: true,
      initialAngleRad: 2.15,
      highlights: [
        'ประกอบด้วยน้ำแข็ง ฝุ่น และก้อนหิน จึงมักถูกเรียกว่า "ก้อนน้ำแข็งสกปรก" (Dirty Snowball)',
        'โคจรเป็นวงรีมาก เมื่อเข้าใกล้ดวงอาทิตย์ ความร้อนจะทำให้น้ำแข็งระเหิดเป็นก๊าซสว่างไสวเกิดเป็นหัวและหาง',
        'ข้อควรจำสำคัญ: หางของดาวหางจะพุ่งชี้ออกจากดวงอาทิตย์เสมอ เพราะถูกลมสุริยะและแรงดันแสงพัดเป่า'
      ],
      curriculumTip: 'ลองสังเกตบนจอ: ดาวหางจะไม่ลากหางไว้ข้างหลังทิศการเคลื่อนที่เสมอไป แต่หางจะชี้หนีจากดวงอาทิตย์ตลอดเวลา!'
    }
  ];

  /**
   * ข้อมูลแถบดาวเคราะห์น้อย (ใช้เมื่อคลิกหรือเน้นศึกษาองค์ประกอบระบบสุริยะ)
   */
  const ASTEROID_BELT_INFO = {
    id: 'asteroid-belt',
    order: 4.5,
    nameTh: 'แถบดาวเคราะห์น้อย',
    nameEn: 'Asteroid Belt',
    subtitle: 'แนวหินและโลหะระหว่างดาวอังคารกับดาวพฤหัสบดี',
    category: 'belt',
    groupFilter: 'small',
    isBelt: true,
    innerOrbitPx: 218,
    outerOrbitPx: 244,
    orbitRadiusPx: 231,
    visualRadiusPx: 14,
    relativeEarthSize: 0.074,
    sizeText: 'ใหญ่สุดคือเซเรส (~0.07× โลก / ~940 กม.)',
    distanceMillionKm: 404,
    distanceText: '329 – 478 ล้าน กม. (2.2 – 3.2 AU)',
    rotationDays: 0.38,
    rotationText: '4 – 9 ชม. (ต่างกันตามแต่ละก้อน)',
    orbitalPeriodDays: 1680,
    orbitalPeriodText: '3 – 6 ปีโลก (เฉลี่ย ~4.6 ปี)',
    tempText: '-73 °C ถึง -108 °C',
    moonsLabel: 'วัตถุเด่นที่พบในแถบ',
    moonsText: 'ดาวเคราะห์แคระเซเรส, เวสตา, พัลลาส',
    gravityFactor: 0.029,
    color: '#a8a29e',
    secondaryColor: '#e7e5e4',
    description: 'อยู่ระหว่างวงโคจรของดาวอังคารและดาวพฤหัสบดี เต็มไปด้วยหินและโลหะที่เหลือจากการก่อตัวของระบบสุริยะ',
    highlights: [
      'ตั้งอยู่ระหว่างวงโคจรของดาวอังคาร (ดวงที่ 4) และดาวพฤหัสบดี (ดวงที่ 5) เป็นแนวแบ่งระหว่างดาวเคราะห์ชั้นในและดาวเคราะห์ชั้นนอก',
      'ประกอบด้วยก้อนหินและโลหะนับล้านก้อนที่แรงโน้มถ่วงมหาศาลของดาวพฤหัสบดีขัดขวางไม่ให้รวมตัวกันเป็นดาวเคราะห์',
      'ในอวกาศจริงก้อนหินแต่ละก้อนอยู่ห่างกันหลายแสนกิโลเมตร ไม่ได้เบียดเสียดกันเหมือนในภาพยนตร์ ยานสำรวจจึงบินผ่านได้ปลอดภัย',
      'วัตถุที่มีขนาดใหญ่ที่สุดในแถบนี้คือ "ดาวเคราะห์แคระเซเรส (Ceres)" มีขนาดราว 1 ใน 4 ของดวงจันทร์โลก'
    ],
    curriculumTip: 'จุดเน้นสำคัญ: แถบดาวเคราะห์น้อยคั่นกลางระหว่างดาวเคราะห์หิน 4 ดวงแรก (ชั้นใน) กับดาวเคราะห์แก๊สและน้ำแข็ง 4 ดวงหลัง (ชั้นนอก)'
  };

  /**
   * ชุดคำถามภารกิจระบบสุริยะ (10 ข้อ)
   */
  const QUIZ_QUESTIONS = [
    {
      id: 'q1',
      question: 'วัตถุใดที่เป็นดาวฤกษ์เพียงดวงเดียวและเป็นศูนย์กลางของระบบสุริยะ?',
      options: ['โลก', 'ดวงอาทิตย์', 'ดาวพฤหัสบดี', 'ดวงจันทร์'],
      correctIndex: 1,
      explanation: 'ดวงอาทิตย์เป็นดาวฤกษ์ที่ผลิตแสงสว่างและความร้อนได้เอง และมีแรงโน้มถ่วงยึดเหนี่ยวบริวารทั้งหมดไว้'
    },
    {
      id: 'q2',
      question: 'เรียงลำดับดาวเคราะห์ 4 ดวงแรกจากใกล้ดวงอาทิตย์มากที่สุดไปไกลที่สุด ข้อใดถูกต้อง?',
      options: [
        'พุธ → โลก → ศุกร์ → อังคาร',
        'ศุกร์ → พุธ → โลก → อังคาร',
        'พุธ → ศุกร์ → โลก → อังคาร',
        'พุธ → ศุกร์ → อังคาร → โลก'
      ],
      correctIndex: 2,
      explanation: 'ลำดับดาวเคราะห์ชั้นใน 4 ดวงคือ ดาวพุธ ดาวศุกร์ โลก และดาวอังคาร'
    },
    {
      id: 'q3',
      question: 'ดาวเคราะห์ดวงใดมีอุณหภูมิพื้นผิวร้อนที่สุดในระบบสุริยะ?',
      options: ['ดาวพุธ', 'ดาวศุกร์', 'ดาวอังคาร', 'ดาวพฤหัสบดี'],
      correctIndex: 1,
      explanation: 'ดาวศุกร์ร้อนที่สุด (~464 °C) แม้จะอยู่ถัดจากดาวพุธ เพราะมีชั้นบรรยากาศก๊าซคาร์บอนไดออกไซด์หนาแน่นกักเก็บความร้อน'
    },
    {
      id: 'q4',
      question: 'แถบดาวเคราะห์น้อย (Asteroid Belt) อยู่ระหว่างวงโคจรของดาวเคราะห์คู่ใด?',
      options: [
        'โลก กับ ดาวอังคาร',
        'ดาวพุธ กับ ดาวศุกร์',
        'ดาวอังคาร กับ ดาวพฤหัสบดี',
        'ดาวเสาร์ กับ ดาวยูเรนัส'
      ],
      correctIndex: 2,
      explanation: 'แถบดาวเคราะห์น้อยอยู่ระหว่างดาวอังคาร (ดวงที่ 4) และดาวพฤหัสบดี (ดวงที่ 5) คั่นกลุ่มดาวเคราะห์หินกับกลุ่มแก๊สยักษ์'
    },
    {
      id: 'q5',
      question: 'ข้อใดเป็น "ดาวเคราะห์แก๊สยักษ์" หรือ "ดาวเคราะห์ชั้นนอก" ทั้งหมด?',
      options: [
        'พุธ ศุกร์ โลก อังคาร',
        'พฤหัสบดี เสาร์ ยูเรนัส เนปจูน',
        'อังคาร พฤหัสบดี เสาร์ พลูโต',
        'โลก พฤหัสบดี เสาร์ เนปจูน'
      ],
      correctIndex: 1,
      explanation: 'ดาวเคราะห์ชั้นนอก 4 ดวงหลังแถบดาวเคราะห์น้อยคือ พฤหัสบดี เสาร์ (แก๊สยักษ์) และ ยูเรนัส เนปจูน (น้ำแข็งยักษ์)'
    },
    {
      id: 'q6',
      question: 'เหตุใดดาวเสาร์จึงถูกกล่าวว่า "ลอยน้ำได้" หากมีอ่างน้ำขนาดใหญ่มากพอ?',
      options: [
        'เพราะมีวงแหวนพยุงตัว',
        'เพราะอยู่ไกลดวงอาทิตย์มาก',
        'เพราะมีความหนาแน่นเฉลี่ยน้อยกว่าน้ำ',
        'เพราะหมุนรอบตัวเองเร็วที่สุด'
      ],
      correctIndex: 2,
      explanation: 'ดาวเสาร์มีความหนาแน่นเฉลี่ยประมาณ 0.687 g/cm³ ซึ่งน้อยกว่าความหนาแน่นของน้ำ (1.0 g/cm³)'
    },
    {
      id: 'q7',
      question: 'ดาวเคราะห์ดวงใดที่หมุนรอบตัวเองช้าจน 1 วันยาวนานกว่า 1 ปีของมันเอง และหมุนสวนทางกับโลก?',
      options: ['ดาวพุธ', 'ดาวศุกร์', 'ดาวอังคาร', 'ดาวเนปจูน'],
      correctIndex: 1,
      explanation: 'ดาวศุกร์หมุนรอบตัวเอง 1 รอบใช้เวลา 243 วันโลก แต่โคจรรอบดวงอาทิตย์ 1 รอบใช้เวลาเพียง 225 วันโลก'
    },
    {
      id: 'q8',
      question: 'เมื่อดาวหางโคจรเข้าใกล้ดวงอาทิตย์ หางของดาวหางจะชี้ไปในทิศทางใด?',
      options: [
        'ชี้เข้าหาดวงอาทิตย์เสมอ',
        'ชี้ตามหลังทิศทางการเคลื่อนที่เสมอ',
        'พุ่งชี้ออกจากดวงอาทิตย์เสมอ',
        'ชี้ไปทางดาวพฤหัสบดีเสมอ'
      ],
      correctIndex: 2,
      explanation: 'ลมสุริยะและแรงดันแสงจากดวงอาทิตย์จะพัดเป่าฝุ่นและก๊าซของดาวหาง ทำให้หางพุ่งชี้ออกจากดวงอาทิตย์ตลอดเวลา'
    },
    {
      id: 'q9',
      question: 'ความสัมพันธ์ระหว่างระยะห่างจากดวงอาทิตย์กับคาบการโคจร (1 ปีของดาวเคราะห์) เป็นอย่างไร?',
      options: [
        'ยิ่งไกลดวงอาทิตย์ ยิ่งโคจรรอบดวงอาทิตย์เสร็จเร็ว',
        'ยิ่งไกลดวงอาทิตย์ ยิ่งใช้เวลาโคจรรอบดวงอาทิตย์นานขึ้น',
        'ทุกดวงใช้เวลาโคจร 365 วันเท่ากันหมด',
        'ดาวที่มีขนาดใหญ่จะโคจรเร็วกว่าดาวขนาดเล็กเสมอ'
      ],
      correctIndex: 1,
      explanation: 'ดาวพุธใกล้สุดใช้เวลา 88 วัน ส่วนดาวเนปจูนไกลสุดใช้เวลาถึง 164.8 ปี ยิ่งไกลยิ่งใช้เวลานาน'
    },
    {
      id: 'q10',
      question: 'ทำไมปัจจุบัน "ดาวพลูโต" จึงถูกจัดเป็นดาวเคราะห์แคระ แทนที่จะเป็นดาวเคราะห์ดวงที่ 9?',
      options: [
        'เพราะไม่มีดวงจันทร์บริวาร',
        'เพราะไม่ได้โคจรรอบดวงอาทิตย์',
        'เพราะไม่สามารถกวาดเคลียร์วัตถุอื่นในย่านวงโคจรของตัวเองได้หมด',
        'เพราะทำจากแก๊สทั้งหมด'
      ],
      correctIndex: 2,
      explanation: 'พลูโตอยู่ในแถบไคเปอร์ซึ่งมีวัตถุน้ำแข็งจำนวนมากร่วมวงโคจร จึงขาดคุณสมบัติข้อที่ 3 ของดาวเคราะห์ตามนิยามปี 2006'
    }
  ];

  /**
   * คำนวณน้ำหนักบนดาวเป้าหมาย (กก.) จากน้ำหนักบนโลก
   */
  function calculateWeightOnBody(earthWeightKg, body) {
    if (!Number.isFinite(earthWeightKg) || earthWeightKg < 0 || !body) {
      return 0;
    }
    return earthWeightKg * (body.gravityFactor || 0);
  }

  /**
   * คำนวณอายุบนดาวเป้าหมาย (ปีของดาวนั้น) จากอายุบนโลก
   */
  function calculateAgeOnBody(earthAgeYears, body) {
    if (!Number.isFinite(earthAgeYears) || earthAgeYears < 0 || !body) {
      return null;
    }
    if (!body.orbitalPeriodDays || body.orbitalPeriodDays <= 0) {
      return null;
    }
    const earthDays = earthAgeYears * 365.25;
    return earthDays / body.orbitalPeriodDays;
  }

  /**
   * คำนวณพารามิเตอร์วงรีของวงโคจรโดยให้ดวงอาทิตย์อยู่ที่จุดโฟกัส (0, 0)
   */
  function getOrbitEllipseParams(body) {
    const a = body.orbitRadiusPx || 0;
    const e = body.eccentricity || 0;
    const b = a * Math.sqrt(Math.max(0.05, 1 - e * e));
    const tilt = body.orbitTiltRad || 0;
    const focalOffset = a * e;
    const centerX = -focalOffset * Math.cos(tilt);
    const centerY = -focalOffset * Math.sin(tilt);
    return { a, b, e, tilt, centerX, centerY };
  }

  /**
   * แก้สมการเคปเลอร์ M = E - e sin(E) เพื่อหา Eccentric Anomaly สำหรับวงโคจรวงรี
   */
  function solveEccentricAnomaly(body, elapsedEarthDays) {
    const angularSpeed = (Math.PI * 2) / body.orbitalPeriodDays;
    // ทิศทวนเข็มนาฬิกาเมื่อมองจากขั้วเหนือสุริยจักรวาล
    const meanAnomaly = body.initialAngleRad - elapsedEarthDays * angularSpeed;
    const e = body.eccentricity || 0;

    let eccentricAnomaly = meanAnomaly;
    if (e > 0.001) {
      for (let i = 0; i < 4; i++) {
        const diff = eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly;
        const deriv = 1 - e * Math.cos(eccentricAnomaly);
        eccentricAnomaly -= diff / deriv;
      }
    }
    return eccentricAnomaly;
  }

  /**
   * คำนวณตำแหน่ง (x, y) ในระบบพิกัด 2D รอบดวงอาทิตย์ (0, 0)
   * ใช้สมการของเคปเลอร์ (Kepler's equation) เพื่อให้วงโคจรวงรีเร็วขึ้นเมื่อใกล้ดวงอาทิตย์
   */
  function getOrbitalPosition(body, elapsedEarthDays) {
    if (!body || body.orbitRadiusPx <= 0 || !body.orbitalPeriodDays) {
      return { x: 0, y: 0, angleRad: 0 };
    }

    const eccentricAnomaly = solveEccentricAnomaly(body, elapsedEarthDays);
    const { a, b, e, tilt } = getOrbitEllipseParams(body);

    const ux = a * (Math.cos(eccentricAnomaly) - e);
    const uy = b * Math.sin(eccentricAnomaly);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const x = ux * cosT - uy * sinT;
    const y = ux * sinT + uy * cosT;

    return { x, y, angleRad: eccentricAnomaly };
  }

  /**
   * แปลงค่ามุมในระนาบวงโคจร (eccentricAnomaly) ให้เป็นพิกัด 3 มิติ (Y-up) โดยรองรับความเอียงระนาบวงโคจร
   */
  function projectOrbitPoint3D(body, eccentricAnomaly) {
    const { a, b, e, tilt } = getOrbitEllipseParams(body);
    const incRad = ((body.orbitalInclinationDeg || 0) * Math.PI) / 180;

    const ux = a * (Math.cos(eccentricAnomaly) - e);
    const uz = b * Math.sin(eccentricAnomaly);

    // เอียงระนาบวงโคจรออกจากระนาบสุริยวิถี (y = 0)
    const tx = ux;
    const ty = uz * Math.sin(incRad);
    const tz = uz * Math.cos(incRad);

    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    return {
      x: tx * cosT - tz * sinT,
      y: ty,
      z: tx * sinT + tz * cosT
    };
  }

  /**
   * คำนวณตำแหน่ง (x, y, z) ในระบบพิกัด 3 มิติรอบดวงอาทิตย์ (0, 0, 0)
   */
  function getOrbitalPosition3D(body, elapsedEarthDays) {
    if (!body || body.orbitRadiusPx <= 0 || !body.orbitalPeriodDays) {
      return { x: 0, y: 0, z: 0, angleRad: 0 };
    }

    const eccentricAnomaly = solveEccentricAnomaly(body, elapsedEarthDays);
    const p = projectOrbitPoint3D(body, eccentricAnomaly);
    return { x: p.x, y: p.y, z: p.z, angleRad: eccentricAnomaly };
  }

  /**
   * สร้างชุดจุดบนวงโคจร 3 มิติสำหรับวาดเส้นวงโคจรที่เอียงตามระนาบจริง
   */
  function getOrbitalCurvePoints3D(body, segments = 160) {
    const points = [];
    if (!body || body.orbitRadiusPx <= 0) return points;
    for (let i = 0; i <= segments; i++) {
      const E = (i / segments) * Math.PI * 2;
      points.push(projectOrbitPoint3D(body, E));
    }
    return points;
  }

  /**
   * คำนวณเวกเตอร์ทิศทางหนึ่งหน่วยของหางดาวหางใน 3 มิติ (ชี้หนีออกจากดวงอาทิตย์ (0,0,0) เสมอ)
   */
  function getCometTailDirection3D(x, y, z) {
    const len = Math.hypot(x, y, z);
    if (len < 1e-6) return { x: 1, y: 0, z: 0 };
    return { x: x / len, y: y / len, z: z / len };
  }

  /**
   * คำนวณมุมของหางดาวหาง (ชี้หนีออกจากจุดกำเนิด (0,0) เสมอ)
   */
  function getCometTailAngle(cometX, cometY) {
    return Math.atan2(cometY, cometX);
  }

  /**
   * ตรวจสอบว่าวัตถุตรงกับตัวกรองกลุ่มดาวหรือไม่
   */
  function matchesFilter(body, filterKey) {
    if (!body) return false;
    if (!filterKey || filterKey === 'all') return true;
    if (body.id === 'sun') return true; // คงดวงอาทิตย์เป็นจุดอ้างอิงเสมอ
    return body.groupFilter === filterKey;
  }

  const api = {
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
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.SolarData = api;
})(typeof window !== 'undefined' ? window : globalThis);
