// Configuration & Constants
const CELL_W = 32;
const CELL_H = 32;
const COLS = 5;
const ROWS = 12;

// Character parameters
const PLAYER_SCALE = 2.55; // 0.85x of original scale (3.0 * 0.85 = 2.55)
const PLAYER_SPEED = 5.54; // 1.2x faster than previous speed (4.62 * 1.2 = 5.544)

// Damage values and mob HP
const SWORD_DAMAGE = 50;
const MAGIC_DAMAGE = 100;
const GHOST_MAX_HP = 75;

// Semantic labels for each row (0-11)
const ROW_DEFINITIONS = [
    { name: 'walk_down', label: '아래 걷기 (Walk Down)', row: 0 },
    { name: 'walk_up', label: '위 걷기 (Walk Up)', row: 1 },
    { name: 'walk_left', label: '왼쪽 걷기 (Walk Left)', row: 2 },
    { name: 'walk_right', label: '오른쪽 걷기 (Walk Right)', row: 3 },
    { name: 'attack_down', label: '아래 물리 공격 (Attack Down)', row: 4 },
    { name: 'attack_up', label: '위 물리 공격 (Attack Up)', row: 5 },
    { name: 'attack_left', label: '왼쪽 물리 공격 (Attack Left)', row: 6 },
    { name: 'attack_right', label: '오른쪽 물리 공격 (Attack Right)', row: 7 },
    { name: 'magic_down', label: '아래 마법 공격 (Magic Down)', row: 8 },
    { name: 'magic_up', label: '위 마법 공격 (Magic Up)', row: 9 },
    { name: 'magic_left', label: '왼쪽 마법 공격 (Magic Left)', row: 10 },
    { name: 'magic_right', label: '오른쪽 마법 공격 (Magic Right)', row: 11 }
];

// Elements
const gameCanvas = document.getElementById('game-canvas');
const gameCtx = gameCanvas.getContext('2d');
const hpFill = document.getElementById('hp-fill');
const hpText = document.getElementById('hp-text');
const mpFill = document.getElementById('mp-fill');
const mpText = document.getElementById('mp-text');
const gameoverScreen = document.getElementById('gameover-screen');

// ============================================================
// GAME STATE MACHINE
// ============================================================
// States: 'TITLE' | 'TUTORIAL' | 'PLAYING' | 'WAVE_CLEAR' | 'UPGRADE' | 'GAMEOVER'
let gameState = 'TITLE';

// Core state vars
let score = 0;
let isGameOver = false;
let shakeIntensity = 0;
let ghosts = [];
let gameEffects = [];
let spawnTimer = 0;
let lastTime = 0;
let hitStopDuration = 0;
let dtScale = 1;
let bossSpawned = false;
let bossWarningTimer = 0;

// Cheat Key tracking
let cheatKeys = {
    n: { count: 0, lastTime: 0 },
    m: { count: 0, lastTime: 0 }
};

let screenDarkness = 0;

function showNotification(msg) {
    const container = document.getElementById('cheat-notification-container') || (() => {
        const div = document.createElement('div');
        div.id = 'cheat-notification-container';
        div.style.position = 'absolute';
        div.style.top = '20px';
        div.style.left = '50%';
        div.style.transform = 'translateX(-50%)';
        div.style.zIndex = '9999';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.pointerEvents = 'none';
        document.body.appendChild(div);
        return div;
    })();
    
    const notif = document.createElement('div');
    notif.textContent = msg;
    notif.style.background = 'rgba(15, 23, 42, 0.85)';
    notif.style.color = '#00f5ff';
    notif.style.border = '1px solid #00f5ff';
    notif.style.padding = '8px 16px';
    notif.style.margin = '4px';
    notif.style.borderRadius = '4px';
    notif.style.fontFamily = 'monospace';
    notif.style.fontWeight = 'bold';
    notif.style.fontSize = '14px';
    notif.style.boxShadow = '0 0 10px rgba(0, 245, 255, 0.5)';
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    notif.style.transform = 'translateY(-10px)';
    
    container.appendChild(notif);
    
    // Force reflow
    notif.offsetHeight;
    
    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            notif.remove();
        }, 300);
    }, 2000);
}

// ============================================================
// WAVE SYSTEM
// ============================================================
let currentWave = 1;
let waveEnemiesRemaining = 0;   // Enemies left to spawn this wave
let waveEnemiesKilled = 0;
let waveTotalEnemies = 0;
let waveActive = false;
let waveClearTimer = 0;         // Countdown before showing upgrade screen
let waveStartTimer = 0;         // Announcement display timer
let waveBreakTimer = 0;         // Break between waves
let waveBossWave = false;
let bossesSpawnedThisWave = false;

function getWaveConfig(wave) {
    // Wave escalation: every wave adds more enemies, every 3rd wave is boss wave (e.g. 3, 6, 9...)
    let isBossWave = (wave % 3 === 0 && wave > 0);
    if (wave === 7 || wave === 8 || wave === 10) {
        isBossWave = true;
    }
    
    let ghosts = 0;
    let eyes = 0;
    let elites = 0;
    let arrows = 0;
    
    if (wave === 6) {
        ghosts = 0;
        eyes = 0;
        elites = 0;
        arrows = 12;
    } else if (wave === 7 || wave === 8 || wave === 9 || wave === 10) {
        ghosts = 0;
        eyes = 0;
        elites = 0;
        arrows = 0;
    } else {
        const baseGhosts = 3 + Math.floor(wave * 1.5);
        const baseEyes   = Math.max(0, Math.floor(wave * 0.8) - 1);
        const baseElite  = wave >= 4 ? Math.floor((wave - 3) * 0.5) : 0;
        const baseArrows = wave >= 2 ? Math.floor(wave * 0.6) : 0;
        
        ghosts = isBossWave ? Math.floor(baseGhosts * 0.5) : baseGhosts;
        eyes = isBossWave ? Math.floor(baseEyes * 0.5) : baseEyes;
        elites = baseElite;
        arrows = isBossWave ? Math.floor(baseArrows * 0.5) : baseArrows;
    }
    
    return {
        isBossWave,
        ghosts,
        eyes,
        elites,
        arrows,
        hasBoss: isBossWave,
        spawnDelay: Math.max(400, 1200 - wave * 50), // Enemies spawn faster each wave
        hpMultiplier:  1 + (wave - 1) * 0.25,
        dmgMultiplier: 1 + (wave - 1) * 0.15,
        speedMultiplier: 1 + (wave - 1) * 0.08,
    };
}

// Pending spawns queue for this wave
let waveSpawnQueue = [];
let waveSpawnTimer = 0;

// ============================================================
// XP & LEVEL SYSTEM
// ============================================================
let playerLevel = 1;
let playerXP = 0;
let playerXPToNext = 80;  // XP needed for next level

function xpForLevel(lv) {
    return Math.floor(80 * Math.pow(1.6, lv - 1));
}

// Upgrade multipliers (all start at 1.0)
const upgrades = {
    swordDamage:    1.0,
    fireballDamage: 1.0,
    iceDamage:      1.0,
    moveSpeed:      1.0,
    lifeSteal:      0.0,   // % of damage healed
    maxHpBonus:     0,     // flat HP bonus
    mpCostReduce:   1.0,   // multiplier on MP cost
    mpRegenBonus:   1.0,   // multiplier on MP regen
    critBonus:      0.0,   // extra crit chance
    ultimateDamage: 1.0,   // U key ultimate damage multiplier
};

// ============================================================
// COMBO SYSTEM
// ============================================================
let comboCount = 0;
let comboTimer = 0;
const COMBO_WINDOW = 3500; // ms to maintain combo
let maxCombo = 0;

// Score multiplier from combo
function getScoreMultiplier() {
    if (comboCount >= 10) return 5;
    if (comboCount >= 7)  return 4;
    if (comboCount >= 5)  return 3;
    if (comboCount >= 3)  return 2;
    return 1;
}

function getComboLabel(count) {
    if (count >= 10) return 'GODLIKE!!!';
    if (count >= 7)  return 'RAMPAGE!!';
    if (count >= 5)  return 'ULTRA KILL!';
    if (count >= 3)  return 'TRIPLE!';
    if (count >= 2)  return 'DOUBLE!';
    return '';
}

// ============================================================
// GAME STATISTICS
// ============================================================
let totalKills = 0;
let maxDamageDealt = 0;
let sessionStartTime = 0;

// ============================================================
// UPGRADE DEFINITIONS (10 types, pooled for random selection)
// ============================================================
const UPGRADE_POOL = [
    {
        id: 'sword', icon: '⚔️', name: '검격 강화',
        desc: '검 공격 데미지\n+20% 증가',
        value: '+20% 검 데미지',
        color: '#ef4444', rgb: '239,68,68',
        apply: () => { upgrades.swordDamage *= 1.20; }
    },
    {
        id: 'fire', icon: '🔥', name: '불길의 폭발',
        desc: '파이어볼 데미지\n+20% 증가',
        value: '+20% 파이어볼 데미지',
        color: '#f97316', rgb: '249,115,22',
        apply: () => { upgrades.fireballDamage *= 1.20; }
    },
    {
        id: 'ice', icon: '❄️', name: '빙결 강화',
        desc: '얼음 스킬 데미지\n+20% 증가',
        value: '+20% 얼음 데미지',
        color: '#00f5ff', rgb: '0,245,255',
        apply: () => { upgrades.iceDamage *= 1.20; }
    },
    {
        id: 'speed', icon: '💨', name: '질풍의 발',
        desc: '이동속도\n+15% 증가',
        value: '+15% 이동속도',
        color: '#4ade80', rgb: '74,222,128',
        apply: () => { upgrades.moveSpeed *= 1.15; }
    },
    {
        id: 'vampiric', icon: '🩸', name: '흡혈',
        desc: '공격 데미지의 3%\n를 HP로 흡수',
        value: '공격 시 3% 흡혈',
        color: '#c026d3', rgb: '192,38,211',
        apply: () => { upgrades.lifeSteal += 0.03; }
    },
    {
        id: 'maxhp', icon: '🛡️', name: '강인한 육체',
        desc: '최대 HP +20\n즉시 50HP 회복',
        value: '+20 최대 HP',
        color: '#fbbf24', rgb: '251,191,36',
        apply: () => {
            upgrades.maxHpBonus += 20;
            player.maxHp = 100 + upgrades.maxHpBonus;
            player.hp = Math.min(player.maxHp, player.hp + 50);
        }
    },
    {
        id: 'mpcost', icon: '⚡', name: '마나 절약',
        desc: '필살기 MP 소비\n-15% 감소',
        value: '-15% 필살기 MP 소비',
        color: '#a855f7', rgb: '168,85,247',
        apply: () => { upgrades.mpCostReduce *= 0.85; }
    },
    {
        id: 'mpregen', icon: '🔮', name: '마나 시야',
        desc: 'MP 회복속도\n1.3배 증가',
        value: 'MP 회복속도 x1.3',
        color: '#3b82f6', rgb: '59,130,246',
        apply: () => { upgrades.mpRegenBonus *= 1.3; }
    },
    {
        id: 'crit', icon: '💥', name: '크리티컬 강화',
        desc: '모든 공격 스킬\n크리티컬 확률 +20%',
        value: '+20% 크리티컬 확률',
        color: '#ff003c', rgb: '255,0,60',
        apply: () => { upgrades.critBonus += 0.20; }
    },
    {
        id: 'ultdmg', icon: '⚡', name: '최후의 섬광 강화',
        desc: '최후의 섬광 데미지\n+20% 증가',
        value: '+20% 최후의 섬광 데미지',
        color: '#facc15', rgb: '250,204,21',
        apply: () => { upgrades.ultimateDamage *= 1.20; }
    },
    {
        id: 'chaos', icon: '🌀', name: '혼돈의 축복',
        desc: '무작위 2개 스탯\n대폭 강화 (도박!)',
        value: '랜덤 x2 강화',
        color: '#f59e0b', rgb: '245,158,11',
        apply: () => {
            // Apply 2 random upgrades (excluding chaos itself)
            const pool = UPGRADE_POOL.filter(u => u.id !== 'chaos');
            const picked = [];
            for (let i = 0; i < 2; i++) {
                const pick = pool[Math.floor(Math.random() * pool.length)];
                pick.apply();
                picked.push(pick);
            }
            return picked;
        }
    },
];

function getRandomUpgrades(count = 3) {
    const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

let currentUpgradeChoices = [];

// ============================================================
// TUTORIAL SYSTEM
// ============================================================
let tutorialStep = 0;
let tutorialTaskDone = false;
let tutorialActive = false;
let instructor = null;

const TUTORIAL_STEPS = [
    {
        title: '훈련 1단계: 몸 풀기',
        desc: '<span style="color: #00f5ff; font-weight: bold;">[훈련교관]</span><br>"훈련소에 온 것을 환영한다! 먼저 가볍게 움직이며 몸부터 풀어라!"<br><br>👉 <span class="key">W</span> <span class="key">A</span> <span class="key">S</span> <span class="key">D</span> 또는 <span class="key">방향키</span>로 이동',
        task: '🎯 캐릭터를 상하좌우로 움직여보세요!',
        check: () => tutorialMoved,
    },
    {
        title: '훈련 2단계: 기본 검격',
        desc: '<span style="color: #00f5ff; font-weight: bold;">[훈련교관]</span><br>"좋아, 몸은 풀렸군! 이제 검을 뽑아 전방의 적을 베어넘겨라!"<br><br>👉 <span class="key">J</span> 키로 공격',
        task: '⚔️ 소환된 적을 1마리 베어넘기세요!',
        check: () => totalKills >= 1,
    },
    {
        title: '훈련 3단계: 화염 마법',
        desc: '<span style="color: #00f5ff; font-weight: bold;">[훈련교관]</span><br>"기사의 몸에 마력의 흐름이 감도는구나. 불길을 모아 불덩이를 날려라!"<br><br>👉 <span class="key">K</span> 키로 파이어볼 발사 (마나 20 소모)',
        task: '🔥 파이어볼 마법으로 적 1마리를 처치하세요!',
        check: () => tutorialFireballKill,
    },
    {
        title: '훈련 4단계: 물리 필살기',
        desc: '<span style="color: #00f5ff; font-weight: bold;">[훈련교관]</span><br>"기가 모두 충전되었다! 강력한 광선을 뿜어내어 전방의 적들을 소멸시켜라!"<br><br>👉 <span class="key">U</span> 키를 <span style="color: #fbbf24; font-weight: bold;">0.5초 이상 길게</span> 눌러 <span style="color: #fbbf24; font-weight: bold;">최후의 섬광</span> (마나 100 소모)',
        task: '⚡ U키를 길게 눌러 필살기를 발동하세요!',
        check: () => tutorialUltUsed,
    },
    {
        title: '최종 단계: 빙결 필살기',
        desc: '<span style="color: #00f5ff; font-weight: bold;">[훈련교관]</span><br>"마지막 시험이다! 혹한의 서리로 주변의 모든 적을 얼려 부숴라!"<br><br>👉 <span class="key">I</span> 키를 <span style="color: #00f5ff; font-weight: bold;">0.5초 이상 길게</span> 눌러 <span style="color: #00f5ff; font-weight: bold;">빙결파쇄</span> (마나 100 소모)',
        task: '❄️ I키를 길게 눌러 빙결 필살기를 발동하세요!',
        check: () => tutorialIceUsed,
    },
];

let tutorialMoved = false;
let tutorialFireballKill = false;
let tutorialUltUsed = false;
let tutorialIceUsed = false;


// World dimensions (resized to 1980x1485 per user request)
let WORLD_WIDTH = 1980;
let WORLD_HEIGHT = 1485;

// Clamp entity position to the elliptical arena bound
function clampToArena(x, y, w, h) {
    const cx = WORLD_WIDTH * 0.500;
    const cy = WORLD_HEIGHT * 0.541;
    const rx = WORLD_WIDTH * 0.403;
    const ry = WORLD_HEIGHT * 0.265;
    
    // Check bottom-center (feet) of the entity
    const px = x + w / 2;
    const py = y + h;
    
    const dx = px - cx;
    const dy = py - cy;
    
    const nx = dx / rx;
    const ny = dy / ry;
    const distSq = nx * nx + ny * ny;
    
    if (distSq > 1) {
        const dist = Math.sqrt(distSq);
        const targetPx = cx + (dx / dist);
        const targetPy = cy + (dy / dist);
        return { x: targetPx - w / 2, y: targetPy - h };
    }
    return { x: x, y: y };
}

function clampCenterToArena(cx, cy, halfH) {
    const arenaCx = WORLD_WIDTH * 0.500;
    const arenaCy = WORLD_HEIGHT * 0.541;
    const rx = WORLD_WIDTH * 0.403;
    const ry = WORLD_HEIGHT * 0.265;
    
    // Check feet/base: center x, bottom y (cy + halfH)
    const px = cx;
    const py = cy + halfH;
    
    const dx = px - arenaCx;
    const dy = py - arenaCy;
    
    const nx = dx / rx;
    const ny = dy / ry;
    const distSq = nx * nx + ny * ny;
    
    if (distSq > 1) {
        const dist = Math.sqrt(distSq);
        const targetPx = arenaCx + (dx / dist);
        const targetPy = arenaCy + (dy / dist);
        return {
            x: targetPx,
            y: targetPy - halfH
        };
    }
    return { x: cx, y: cy };
}

function getRandomArenaSpawnPosition() {
    const cx = WORLD_WIDTH * 0.500;
    const cy = WORLD_HEIGHT * 0.541;
    
    // Radii slightly smaller than boundaries for safe spawning inside
    const rx = WORLD_WIDTH * 0.360;
    const ry = WORLD_HEIGHT * 0.235;
    
    const theta = Math.random() * Math.PI * 2;
    const radiusMult = Math.random() * 0.95;
    
    return {
        x: cx + rx * radiusMult * Math.cos(theta),
        y: cy + ry * radiusMult * Math.sin(theta)
    };
}

const camera = {
    x: 0,
    y: 0,
    update() {
        // Target is centered on player
        const targetX = player.x + player.width / 2 - gameCanvas.width / 2;
        const targetY = player.y + player.height / 2 - gameCanvas.height / 2;
        
        // Clamp to world bounds
        this.x = Math.max(0, Math.min(WORLD_WIDTH - gameCanvas.width, targetX));
        this.y = Math.max(0, Math.min(WORLD_HEIGHT - gameCanvas.height, targetY));
    }
};

// Offscreen tint canvas for high-quality silhouette hit flash
// Fixed size to avoid GPU texture reallocation every frame
const tintCanvas = document.createElement('canvas');
tintCanvas.width = 512;
tintCanvas.height = 512;
const tintCtx = tintCanvas.getContext('2d');

function drawTintedImage(img, sx, sy, sw, sh, dx, dy, dw, dh, color, flip = false) {
    // Only resize if needed (avoids GPU texture reallocation)
    if (tintCanvas.width < dw || tintCanvas.height < dh) {
        tintCanvas.width = Math.max(tintCanvas.width, dw);
        tintCanvas.height = Math.max(tintCanvas.height, dh);
    }
    tintCtx.clearRect(0, 0, dw, dh);
    
    // Draw onto offscreen canvas
    tintCtx.save();
    if (flip) {
        tintCtx.translate(dw, 0);
        tintCtx.scale(-1, 1);
    }
    tintCtx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    tintCtx.restore();
    
    // Apply tint color overlay
    tintCtx.globalCompositeOperation = 'source-atop';
    tintCtx.fillStyle = color;
    tintCtx.fillRect(0, 0, dw, dh);
    tintCtx.globalCompositeOperation = 'source-over';
    
    // Draw finished tinted image onto main canvas
    gameCtx.drawImage(tintCanvas, 0, 0, dw, dh, dx, dy, dw, dh);
}

// 1. Preload Assets
// Knight spritesheet
const spritesheet = new Image();

// Sword Effect (9 frames, split from 192x141)
const swordEffectFrames = [];
for (let i = 0; i < 9; i++) {
    const img = new Image();
    img.src = `swordeffect/frame_${i}.png`;
    swordEffectFrames.push(img);
}

// Fireball Effect (28 frames)
const fireballFrames = [];
for (let i = 1; i <= 28; i++) {
    const img = new Image();
    const num = String(i).padStart(2, '0');
    img.src = `magic/Effects_Fire_0_${num}.png`;
    fireballFrames.push(img);
}

// Ghost Frames (6 frames)
const ghostFrames = [];
for (let i = 0; i < 6; i++) {
    const img = new Image();
    img.src = `ghost/frame_${i}.png`;
    ghostFrames.push(img);
}

// Finish/Finisher Ultimate Frames (10 frames, 60.png to 69.png in knight_flat)
const finishFrames = [];
for (let i = 60; i <= 69; i++) {
    const img = new Image();
    img.src = `knight_flat/${i}.png`;
    finishFrames.push(img);
}

// Eye Monster Frames (24 frames)
const eyeMonsterFrames = [];
for (let i = 0; i < 24; i++) {
    const img = new Image();
    img.src = `eye_monster/frame_${i}.png`;
    eyeMonsterFrames.push(img);
}

// Arrow Monster Frames
const arrowMonsterStandImg = new Image();
arrowMonsterStandImg.src = 'archermonster/stand.png';

const arrowMonsterWalkFrames = [];
for (let i = 1; i <= 3; i++) {
    const img = new Image();
    img.src = `archermonster/walk${i}.png`;
    arrowMonsterWalkFrames.push(img);
}

const arrowMonsterAttackFrames = [];
for (let i = 1; i <= 3; i++) {
    const img = new Image();
    img.src = `archermonster/attack${i}.png`;
    arrowMonsterAttackFrames.push(img);
}

const arrowMonsterArrowImg = new Image();
arrowMonsterArrowImg.src = 'archermonster/arrow.png';

// Boss Frames
const bossIdleFrames = [];
for (let i = 0; i < 4; i++) {
    const img = new Image();
    img.src = `boss1/idle/frame_${i}.png`;
    bossIdleFrames.push(img);
}
const bossWalkFrames = [];
for (let i = 0; i < 8; i++) {
    const img = new Image();
    img.src = `boss1/walk/frame_${i}.png`;
    bossWalkFrames.push(img);
}
const bossAttackFrames = [];
for (let i = 0; i < 5; i++) {
    const img = new Image();
    img.src = `boss1/attack/frame_${i}.png`;
    bossAttackFrames.push(img);
}
const bossDieFrames = [];
for (let i = 0; i < 6; i++) {
    const img = new Image();
    img.src = `boss1/die/frame_${i}.png`;
    bossDieFrames.push(img);
}

// Freeze Skill - Ice Spike Frames (30 frames, frame_0.png to frame_29.png)
const icespikeFrames = [];
for (let i = 0; i < 30; i++) {
    const img = new Image();
    img.src = `freezeskill/frame_${i}.png`;
    icespikeFrames.push(img);
}

// Sorcerer Frames
const sorcererIdleFrames = [];
for (let i = 0; i < 8; i++) {
    const img = new Image();
    img.src = `sorcerer/idle/frame_${i}.png`;
    sorcererIdleFrames.push(img);
}
const sorcererMoveFrames = [];
for (let i = 0; i < 8; i++) {
    const img = new Image();
    img.src = `sorcerer/move/frame_${i}.png`;
    sorcererMoveFrames.push(img);
}
const sorcererCastFrames = [];
for (let i = 0; i < 10; i++) {
    const img = new Image();
    img.src = `sorcerer/cast/frame_${i}.png`;
    sorcererCastFrames.push(img);
}
const sorcererDarkOrbFrames = [];
for (let i = 0; i < 4; i++) {
    const img = new Image();
    img.src = `sorcerer/dark_orb/frame_${i}.png`;
    sorcererDarkOrbFrames.push(img);
}
const sorcererDarkCircleFrames = [];
for (let i = 0; i < 36; i++) {
    const img = new Image();
    img.src = `sorcerer/dark_circle/frame_${i}.png`;
    sorcererDarkCircleFrames.push(img);
}

// LastBoss Frames
const lastBossIdleFrames = [];
for (let i = 0; i < 4; i++) {
    const img = new Image();
    img.src = `lastboss/idle/frame_${i}.png`;
    lastBossIdleFrames.push(img);
}
const lastBossWalkFrames = [];
for (let i = 0; i < 6; i++) {
    const img = new Image();
    img.src = `lastboss/달리기/frame_${i}.png`;
    lastBossWalkFrames.push(img);
}
const lastBossAttackFrames = [];
for (let i = 0; i < 6; i++) {
    const img = new Image();
    img.src = `lastboss/근접공격/frame_${i}.png`;
    lastBossAttackFrames.push(img);
}
const lastBossJumpFrames = [];
for (let i = 0; i < 4; i++) {
    const img = new Image();
    img.src = `lastboss/점프후 순간이동/frame_${i}.png`;
    lastBossJumpFrames.push(img);
}
const lastBossHurtFrames = [];
for (let i = 0; i < 0; i++) {
    const img = new Image();
    img.src = `lastboss/hurt/frame_${i}.png`;
    lastBossHurtFrames.push(img);
}
const lastBossDieFrames = [];
for (let i = 0; i < 3; i++) {
    const img = new Image();
    img.src = `lastboss/die/frame_${i}.png`;
    lastBossDieFrames.push(img);
}
const lastBossCastFrames = [];
for (let i = 0; i < 4; i++) {
    const img = new Image();
    img.src = `lastboss/찌르기/frame_${i}.png`;
    lastBossCastFrames.push(img);
}
const lastBossDarkOrbFrames = [];
for (let i = 0; i < 4; i++) {
    const img = new Image();
    img.src = `lastboss/dark_orb/frame_${i}.png`;
    lastBossDarkOrbFrames[i] = img;
}
const darkOrb2Indices = [4, 5, 6, 9];
for (let idx of darkOrb2Indices) {
    const img = new Image();
    img.src = `lastboss/dark_orb2/frame_${idx}.png`;
    lastBossDarkOrbFrames[idx] = img;
}
const lastBossDarkCircleFrames = [];
for (let i = 0; i < 36; i++) {
    const img = new Image();
    img.src = `sorcerer/dark_circle/frame_${i}.png`;
    lastBossDarkCircleFrames.push(img);
}
const lastBossDarkAuraFrames = [];
for (let i = 0; i < 0; i++) {
    const img = new Image();
    img.src = `lastboss/dark_aura/frame_${i}.png`;
    lastBossDarkAuraFrames.push(img);
}
const lastBossGiantImg = new Image();
lastBossGiantImg.src = `lastboss/giant_boss.png`;

// Sound system
let audioCtx = null;
function getAudioContext() {
    try {
        if (!audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                audioCtx = new AudioCtx();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.error("Failed to initialize AudioContext", e);
    }
    return audioCtx;
}

const slashSound = new Audio('sound/검휘두르기.wav');
slashSound.volume = 0.4;

function playSlashSound() {
    try {
        // Clone the sound to allow overlapping plays
        const sound = slashSound.cloneNode();
        sound.volume = 0.4;
        sound.play().catch(e => console.log("Slash sound blocked:", e));
    } catch (e) {}
}

let lastGhostHurtSoundTime = 0;
function playGhostHurtSound() {
    const now = Date.now();
    if (now - lastGhostHurtSoundTime < 80) return;
    lastGhostHurtSoundTime = now;
    try {
        const sound = new Audio('sound/ghost_hurt.wav');
        sound.volume = 0.45;
        sound.play().catch(e => console.log("Ghost hurt sound blocked:", e));
    } catch (e) {}
}

let lastEyeHurtSoundTime = 0;
function playEyeHurtSound() {
    const now = Date.now();
    if (now - lastEyeHurtSoundTime < 80) return;
    lastEyeHurtSoundTime = now;
    try {
        const sound = new Audio('sound/eye_hurt.wav');
        sound.volume = 0.5;
        sound.currentTime = 0.49;
        sound.addEventListener('loadedmetadata', () => {
            sound.currentTime = 0.49;
        });
        sound.play().catch(e => console.log("Eye hurt sound blocked:", e));
    } catch (e) {}
}

function playSwordGrunt() {
    try {
        const r = Math.floor(Math.random() * 3) + 1;
        const sound = new Audio(`sound/swordgrunt${r}.wav`);
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Sword grunt sound blocked:", e));
    } catch (e) {}
}

function playFireballGrunt() {
    try {
        const sound = new Audio('sound/fireballgrunt.wav');
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Fireball grunt sound blocked:", e));
    } catch (e) {}
}

function playFreezeGrunt() {
    try {
        const sound = new Audio('sound/freezegrunt.wav');
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Freeze grunt sound blocked:", e));
    } catch (e) {}
}

function playArrowSound() {
    try {
        const sound = new Audio('sound/arrow.wav');
        sound.volume = 0.45;
        sound.play().catch(e => console.log("Arrow sound blocked:", e));
    } catch (e) {}
}

let currentBGM = null;
function playBGM(src, customVolume) {
    try {
        if (currentBGM) {
            // Prevent restarting if it's already playing the requested track
            if (currentBGM.src.indexOf(src) !== -1) {
                return;
            }
            currentBGM.pause();
            currentBGM = null;
        }
        currentBGM = new Audio(src);
        currentBGM.loop = true;
        currentBGM.volume = customVolume !== undefined ? customVolume : 0.10;
        currentBGM.play().catch(e => {
            console.log("BGM autoplay blocked by browser policy. Waiting for user interaction.", e);
            const playOnInteract = () => {
                if (currentBGM) {
                    currentBGM.play().catch(err => console.log("Play on interact failed:", err));
                }
                document.removeEventListener('click', playOnInteract);
                document.removeEventListener('keydown', playOnInteract);
                document.removeEventListener('mousedown', playOnInteract);
                document.removeEventListener('touchstart', playOnInteract);
                document.removeEventListener('pointerdown', playOnInteract);
            };
            document.addEventListener('click', playOnInteract);
            document.addEventListener('keydown', playOnInteract);
            document.addEventListener('mousedown', playOnInteract);
            document.addEventListener('touchstart', playOnInteract);
            document.addEventListener('pointerdown', playOnInteract);
        });
    } catch (e) {
        console.error("BGM error:", e);
    }
}

// Preload skill grunt sounds to eliminate HTML5 audio instantiation latency
const skillGrunt1 = new Audio('sound/swordskillgrunt1.wav');
skillGrunt1.volume = 0.5;
const skillGrunt2 = new Audio('sound/swordskillgrunt2.wav');
skillGrunt2.volume = 0.5;

function playSwordSkillGrunt1() {
    try {
        const sound = skillGrunt1.cloneNode();
        sound.volume = 0.55;
        sound.play().catch(e => console.log("Swordskill grunt 1 blocked:", e));
    } catch (e) {}
}

function playSwordSkillGrunt2() {
    try {
        const sound = skillGrunt2.cloneNode();
        sound.volume = 0.55;
        sound.play().catch(e => console.log("Swordskill grunt 2 blocked:", e));
    } catch (e) {}
}

function playBossHurtSound() {
    try {
        const sound = new Audio('sound/bosshurt.mp3');
        sound.volume = 0.6;
        sound.play().catch(e => console.log("Boss hurt sound blocked:", e));
    } catch (e) {}
}

function playFreezeMagicSound() {
    try {
        const sound = new Audio('sound/freezemagic.wav');
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Freeze sound blocked:", e));
    } catch (e) {}
}

function playIceShatterSound() {
    try {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        
        const now = audioCtx.currentTime;
        
        // Main crystal high tone
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(2200, now);
        osc1.frequency.exponentialRampToValueAtTime(400, now + 0.12);
        gain1.gain.setValueAtTime(0.04, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        
        // Sub clink tone for crispness
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3500, now);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        gain2.gain.setValueAtTime(0.02, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc1.start(now);
        osc1.stop(now + 0.12);
        osc2.start(now);
        osc2.stop(now + 0.08);
    } catch (e) {
        console.error("Ice shatter sound failed:", e);
    }
}

function playBlessingSound() {
    try {
        const sound = new Audio('sound/blessing.ogg');
        sound.volume = 0.55;
        sound.play().catch(e => console.log("Blessing sound blocked:", e));
    } catch (e) {}
}

let isTransitioning = false;
function triggerScreenTransition(onOpaqueCallback) {
    const transitionOverlay = document.getElementById('screen-transition');
    if (!transitionOverlay) {
        onOpaqueCallback();
        return;
    }
    
    // Play blessing sound on transition start
    playBlessingSound();
    
    // Show overlay
    transitionOverlay.classList.add('active');
    
    // Wait for the fade-in to complete (0.4s transition)
    setTimeout(() => {
        onOpaqueCallback();
        
        // Brief delay for DOM reflow, then fade out
        setTimeout(() => {
            transitionOverlay.classList.remove('active');
        }, 150);
    }, 400);
}

function playHealSound() {
    try {
        const sound = new Audio('sound/healsound.aif');
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Heal sound blocked:", e));
    } catch (e) {}
}

function playBossAppearSound() {
    try {
        const sound = new Audio('sound/bossappear.flac');
        sound.volume = 0.25; // Reduced volume as requested
        sound.play().catch(e => console.log("Boss appear sound blocked:", e));
    } catch (e) {}
}

function playSorcererIntroSound() {
    try {
        const sound = new Audio('sorcerer/socerer_intro.wav');
        sound.volume = 0.55;
        sound.play().catch(e => console.log("Sorcerer intro sound blocked:", e));
    } catch (e) {}
}

let lastSorcererMagicSoundTime = 0;
function playSorcererMagicSound() {
    const now = Date.now();
    if (now - lastSorcererMagicSoundTime < 80) return;
    lastSorcererMagicSoundTime = now;
    try {
        const sound = new Audio('sorcerer/socerer_magic.wav');
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Sorcerer magic sound blocked:", e));
    } catch (e) {}
}

// Web Audio API Retro Sounds
function playMagicSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
}

function playUltimateSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // 1. Initial Sparks crackle (high-pass sawtooth clicks)
        // Scaled down by 0.7x (0.048 -> 0.0336)
        for (let i = 0; i < 4; i++) {
            const time = ctx.currentTime + i * 0.1;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(1200 + Math.random() * 800, time);
            gain.gain.setValueAtTime(0.0336, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 0.05);
        }
        
        // 2. High-speed dash swoosh (frequency sweep)
        // Scaled down by 0.7x (0.096 -> 0.0672)
        const oscSwoosh = ctx.createOscillator();
        const gainSwoosh = ctx.createGain();
        oscSwoosh.type = 'triangle';
        oscSwoosh.frequency.setValueAtTime(100, ctx.currentTime);
        oscSwoosh.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.5);
        gainSwoosh.gain.setValueAtTime(0.0672, ctx.currentTime);
        gainSwoosh.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscSwoosh.connect(gainSwoosh);
        gainSwoosh.connect(ctx.destination);
        oscSwoosh.start();
        oscSwoosh.stop(ctx.currentTime + 0.5);
        
        // 3. Huge Thunderclap explosion (at 500ms, when the dash strikes)
        setTimeout(() => {
            try {
                const ctx2 = getAudioContext(); // Use same context
                if (!ctx2) return;
                
                // Low rumble oscillator
                // Scaled down by 0.7x (0.28 -> 0.196)
                const osc2 = ctx2.createOscillator();
                const gain2 = ctx2.createGain();
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(90, ctx2.currentTime);
                osc2.frequency.linearRampToValueAtTime(10, ctx2.currentTime + 0.9);
                gain2.gain.setValueAtTime(0.196, ctx2.currentTime);
                gain2.gain.linearRampToValueAtTime(0.01, ctx2.currentTime + 0.9);
                osc2.connect(gain2);
                gain2.connect(ctx2.destination);
                
                // Crackling high-frequency component
                // Scaled down by 0.7x (0.12 -> 0.084)
                const oscCrack = ctx2.createOscillator();
                const gainCrack = ctx2.createGain();
                oscCrack.type = 'square';
                oscCrack.frequency.setValueAtTime(800, ctx2.currentTime);
                oscCrack.frequency.linearRampToValueAtTime(150, ctx2.currentTime + 0.35);
                gainCrack.gain.setValueAtTime(0.084, ctx2.currentTime);
                gainCrack.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.35);
                oscCrack.connect(gainCrack);
                gainCrack.connect(ctx2.destination);
                
                // Low-pass filtered noise for rumbling explosion
                const bufferSize = ctx2.sampleRate * 0.9;
                const buffer = ctx2.createBuffer(1, bufferSize, ctx2.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx2.createBufferSource();
                noise.buffer = buffer;
                
                const filter = ctx2.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(400, ctx2.currentTime);
                filter.frequency.linearRampToValueAtTime(2, ctx2.currentTime + 0.9);
                
                // Scaled down by 0.7x (0.32 -> 0.224)
                const noiseGain = ctx2.createGain();
                noiseGain.gain.setValueAtTime(0.224, ctx2.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.9);
                
                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(ctx2.destination);
                
                osc2.start();
                oscCrack.start();
                noise.start();
                
                osc2.stop(ctx2.currentTime + 0.9);
                oscCrack.stop(ctx2.currentTime + 0.95);
                noise.stop(ctx2.currentTime + 0.9);
            } catch (err) {}
        }, 500);
    } catch (e) {}
}

function playFailSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
}

function playHitSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(110, ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
}

function playIceFreezeSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // Ice freeze sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.6);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        
        // Crackling shards (using highpass filter and sawtooth)
        for (let i = 0; i < 4; i++) {
            const timeOffset = i * 0.12;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(1200 - i * 200, ctx.currentTime + timeOffset);
            
            gain2.gain.setValueAtTime(0.08, ctx.currentTime + timeOffset);
            gain2.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + timeOffset + 0.15);
            
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + timeOffset);
            osc2.stop(ctx.currentTime + timeOffset + 0.15);
        }
    } catch (e) {}
}

let loaded = false;
let gameStarted = false;
function triggerStart() {
    if (gameStarted) return;
    gameStarted = true;
    loaded = true;
    startGame();
}
function tryTriggerStart() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', triggerStart);
    } else {
        triggerStart();
    }
}
spritesheet.onload = function() {
    tryTriggerStart();
};
spritesheet.src = 'knight.png';
if (spritesheet.complete) {
    tryTriggerStart();
}


// ==========================================
// COLLISION DETECTOR HELPER
// ==========================================
function rectOverlap(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}


// ==========================================
// PARTICLES & NUMBERS SYSTEMS
// ==========================================

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.color = color;
        this.radius = 1.5 + Math.random() * 3;
        this.alpha = 1;
        this.decay = 0.025 + Math.random() * 0.025;
        this.active = true;
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.alpha -= this.decay * dtScale;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.globalAlpha = this.alpha;
        gameCtx.fillStyle = this.color;
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, this.radius * PLAYER_SCALE / 3, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.restore();
    }
}

// SparkleParticle for DamageNumber and Crit feedback
class SparkleParticle {
    constructor(x, y, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5 - 2;
        this.radius = 1.5 + Math.random() * 2;
        this.alpha = 1.0;
        this.decay = 0.04 + Math.random() * 0.04;
        this.color = color;
        this.active = true;
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.vy += 0.1 * dtScale; // gentle gravity
        this.alpha -= this.decay * dtScale;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.globalAlpha = this.alpha;
        gameCtx.fillStyle = this.color;
        
        // Draw cross/star shapes for sparkles
        gameCtx.shadowColor = this.color;
        gameCtx.shadowBlur = 4;
        
        // Draw tiny plus shape
        gameCtx.fillRect(this.x - this.radius, this.y, this.radius * 2 + 1, 1);
        gameCtx.fillRect(this.x, this.y - this.radius, 1, this.radius * 2 + 1);
        
        gameCtx.restore();
    }
}

class BloodParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 4;
        this.radius = 2 + Math.random() * 4;
        this.alpha = 1.0;
        this.decay = 0.015 + Math.random() * 0.02;
        const colors = ['#7f1d1d', '#991b1b', '#b91c1c', '#450a0a', '#1e293b'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.active = true;
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.vy += 0.25 * dtScale;
        this.alpha -= this.decay * dtScale;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.globalAlpha = this.alpha;
        gameCtx.fillStyle = this.color;
        
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.restore();
    }
}

// Neon Slash Effect for impactful cuts
class HitSlash {
    constructor(x, y, isMagic = false) {
        this.x = x + (Math.random() - 0.5) * 15;
        this.y = y + (Math.random() - 0.5) * 15;
        this.isMagic = isMagic;
        this.angle = Math.random() * Math.PI * 2;
        this.length = 30 + Math.random() * 25;
        this.width = 3 + Math.random() * 4;
        this.alpha = 1.0;
        this.active = true;
        this.color = isMagic ? '#00f5ff' : '#ff003c'; // Neon Cyan or Hot Red
        this.decay = 0.15; // Disappears very quickly (approx 6 frames)
    }
    
    update(dt) {
        this.alpha -= this.decay * dtScale;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.globalAlpha = this.alpha;
        gameCtx.strokeStyle = '#ffffff';
        gameCtx.lineWidth = this.width;
        gameCtx.lineCap = 'round';
        
        // Double slash style (white core, neon outer glow)
        gameCtx.shadowColor = this.color;
        gameCtx.shadowBlur = 10;
        
        gameCtx.beginPath();
        const dx = Math.cos(this.angle) * (this.length / 2);
        const dy = Math.sin(this.angle) * (this.length / 2);
        gameCtx.moveTo(this.x - dx, this.y - dy);
        gameCtx.lineTo(this.x + dx, this.y + dy);
        gameCtx.stroke();
        
        // Inner core
        gameCtx.shadowBlur = 0;
        gameCtx.strokeStyle = this.color;
        gameCtx.lineWidth = this.width / 2;
        gameCtx.stroke();
        
        gameCtx.restore();
    }
}

// Shockwave Ring for massive hits
class ShockwaveRing {
    constructor(x, y, maxRadius = 55, isMagic = false) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = maxRadius;
        this.isMagic = isMagic;
        this.color = isMagic ? '#38bdf8' : '#fbbf24'; // Neon cyan or gold
        this.alpha = 1.0;
        this.active = true;
        this.speed = 4.5;
    }
    
    update(dt) {
        this.radius += this.speed * dtScale;
        this.alpha = Math.max(0, 1.0 - (this.radius / this.maxRadius));
        if (this.radius >= this.maxRadius) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.globalAlpha = this.alpha;
        gameCtx.strokeStyle = this.color;
        gameCtx.lineWidth = 2.5;
        
        gameCtx.shadowColor = this.color;
        gameCtx.shadowBlur = 10;
        
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        gameCtx.stroke();
        
        gameCtx.strokeStyle = '#ffffff';
        gameCtx.lineWidth = 1;
        gameCtx.shadowBlur = 0;
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, Math.max(1, this.radius - 2), 0, Math.PI * 2);
        gameCtx.stroke();
        
        gameCtx.restore();
    }
}

class HitParticle extends Particle {
    constructor(x, y, isMagic = false) {
        // Neon-like highly saturated colors
        const colors = isMagic 
            ? ['#06b6d4', '#00f5ff', '#38bdf8', '#ffffff', '#e0f2fe'] // Neon Cyan/Blue/White for magic
            : ['#ff003c', '#ff5a00', '#ffc000', '#ffffff', '#ff007c']; // Hot Red/Orange/Yellow/Magenta for physical
        const color = colors[Math.floor(Math.random() * colors.length)];
        super(x, y, color);
        
        // Erupt faster and with higher variance
        const speedMultiplier = isMagic ? 1.4 : 1.2;
        const angle = Math.random() * Math.PI * 2;
        const speed = (2 + Math.random() * 10) * speedMultiplier;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1.5; // slight upward bias
        
        this.radius = 2.0 + Math.random() * 3.5;
        this.decay = 0.03 + Math.random() * 0.04; // longer trail/spark life
        this.friction = 0.92 + Math.random() * 0.04; // air resistance
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = (Math.random() - 0.5) * 0.4;
    }
    
    update(dt) {
        this.vx *= Math.pow(this.friction, dtScale);
        this.vy *= Math.pow(this.friction, dtScale);
        this.vy += 0.15 * dtScale; // gentle gravity pull
        
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.alpha -= this.decay * dtScale;
        this.angle += this.angleSpeed * dtScale;
        
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.globalAlpha = this.alpha;
        
        // Neon Glow effect
        gameCtx.shadowColor = this.color;
        gameCtx.shadowBlur = 6;
        gameCtx.fillStyle = this.color;
        
        // Rotate the square particle for dynamic feel
        gameCtx.translate(this.x, this.y);
        gameCtx.rotate(this.angle);
        
        // Draw sharp retro pixel squares
        const size = this.radius * 2;
        gameCtx.fillRect(-this.radius, -this.radius, size, size);
        
        // Retro outline for premium visual
        gameCtx.strokeStyle = '#ffffff';
        gameCtx.lineWidth = 1;
        gameCtx.strokeRect(-this.radius, -this.radius, size, size);
        
        gameCtx.restore();
    }
}

class DeathParticle extends Particle {
    constructor(x, y) {
        const colors = ['#f8fafc', '#cbd5e1', '#a78bfa', '#f5f3ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        super(x, y, color);
        this.vx *= 1.5;
        this.vy *= 1.5;
        this.radius = 3 + Math.random() * 4;
        this.decay = 0.015 + Math.random() * 0.02;
    }
}

class FireParticle extends Particle {
    constructor(x, y) {
        const colors = ['#fbbf24', '#f97316', '#ef4444', '#facc15'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        super(x, y, color);
        this.vx *= 1.6;
        this.vy *= 1.6;
        this.radius = 2 + Math.random() * 3;
    }
}

// Bouncing Damage Numbers for RPG 타격감 (Dynamic Scale Pop & Gold Criticals)
class DamageNumber {
    constructor(x, y, amount, isMagic = false, isCritical = undefined) {
        this.x = x + (Math.random() - 0.5) * 30; // wider spread
        this.y = y - 15;
        this.amount = amount;
        this.isMagic = isMagic;
        this.alpha = 1.0;
        
        this.isCritical = isCritical !== undefined ? isCritical : (amount >= 100);
        
        // High-speed pop trajectory
        this.vy = this.isCritical ? -6.5 - Math.random() * 2.5 : -4.5 - Math.random() * 2.0;
        this.vx = (Math.random() - 0.5) * 4;
        this.active = true;
        
        // Pop dynamic scale
        this.scale = this.isCritical ? 3.0 : 2.2; 
        
        // Critical pop shake timer
        this.shakeTimer = this.isCritical ? 12 : 0;
        
        // Generate extra sparkle particles at spawn
        if (this.isCritical) {
            const colors = ['#facc15', '#f97316', '#ffffff', '#fbbf24'];
            for (let i = 0; i < 6; i++) {
                gameEffects.push(new SparkleParticle(this.x, this.y, colors[Math.floor(Math.random() * colors.length)]));
            }
        } else if (isMagic) {
            const colors = ['#00f5ff', '#38bdf8', '#ffffff', '#a5f3fc'];
            for (let i = 0; i < 3; i++) {
                gameEffects.push(new SparkleParticle(this.x, this.y, colors[Math.floor(Math.random() * colors.length)]));
            }
        }
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.vy += 0.25 * dtScale; // snappy bounce gravity pull
        this.alpha -= 0.018 * dtScale; // fade out slightly slower
        
        // Decay scale smoothly to normal
        if (this.scale > 1.0) {
            this.scale = Math.max(1.0, this.scale - 0.15 * dtScale);
        }
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dtScale;
        }
        
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.globalAlpha = this.alpha;
        gameCtx.textAlign = 'center';
        
        let ox = this.x;
        let oy = this.y;
        if (this.shakeTimer > 0) {
            ox += (Math.random() - 0.5) * 8; // pop shake
            oy += (Math.random() - 0.5) * 8;
        }
        
        const baseSize = this.isCritical ? 20 : (this.isMagic ? 13 : 10);
        const fontSize = Math.round(baseSize * this.scale);
        
        gameCtx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
        
        // Text string construction
        let drawText = this.amount.toString();
        if (this.isCritical) {
            drawText = `★ ${this.amount} ★`;
        }
        
        // 1. Text Shadow / 3D Extrusion
        gameCtx.fillStyle = '#000000';
        gameCtx.fillText(drawText, ox + 2, oy + 2);
        gameCtx.fillText(drawText, ox + 3, oy + 3); // double shadow for 3D outline
        
        // 2. Critical Glow
        if (this.isCritical) {
            gameCtx.shadowColor = '#f59e0b';
            gameCtx.shadowBlur = 12;
        } else if (this.isMagic) {
            gameCtx.shadowColor = '#00f5ff';
            gameCtx.shadowBlur = 6;
        }
        
        // 3. Front Fill
        if (this.isCritical) {
            // Golden Critical Gradient
            const grad = gameCtx.createLinearGradient(ox, oy - fontSize, ox, oy);
            grad.addColorStop(0, '#fffbeb'); // White gold
            grad.addColorStop(0.3, '#fef08a'); // Bright gold yellow
            grad.addColorStop(0.7, '#facc15'); // Gold
            grad.addColorStop(1, '#ea580c'); // Deep orange-gold
            gameCtx.fillStyle = grad;
        } else if (this.isMagic) {
            // Cool Cyan Magic Gradient
            const grad = gameCtx.createLinearGradient(ox, oy - fontSize, ox, oy);
            grad.addColorStop(0, '#e0f2fe'); // Soft light blue
            grad.addColorStop(0.5, '#38bdf8'); // Cyan-blue
            grad.addColorStop(1, '#0284c7'); // Dark cyan-blue
            gameCtx.fillStyle = grad;
        } else {
            // Strong Red-Orange Gradient for standard hits
            const grad = gameCtx.createLinearGradient(ox, oy - fontSize, ox, oy);
            grad.addColorStop(0, '#fecaca'); // Light red
            grad.addColorStop(0.5, '#ef4444'); // Crimson
            grad.addColorStop(1, '#b91c1c'); // Dark red
            gameCtx.fillStyle = grad;
        }
        gameCtx.fillText(drawText, ox, oy);
        
        // 4. Draw Critical Banner text underneath
        if (this.isCritical) {
            gameCtx.shadowBlur = 0;
            const subSize = Math.round(9 * this.scale);
            gameCtx.font = `bold ${subSize}px 'Press Start 2P', monospace`;
            
            // Sub banner shadow
            gameCtx.fillStyle = '#000000';
            gameCtx.fillText("★ CRITICAL! ★", ox + 2, oy + fontSize * 0.75 + 2);
            
            // Sub banner gradient
            const bannerGrad = gameCtx.createLinearGradient(ox, oy + fontSize * 0.4, ox, oy + fontSize * 0.85);
            bannerGrad.addColorStop(0, '#ffffff');
            bannerGrad.addColorStop(0.5, '#ff7a00'); // Neon Orange
            bannerGrad.addColorStop(1, '#ff003c'); // Crimson Red
            gameCtx.fillStyle = bannerGrad;
            
            gameCtx.fillText("★ CRITICAL! ★", ox, oy + fontSize * 0.75);
        }
        
        gameCtx.restore();
    }
}


// ==========================================
// GAME EFFECTS CLASSES
// ==========================================

// Sword slash effect (9 frames)
class SwordSlash {
    constructor(owner) {
        this.owner = owner;
        this.facing = owner.facing;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 15; 
        this.w = 64;
        this.h = 47;
        this.active = true;
        this.hitGhosts = new Set();
    }
    
    update(dt) {
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame++;
            if (this.currentFrame >= 9) {
                this.active = false;
                return;
            }
        }
        
        this.checkCollisions();
    }
    
    checkCollisions() {
        if (!this.active) return;
        const scale = PLAYER_SCALE;
        const drawW = this.w * scale;
        const drawH = this.h * scale;
        
        // Calculate center of sword slash
        let ox = this.owner.x + this.owner.width / 2;
        let oy = this.owner.y + this.owner.height / 2;
        let distance = 35 * scale; // Swing range reach
        
        if (this.facing === 'right') ox += distance;
        else if (this.facing === 'left') ox -= distance;
        else if (this.facing === 'down') oy += distance;
        else if (this.facing === 'up') oy -= distance;
        
        const slashRect = {
            x: ox - drawW / 2,
            y: oy - drawH / 2,
            w: drawW,
            h: drawH
        };
        
        ghosts.forEach(ghost => {
            if (!ghost.active || this.hitGhosts.has(ghost)) return;
            
            const gHbox = ghost.getHitbox();
            if (rectOverlap(slashRect, gHbox)) {
                const dx = ghost.x - (this.owner.x + this.owner.width / 2);
                const dy = ghost.y - (this.owner.y + this.owner.height / 2);
                const dist = Math.hypot(dx, dy) || 1;
                const kx = dx / dist;
                const ky = dy / dist;
                
                const critChance = 0.10 + (typeof upgrades !== 'undefined' ? upgrades.critBonus : 0);
                const isCrit = Math.random() < critChance;
                const baseDmg = Math.round(SWORD_DAMAGE * (typeof upgrades !== 'undefined' ? upgrades.swordDamage : 1.0));
                const swordDmg = isCrit ? Math.round(baseDmg * 1.6) : baseDmg;
                
                if (typeof maxDamageDealt !== 'undefined' && swordDmg > maxDamageDealt) maxDamageDealt = swordDmg;
                ghost.takeDamage(swordDmg, kx, ky, false, false, isCrit);
                this.hitGhosts.add(ghost);
            }
        });

        // Check collision with LastBossIceSpike (destructible spikes)
        gameEffects.forEach(effect => {
            if (effect instanceof LastBossIceSpike && effect.active && effect.state === 'holding') {
                const spikeRect = {
                    x: effect.x - effect.w / 2,
                    y: effect.y - effect.h * 0.85 - 60, // Extend vertically up by 60px
                    w: effect.w,
                    h: effect.h + 120 // Extend total vertical height by 120px to cover top-down height alignment
                };
                if (rectOverlap(slashRect, spikeRect)) {
                    effect.takeDamage(1, 'sword');
                }
            }
        });
    }
    
    draw() {
        if (!this.active) return;
        const drawW = this.w * PLAYER_SCALE;
        const drawH = this.h * PLAYER_SCALE;
        
        let ox = this.owner.x + this.owner.width / 2;
        let oy = this.owner.y + this.owner.height / 2;
        let distance = 25 * PLAYER_SCALE;
        let angle = 0;
        
        if (this.facing === 'right') {
            ox += distance;
            angle = 0;
        } else if (this.facing === 'left') {
            ox -= distance;
            angle = Math.PI;
        } else if (this.facing === 'down') {
            oy += distance;
            angle = Math.PI / 2;
        } else if (this.facing === 'up') {
            oy -= distance;
            angle = -Math.PI / 2;
        }
        
        gameCtx.save();
        gameCtx.translate(ox, oy);
        gameCtx.rotate(angle);
        
        const img = swordEffectFrames[this.currentFrame];
        if (img && img.complete) {
            gameCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        }
        gameCtx.restore();
    }
}

// Fireball projectile (28 frames)
class Fireball {
    constructor(owner) {
        this.facing = owner.facing;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 20; 
        this.w = 32;
        this.h = 32;
        this.active = true;
        
        this.x = owner.x + owner.width / 2;
        this.y = owner.y + owner.height / 2;
        
        const baseSpeed = 8.5;
        this.vx = 0;
        this.vy = 0;
        
        if (this.facing === 'right') this.vx = baseSpeed;
        else if (this.facing === 'left') this.vx = -baseSpeed;
        else if (this.facing === 'down') this.vy = baseSpeed;
        else if (this.facing === 'up') this.vy = -baseSpeed;
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        
        if (this.x < -50 || this.x > WORLD_WIDTH + 50 ||
            this.y < -50 || this.y > WORLD_HEIGHT + 50) {
            this.active = false;
            return;
        }
        
        this.checkCollisions();
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame = (this.currentFrame + 1) % 28;
        }
    }
    
    checkCollisions() {
        if (!this.active) return;
        const scale = PLAYER_SCALE;
        const fw = this.w * scale;
        const fh = this.h * scale;
        
        const fireballRect = {
            x: this.x - fw / 2,
            y: this.y - fh / 2,
            w: fw,
            h: fh
        };
        
        for (let ghost of ghosts) {
            if (!ghost.active) continue;
            
            const gHbox = ghost.getHitbox();
            if (rectOverlap(fireballRect, gHbox)) {
                const kx = this.vx !== 0 ? Math.sign(this.vx) : 0;
                const ky = this.vy !== 0 ? Math.sign(this.vy) : 0;
                
                // Crit chance: base 10% + upgrade bonus; damage scaled by upgrade
                const fbMult = typeof upgrades !== 'undefined' ? upgrades.fireballDamage : 1.0;
                const critChance = 0.10 + (typeof upgrades !== 'undefined' ? upgrades.critBonus : 0);
                const isCrit = Math.random() < critChance;
                const baseDmg = Math.round(75 * fbMult);
                const damage = isCrit ? Math.round(baseDmg * 1.6) : baseDmg;
                
                if (typeof maxDamageDealt !== 'undefined' && damage > maxDamageDealt) maxDamageDealt = damage;
                
                // Tutorial: track fireball kills
                if (typeof tutorialLastAttackWasFireball !== 'undefined') tutorialLastAttackWasFireball = true;
                
                ghost.takeDamage(damage, kx, ky, true, false, isCrit);
                this.active = false;
                
                // Exploding fire particles (more intense for critical hits)
                const particleCount = isCrit ? 22 : 12;
                for (let i = 0; i < particleCount; i++) {
                    gameEffects.push(new FireParticle(this.x, this.y));
                }
                break;
            }
        }

        // Check collision with LastBossIceSpike (destructible spikes)
        if (this.active) {
            for (let effect of gameEffects) {
                if (effect instanceof LastBossIceSpike && effect.active && effect.state === 'holding') {
                    const spikeRect = {
                        x: effect.x - effect.w / 2,
                        y: effect.y - effect.h * 0.85 - 60, // Extend vertically up by 60px
                        w: effect.w,
                        h: effect.h + 120 // Extend total vertical height by 120px to cover top-down height alignment
                    };
                    if (rectOverlap(fireballRect, spikeRect)) {
                        effect.takeDamage(3, 'magic');
                        this.active = false;
                        
                        // Exploding fire particles
                        for (let i = 0; i < 10; i++) {
                            gameEffects.push(new FireParticle(this.x, this.y));
                        }
                        break;
                    }
                }
            }
        }
    }
    
    draw() {
        if (!this.active) return;
        const drawW = this.w * PLAYER_SCALE;
        const drawH = this.h * PLAYER_SCALE;
        
        let angle = 0;
        if (this.facing === 'right') angle = 0;
        else if (this.facing === 'left') angle = Math.PI;
        else if (this.facing === 'down') angle = Math.PI / 2;
        else if (this.facing === 'up') angle = -Math.PI / 2;
        
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        gameCtx.rotate(angle);
        
        const img = fireballFrames[this.currentFrame];
        if (img && img.complete) {
            gameCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        }
        gameCtx.restore();
    }
}


// Ultimate Finisher shockwave and rune circle effect
class UltimateShockwave {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = Math.max(gameCanvas.width, gameCanvas.height);
        this.speed = 18;
        this.alpha = 1.0;
        this.active = true;
    }
    
    update(dt) {
        this.radius += this.speed * dtScale;
        this.alpha = 1.0 - (this.radius / this.maxRadius);
        if (this.radius >= this.maxRadius) {
            this.active = false;
        }
        
        // Hit ghosts within radius
        ghosts.forEach(ghost => {
            if (ghost.active && !ghost.hitByUltimate) {
                const dist = Math.hypot(ghost.x - this.x, ghost.y - this.y);
                if (dist < this.radius) {
                    ghost.hitByUltimate = true;
                    const critChance = 0.10 + (typeof upgrades !== 'undefined' ? upgrades.critBonus : 0);
                    const isCrit = Math.random() < critChance;
                    const baseDmg = 200;
                    const damage = isCrit ? Math.round(baseDmg * 1.6) : baseDmg;
                    ghost.takeDamage(damage, 0, 0, false, false, isCrit);
                }
            }
        });
        
        // Hit ice spikes within radius
        gameEffects.forEach(effect => {
            if (effect instanceof LastBossIceSpike && effect.active && effect.state === 'holding') {
                const dist = Math.hypot(effect.x - this.x, effect.y - this.y);
                if (dist < this.radius) {
                    effect.takeDamage(3, 'finish'); // Deal 3 damage to break the spike
                }
            }
        });
    }
    
    draw() {
        gameCtx.save();
        
        // Inner glowing ring
        gameCtx.strokeStyle = `rgba(167, 139, 250, ${this.alpha})`; // Purple
        gameCtx.lineWidth = 14;
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        gameCtx.stroke();
        
        // Outer red shockwave
        gameCtx.strokeStyle = `rgba(239, 68, 68, ${this.alpha * 0.6})`; // Crimson
        gameCtx.lineWidth = 6;
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
        gameCtx.stroke();
        
        // Drawing golden magic seal glyphs
        gameCtx.strokeStyle = `rgba(253, 224, 71, ${this.alpha * 0.75})`; // Gold
        gameCtx.lineWidth = 4;
        
        const r = this.radius * 0.45;
        if (r > 15) {
            // Circle border
            gameCtx.beginPath();
            gameCtx.arc(this.x, this.y, r, 0, Math.PI * 2);
            gameCtx.stroke();
            
            // 5-Pointed Star
            gameCtx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                const sx = this.x + Math.cos(angle) * r;
                const sy = this.y + Math.sin(angle) * r;
                if (i === 0) gameCtx.moveTo(sx, sy);
                else gameCtx.lineTo(sx, sy);
            }
            gameCtx.closePath();
            gameCtx.stroke();
        }
        
        gameCtx.restore();
    }
}

// Sparkly frost particles
class FrostParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -1 - Math.random() * 2;
        this.size = 3 + Math.random() * 4;
        this.alpha = 1.0;
        this.active = true;
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.alpha -= 0.02 * dtScale;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        gameCtx.fillStyle = `rgba(147, 197, 253, ${this.alpha})`;
        gameCtx.beginPath();
        gameCtx.arc(0, 0, this.size, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.restore();
    }
}

// Spinning icy diamond shard particles for impact feedback
class IceShatterParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 7;
        this.vy = (Math.random() - 0.5) * 7 - 2.5; // fly upwards slightly
        this.size = 2.5 + Math.random() * 5.5;
        this.alpha = 1.0;
        this.decay = 0.035 + Math.random() * 0.035;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.25;
        this.active = true;
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.vy += 0.18 * dtScale; // gravity pull
        this.rotation += this.rotSpeed * dtScale;
        this.alpha -= this.decay * dtScale;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        gameCtx.rotate(this.rotation);
        
        // Ice blue diamond shape with white outline
        gameCtx.fillStyle = `rgba(186, 230, 253, ${this.alpha * 0.85})`;
        gameCtx.strokeStyle = `rgba(255, 255, 255, ${this.alpha * 0.95})`;
        gameCtx.lineWidth = 1;
        
        gameCtx.beginPath();
        gameCtx.moveTo(0, -this.size);
        gameCtx.lineTo(this.size * 0.7, 0);
        gameCtx.lineTo(0, this.size);
        gameCtx.lineTo(-this.size * 0.7, 0);
        gameCtx.closePath();
        gameCtx.fill();
        gameCtx.stroke();
        
        gameCtx.restore();
    }
}

// Screen glacier shatter freeze ultimate effect
class GlacierShatterEffect {
    constructor() {
        this.active = true;
        this.time = 0;
        this.duration = 800; // 800ms
        this.particles = [];
        
        // Spawn 45 floating frost/snowflake particles rising up
        for (let i = 0; i < 45; i++) {
            this.particles.push({
                x: Math.random() * gameCanvas.width,
                y: gameCanvas.height + 20 - Math.random() * 50,
                vx: (Math.random() - 0.5) * 3,
                vy: -4 - Math.random() * 8, // rise up fast
                size: 4 + Math.random() * 6,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 4,
                alpha: 1.0
            });
        }
    }
    
    update(dt) {
        this.time += dt;
        if (this.time >= this.duration) {
            this.active = false;
            return;
        }
        
        const progress = this.time / this.duration;
        this.particles.forEach(p => {
            p.x += p.vx * dtScale;
            p.y += p.vy * dtScale;
            p.vy *= Math.pow(0.98, dtScale); // slow down rising
            p.rot += p.rotSpeed * dt / 1000;
            p.alpha = 1 - progress;
        });
    }
    
    draw() {
        // Fullscreen icy blue flash (drawn in screenspace relative to camera)
        const progress = this.time / this.duration;
        const flashAlpha = Math.max(0, 0.45 - progress * 0.45);
        gameCtx.fillStyle = `rgba(186, 230, 253, ${flashAlpha})`;
        gameCtx.fillRect(camera.x, camera.y, gameCanvas.width, gameCanvas.height);
        
        // Draw rising frost snowflakes
        this.particles.forEach(p => {
            const wx = camera.x + p.x;
            const wy = camera.y + p.y;
            gameCtx.save();
            gameCtx.translate(wx, wy);
            gameCtx.rotate(p.rot);
            
            // Draw a soft glowing ice particle
            gameCtx.fillStyle = `rgba(147, 197, 253, ${p.alpha * 0.85})`;
            gameCtx.beginPath();
            gameCtx.arc(0, 0, p.size, 0, Math.PI * 2);
            gameCtx.fill();
            
            // Outer snowflake outline
            gameCtx.strokeStyle = `rgba(255, 255, 255, ${p.alpha * 0.95})`;
            gameCtx.lineWidth = 1;
            gameCtx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                gameCtx.moveTo(0, 0);
                gameCtx.lineTo(Math.cos(angle) * p.size * 1.5, Math.sin(angle) * p.size * 1.5);
            }
            gameCtx.stroke();
            
            gameCtx.restore();
        });
    }
}

class IceSpike {
    constructor(x, y, scale = 1.0, targetHoldFrame = 8, facing = 'right') {
        this.x = x;
        this.y = y;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 15; // Play 30 frames at 15 FPS (exactly 2.0 seconds duration)
        this.active = true;
        
        this.scale = scale; // Dynamic scale factor for gradual growth
        this.targetHoldFrame = targetHoldFrame; // Dynamic peak frame for holding
        this.facing = facing; // Store skill cast direction for linear knockback
        
        // Scale 150x292 original dimensions dynamically (1.7x larger skill effect size)
        this.w = 150 * 1.53 * scale; 
        this.h = 292 * 1.53 * scale;
        
        this.lastDamageFrame = -1; // Keep track of the last frame damage was applied
        this.damageRadius = 153 * scale; // Scale the damage detection radius dynamically (1.7x larger range)
        
        this.state = 'holding'; // 'holding' or 'melting'
        this.meltTimer = 0;
        this.meltDuration = 350; // 0.35 seconds to fade out smoothly
        this.alpha = 1.0;
        
        // Tick damage variables for hyper multi-hit 뽕맛!
        this.damageTimer = 0;
        this.damageInterval = 75; // Tick damage every 75ms while holding at peak
    }
    
    update(dt) {
        if (this.state === 'holding') {
            const frameInterval = 1000 / this.fps;
            this.frameTimeAcc += dt;
            
            const isPeakReached = (this.currentFrame === this.targetHoldFrame);
            
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                
                if (isPeakReached) {
                    // Hold at target peak frame
                } else {
                    this.currentFrame++;
                    if (this.currentFrame >= 30) {
                        this.active = false;
                    }
                }
            }
            
            if (!isPeakReached) {
                // Apply damage once per animation frame during eruption
                if (this.currentFrame !== this.lastDamageFrame && this.currentFrame < 30) {
                    this.applyDamage();
                    this.lastDamageFrame = this.currentFrame;
                }
            } else {
                // Apply tick damage every 75ms while fully grown and holding
                this.damageTimer += dt;
                if (this.damageTimer >= this.damageInterval) {
                    this.applyDamage();
                    this.damageTimer -= this.damageInterval;
                }
            }
        } else if (this.state === 'melting') {
            this.meltTimer += dt;
            let progress = this.meltTimer / this.meltDuration;
            if (progress >= 1.0) {
                progress = 1.0;
                this.active = false;
            }
            
            // Only fade out alpha (no shrinking)
            this.alpha = 1.0 - progress;
        }
    }
    
    startMelting() {
        this.state = 'melting';
    }
    
    applyDamage() {
        // Find ghosts within radius
        const now = Date.now();
        ghosts.forEach(ghost => {
            if (ghost.active) {
                const gHbox = ghost.getHitbox();
                const gx = gHbox.x + gHbox.w / 2;
                const gy = gHbox.y + gHbox.h / 2;
                const dist = Math.hypot(gx - this.x, gy - this.y) || 1;
                if (dist < this.damageRadius) {
                    // Prevent overlapping spikes from causing extreme lag by limiting hit frequency per ghost
                    if (!ghost.lastIceHitTime || now - ghost.lastIceHitTime > 75) {
                        ghost.lastIceHitTime = now;
                        
                        // Calculate direction along the skill cast direction
                        let kx = 0;
                        let ky = 0;
                        if (this.facing === 'left') kx = -1;
                        else if (this.facing === 'right') kx = 1;
                        else if (this.facing === 'up') ky = -1;
                        else if (this.facing === 'down') ky = 1;
                        
                        // Apply damage. Scaled up slightly since hits are now properly throttled.
                        const finalDmg = Math.round(15 * (typeof upgrades !== 'undefined' ? upgrades.iceDamage : 1.0));
                        ghost.takeDamage(finalDmg, kx * 0.36, ky * 0.36, true, true);
                        ghost.isFrozen = true;
                        ghost.frozenTime = 3000; // 3 seconds freeze
                        
                        // Spawn fewer particles to prevent memory leak/lag
                        if (Math.random() > 0.3) {
                            gameEffects.push(new IceShatterParticle(gx, gy));
                        }
                        
                        // Screen rumble
                        shakeIntensity = Math.max(shakeIntensity, 5.0);
                    }
                }
            }
        });
    }
    
    draw() {
        const img = icespikeFrames[Math.min(icespikeFrames.length - 1, this.currentFrame)];
        if (img && img.complete) {
            gameCtx.save();
            gameCtx.globalAlpha = this.alpha;
            // Draw centered horizontally, but bottom-aligned vertically (so it erupts from the ground)
            gameCtx.drawImage(
                img,
                this.x - this.w / 2,
                this.y - this.h * 0.85, // Lower center ground alignment
                this.w,
                this.h
            );
            gameCtx.restore();
        }
    }
}

// Sequencer to spawn IceSpikes consecutively in front of player
class IceSpikeSequencer {
    constructor(startX, startY, facing) {
        this.startX = startX;
        this.startY = startY;
        this.facing = facing;
        this.spikeCount = 0;
        this.maxSpikes = 15; // Spawns 15 spikes consecutively (half length)
        this.timer = 0;
        this.delayBetweenSpikes = 35; // 35ms interval (faster spawning)
        this.stepDistance = 85; // Moves 85px forward per spike
        this.active = true;
        
        this.spikes = []; // Keep track of spikes spawned by this sequencer
        this.state = 'spawning'; // 'spawning', 'holding', 'done'
        this.holdTimer = 0;
        this.holdDuration = 2000; // 2 seconds hold
    }
    
    update(dt) {
        if (this.state === 'spawning') {
            this.timer += dt;
            if (this.timer >= this.delayBetweenSpikes) {
                this.timer = 0;
                
                const dist = (this.spikeCount + 1) * this.stepDistance;
                let sx = this.startX;
                let sy = this.startY;
                
                if (this.facing === 'left') sx -= dist;
                else if (this.facing === 'right') sx += dist;
                else if (this.facing === 'up') sy -= dist;
                else if (this.facing === 'down') sy += dist;
                
                // Check if target spike position is outside the arena boundary (prevent passing stone tower)
                const cx = WORLD_WIDTH * 0.500;
                const cy = WORLD_HEIGHT * 0.541;
                const rx = WORLD_WIDTH * 0.403;
                const ry = WORLD_HEIGHT * 0.265;
                const dx = sx - cx;
                const dy = sy - cy;
                const nx = dx / rx;
                const ny = dy / ry;
                if (nx * nx + ny * ny > 1.0) {
                    // Stop spawning spikes immediately if we hit the edge of the platform
                    this.state = 'holding';
                    this.holdTimer = 0;
                    return;
                }
                
                // Calculate targetHoldFrame smoothly from 3 to 16 based on spikeCount (0 to 28)
                let targetHoldFrame = 3 + Math.floor((this.spikeCount / (this.maxSpikes - 1)) * 13);
                
                // Calculate smooth linear scaling from 0.4x to 1.0x size for a perfect staircase growth
                let scale = 0.4 + (this.spikeCount / (this.maxSpikes - 1)) * 0.6;
                const spike = new IceSpike(sx, sy, scale, targetHoldFrame, this.facing);
                gameEffects.push(spike);
                this.spikes.push(spike);
                
                // Screen rumble on each ground eruption (stronger feedback)
                shakeIntensity = 12;
                
                this.spikeCount++;
                if (this.spikeCount >= this.maxSpikes) {
                    this.state = 'holding';
                    this.holdTimer = 0;
                }
            }
        } else if (this.state === 'holding') {
            this.holdTimer += dt;
            if (this.holdTimer >= this.holdDuration) {
                this.state = 'melting';
                this.timer = 0; // reuse timer for melt interval
                this.meltCount = 0; // count melted spikes
            }
        } else if (this.state === 'melting') {
            this.timer += dt;
            // Spikes melt one by one with a small delay (20ms) starting from the player's position
            const delayBetweenMelt = 20; 
            if (this.timer >= delayBetweenMelt) {
                this.timer = 0;
                
                if (this.meltCount < this.spikes.length) {
                    const s = this.spikes[this.meltCount];
                    if (s && s.active) {
                        s.startMelting();
                    }
                    this.meltCount++;
                } else {
                    this.state = 'done';
                    this.active = false;
                }
            }
        }
    }
    
    draw() {
        // Sequencer does not render anything directly
    }
}

class LastBossIceSpike {
    constructor(x, y, scale = 1.0, targetHoldFrame = 8, angle = 0) {
        this.x = x;
        this.y = y;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 15; // Play 30 frames at 15 FPS (exactly 2.0 seconds duration)
        this.active = true;
        this.hp = 3; // Health pool of the ice spike
        
        this.scale = scale; // Dynamic scale factor for gradual growth
        this.targetHoldFrame = targetHoldFrame; // Dynamic peak frame for holding
        this.angle = angle; // Store angle for linear knockback
        
        // Scale 150x292 original dimensions dynamically (1.7x larger skill effect size)
        this.w = 150 * 1.53 * scale; 
        this.h = 292 * 1.53 * scale;
        
        this.lastDamageFrame = -1; // Keep track of the last frame damage was applied
        this.damageRadius = 153 * scale; // Scale the damage detection radius dynamically (1.7x larger range)
        
        this.state = 'holding'; // 'holding' or 'melting'
        this.meltTimer = 0;
        this.meltDuration = 350; // 0.35 seconds to fade out smoothly
        this.alpha = 1.0;
        
        // Tick damage variables
        this.damageTimer = 0;
        this.damageInterval = 75; // Tick damage every 75ms while holding at peak
    }
    
    getCollisionBox() {
        const hw = this.w * 0.22;
        const hh = this.h * 0.12;
        return {
            x: this.x - hw,
            y: this.y - hh * 0.8,
            w: hw * 2,
            h: hh
        };
    }
    
    update(dt) {
        if (this.state === 'holding') {
            const frameInterval = 1000 / this.fps;
            this.frameTimeAcc += dt;
            
            const isPeakReached = (this.currentFrame === this.targetHoldFrame);
            
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                
                if (isPeakReached) {
                    // Hold at target peak frame
                } else {
                    this.currentFrame++;
                    if (this.currentFrame >= 30) {
                        this.active = false;
                    }
                }
            }
            
            // Only apply damage once per animation frame during eruption (not while holding)
            if (!isPeakReached) {
                if (this.currentFrame !== this.lastDamageFrame && this.currentFrame < 30) {
                    this.applyDamage();
                    this.lastDamageFrame = this.currentFrame;
                }
            }
        } else if (this.state === 'melting') {
            this.meltTimer += dt;
            let progress = this.meltTimer / this.meltDuration;
            if (progress >= 1.0) {
                progress = 1.0;
                this.active = false;
            }
            
            // Only fade out alpha (no shrinking)
            this.alpha = 1.0 - progress;
        }
    }
    
    startMelting() {
        this.state = 'melting';
    }
    
    applyDamage() {
        const now = Date.now();
        const pHbox = player.getHitbox();
        
        // Target hitbox of the spike (narrow base box)
        const spikeHbox = this.getCollisionBox();
        
        // AABB Collision check
        const isColliding = (
            pHbox.x < spikeHbox.x + spikeHbox.w &&
            pHbox.x + pHbox.w > spikeHbox.x &&
            pHbox.y < spikeHbox.y + spikeHbox.h &&
            pHbox.y + pHbox.h > spikeHbox.y
        );
        
        if (isColliding && !player.isInvincible) {
            // Prevent overlapping spikes from causing extreme lag by limiting hit frequency per entity
            if (!player.lastIceHitTime || now - player.lastIceHitTime > 150) {
                player.lastIceHitTime = now;
                
                // Calculate direction along the skill cast direction
                let kx = Math.cos(this.angle);
                let ky = Math.sin(this.angle);
                
                // Apply damage.
                player.takeDamage(15, kx * 0.36, ky * 0.36);
                player.isSlowed = true;
                player.slowedTime = 2500; // 2.5 seconds slow (blocks movement less severely)
                
                // Spawn fewer particles to prevent memory leak/lag
                const px = pHbox.x + pHbox.w / 2;
                const py = pHbox.y + pHbox.h / 2;
                if (Math.random() > 0.3) {
                    gameEffects.push(new IceShatterParticle(px, py));
                }
                
                // Screen rumble
                shakeIntensity = Math.max(shakeIntensity, 5.0);
            }
        }
    }
    
    draw() {
        const img = icespikeFrames[Math.min(icespikeFrames.length - 1, this.currentFrame)];
        if (img && img.complete) {
            gameCtx.save();
            gameCtx.globalAlpha = this.alpha;
            // Draw centered horizontally, but bottom-aligned vertically (so it erupts from the ground)
            gameCtx.drawImage(
                img,
                this.x - this.w / 2,
                this.y - this.h * 0.85, // Lower center ground alignment
                this.w,
                this.h
            );
            gameCtx.restore();
        }
    }
    
    takeDamage(dmg, source = 'sword') {
        this.hp -= dmg;
        
        // Lifesteal on hit
        if (typeof upgrades !== 'undefined' && upgrades.lifeSteal > 0) {
            let baseDmg = SWORD_DAMAGE;
            if (source === 'magic') {
                const fbMult = typeof upgrades !== 'undefined' ? upgrades.fireballDamage : 1.0;
                baseDmg = 75 * fbMult;
            } else if (source === 'finish') {
                baseDmg = 350; // Ultimate damage base
            }
            const mult = (source === 'magic') ? 1.0 : (typeof upgrades !== 'undefined' ? upgrades.swordDamage : 1.0);
            const finalDmg = baseDmg * mult;
            const healAmount = finalDmg * upgrades.lifeSteal;
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
        }
        
        if (this.hp <= 0) {
            this.active = false;
            // Spawn shatter particles
            for (let i = 0; i < 15; i++) {
                gameEffects.push(new IceShatterParticle(this.x, this.y - this.h * 0.4));
            }
            playIceShatterSound(); // Shatter sound feedback
            shakeIntensity = Math.max(shakeIntensity, 6.0);
        }
    }
}
 
// Sequencer to spawn IceSpikes consecutively in front of lastboss
class LastBossIceSpikeSequencer {
    constructor(startX, startY, angle) {
        this.startX = startX;
        this.startY = startY;
        this.angle = angle;
        this.spikeCount = 0;
        this.maxSpikes = 15; // Spawns 15 spikes consecutively
        this.timer = 0;
        this.delayBetweenSpikes = 35; // 35ms interval
        this.stepDistance = 85; // Moves 85px forward per spike
        this.active = true;
        
        this.spikes = []; // Keep track of spikes spawned by this sequencer
        this.state = 'spawning'; // 'spawning', 'holding', 'done'
        this.holdTimer = 0;
        this.holdDuration = 2000; // 2 seconds hold
    }
    
    update(dt) {
        if (this.state === 'spawning') {
            this.timer += dt;
            if (this.timer >= this.delayBetweenSpikes) {
                this.timer = 0;
                
                const dist = (this.spikeCount + 1) * this.stepDistance;
                let sx = this.startX + Math.cos(this.angle) * dist;
                let sy = this.startY + Math.sin(this.angle) * dist;
                
                // Check if target spike position is outside the arena boundary (prevent passing stone tower)
                const cx = WORLD_WIDTH * 0.500;
                const cy = WORLD_HEIGHT * 0.541;
                const rx = WORLD_WIDTH * 0.403;
                const ry = WORLD_HEIGHT * 0.265;
                const dx = sx - cx;
                const dy = sy - cy;
                const nx = dx / rx;
                const ny = dy / ry;
                if (nx * nx + ny * ny > 1.0) {
                    // Stop spawning spikes immediately if we hit the edge of the platform
                    this.state = 'holding';
                    this.holdTimer = 0;
                    return;
                }
                
                // Calculate targetHoldFrame smoothly from 3 to 16 based on spikeCount (0 to 28)
                let targetHoldFrame = 3 + Math.floor((this.spikeCount / (this.maxSpikes - 1)) * 13);
                
                // Calculate smooth linear scaling from 0.4x to 1.0x size for a perfect staircase growth
                let scale = 0.4 + (this.spikeCount / (this.maxSpikes - 1)) * 0.6;
                const spike = new LastBossIceSpike(sx, sy, scale, targetHoldFrame, this.angle);
                gameEffects.push(spike);
                this.spikes.push(spike);
                
                // Screen rumble on each ground eruption (stronger feedback)
                shakeIntensity = 12;
                
                this.spikeCount++;
                if (this.spikeCount >= this.maxSpikes) {
                    this.state = 'holding';
                    this.holdTimer = 0;
                }
            }
        } else if (this.state === 'holding') {
            // Do not melt automatically. Remain indefinitely until player breaks them.
        } else if (this.state === 'melting') {
            this.timer += dt;
            // Spikes melt one by one with a small delay (20ms) starting from the player's position
            const delayBetweenMelt = 20; 
            if (this.timer >= delayBetweenMelt) {
                this.timer = 0;
                
                if (this.meltCount < this.spikes.length) {
                    const s = this.spikes[this.meltCount];
                    if (s && s.active) {
                        s.startMelting();
                    }
                    this.meltCount++;
                } else {
                    this.state = 'done';
                    this.active = false;
                }
            }
        }
    }
    
    draw() {
        // Sequencer does not render anything directly
    }
}

// Expanding magical ice circle from player caster
class IceMagicCircle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.maxRadius = Math.max(gameCanvas.width, gameCanvas.height) * 0.7; // expand to cover most of screen
        this.speed = 15;
        this.alpha = 1.0;
        this.active = true;
    }
    
    update(dt) {
        this.radius += this.speed * dtScale;
        this.alpha = 1.0 - (this.radius / this.maxRadius);
        if (this.radius >= this.maxRadius) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        
        // Ice-blue glowing expanding ring
        gameCtx.strokeStyle = `rgba(56, 189, 248, ${this.alpha})`; // Light blue
        gameCtx.lineWidth = 8;
        gameCtx.shadowColor = '#38bdf8';
        gameCtx.shadowBlur = 15;
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        gameCtx.stroke();
        
        // Snowflake geometry inside the circle
        gameCtx.strokeStyle = `rgba(186, 230, 253, ${this.alpha * 0.8})`; // Pale Ice Blue
        gameCtx.lineWidth = 3;
        
        const r = this.radius;
        if (r > 20) {
            // Draw 6-pointed star / snowflake structure
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI / 3);
                const ex = this.x + Math.cos(angle) * r;
                const ey = this.y + Math.sin(angle) * r;
                gameCtx.beginPath();
                gameCtx.moveTo(this.x, this.y);
                gameCtx.lineTo(ex, ey);
                gameCtx.stroke();
                
                // Add branches to the snowflake arms
                const branchR = r * 0.5;
                const bx = this.x + Math.cos(angle) * branchR;
                const by = this.y + Math.sin(angle) * branchR;
                
                const bAngle1 = angle + Math.PI / 4;
                const bAngle2 = angle - Math.PI / 4;
                const branchLen = r * 0.25;
                
                gameCtx.beginPath();
                gameCtx.moveTo(bx, by);
                gameCtx.lineTo(bx + Math.cos(bAngle1) * branchLen, by + Math.sin(bAngle1) * branchLen);
                gameCtx.moveTo(bx, by);
                gameCtx.lineTo(bx + Math.cos(bAngle2) * branchLen, by + Math.sin(bAngle2) * branchLen);
                gameCtx.stroke();
            }
            
            // Draw secondary outer ring
            gameCtx.beginPath();
            gameCtx.arc(this.x, this.y, r * 0.8, 0, Math.PI * 2);
            gameCtx.stroke();
        }
        
        gameCtx.restore();
    }
}

// Distance from point P to line segment between S and E
function distanceToSegment(px, py, sx, sy, ex, ey) {
    const l2 = (ex - sx) ** 2 + (ey - sy) ** 2;
    if (l2 === 0) return Math.hypot(px - sx, py - sy);
    let t = ((px - sx) * (ex - sx) + (py - sy) * (ey - sy)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (sx + t * (ex - sx)), py - (sy + t * (ey - sy)));
}

// Sparkly lightning particles
class LightningParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 16;
        this.vy = (Math.random() - 0.5) * 16;
        this.length = 6 + Math.random() * 18;
        this.angle = Math.random() * Math.PI * 2;
        this.life = 1.0;
        this.decay = 0.05 + Math.random() * 0.05;
        this.color = Math.random() > 0.35 ? '#facc15' : '#60a5fa'; // Gold Yellow or Electric Cyan-Blue
        this.active = true;
    }
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.life -= this.decay * dtScale;
        if (this.life <= 0) {
            this.active = false;
        }
    }
    draw() {
        gameCtx.save();
        gameCtx.strokeStyle = this.color;
        gameCtx.globalAlpha = this.life;
        gameCtx.lineWidth = 2.5;
        gameCtx.beginPath();
        gameCtx.moveTo(this.x, this.y);
        gameCtx.lineTo(this.x + Math.cos(this.angle) * this.length, this.y + Math.sin(this.angle) * this.length);
        gameCtx.stroke();
        gameCtx.restore();
    }
}

// Thunderclap and Flash (벽력일섬) Linear Jagged Lightning Strike
class ThunderclapFlashEffect {
    constructor(sx, sy, ex, ey) {
        this.sx = sx;
        this.sy = sy;
        this.ex = ex;
        this.ey = ey;
        this.life = 1.0;
        this.decay = 0.045; // Fades in ~300ms
        this.active = true;
        
        // Generate points for the jagged electric shape
        this.points = [];
        const dx = ex - sx;
        const dy = ey - sy;
        const distance = Math.hypot(dx, dy);
        const segments = Math.max(5, Math.floor(distance / 24));
        
        this.points.push({ x: sx, y: sy });
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            let px = sx + dx * t;
            let py = sy + dy * t;
            
            // Perpendicular offset
            const nx = -dy / distance;
            const ny = dx / distance;
            const offset = (Math.random() - 0.5) * 32; // Jagged offset amplitude
            px += nx * offset;
            py += ny * offset;
            
            this.points.push({ x: px, y: py });
        }
        this.points.push({ x: ex, y: ey });
    }
    
    update(dt) {
        this.life -= this.decay;
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    draw() {
        gameCtx.save();
        
        // 1. Gold bloom slash trail
        gameCtx.strokeStyle = `rgba(253, 224, 71, ${this.life * 0.45})`;
        gameCtx.lineWidth = 26 * this.life;
        gameCtx.beginPath();
        gameCtx.moveTo(this.sx, this.sy);
        gameCtx.lineTo(this.ex, this.ey);
        gameCtx.stroke();
        
        // 2. Central white lightning bolt
        gameCtx.strokeStyle = `rgba(255, 255, 255, ${this.life})`;
        gameCtx.lineWidth = 3.5;
        gameCtx.beginPath();
        gameCtx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            gameCtx.lineTo(this.points[i].x, this.points[i].y);
        }
        gameCtx.stroke();
        
        // 3. Neon blue crackling energy aura
        gameCtx.strokeStyle = `rgba(96, 165, 250, ${this.life * 0.75})`;
        gameCtx.lineWidth = 8;
        gameCtx.beginPath();
        gameCtx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            gameCtx.lineTo(this.points[i].x, this.points[i].y);
        }
        gameCtx.stroke();
        
        gameCtx.restore();
    }
}

// Fade out afterimages along the dash line
class PlayerAfterimage {
    constructor(img, sx, sy, sw, sh, x, y, w, h, facing, alphaDecay = 0.06, color = null) {
        this.img = img;
        this.sx = sx;
        this.sy = sy;
        this.sw = sw;
        this.sh = sh;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.facing = facing;
        this.alpha = 0.65;
        this.decay = alphaDecay;
        this.active = true;
        this.color = color || 'rgba(96, 165, 250, ALPHA)';
    }
    update(dt) {
        this.alpha -= this.decay * dtScale;
        if (this.alpha <= 0) {
            this.active = false;
        }
    }
    draw() {
        if (!this.img || !this.img.complete) return;
        gameCtx.save();
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        gameCtx.translate(cx, cy);
        
        let angle = 0;
        let flip = false;
        if (this.facing === 'left') {
            flip = true;
        } else if (this.facing === 'up') {
            angle = -Math.PI / 2;
        } else if (this.facing === 'down') {
            angle = Math.PI / 2;
        }
        gameCtx.rotate(angle);
        if (flip) {
            gameCtx.scale(-1, 1);
        }
        
        const halfW = this.w / 2;
        const halfH = this.h / 2;
        
        const colorStr = this.color.replace('ALPHA', this.alpha.toFixed(3));
        
        // Render afterimage tinted with translucent color
        drawTintedImage(
            this.img, this.sx, this.sy, this.sw, this.sh,
            -halfW, -halfH, this.w, this.h,
            colorStr
        );
        
        gameCtx.restore();
    }
}

// ==========================================
// MONSTER GHOST CLASS
// ==========================================

class Ghost {
    constructor(startX, startY) {
        this.w = CELL_W * PLAYER_SCALE; // 96
        this.h = CELL_H * PLAYER_SCALE; // 96
        this.active = true;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 8;
        this.hp = GHOST_MAX_HP; 
        this.speed = 1.0 + Math.random() * 0.8; 
        this.isFrozen = false;
        this.frozenTime = 0;
        this.spawnTime = 800; // 800ms spawn time
        
        if (startX !== undefined && startY !== undefined) {
            this.x = startX;
            this.y = startY;
        } else {
            const pos = getRandomArenaSpawnPosition();
            this.x = pos.x;
            this.y = pos.y;
        }
        
        this.flashTime = 0; // Visual flash timer
        this.knockbackX = 0;
        this.knockbackY = 0;
    }
    
    // Exact gameplay bounding box for colliders
    getHitbox() {
        const hw = this.w * 0.4;
        const hh = this.h * 0.5;
        return {
            x: this.x - hw / 2,
            y: this.y - hh / 2 + 5,
            w: hw,
            h: hh
        };
    }
    
    update(dt) {
        if (!this.active) return;
        
        if (this.spawnTime > 0) {
            this.spawnTime -= dt;
            if (Math.random() < 0.2) {
                gameEffects.push(new SparkleParticle(this.x + (Math.random() - 0.5) * 30, this.y + this.h / 2 + (Math.random() - 0.5) * 10, '#00f5ff'));
            }
            return;
        }
        
        if (this.isFrozen) {
            this.frozenTime -= dt;
            if (this.frozenTime <= 0) {
                this.isFrozen = false;
            }
        }
        
        // Track towards player center
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let currentSpeed = this.speed;
        if (this.isFrozen) {
            currentSpeed = this.speed * 0.3; // 70% slow (30% speed)
            
            // Spawn tiny ice sparkles occasionally
            if (Math.random() < 0.05) {
                gameEffects.push(new FrostParticle(this.x + (Math.random() - 0.5) * this.w * 0.4, this.y + (Math.random() - 0.5) * this.h * 0.4));
            }
        }
        
        // Apply decaying knockback velocity
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dtScale;
            this.y += this.knockbackY * dtScale;
            this.knockbackX *= Math.pow(0.82, dtScale);
            this.knockbackY *= Math.pow(0.82, dtScale);
        } else {
            this.knockbackX = 0;
            this.knockbackY = 0;
            
            if (dist > 8) {
                this.x += (dx / dist) * currentSpeed * dtScale;
                this.y += (dy / dist) * currentSpeed * dtScale;
            }
        }
        
        // Clamp to world bounds
        const clamped = clampCenterToArena(this.x, this.y, this.h / 2);
        this.x = clamped.x;
        this.y = clamped.y;
        
        // Animation
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame = (this.currentFrame + 1) % 6;
        }
        
        if (this.flashTime > 0) {
            this.flashTime -= dt;
        }
        
        this.checkPlayerHit();
    }
    
    checkPlayerHit() {
        if (player.isInvincible) return;
        
        const pHbox = player.getHitbox();
        const gHbox = this.getHitbox();
        
        if (rectOverlap(pHbox, gHbox)) {
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;
            const dx = pCenterX - this.x;
            const dy = pCenterY - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            
            // Knock back player
            player.takeDamage(10, dx / dist, dy / dist);
            
            // Also knock back this ghost in the opposite direction to separate them and prevent hit lock
            this.knockbackX = -(dx / dist) * 10;
            this.knockbackY = -(dy / dist) * 10;
        }
    }
    
    takeDamage(amount, knockbackX, knockbackY, isMagic = false, isMultiHit = false, isCritical = false) {
        if (player.isDebugMode) amount = 300;
        this.hp = Math.max(0, this.hp - amount);
        this.flashTime = 200; // Flashes for 200ms
        
        // Apply knockback velocity (decays in update)
        this.knockbackX = knockbackX * 3.6;
        this.knockbackY = knockbackY * 3.6;
        
        if (!isMultiHit) {
            // Screen Shake and HitStop (Hit freeze) for premium crunchy feedback
            shakeIntensity = isMagic ? 14 : 9;
            hitStopDuration = isMagic ? 70 : 45; // 45-70ms freeze
            
            playGhostHurtSound();
            
            // Spawn Splattering particles
            const particleCount = isMagic ? 12 : 7;
            for (let i = 0; i < particleCount; i++) {
                gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            }
            
            // Neon HitSlash for satisfying visual slice
            gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            
            // Critical Shockwave
            if (amount >= 100) {
                gameEffects.push(new ShockwaveRing(this.x, this.y, 60, isMagic));
                shakeIntensity = Math.max(shakeIntensity, 18); // Shake harder on crits
            }
        } else {
            // Multi-hit light impact feedback (No HitStop freeze!)
            shakeIntensity = Math.max(shakeIntensity, 2.5); // Subtle shake
            if (Math.random() < 0.15) {
                playGhostHurtSound(); // Throttled sound
            }
            // Spawn a single particle instead of 12 to prevent rendering lag
            gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            
            // Occasional tiny slash on multihit
            if (Math.random() < 0.25) {
                gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            }
        }
        
        // Spawn Floating Damage Text
        // Lifesteal on hit
        if (upgrades.lifeSteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + amount * upgrades.lifeSteal);
        }
        
        gameEffects.push(new DamageNumber(this.x, this.y - 10, amount, isMagic, isCritical));
        
        if (this.hp <= 0) {
            this.active = false;
            // Score/XP awarded via onMonsterKilled() in gameLoop filter
            for (let i = 0; i < 12; i++) {
                gameEffects.push(new DeathParticle(this.x, this.y));
            }
        }
    }
    
    draw() {
        const drawX = this.x - this.w / 2;
        const drawY = this.y - this.h / 2;
        
        // Check flipping based on player position
        const flip = player.x + player.width / 2 < this.x;
        
        let alpha = 1.0;
        if (this.spawnTime > 0) {
            alpha = (800 - this.spawnTime) / 800;
            
            // Draw expanding magical circle
            const ratio = (800 - this.spawnTime) / 800;
            gameCtx.save();
            gameCtx.translate(this.x, this.y + this.h / 2);
            const grad = gameCtx.createRadialGradient(0, 0, 0, 0, 0, 45 * ratio);
            grad.addColorStop(0, 'rgba(0, 245, 255, 0.8)');
            grad.addColorStop(0.5, 'rgba(0, 245, 255, 0.3)');
            grad.addColorStop(1, 'rgba(0, 245, 255, 0)');
            gameCtx.fillStyle = grad;
            gameCtx.beginPath();
            gameCtx.ellipse(0, 0, 45 * ratio, 18 * ratio, 0, 0, Math.PI * 2);
            gameCtx.fill();
            
            // Outer ring
            gameCtx.strokeStyle = `rgba(0, 245, 255, ${0.6 * (1 - ratio)})`;
            gameCtx.lineWidth = 2;
            gameCtx.beginPath();
            gameCtx.ellipse(0, 0, 50 * ratio, 20 * ratio, 0, 0, Math.PI * 2);
            gameCtx.stroke();
            gameCtx.restore();
        }
        
        gameCtx.save();
        gameCtx.globalAlpha = alpha;
        
        if (this.flashTime > 0) {
            // White-hot flash at the start, decaying into crimson red for maximum hit aesthetic
            const color = this.flashTime > 130 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(239, 68, 68, 0.85)';
            drawTintedImage(
                ghostFrames[this.currentFrame],
                0, 0, 32, 32,
                drawX, drawY, this.w, this.h,
                color,
                flip
            );
        } else if (this.isFrozen) {
            // Draw frozen ice-blue silhouette overlay
            drawTintedImage(
                ghostFrames[this.currentFrame],
                0, 0, 32, 32,
                drawX, drawY, this.w, this.h,
                'rgba(147, 197, 253, 0.75)',
                flip
            );
        } else {
            // Normal Render
            gameCtx.save();
            if (flip) {
                gameCtx.translate(drawX + this.w, drawY);
                gameCtx.scale(-1, 1);
                gameCtx.drawImage(ghostFrames[this.currentFrame], 0, 0, this.w, this.h);
            } else {
                gameCtx.drawImage(ghostFrames[this.currentFrame], drawX, drawY, this.w, this.h);
            }
            gameCtx.restore();
        }
        
        gameCtx.restore();
    }
}

class EyeMonster {
    constructor(startX, startY) {
        this.w = CELL_W * PLAYER_SCALE; // 96
        this.h = CELL_H * PLAYER_SCALE; // 96
        this.active = true;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 10;
        this.hp = 50; // lower HP than ghost (75)
        this.speed = 1.6 + Math.random() * 1.0; // faster than ghost (1.0 - 1.8)
        this.isFrozen = false;
        this.frozenTime = 0;
        this.maxSpawnTime = 300; // 300ms spawn animation (0.5 seconds faster than default 800)
        this.spawnTime = this.maxSpawnTime;
        
        if (startX !== undefined && startY !== undefined) {
            // Explicit position provided (e.g. boss wave octagon)
            this.x = startX;
            this.y = startY;
        } else {
            // Spawn inside arena boundary (same as Ghost)
            const pos = getRandomArenaSpawnPosition();
            this.x = pos.x;
            this.y = pos.y;
        }
        
        this.flashTime = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
    }
    
    getHitbox() {
        const hw = this.w * 0.4;
        const hh = this.h * 0.5;
        return {
            x: this.x - hw / 2,
            y: this.y - hh / 2 + 5,
            w: hw,
            h: hh
        };
    }
    
    update(dt) {
        if (!this.active) return;
        
        // Spawn animation phase
        if (this.spawnTime > 0) {
            this.spawnTime -= dt;
            if (Math.random() < 0.2) {
                gameEffects.push(new SparkleParticle(this.x + (Math.random() - 0.5) * 30, this.y + this.h / 2 + (Math.random() - 0.5) * 10, '#00f5ff'));
            }
            return;
        }
        
        if (this.isFrozen) {
            this.frozenTime -= dt;
            if (this.frozenTime <= 0) {
                this.isFrozen = false;
            }
        }
        
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.hypot(dx, dy);
        
        let currentSpeed = this.speed;
        if (this.isFrozen) {
            currentSpeed = this.speed * 0.3;
            if (Math.random() < 0.05) {
                gameEffects.push(new FrostParticle(this.x + (Math.random() - 0.5) * this.w * 0.4, this.y + (Math.random() - 0.5) * this.h * 0.4));
            }
        }
        
        // Apply decaying knockback velocity
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dtScale;
            this.y += this.knockbackY * dtScale;
            this.knockbackX *= Math.pow(0.82, dtScale);
            this.knockbackY *= Math.pow(0.82, dtScale);
        } else {
            this.knockbackX = 0;
            this.knockbackY = 0;
            
            if (dist > 8) {
                this.x += (dx / dist) * currentSpeed * dtScale;
                this.y += (dy / dist) * currentSpeed * dtScale;
            }
        }
        
        // BUG FIX: was using this.width/this.height (undefined) → use this.w/this.h
        const clamped = clampToArena(this.x, this.y, this.w, this.h);
        this.x = clamped.x;
        this.y = clamped.y;
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame = (this.currentFrame + 1) % 24;
        }
        
        if (this.flashTime > 0) {
            this.flashTime -= dt;
        }
        
        this.checkPlayerHit();
    }
    
    checkPlayerHit() {
        if (player.isInvincible) return;
        
        const pHbox = player.getHitbox();
        const gHbox = this.getHitbox();
        
        if (rectOverlap(pHbox, gHbox)) {
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;
            const dx = pCenterX - this.x;
            const dy = pCenterY - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            
            player.takeDamage(8, dx / dist, dy / dist); // Eye monster deals 8 dmg
            
            this.knockbackX = -(dx / dist) * 10;
            this.knockbackY = -(dy / dist) * 10;
        }
    }
    
    takeDamage(amount, knockbackX, knockbackY, isMagic = false, isMultiHit = false, isCritical = false) {
        if (player.isDebugMode) amount = 300;
        this.hp = Math.max(0, this.hp - amount);
        this.flashTime = 200;
        
        this.knockbackX = knockbackX * 3.6;
        this.knockbackY = knockbackY * 3.6;
        
        if (!isMultiHit) {
            shakeIntensity = isMagic ? 14 : 9;
            hitStopDuration = isMagic ? 70 : 45;
            
            playEyeHurtSound();
            
            const particleCount = isMagic ? 12 : 7;
            for (let i = 0; i < particleCount; i++) {
                gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            }
            
            // Neon HitSlash for satisfying visual slice
            gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            
            // Critical Shockwave
            if (amount >= 100) {
                gameEffects.push(new ShockwaveRing(this.x, this.y, 60, isMagic));
                shakeIntensity = Math.max(shakeIntensity, 18); // Shake harder on crits
            }
        } else {
            // Multi-hit light impact feedback (No HitStop freeze!)
            shakeIntensity = Math.max(shakeIntensity, 2.5); // Subtle shake
            if (Math.random() < 0.15) {
                playEyeHurtSound(); // Throttled sound
            }
            // Spawn a single particle instead of 12 to prevent rendering lag
            gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            
            // Occasional tiny slash on multihit
            if (Math.random() < 0.25) {
                gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            }
        }
        
        // Lifesteal on hit
        if (upgrades.lifeSteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + amount * upgrades.lifeSteal);
        }
        
        gameEffects.push(new DamageNumber(this.x, this.y - 10, amount, isMagic, isCritical));
        
        if (this.hp <= 0) {
            this.active = false;
            // Score/XP awarded via onMonsterKilled() in gameLoop filter
            for (let i = 0; i < 12; i++) {
                gameEffects.push(new DeathParticle(this.x, this.y));
            }
        }
    }
    
    draw() {
        const drawX = this.x - this.w / 2;
        const drawY = this.y - this.h / 2;
        const flip = player.x + player.width / 2 < this.x;
        
        // Spawn fade-in
        let alpha = 1.0;
        if (this.spawnTime > 0) {
            alpha = (this.maxSpawnTime - this.spawnTime) / this.maxSpawnTime;
            // Draw spawn circle
            const ratio = (this.maxSpawnTime - this.spawnTime) / this.maxSpawnTime;
            gameCtx.save();
            gameCtx.translate(this.x, this.y + this.h / 2);
            const grad = gameCtx.createRadialGradient(0, 0, 0, 0, 0, 45 * ratio);
            grad.addColorStop(0, 'rgba(0, 245, 255, 0.8)');
            grad.addColorStop(0.5, 'rgba(0, 245, 255, 0.3)');
            grad.addColorStop(1, 'rgba(0, 245, 255, 0)');
            gameCtx.fillStyle = grad;
            gameCtx.beginPath();
            gameCtx.ellipse(0, 0, 45 * ratio, 18 * ratio, 0, 0, Math.PI * 2);
            gameCtx.fill();
            gameCtx.strokeStyle = `rgba(0, 245, 255, ${0.6 * (1 - ratio)})`;
            gameCtx.lineWidth = 2;
            gameCtx.beginPath();
            gameCtx.ellipse(0, 0, 50 * ratio, 20 * ratio, 0, 0, Math.PI * 2);
            gameCtx.stroke();
            gameCtx.restore();
        }
        
        gameCtx.save();
        gameCtx.globalAlpha = alpha;
        
        if (this.flashTime > 0) {
            const color = this.flashTime > 130 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(239, 68, 68, 0.85)';
            drawTintedImage(
                eyeMonsterFrames[this.currentFrame],
                0, 0, 32, 32,
                drawX, drawY, this.w, this.h,
                color,
                flip
            );
        } else if (this.isFrozen) {
            drawTintedImage(
                eyeMonsterFrames[this.currentFrame],
                0, 0, 32, 32,
                drawX, drawY, this.w, this.h,
                'rgba(147, 197, 253, 0.75)',
                flip
            );
        } else {
            gameCtx.save();
            if (flip) {
                gameCtx.translate(drawX + this.w, drawY);
                gameCtx.scale(-1, 1);
                gameCtx.drawImage(eyeMonsterFrames[this.currentFrame], 0, 0, this.w, this.h);
            } else {
                gameCtx.drawImage(eyeMonsterFrames[this.currentFrame], drawX, drawY, this.w, this.h);
            }
            gameCtx.restore();
        }
        
        gameCtx.restore();
    }
}

class Arrow {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.active = true;
        this.w = 64;
        this.h = 24;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const speed = 7.0;
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
        this.angle = Math.atan2(dy, dx);
    }
    
    update(dt) {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        
        if (this.x < -50 || this.x > WORLD_WIDTH + 50 ||
            this.y < -50 || this.y > WORLD_HEIGHT + 50) {
            this.active = false;
            return;
        }
        
        if (!player.isInvincible) {
            const pHbox = player.getHitbox();
            const aw = 36;
            const ah = 12;
            const aRect = {
                x: this.x - aw / 2,
                y: this.y - ah / 2,
                w: aw,
                h: ah
            };
            
            if (rectOverlap(pHbox, aRect)) {
                const dist = Math.hypot(this.vx, this.vy) || 1;
                player.takeDamage(10, this.vx / dist, this.vy / dist);
                this.active = false;
                
                for (let i = 0; i < 6; i++) {
                    gameEffects.push(new HitParticle(this.x, this.y, false));
                }
            }
        }
    }
    
    draw() {
        if (!this.active) return;
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        gameCtx.rotate(this.angle);
        gameCtx.drawImage(arrowMonsterArrowImg, -this.w / 2, -this.h / 2, this.w, this.h);
        gameCtx.restore();
    }
}

class ArrowMonster {
    constructor(startX, startY) {
        this.w = 128;
        this.h = 128;
        this.active = true;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 8;
        this.hp = 60;
        this.speed = 1.2 + Math.random() * 0.6;
        this.isFrozen = false;
        this.frozenTime = 0;
        this.spawnTime = 800; // 800ms spawn animation
        
        this.state = 'idle';
        this.attackCooldown = 0;
        
        if (startX !== undefined && startY !== undefined) {
            // Explicit position (boss wave octagon)
            this.x = startX;
            this.y = startY;
        } else {
            // Spawn inside arena boundary
            const pos = getRandomArenaSpawnPosition();
            this.x = pos.x;
            this.y = pos.y;
        }
        
        this.flashTime = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.hasFired = false;
    }
    
    getHitbox() {
        const hw = 48;
        const hh = 80;
        return {
            x: this.x - hw / 2,
            y: this.y + 56 - hh,
            w: hw,
            h: hh
        };
    }
    
    update(dt) {
        if (!this.active) return;
        
        // Spawn animation phase
        if (this.spawnTime > 0) {
            this.spawnTime -= dt;
            if (Math.random() < 0.2) {
                gameEffects.push(new SparkleParticle(this.x + (Math.random() - 0.5) * 30, this.y + this.h / 2 + (Math.random() - 0.5) * 10, '#00f5ff'));
            }
            return;
        }
        
        if (this.isFrozen) {
            this.frozenTime -= dt;
            if (this.frozenTime <= 0) {
                this.isFrozen = false;
            }
        }
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }
        
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.hypot(dx, dy);
        
        let currentSpeed = this.speed;
        if (this.isFrozen) {
            currentSpeed = this.speed * 0.3;
            if (Math.random() < 0.05) {
                gameEffects.push(new FrostParticle(this.x + (Math.random() - 0.5) * this.w * 0.2, this.y + (Math.random() - 0.5) * this.h * 0.2));
            }
        }
        
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dtScale;
            this.y += this.knockbackY * dtScale;
            this.knockbackX *= Math.pow(0.82, dtScale);
            this.knockbackY *= Math.pow(0.82, dtScale);
        } else {
            this.knockbackX = 0;
            this.knockbackY = 0;
            
            if (this.state !== 'attack') {
                if (dist > 420) {
                    this.state = 'walk';
                    this.x += (dx / dist) * currentSpeed * dtScale;
                    this.y += (dy / dist) * currentSpeed * dtScale;
                } else if (dist < 180) {
                    this.state = 'walk';
                    this.x -= (dx / dist) * currentSpeed * 0.8 * dtScale;
                    this.y -= (dy / dist) * currentSpeed * 0.8 * dtScale;
                } else {
                    this.state = 'idle';
                    if (this.attackCooldown <= 0) {
                        this.state = 'attack';
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                        this.hasFired = false;
                    }
                }
            }
        }
        
        const clamped = clampToArena(this.x, this.y, this.w, this.h);
        this.x = clamped.x;
        this.y = clamped.y;
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            
            if (this.state === 'attack') {
                this.currentFrame++;
                if (this.currentFrame === 2 && !this.hasFired) {
                    gameEffects.push(new Arrow(this.x, this.y + 10, px, py));
                    playArrowSound();
                    this.hasFired = true;
                }
                if (this.currentFrame >= 3) {
                    this.state = 'idle';
                    this.attackCooldown = 1800 + Math.random() * 800;
                    this.currentFrame = 0;
                }
            } else if (this.state === 'walk') {
                this.currentFrame = (this.currentFrame + 1) % 3;
            } else {
                this.currentFrame = 0;
            }
        }
        
        if (this.flashTime > 0) {
            this.flashTime -= dt;
        }
        this.checkPlayerHit();
    }
    
    checkPlayerHit() {
        if (player.isInvincible) return;
        const pHbox = player.getHitbox();
        const gHbox = this.getHitbox();
        if (rectOverlap(pHbox, gHbox)) {
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;
            const dx = pCenterX - this.x;
            const dy = pCenterY - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            player.takeDamage(6, dx / dist, dy / dist);
            this.knockbackX = -(dx / dist) * 8;
            this.knockbackY = -(dy / dist) * 8;
        }
    }
    
    takeDamage(amount, knockbackX, knockbackY, isMagic = false, isMultiHit = false, isCritical = false) {
        if (player.isDebugMode) amount = 300;
        this.hp = Math.max(0, this.hp - amount);
        this.flashTime = 200;
        this.knockbackX = knockbackX * 3.6;
        this.knockbackY = knockbackY * 3.6;
        
        // Lifesteal on hit (consistent with other monsters)
        if (upgrades.lifeSteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + amount * upgrades.lifeSteal);
        }
        
        if (!isMultiHit) {
            shakeIntensity = isMagic ? 14 : 9;
            hitStopDuration = isMagic ? 70 : 45;
            playGhostHurtSound();
            const particleCount = isMagic ? 12 : 7;
            for (let i = 0; i < particleCount; i++) {
                gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            }
            gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            if (amount >= 100) {
                gameEffects.push(new ShockwaveRing(this.x, this.y, 60, isMagic));
                shakeIntensity = Math.max(shakeIntensity, 18);
            }
        } else {
            shakeIntensity = Math.max(shakeIntensity, 2.5);
            if (Math.random() < 0.15) {
                playGhostHurtSound();
            }
            gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            if (Math.random() < 0.25) {
                gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            }
        }
        
        gameEffects.push(new DamageNumber(this.x, this.y - 10, amount, isMagic, isCritical));
        
        if (this.hp <= 0) {
            this.active = false;
            // Score/XP awarded via onMonsterKilled() in gameLoop filter
            for (let i = 0; i < 12; i++) {
                gameEffects.push(new DeathParticle(this.x, this.y));
            }
        }
    }
    
    draw() {
        const drawX = this.x - this.w / 2;
        const drawY = this.y - this.h / 2;
        const flip = player.x + player.width / 2 < this.x;
        
        let frameImg;
        if (this.state === 'attack') {
            frameImg = arrowMonsterAttackFrames[this.currentFrame % 3];
        } else if (this.state === 'walk') {
            frameImg = arrowMonsterWalkFrames[this.currentFrame % 3];
        } else {
            frameImg = arrowMonsterStandImg;
        }
        
        // Spawn fade-in
        let alpha = 1.0;
        if (this.spawnTime > 0) {
            alpha = (800 - this.spawnTime) / 800;
            const ratio = alpha;
            gameCtx.save();
            gameCtx.translate(this.x, this.y + this.h / 2);
            const grad = gameCtx.createRadialGradient(0, 0, 0, 0, 0, 55 * ratio);
            grad.addColorStop(0, 'rgba(0, 245, 255, 0.8)');
            grad.addColorStop(0.5, 'rgba(0, 245, 255, 0.3)');
            grad.addColorStop(1, 'rgba(0, 245, 255, 0)');
            gameCtx.fillStyle = grad;
            gameCtx.beginPath();
            gameCtx.ellipse(0, 0, 55 * ratio, 22 * ratio, 0, 0, Math.PI * 2);
            gameCtx.fill();
            gameCtx.restore();
        }
        
        gameCtx.save();
        gameCtx.globalAlpha = alpha;
        
        if (this.flashTime > 0) {
            const color = this.flashTime > 130 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(239, 68, 68, 0.85)';
            drawTintedImage(
                frameImg,
                0, 0, 256, 256,
                drawX, drawY, this.w, this.h,
                color,
                flip
            );
        } else if (this.isFrozen) {
            drawTintedImage(
                frameImg,
                0, 0, 256, 256,
                drawX, drawY, this.w, this.h,
                'rgba(147, 197, 253, 0.75)',
                flip
            );
        } else {
            gameCtx.save();
            if (flip) {
                gameCtx.translate(drawX + this.w, drawY);
                gameCtx.scale(-1, 1);
                gameCtx.drawImage(frameImg, 0, 0, this.w, this.h);
            } else {
                gameCtx.drawImage(frameImg, drawX, drawY, this.w, this.h);
            }
            gameCtx.restore();
        }
        
        gameCtx.restore();
    }
}

class Boss {
    constructor(startX, startY) {
        this.w = 64 * PLAYER_SCALE; // 163.2 px
        this.h = 64 * PLAYER_SCALE; // 163.2 px
        this.active = true;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 8;
        this.hp = 1000;
        this.maxHp = 1000;
        this.speed = 1.1; 
        this.speedMultiplier = 1.0;
        this.damageMultiplier = 1.0;
        this.isFrozen = false;
        this.frozenTime = 0;
        this.flashTime = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        
        if (startX !== undefined && startY !== undefined) {
            this.x = startX;
            this.y = startY;
        } else {
            // Spawn from top border center (dramatic entry)
            this.x = WORLD_WIDTH / 2;
            this.y = camera.y - 120;
        }
        
        // Boss states: 'walk', 'attack', 'skill', 'die'
        this.state = 'walk';
        
        // Skill timers
        this.skillTimer = 0; // triggers every 8 seconds
        this.skillDuration = 2000; // 2 seconds total skill charging
        this.skillTimeAcc = 0;
        this.speedBuffTimer = 0; // speed buff duration
        
        this.facing = 'down';
    }
    
    getHitbox() {
        const hw = this.w * 0.45;
        const hh = this.h * 0.55;
        return {
            x: this.x - hw / 2,
            y: this.y - hh / 2 + 10,
            w: hw,
            h: hh
        };
    }
    
    update(dt) {
        if (!this.active) return;
        
        // Frozen status
        if (this.isFrozen) {
            this.frozenTime -= dt;
            if (this.frozenTime <= 0) {
                this.isFrozen = false;
            }
        }
        
        // Speed buff duration check
        if (this.speedBuffTimer > 0) {
            this.speedBuffTimer -= dt;
            if (this.speedBuffTimer <= 0) {
                this.speedMultiplier = 1.0;
                this.damageMultiplier = 1.0;
            }
            
            // Spawn speed trail particles!
            if (Math.random() < 0.35) {
                gameEffects.push(new Particle(this.x + (Math.random() - 0.5) * this.w * 0.3, this.y + (Math.random() - 0.5) * this.h * 0.3, '#ef4444'));
            }
        }
        
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Facing direction
        if (Math.abs(dx) > Math.abs(dy)) {
            this.facing = dx > 0 ? 'right' : 'left';
        } else {
            this.facing = dy > 0 ? 'down' : 'up';
        }
        
        let currentSpeed = this.speed * this.speedMultiplier;
        if (this.isFrozen) {
            currentSpeed *= 0.3; // 70% slow
            if (Math.random() < 0.05) {
                gameEffects.push(new FrostParticle(this.x + (Math.random() - 0.5) * this.w * 0.4, this.y + (Math.random() - 0.5) * this.h * 0.4));
            }
        }
        
        // State Machine
        if (this.state === 'die') {
            // Die animation playing
            const frameInterval = 1000 / 6; // 6 FPS
            this.frameTimeAcc += dt;
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame++;
                if (this.currentFrame >= 6) {
                    this.active = false;
                    score += 200;
                    
                    // Trigger heal sound and heal player
                    player.hp = Math.min(player.maxHp, player.hp + 35);
                    playHealSound();
                    
                    // Massive golden particle explosion
                    for (let i = 0; i < 45; i++) {
                        const gp = new Particle(this.x, this.y, '#facc15');
                        gp.vx *= 2.0;
                        gp.vy *= 2.0;
                        gp.radius *= 1.5;
                        gameEffects.push(gp);
                    }
                }
            }
            return;
        }
        
        // Skill Cooldown Timer
        if (this.state === 'walk') {
            this.skillTimer += dt;
            if (this.skillTimer >= 8000) {
                this.state = 'skill';
                this.skillTimer = 0;
                this.skillTimeAcc = 0;
                this.currentFrame = 0;
                this.frameTimeAcc = 0;
                playBossAppearSound();
            }
        }
        
        if (this.state === 'skill') {
            this.skillTimeAcc += dt;
            
            // Skill parameters: idle animation plays slowly at 4 FPS
            const frameInterval = 1000 / 4; 
            this.frameTimeAcc += dt;
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame = (this.currentFrame + 1) % 4;
            }
            
            // [SKILL EFFECT: 1.3x Larger and Much More Intense Charging Aura (Red & Purple swirl)]
            if (Math.random() < 0.9) {
                for (let k = 0; k < 2; k++) { // Spawn 2 particles per frame for extra density
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 70 + Math.random() * 100;
                    const px = this.x + Math.cos(angle) * radius;
                    const py = this.y + Math.sin(angle) * radius;
                    const p = new Particle(px, py, Math.random() < 0.5 ? '#ef4444' : '#a855f7'); 
                    p.vx = -Math.cos(angle) * (3 + Math.random() * 5);
                    p.vy = -Math.sin(angle) * (3 + Math.random() * 5);
                    p.radius = (3.0 + Math.random() * 4.0) * 1.3; // 1.3x Larger particles
                    p.life = 500;
                    gameEffects.push(p);
                }
            }
            
            // Purple lightning sparks (Increased frequency & density)
            if (Math.random() < 0.45) {
                const px = this.x + (Math.random() - 0.5) * this.w * 0.9;
                const py = this.y + (Math.random() - 0.5) * this.h * 0.9;
                const lp = new LightningParticle(px, py);
                lp.color = '#a855f7'; 
                gameEffects.push(lp);
            }
            
            // Stand completely still for 1.2 seconds (approx. 1 second user request)
            if (this.skillTimeAcc >= 1200) {
                // Skill finished! Grant 4x speed buff & 2x damage buff (User request)
                this.speedMultiplier = 4.0; 
                this.damageMultiplier = 2.0;
                this.speedBuffTimer = 5000; // 5 seconds buff
                this.state = 'walk';
                this.currentFrame = 0;
                this.frameTimeAcc = 0;
                
                // Blast wave shockwave effect when the buff triggers (1.3x larger particles & count)
                const shockwaveParticles = 45;
                for (let i = 0; i < shockwaveParticles; i++) {
                    const angle = (i / shockwaveParticles) * Math.PI * 2;
                    const p = new Particle(this.x, this.y, '#ef4444');
                    p.vx = Math.cos(angle) * 9.0;
                    p.vy = Math.sin(angle) * 9.0;
                    p.radius = 4 * 1.3; // 1.3x Larger shockwave particles
                    p.life = 700;
                    gameEffects.push(p);
                }
                shakeIntensity = 24; // Massive screen shake on release
                
                // Spawn 8 summoned EyeMonsters around the boss
                const config = getWaveConfig(currentWave);
                for (let i = 0; i < 8; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 80 + Math.random() * 60;
                    const mx = this.x + Math.cos(angle) * radius;
                    const my = this.y + Math.sin(angle) * radius;
                    
                    const mob = new EyeMonster(mx, my);
                    mob.isSummoned = true;
                    mob.hp = Math.round(mob.hp * config.hpMultiplier);
                    mob.speed = mob.speed * config.speedMultiplier;
                    ghosts.push(mob);
                    
                    if (gameState === 'PLAYING' && waveActive) {
                        waveTotalEnemies++;
                        waveEnemiesRemaining++;
                    }
                }
                
                // [CRITICAL DAMAGE GIMMICK: Damage both friendly (ghosts) & enemy (player) by 30, with 7x knockback]
                const blastRadius = 240; // Wide blast range
                
                // Damage Player (Enemy)
                const pCenterX = player.x + player.width / 2;
                const pCenterY = player.y + player.height / 2;
                const pDx = pCenterX - this.x;
                const pDy = pCenterY - this.y;
                const pDist = Math.hypot(pDx, pDy) || 1;
                if (pDist < blastRadius) {
                    // 30 damage (reduced from 100) and 7x knockback power (multiplying directional unit vector by 7)
                    player.takeDamage(30, (pDx / pDist) * 7, (pDy / pDist) * 7);
                }
                
                // Damage other ghosts (Friendly Fire!) -> No damage, just huge knockback!
                ghosts.forEach(ghost => {
                    if (ghost.active && ghost !== this) { // Do not damage self, apply to all surrounding monsters (including summoned)
                        const gHbox = ghost.getHitbox();
                        const gx = gHbox.x + gHbox.w / 2;
                        const gy = gHbox.y + gHbox.h / 2;
                        const gDx = gx - this.x;
                        const gDy = gy - this.y;
                        const gDist = Math.hypot(gDx, gDy) || 1;
                        if (gDist < blastRadius) {
                            // Huge knockback directly to velocity (equivalent to knockback power of ~22x, i.e., 80px/frame initial velocity)
                            const knockbackPower = 80;
                            ghost.knockbackX = (gDx / gDist) * knockbackPower;
                            ghost.knockbackY = (gDy / gDist) * knockbackPower;
                            
                            // Spawn shockwave push particles around friendly ghost
                            for (let j = 0; j < 6; j++) {
                                gameEffects.push(new Particle(gx, gy, '#a855f7'));
                            }
                        }
                    }
                });
            }
            
        } else if (this.state === 'attack') {
            // Attack animation: 5 frames at 10 FPS
            const frameInterval = 1000 / 10;
            this.frameTimeAcc += dt;
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame++;
                
                // Strike at frame 2
                if (this.currentFrame === 2) {
                    if (dist < 100) {
                        // Deal 20 damage (multiplied by damageMultiplier) and knock back player
                        const pCenterX = player.x + player.width / 2;
                        const pCenterY = player.y + player.height / 2;
                        const pDx = pCenterX - this.x;
                        const pDy = pCenterY - this.y;
                        const pDist = Math.hypot(pDx, pDy) || 1;
                        player.takeDamage(20 * this.damageMultiplier, pDx / pDist, pDy / pDist);
                    }
                }
                
                if (this.currentFrame >= 5) {
                    this.state = 'walk';
                    this.currentFrame = 0;
                    this.frameTimeAcc = 0;
                }
            }
            
        } else if (this.state === 'walk') {
            // Apply knockback
            if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
                this.x += this.knockbackX * dtScale;
                this.y += this.knockbackY * dtScale;
                this.knockbackX *= Math.pow(0.82, dtScale);
                this.knockbackY *= Math.pow(0.82, dtScale);
            } else {
                this.knockbackX = 0;
                this.knockbackY = 0;
                
                if (dist > 8) {
                    this.x += (dx / dist) * currentSpeed * dtScale;
                    this.y += (dy / dist) * currentSpeed * dtScale;
                }
            }
            
            // Loop 8 frames for walk
            const frameInterval = 1000 / this.fps;
            this.frameTimeAcc += dt;
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame = (this.currentFrame + 1) % 8;
            }
            
            // Attack trigger if close enough
            if (dist < 80) {
                this.state = 'attack';
                this.currentFrame = 0;
                this.frameTimeAcc = 0;
            }
        }
        
        // BUG FIX: was using this.width/this.height (undefined) → use this.w/this.h
        const clamped = clampToArena(this.x, this.y, this.w, this.h);
        this.x = clamped.x;
        this.y = clamped.y;
        
        if (this.flashTime > 0) {
            this.flashTime -= dt;
        }
        
        this.checkPlayerHit();
    }
    
    checkPlayerHit() {
        if (player.isInvincible || this.state === 'die') return;
        
        const pHbox = player.getHitbox();
        const gHbox = this.getHitbox();
        
        if (rectOverlap(pHbox, gHbox)) {
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;
            const dx = pCenterX - this.x;
            const dy = pCenterY - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            
            player.takeDamage(12 * this.damageMultiplier, dx / dist, dy / dist); // Passive touch damage (multiplied by damageMultiplier)
            
            this.knockbackX = -(dx / dist) * 8;
            this.knockbackY = -(dy / dist) * 8;
        }
    }
    
    takeDamage(amount, knockbackX, knockbackY, isMagic = false, isMultiHit = false, isCritical = false) {
        if (this.state === 'die') return;
        
        let finalAmount = Math.max(5, Math.ceil(amount * 0.8));
        if (player.isDebugMode) finalAmount = 300;
        this.hp = Math.max(0, this.hp - finalAmount);
        this.flashTime = 200;
        
        // Boss has high mass: less knockback distance (multiply by 0.3)
        this.knockbackX = knockbackX * 3.6;
        this.knockbackY = knockbackY * 3.6;
        
        if (!isMagic && amount >= 100) {
            // make sure normal sword high damage also triggers magic flag or is visually clean
        }
        
        if (!isMultiHit) {
            shakeIntensity = isMagic ? 20 : 12;
            hitStopDuration = isMagic ? 120 : 80;
            
            playBossHurtSound();
            
            const particleCount = isMagic ? 18 : 10;
            for (let i = 0; i < particleCount; i++) {
                gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            }
            
            // Neon HitSlash for satisfying visual slice
            gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            
            // Critical Shockwave
            if (finalAmount >= 100) {
                gameEffects.push(new ShockwaveRing(this.x, this.y, 75, isMagic)); // slightly larger ring for boss
                shakeIntensity = Math.max(shakeIntensity, 25); // MASSIVE screenshake
            }
        } else {
            // Multi-hit light impact feedback (No HitStop freeze!)
            shakeIntensity = Math.max(shakeIntensity, 3); // Subtle shake
            if (Math.random() < 0.15) {
                playBossHurtSound(); // Throttled sound
            }
            // Spawn a single particle instead of 18 to prevent rendering lag
            gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            
            // Occasional tiny slash on multihit
            if (Math.random() < 0.25) {
                gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            }
        }
        
        gameEffects.push(new DamageNumber(this.x, this.y - 10, finalAmount, isMagic, isCritical));
        
        if (this.hp <= 0) {
            this.state = 'die';
            this.currentFrame = 0;
            this.frameTimeAcc = 0;
        }
    }
    
    draw() {
        const drawX = this.x - this.w / 2;
        const drawY = this.y - this.h / 2;
        const flip = player.x + player.width / 2 < this.x;
        
        // Select frames array based on state
        let frames = bossWalkFrames;
        if (this.state === 'idle' || this.state === 'skill') {
            frames = bossIdleFrames;
        } else if (this.state === 'attack') {
            frames = bossAttackFrames;
        } else if (this.state === 'die') {
            frames = bossDieFrames;
        }
        
        // Safeguard array bounds
        const frameIdx = Math.min(this.currentFrame, frames.length - 1);
        const img = frames[frameIdx];
        
        if (!img || !img.complete) return;
        
        if (this.flashTime > 0) {
            const color = this.flashTime > 130 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(239, 68, 68, 0.85)';
            drawTintedImage(
                img,
                0, 0, 64, 64, // Cell size 64x64
                drawX, drawY, this.w, this.h,
                color,
                flip
            );
        } else if (this.isFrozen) {
            drawTintedImage(
                img,
                0, 0, 64, 64,
                drawX, drawY, this.w, this.h,
                'rgba(147, 197, 253, 0.75)',
                flip
            );
        } else if (this.speedMultiplier > 1.0) {
            // Draw red speed-trail silhouette overlay slightly blended
            drawTintedImage(
                img,
                0, 0, 64, 64,
                drawX, drawY, this.w, this.h,
                'rgba(239, 68, 68, 0.35)',
                flip
            );
            
            // Draw actual boss over it
            gameCtx.save();
            if (flip) {
                gameCtx.translate(drawX + this.w, drawY);
                gameCtx.scale(-1, 1);
                gameCtx.drawImage(img, 0, 0, this.w, this.h);
            } else {
                gameCtx.drawImage(img, drawX, drawY, this.w, this.h);
            }
            gameCtx.restore();
        } else {
            gameCtx.save();
            if (flip) {
                gameCtx.translate(drawX + this.w, drawY);
                gameCtx.scale(-1, 1);
                gameCtx.drawImage(img, 0, 0, this.w, this.h);
            } else {
                gameCtx.drawImage(img, drawX, drawY, this.w, this.h);
            }
            gameCtx.restore();
        }
    }
}

// ============================================================
// SORCERER MONSTER & SKILLS/EFFECTS
// ============================================================

class SorcererDarkOrb {
    constructor(startX, startY, targetX, targetY, angleOffset = 0) {
        this.x = startX;
        this.y = startY;
        this.active = true;
        this.w = 180; // 0.7x of 256
        this.h = 180; // 0.7x of 256
        
        this.state = 'spawn'; // 'spawn', 'fly', 'vanish'
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 10;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const baseAngle = Math.atan2(dy, dx);
        this.angle = baseAngle + angleOffset;
        
        const speed = 7.5; // 1.5x of 5.0
        this.vx = Math.cos(this.angle) * speed;
        this.vy = Math.sin(this.angle) * speed;
        
        this.lifeTime = 3000;
    }
    
    update(dt) {
        if (!this.active) return;
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        
        if (this.state === 'spawn') {
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame++;
                if (this.currentFrame >= 3) {
                    this.state = 'fly';
                    this.currentFrame = 2;
                }
            }
        } else if (this.state === 'fly') {
            this.x += this.vx * dtScale;
            this.y += this.vy * dtScale;
            this.lifeTime -= dt;
            
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame = this.currentFrame === 2 ? 3 : 2;
            }
            
            if (this.x < -100 || this.x > WORLD_WIDTH + 100 ||
                this.y < -100 || this.y > WORLD_HEIGHT + 100 ||
                this.lifeTime <= 0) {
                this.state = 'vanish';
                this.currentFrame = 3;
                this.frameTimeAcc = 0;
                return;
            }
            
            if (!player.isInvincible) {
                const pHbox = player.getHitbox();
                const orbSize = 67; // 0.7x of 96
                const orbRect = {
                    x: this.x - orbSize / 2,
                    y: this.y - orbSize / 2,
                    w: orbSize,
                    h: orbSize
                };
                
                if (rectOverlap(pHbox, orbRect)) {
                    const dist = Math.hypot(this.vx, this.vy) || 1;
                    player.takeDamage(40, this.vx / dist, this.vy / dist);
                    this.state = 'vanish';
                    this.currentFrame = 3;
                    this.frameTimeAcc = 0;
                    
                    for (let i = 0; i < 6; i++) {
                        gameEffects.push(new HitParticle(this.x, this.y, true));
                    }
                }
            }
        } else if (this.state === 'vanish') {
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame--;
                if (this.currentFrame < 0) {
                    this.active = false;
                }
            }
        }
    }
    
    draw() {
        if (!this.active) return;
        const img = sorcererDarkOrbFrames[this.currentFrame];
        if (!img) return;
        
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        if (this.state === 'fly') {
            gameCtx.rotate(this.angle);
        }
        gameCtx.drawImage(img, -this.w / 2, -this.h / 2, this.w, this.h);
        gameCtx.restore();
    }
}

class SorcererDarkCircle {
    constructor(targetX, targetY, isTargeted = false) {
        this.x = targetX;
        this.y = targetY;
        this.active = true;
        this.isTargeted = isTargeted;
        this.w = isTargeted ? 320 * 2.4 : 320;
        this.h = isTargeted ? 320 * 2.4 : 320;
        
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 18; // 1.5x of 12 (disappears 1.5x faster)
        this.hasDamageDealt = false;
    }
    
    update(dt) {
        if (!this.active) return;
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame++;
            
            if (this.currentFrame === 16 && !this.hasDamageDealt) {
                playSorcererMagicSound();
                if (!player.isInvincible) {
                    const pCenterX = player.x + player.width / 2;
                    const pCenterY = player.y + player.height / 2;
                    const dx = pCenterX - this.x;
                    const dy = pCenterY - this.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    
                    const baseRadius = 96;
                    const radius = this.isTargeted ? baseRadius * 2.4 : baseRadius;
                    if (dist <= radius) {
                        const damage = this.isTargeted ? 90 : 50;
                        player.takeDamage(damage, dx / dist, dy / dist);
                        shakeIntensity = Math.max(shakeIntensity, this.isTargeted ? 36 : 12);
                    }
                }
                this.hasDamageDealt = true;
            }
            
            if (this.currentFrame >= 36) {
                this.active = false;
            }
        }
    }
    
    draw() {
        if (!this.active) return;
        const img = sorcererDarkCircleFrames[this.currentFrame];
        if (!img) return;
        
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        gameCtx.drawImage(img, -this.w / 2, -this.h / 2, this.w, this.h);
        gameCtx.restore();
    }
}

class Sorcerer {
    constructor(startX, startY) {
        this.w = 180; // 0.7x of 256
        this.h = 180; // 0.7x of 256
        this.active = true;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 8;
        this.hp = 1000;
        this.speed = (1.0 + Math.random() * 0.4) * 3.0; // 3x speed increase
        this.isFrozen = false;
        this.frozenTime = 0;
        this.spawnTime = 800;
        
        this.state = 'idle';
        this.attackCooldown = 1500;
        this.attackType = 'orb';
        this.hasFired = false;
        this.orbComboStage = 0;
        this.burstComboStage = 0;
        this.nextCooldown = 1500;
        
        if (startX !== undefined && startY !== undefined) {
            this.x = startX;
            this.y = startY;
        } else {
            const pos = getRandomArenaSpawnPosition();
            this.x = pos.x;
            this.y = pos.y;
        }
        
        this.flashTime = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
    }
    
    getHitbox() {
        const hw = 70; // 0.7x of 100
        const hh = 126; // 0.7x of 180
        return {
            x: this.x - hw / 2,
            y: this.y - hh / 2 + 14, // 0.7x of 20
            w: hw,
            h: hh
        };
    }
    
    update(dt) {
        if (!this.active) return;
        
        if (this.spawnTime > 0) {
            this.spawnTime -= dt;
            if (Math.random() < 0.2) {
                gameEffects.push(new SparkleParticle(this.x + (Math.random() - 0.5) * 40, this.y + this.h / 2 + (Math.random() - 0.5) * 10, '#bf00ff'));
            }
            return;
        }
        
        if (this.isFrozen) {
            this.frozenTime -= dt;
            if (this.frozenTime <= 0) {
                this.isFrozen = false;
            }
        }
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }
        
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.hypot(dx, dy);
        
        let currentSpeed = this.speed;
        if (this.isFrozen) {
            currentSpeed = this.speed * 0.3;
            if (Math.random() < 0.05) {
                gameEffects.push(new FrostParticle(this.x + (Math.random() - 0.5) * this.w * 0.2, this.y + (Math.random() - 0.5) * this.h * 0.2));
            }
        }
        
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dtScale;
            this.y += this.knockbackY * dtScale;
            this.knockbackX *= Math.pow(0.82, dtScale);
            this.knockbackY *= Math.pow(0.82, dtScale);
        } else {
            this.knockbackX = 0;
            this.knockbackY = 0;
            
            if (this.state !== 'cast') {
                if (dist > 350) {
                    this.state = 'walk';
                    this.x += (dx / dist) * currentSpeed * dtScale;
                    this.y += (dy / dist) * currentSpeed * dtScale;
                } else if (dist < 150) {
                    this.state = 'walk';
                    this.x -= (dx / dist) * currentSpeed * 0.8 * dtScale;
                    this.y -= (dy / dist) * currentSpeed * 0.8 * dtScale;
                } else {
                    this.state = 'idle';
                    if (this.attackCooldown <= 0) {
                        this.state = 'cast';
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                        this.hasFired = false;
                    }
                }
            }
        }
        
        const clamped = clampToArena(this.x, this.y, this.w, this.h);
        this.x = clamped.x;
        this.y = clamped.y;
        
        const animFps = (this.state === 'cast') ? 10 : 8;
        const frameInterval = 1000 / animFps;
        this.frameTimeAcc += dt;
        
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            
            if (this.state === 'cast') {
                this.currentFrame++;
                if (this.currentFrame === 6 && !this.hasFired) {
                    if (this.attackType === 'orb') {
                        if (this.orbComboStage === 0) {
                            // Stage 1: Spawn 1 fireball
                            gameEffects.push(new SorcererDarkOrb(this.x, this.y - 21, px, py, 0));
                            this.orbComboStage = 1;
                            this.nextCooldown = 100; // immediately cast the next one
                        } else if (this.orbComboStage === 1) {
                            // Stage 2: Spawn 1 fireball immediately
                            gameEffects.push(new SorcererDarkOrb(this.x, this.y - 21, px, py, 0));
                            this.orbComboStage = 2;
                            this.nextCooldown = 150;
                        } else if (this.orbComboStage === 2) {
                            // Stage 3: Spawn 3 fireballs
                            gameEffects.push(new SorcererDarkOrb(this.x, this.y - 21, px, py, 0));
                            gameEffects.push(new SorcererDarkOrb(this.x, this.y - 21, px, py, -0.26));
                            gameEffects.push(new SorcererDarkOrb(this.x, this.y - 21, px, py, 0.26));
                            this.orbComboStage = 3;
                            this.nextCooldown = 250;
                        } else if (this.orbComboStage === 3) {
                            // Stage 4: Spawn fireballs in all directions
                            const numOrbs = 16;
                            for (let i = 0; i < numOrbs; i++) {
                                const angle = (i / numOrbs) * Math.PI * 2;
                                const tx = this.x + Math.cos(angle) * 100;
                                const ty = this.y + Math.sin(angle) * 100;
                                gameEffects.push(new SorcererDarkOrb(this.x, this.y - 21, tx, ty, 0));
                            }
                            this.orbComboStage = 0;
                            this.nextCooldown = 1800 + Math.random() * 1200;
                            this.attackType = 'circle';
                        }
                    } else if (this.attackType === 'circle') {
                        // 1 targeted at the player (3x size & 3x damage)
                        gameEffects.push(new SorcererDarkCircle(px, py, true));
                        if (Math.random() < 0.2) {
                            const g = new Ghost(px, py);
                            g.isSummoned = true;
                            ghosts.push(g);
                            if (gameState === 'PLAYING' && waveActive) {
                                waveTotalEnemies++;
                                waveEnemiesRemaining++;
                            }
                        }
                        // 8 randomly within the arena boundary (normal size & damage)
                        for (let i = 0; i < 8; i++) {
                            const pos = getRandomArenaSpawnPosition();
                            gameEffects.push(new SorcererDarkCircle(pos.x, pos.y, false));
                            if (Math.random() < 0.2) {
                                const g = new Ghost(pos.x, pos.y);
                                g.isSummoned = true;
                                ghosts.push(g);
                                if (gameState === 'PLAYING' && waveActive) {
                                    waveTotalEnemies++;
                                    waveEnemiesRemaining++;
                                }
                            }
                        }
                        this.nextCooldown = 1800 + Math.random() * 1200;
                        this.attackType = 'burst';
                    } else if (this.attackType === 'burst') {
                        // 5 fireballs at once, 3 times consecutively (total 5x5x5)
                        const offsets = [-0.52, -0.26, 0, 0.26, 0.52];
                        offsets.forEach(offset => {
                            gameEffects.push(new SorcererDarkOrb(this.x, this.y - 21, px, py, offset));
                        });
                        
                        if (this.burstComboStage < 2) {
                            this.burstComboStage++;
                            this.nextCooldown = 350; // Delay between consecutive bursts (0.35s)
                        } else {
                            this.burstComboStage = 0;
                            this.nextCooldown = 2000 + Math.random() * 1000;
                            this.attackType = 'orb';
                        }
                    }
                    this.hasFired = true;
                }
                
                if (this.currentFrame >= 10) {
                    this.state = 'idle';
                    this.attackCooldown = this.nextCooldown;
                    this.currentFrame = 0;
                }
            } else if (this.state === 'walk') {
                this.currentFrame = (this.currentFrame + 1) % 8;
            } else {
                this.currentFrame = (this.currentFrame + 1) % 8;
            }
        }
        
        if (this.flashTime > 0) {
            this.flashTime -= dt;
        }
        
        this.checkPlayerHit();
    }
    
    checkPlayerHit() {
        if (player.isInvincible) return;
        const pHbox = player.getHitbox();
        const gHbox = this.getHitbox();
        if (rectOverlap(pHbox, gHbox)) {
            const pCenterX = player.x + player.width / 2;
            const pCenterY = player.y + player.height / 2;
            const dx = pCenterX - this.x;
            const dy = pCenterY - this.y;
            const dist = Math.hypot(dx, dy) || 1;
            
            player.takeDamage(10, dx / dist, dy / dist);
            this.knockbackX = -(dx / dist) * 8;
            this.knockbackY = -(dy / dist) * 8;
        }
    }
    
    takeDamage(amount, knockbackX, knockbackY, isMagic = false, isMultiHit = false, isCritical = false) {
        if (player.isDebugMode) amount = 300;
        this.hp = Math.max(0, this.hp - amount);
        this.flashTime = 200;
        
        this.knockbackX = knockbackX * 3.0;
        this.knockbackY = knockbackY * 3.0;
        
        if (!isMultiHit) {
            shakeIntensity = isMagic ? 14 : 9;
            hitStopDuration = isMagic ? 70 : 45;
            
            const particleCount = isMagic ? 12 : 7;
            for (let i = 0; i < particleCount; i++) {
                gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            }
            
            gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            
            if (amount >= 100) {
                gameEffects.push(new ShockwaveRing(this.x, this.y, 60, isMagic));
                shakeIntensity = Math.max(shakeIntensity, 18);
            }
        } else {
            shakeIntensity = Math.max(shakeIntensity, 2.5);
            gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            if (Math.random() < 0.25) {
                gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            }
        }
        
        if (upgrades.lifeSteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + amount * upgrades.lifeSteal);
        }
        
        gameEffects.push(new DamageNumber(this.x, this.y - 10, amount, isMagic, isCritical));
        
        if (this.hp <= 0) {
            this.active = false;
            for (let i = 0; i < 15; i++) {
                gameEffects.push(new SparkleParticle(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30, '#bf00ff'));
            }
        }
    }
    
    draw() {
        const drawW = (this.state === 'cast') ? 224 : 180; // 0.7x of 320 and 256
        const drawH = (this.state === 'cast') ? 224 : 180; // 0.7x of 320 and 256
        const drawX = this.x - drawW / 2;
        const drawY = this.y - drawH / 2;
        const flip = player.x + player.width / 2 < this.x;
        
        let alpha = 1.0;
        if (this.spawnTime > 0) {
            alpha = (800 - this.spawnTime) / 800;
            const ratio = (800 - this.spawnTime) / 800;
            gameCtx.save();
            gameCtx.translate(this.x, this.y + this.h / 2);
            const grad = gameCtx.createRadialGradient(0, 0, 0, 0, 0, 63 * ratio); // 0.7x of 90
            grad.addColorStop(0, 'rgba(191, 0, 255, 0.8)');
            grad.addColorStop(0.5, 'rgba(191, 0, 255, 0.3)');
            grad.addColorStop(1, 'rgba(191, 0, 255, 0)');
            gameCtx.fillStyle = grad;
            gameCtx.beginPath();
            gameCtx.ellipse(0, 0, 63 * ratio, 25 * ratio, 0, 0, Math.PI * 2); // 0.7x of 90 and 36
            gameCtx.fill();
            gameCtx.strokeStyle = `rgba(191, 0, 255, ${0.6 * (1 - ratio)})`;
            gameCtx.lineWidth = 2;
            gameCtx.beginPath();
            gameCtx.ellipse(0, 0, 70 * ratio, 28 * ratio, 0, 0, Math.PI * 2); // 0.7x of 100 and 40
            gameCtx.stroke();
            gameCtx.restore();
        }
        
        gameCtx.save();
        gameCtx.globalAlpha = alpha;
        
        let frameImg = null;
        if (this.state === 'cast') {
            frameImg = sorcererCastFrames[this.currentFrame];
        } else if (this.state === 'walk') {
            frameImg = sorcererMoveFrames[this.currentFrame];
        } else {
            frameImg = sorcererIdleFrames[this.currentFrame];
        }
        
        if (!frameImg) {
            gameCtx.restore();
            return;
        }
        
        const srcW = frameImg.width;
        const srcH = frameImg.height;
        
        if (this.flashTime > 0) {
            const color = this.flashTime > 130 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(239, 68, 68, 0.85)';
            drawTintedImage(
                frameImg,
                0, 0, srcW, srcH,
                drawX, drawY, drawW, drawH,
                color,
                flip
            );
        } else if (this.isFrozen) {
            drawTintedImage(
                frameImg,
                0, 0, srcW, srcH,
                drawX, drawY, drawW, drawH,
                'rgba(147, 197, 253, 0.75)',
                flip
            );
        } else {
            gameCtx.save();
            if (flip) {
                gameCtx.translate(drawX + drawW, drawY);
                gameCtx.scale(-1, 1);
                gameCtx.drawImage(frameImg, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
            } else {
                gameCtx.drawImage(frameImg, 0, 0, srcW, srcH, drawX, drawY, drawW, drawH);
            }
            gameCtx.restore();
        }
        
        gameCtx.restore();
    }
}

// ============================================================
// LASTBOSS PROJECTILES & SKILLS
// ============================================================

class LastBossDarkOrb {
    constructor(startX, startY, targetX, targetY, angleOffset = 0) {
        this.x = startX;
        this.y = startY;
        this.active = true;
        this.w = 192;
        this.h = 192;
        
        this.state = 'spawn';
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 12;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const baseAngle = Math.atan2(dy, dx);
        this.angle = baseAngle + angleOffset;
        
        const speed = 9.0;
        this.vx = Math.cos(this.angle) * speed;
        this.vy = Math.sin(this.angle) * speed;
        
        this.lifeTime = 4000;
    }
    
    update(dt) {
        if (!this.active) return;
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        
        if (this.state === 'spawn') {
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame++;
                if (this.currentFrame >= 4) {
                    this.state = 'fly';
                    this.currentFrame = 4;
                }
            }
        } else if (this.state === 'fly') {
            this.x += this.vx * dtScale;
            this.y += this.vy * dtScale;
            this.lifeTime -= dt;
            
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame = 4 + ((this.currentFrame - 4 + 1) % 3);
            }
            
            if (this.x < -100 || this.x > WORLD_WIDTH + 100 ||
                this.y < -100 || this.y > WORLD_HEIGHT + 100 ||
                this.lifeTime <= 0) {
                this.state = 'vanish';
                this.currentFrame = 9;
                this.frameTimeAcc = 0;
                return;
            }
            
            if (!player.isInvincible) {
                const pHbox = player.getHitbox();
                const orbSize = 75;
                const orbRect = {
                    x: this.x - orbSize / 2,
                    y: this.y - orbSize / 2,
                    w: orbSize,
                    h: orbSize
                };
                
                if (rectOverlap(pHbox, orbRect)) {
                    const dist = Math.hypot(this.vx, this.vy) || 1;
                    player.takeDamage(20, this.vx / dist, this.vy / dist);
                    this.state = 'vanish';
                    this.currentFrame = 9;
                    this.frameTimeAcc = 0;
                    
                    for (let i = 0; i < 6; i++) {
                        gameEffects.push(new HitParticle(this.x, this.y, true));
                    }
                }
            }
        } else if (this.state === 'vanish') {
            if (this.frameTimeAcc >= frameInterval) {
                this.active = false;
            }
        }
    }
    
    draw() {
        if (!this.active) return;
        const img = lastBossDarkOrbFrames[this.currentFrame];
        if (!img) return;
        
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        if (this.state === 'fly') {
            gameCtx.rotate(this.angle);
        }
        gameCtx.drawImage(img, -this.w / 2, -this.h / 2, this.w, this.h);
        gameCtx.restore();
    }
}

class LastBossDarkCircle {
    constructor(targetX, targetY, isTargeted = false) {
        this.x = targetX;
        this.y = targetY;
        this.active = true;
        this.isTargeted = isTargeted;
        this.w = isTargeted ? 360 * 2.4 : 360;
        this.h = isTargeted ? 360 * 2.4 : 360;
        
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 20;
        this.hasDamageDealt = false;
    }
    
    update(dt) {
        if (!this.active) return;
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame++;
            
            if (this.currentFrame === 16 && !this.hasDamageDealt) {
                playSorcererMagicSound();
                if (!player.isInvincible) {
                    const pCenterX = player.x + player.width / 2;
                    const pCenterY = player.y + player.height / 2;
                    const dx = pCenterX - this.x;
                    const dy = pCenterY - this.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    
                    const baseRadius = 110;
                    const radius = this.isTargeted ? baseRadius * 2.4 : baseRadius;
                    if (dist <= radius) {
                        const damage = this.isTargeted ? 35 : 25;
                        player.takeDamage(damage, dx / dist, dy / dist);
                        shakeIntensity = Math.max(shakeIntensity, this.isTargeted ? 30 : 10);
                    }
                }
                this.hasDamageDealt = true;
            }
            
            if (this.currentFrame >= 36) {
                this.active = false;
            }
        }
    }
    
    draw() {
        if (!this.active) return;
        const img = lastBossDarkCircleFrames[this.currentFrame];
        if (!img || !img.complete) return;
        
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        gameCtx.drawImage(img, -this.w / 2, -this.h / 2, this.w, this.h);
        gameCtx.restore();
    }
}

class LastBossDarkAura {
    constructor(owner) {
        this.owner = owner;
        this.active = true;
        this.w = 500;
        this.h = 500;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 12;
    }
    
    update(dt) {
        if (!this.active || !this.owner.active) {
            this.active = false;
            return;
        }
        
        this.x = this.owner.x;
        this.y = this.owner.y;
        
        const frameInterval = 1000 / this.fps;
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame = (this.currentFrame + 1) % 30;
        }
        
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = this.x - px;
        const dy = this.y - py;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 400) {
            const force = ((400 - dist) / 400) * 2.2 * dtScale;
            player.x += (dx / dist) * force;
            player.y += (dy / dist) * force;
            
            if (dist < 100 && Math.random() < 0.05 && !player.isInvincible) {
                player.takeDamage(5, -dx / dist, -dy / dist);
            }
        }
    }
    
    draw() {
        if (!this.active) return;
        
        gameCtx.save();
        gameCtx.translate(this.x, this.y);
        gameCtx.globalAlpha = 0.6;
        
        // Pulsing radius
        const pulse = 1 + Math.sin(Date.now() / 150) * 0.08;
        const radius = (this.w / 2) * pulse;
        
        // Create radial gradient
        const grad = gameCtx.createRadialGradient(0, 0, 10, 0, 0, radius);
        grad.addColorStop(0, 'rgba(191, 0, 255, 0.45)');  // neon purple
        grad.addColorStop(0.3, 'rgba(120, 0, 200, 0.3)');  // dark purple
        grad.addColorStop(0.7, 'rgba(50, 0, 100, 0.15)'); // deep purple/indigo
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');          // transparent boundary
        
        gameCtx.fillStyle = grad;
        gameCtx.beginPath();
        gameCtx.arc(0, 0, radius, 0, Math.PI * 2);
        gameCtx.fill();
        
        gameCtx.restore();
    }
}

class LastBoss {
    constructor(startX, startY) {
        this.w = 128 * 2.2;
        this.h = 128 * 2.2;
        this.active = true;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.fps = 8;
        this.hp = 3000;
        this.maxHp = 3000;
        this.groggyHp = 500; // Groggy HP pool (Second phase)
        this.groggyInvincibleTime = 0; // Groggy invincibility duration on fall
        this.speed = 3.2;
        this.isFrozen = false;
        this.frozenTime = 0;
        this.flashTime = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.spawnTime = 1800;
        this.spawnMaxTime = 1800;
        this.landedEffectTriggered = false;
        
        if (startX !== undefined && startY !== undefined) {
            this.x = startX;
            this.y = startY;
        } else {
            this.x = WORLD_WIDTH / 2;
            this.y = WORLD_HEIGHT / 2 - 100;
        }
        
        this.state = 'idle';
        this.phase = 1;
        this.patternTimer = 2000;
        this.patternCooldown = 0;
        this.currentPattern = 'none';
        this.patternState = 0;
        this.auraEffect = null;
        this.facing = 'down';
        this.hidden = false;
        this.thunderFlashCooldown = 0;
        this.instantKillCooldown = 0;
        this.lockOnLine = null;
        this.strafeDirection = Math.random() < 0.5 ? 1 : -1;
        this.strafeTimer = 1500;
        
        // Play lastboss BGM
        playBGM('lastboss/lastbgm.mp3', 0.5);
    }
    
    getHitbox() {
        const hw = this.w * 0.45;
        const hh = this.h * 0.6;
        return {
            x: this.x - hw / 2,
            y: this.y - hh / 2 + 15,
            w: hw,
            h: hh
        };
    }
    
    getArenaIntersectionPoints(px, py, theta) {
        const cx = WORLD_WIDTH * 0.500;
        const cy = WORLD_HEIGHT * 0.541;
        const rx = WORLD_WIDTH * 0.403;
        const ry = WORLD_HEIGHT * 0.265;
        
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const ux = px - cx;
        const uy = py - cy;
        
        const A = (cosT * cosT) / (rx * rx) + (sinT * sinT) / (ry * ry);
        const B = 2 * ((ux * cosT) / (rx * rx) + (uy * sinT) / (ry * ry));
        const C = (ux * ux) / (rx * rx) + (uy * uy) / (ry * ry) - 1.0;
        
        const disc = B * B - 4 * A * C;
        if (disc < 0) {
            return {
                x1: px - cosT * 800, y1: py - sinT * 800,
                x2: px + cosT * 800, y2: py + sinT * 800
            };
        }
        
        const sqrtDisc = Math.sqrt(disc);
        const t1 = (-B + sqrtDisc) / (2 * A);
        const t2 = (-B - sqrtDisc) / (2 * A);
        
        return {
            x1: px + t1 * cosT,
            y1: py + t1 * sinT,
            x2: px + t2 * cosT,
            y2: py + t2 * sinT
        };
    }
    
    getNextBouncePoint(sx, sy, theta) {
        const cx = WORLD_WIDTH * 0.500;
        const cy = WORLD_HEIGHT * 0.541;
        const rx = WORLD_WIDTH * 0.403;
        const ry = WORLD_HEIGHT * 0.265;
        
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const ux = sx - cx;
        const uy = sy - cy;
        
        const A = (cosT * cosT) / (rx * rx) + (sinT * sinT) / (ry * ry);
        const B = 2 * ((ux * cosT) / (rx * rx) + (uy * sinT) / (ry * ry));
        const C = (ux * ux) / (rx * rx) + (uy * uy) / (ry * ry) - 1.0;
        
        const disc = B * B - 4 * A * C;
        if (disc < 0) {
            return { x: sx + cosT * 600, y: sy + sinT * 600 };
        }
        
        const sqrtDisc = Math.sqrt(disc);
        const t1 = (-B + sqrtDisc) / (2 * A);
        const t2 = (-B - sqrtDisc) / (2 * A);
        
        // We want the positive root representing a step forward (far enough from start point 0)
        let t = 0;
        if (t1 > 5.0 && t2 > 5.0) {
            t = Math.max(t1, t2);
        } else if (t1 > 5.0) {
            t = t1;
        } else if (t2 > 5.0) {
            t = t2;
        } else {
            t = Math.max(t1, t2);
            if (t <= 5.0) t = 600;
        }
        
        return {
            x: sx + t * cosT,
            y: sy + t * sinT
        };
    }
    
    getNextReflectionAngle(px, py, incidentTheta) {
        const cx = WORLD_WIDTH * 0.500;
        const cy = WORLD_HEIGHT * 0.541;
        const rx = WORLD_WIDTH * 0.403;
        const ry = WORLD_HEIGHT * 0.265;
        
        // Normal vector to ellipse at boundary point (px, py)
        let nx = (px - cx) / (rx * rx);
        let ny = (py - cy) / (ry * ry);
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        
        // Incident unit vector
        const vx = Math.cos(incidentTheta);
        const vy = Math.sin(incidentTheta);
        
        // Reflected vector: r = v - 2 * (v . n) * n
        const dot = vx * nx + vy * ny;
        const rxRef = vx - 2 * dot * nx;
        const ryRef = vy - 2 * dot * ny;
        
        return Math.atan2(ryRef, rxRef);
    }
    
    update(dt) {
        if (!this.active) return;
        
        if (this.spawnTime > 0) {
            this.spawnTime -= dt;
            
            // Gather dark energy particles
            if (Math.random() < 0.5) {
                // Purple particles
                gameEffects.push(new SparkleParticle(
                    this.x + (Math.random() - 0.5) * 80, 
                    this.y + (Math.random() - 0.5) * 80, 
                    '#a855f7'
                ));
            }
            if (Math.random() < 0.4) {
                // Blood particles converging towards the center spawn position
                let angle = Math.random() * Math.PI * 2;
                let dist = 140 + Math.random() * 90;
                let px = this.x + Math.cos(angle) * dist;
                let py = this.y + Math.sin(angle) * dist;
                let bp = new BloodParticle(px, py);
                bp.vx = -Math.cos(angle) * 3.8;
                bp.vy = -Math.sin(angle) * 3.8;
                gameEffects.push(bp);
            }
            if (Math.random() < 0.15) {
                // Red lightning sparks
                gameEffects.push(new LightningParticle(
                    this.x + (Math.random() - 0.5) * 60,
                    this.y - this.h * 0.3 + (Math.random() - 0.5) * 60
                ));
            }
            
            // Screen rumble to build tension during summoning
            shakeIntensity = Math.max(shakeIntensity, 1.8);
            
            // When boss hits the ground (summoning completes)
            if (this.spawnTime <= 0 && !this.landedEffectTriggered) {
                this.landedEffectTriggered = true;
                
                // 1. Heavy camera shake
                shakeIntensity = 38;
                
                // 2. Shockwaves
                gameEffects.push(new ShockwaveRing(this.x, this.y, 140, false));
                gameEffects.push(new ShockwaveRing(this.x, this.y, 80, true));
                
                // 3. Explosive particle burst
                for (let i = 0; i < 35; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let speed = 3 + Math.random() * 8;
                    let bp = new BloodParticle(this.x, this.y);
                    bp.vx = Math.cos(angle) * speed;
                    bp.vy = Math.sin(angle) * speed;
                    gameEffects.push(bp);
                }
                for (let i = 0; i < 20; i++) {
                    gameEffects.push(new SparkleParticle(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 100, '#a855f7'));
                    gameEffects.push(new FrostParticle(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 100));
                }
                for (let i = 0; i < 8; i++) {
                    gameEffects.push(new LightningParticle(this.x, this.y - this.h * 0.3));
                }
                
                // 4. Ground impact audio feedback
                playIceShatterSound();
                playMagicSound();
            }
            return;
        }
        
        if (this.phase === 1 && this.hp < this.maxHp / 2) {
            this.phase = 2;
            this.currentPattern = 'transform';
            this.patternState = 0;
            this.patternTimer = 0; // State 0 checks jump animation completion
            this.state = 'jump';
            this.currentFrame = 0;
            this.frameTimeAcc = 0;
            return;
        }
        
        if (this.isFrozen) {
            this.frozenTime -= dt;
            if (this.frozenTime <= 0) {
                this.isFrozen = false;
            }
        }
        
        if (this.flashTime > 0) {
            this.flashTime -= dt;
        }
        
        if (this.thunderFlashCooldown > 0) {
            this.thunderFlashCooldown -= dt;
        }
        
        if (this.instantKillCooldown > 0) {
            this.instantKillCooldown -= dt;
        }
        
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.facing = dx > 0 ? 'right' : 'left';
        } else {
            this.facing = dy > 0 ? 'down' : 'up';
        }
        
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            this.x += this.knockbackX * dtScale;
            this.y += this.knockbackY * dtScale;
            this.knockbackX *= Math.pow(0.85, dtScale);
            this.knockbackY *= Math.pow(0.85, dtScale);
        } else {
            this.knockbackX = 0;
            this.knockbackY = 0;
        }
        
        if (this.state === 'groggy') {
            if (this.groggyInvincibleTime > 0) {
                this.groggyInvincibleTime -= dt;
            }
            if (this.currentFrame < 2) {
                const frameInterval = 1000 / 6;
                this.frameTimeAcc += dt;
                if (this.frameTimeAcc >= frameInterval) {
                    this.frameTimeAcc -= frameInterval;
                    this.currentFrame++;
                }
            }
            return;
        }
        
        if (this.currentPattern !== 'none') {
            this.executePattern(dt, px, py, dx, dy, dist);
            this.checkPlayerHit();
            return;
        }
        
        if (this.patternCooldown > 0) {
            this.patternCooldown -= dt;
        }
        
        if (this.patternCooldown <= 0) {
            this.chooseNextPattern(dist);
        } else {
            // Update strafe direction timer
            this.strafeTimer -= dt;
            if (this.strafeTimer <= 0) {
                this.strafeDirection = Math.random() < 0.5 ? 1 : -1;
                this.strafeTimer = 1500 + Math.random() * 1500; // swap direction every 1.5 - 3 seconds
            }

            this.state = 'walk';
            let currentSpeed = this.speed * (this.phase === 2 ? 1.5 : 1.0);
            if (this.isFrozen) currentSpeed *= 0.3;
            
            let vx = 0;
            let vy = 0;
            
            // 1. Radial component (keep distance between 150 and 260)
            if (dist > 260) {
                vx += (dx / dist) * currentSpeed;
                vy += (dy / dist) * currentSpeed;
            } else if (dist < 150) {
                vx -= (dx / dist) * currentSpeed * 1.25; // back off slightly faster
                vy -= (dy / dist) * currentSpeed * 1.25;
            }
            
            // 2. Tangent component (strafe perpendicular to player direction)
            const strafeSpeed = currentSpeed * 0.85;
            vx += (-dy / dist) * this.strafeDirection * strafeSpeed;
            vy += (dx / dist) * this.strafeDirection * strafeSpeed;
            
            // Normalize velocity to not exceed currentSpeed
            const velLen = Math.hypot(vx, vy) || 1;
            if (velLen > currentSpeed) {
                vx = (vx / velLen) * currentSpeed;
                vy = (vy / velLen) * currentSpeed;
            }
            
            this.x += vx * dtScale;
            this.y += vy * dtScale;
            
            const clamped = clampToArena(this.x, this.y, this.w, this.h);
            this.x = clamped.x;
            this.y = clamped.y;
            
            const fps = (this.state === 'walk') ? 8 : 4;
            const animLimit = (this.state === 'walk') ? 6 : 4;
            const frameInterval = 1000 / fps;
            this.frameTimeAcc += dt;
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame = (this.currentFrame + 1) % animLimit;
            }
        }
        
        this.checkPlayerHit();
    }
    
    chooseNextPattern(dist) {
        const rand = Math.random();
        
        // Check if thunder_flash is on cooldown
        const canUseFlash = (this.thunderFlashCooldown <= 0);
        const canUseInstantKill = (this.phase === 2 && this.instantKillCooldown <= 0);
        
        if (canUseInstantKill) {
            this.currentPattern = 'instant_kill';
            this.instantKillCooldown = 20000; // 20s cooldown
            this.patternState = 0;
            this.patternTimer = 1500; // 1.5s gathering energy
            this.currentFrame = 0;
            this.frameTimeAcc = 0;
            this.lockOnLine = null;
            return;
        }
        
        if (dist < 120) {
            // Super close range: always perform melee_5x
            this.currentPattern = 'melee_5x';
        } else if (dist > 250) {
            // Far range
            if (canUseFlash) {
                if (rand < 0.4) this.currentPattern = 'thunder_flash';
                else if (rand < 0.7) this.currentPattern = 'thunder_3x';
                else this.currentPattern = 'ice_ultimate';
            } else {
                this.currentPattern = rand < 0.5 ? 'thunder_3x' : 'ice_ultimate';
            }
        } else if (dist > 140) {
            // Medium range
            if (canUseFlash) {
                if (rand < 0.3) {
                    this.currentPattern = 'thunder_flash';
                } else if (rand < 0.6) {
                    this.currentPattern = 'thunder_3x';
                } else if (rand < 0.8) {
                    this.currentPattern = 'melee_5x';
                } else {
                    this.currentPattern = 'ice_ultimate';
                }
            } else {
                if (rand < 0.4) this.currentPattern = 'thunder_3x';
                else if (rand < 0.7) this.currentPattern = 'melee_5x';
                else this.currentPattern = 'ice_ultimate';
            }
        } else {
            // Close range (120 <= dist <= 140)
            if (canUseFlash) {
                if (rand < 0.15) {
                    this.currentPattern = 'thunder_flash';
                } else if (rand < 0.4) {
                    this.currentPattern = 'thunder_3x';
                } else if (rand < 0.75) {
                    this.currentPattern = 'melee_5x';
                } else {
                    this.currentPattern = 'ice_ultimate';
                }
            } else {
                if (rand < 0.3) this.currentPattern = 'thunder_3x';
                else if (rand < 0.7) this.currentPattern = 'melee_5x';
                else this.currentPattern = 'ice_ultimate';
            }
        }
        
        // Trigger 10-second cooldown if thunder_flash was selected
        if (this.currentPattern === 'thunder_flash') {
            this.thunderFlashCooldown = 10000;
        }
        
        this.patternState = 0;
        this.patternTimer = 0;
        this.currentFrame = 0;
        this.frameTimeAcc = 0;
        this.strikeCount = 0;
        this.meleeCount = 0;
        this.hidden = false;
        this.warningLines = null;
        this.activeWarningLine = null;
    }
    
    executePattern(dt, px, py, dx, dy, dist) {
        if (this.currentPattern === 'transform') {
            // State 0: Jump in place and prepare teleport
            if (this.patternState === 0) {
                this.state = 'jump';
                const frameInterval = 1000 / 10;
                this.frameTimeAcc += dt;
                
                if (this.frameTimeAcc >= frameInterval) {
                    this.frameTimeAcc -= frameInterval;
                    this.currentFrame++;
                    if (this.currentFrame >= 4) {
                        // Teleport boss to the center of the arena
                        this.x = WORLD_WIDTH / 2;
                        this.y = WORLD_HEIGHT / 2 - 100;
                        
                        this.state = 'cast';
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                        
                        shakeIntensity = 35;
                        playBossAppearSound();
                        
                        // Spawn lightning and blood burst
                        for (let i = 0; i < 30; i++) {
                            gameEffects.push(new LightningParticle(this.x, this.y));
                        }
                        for (let i = 0; i < 80; i++) {
                            gameEffects.push(new BloodParticle(this.x, this.y));
                        }
                        
                        // Fire dark orbs in 360 degrees전방위 불꽃 공격
                        for (let i = 0; i < 16; i++) {
                            const orbAngle = (i / 16) * Math.PI * 2;
                            const tx = this.x + Math.cos(orbAngle) * 100;
                            const ty = this.y + Math.sin(orbAngle) * 100;
                            gameEffects.push(new LastBossDarkOrb(this.x, this.y, tx, ty));
                        }
                        
                        this.patternState = 1;
                        this.patternTimer = 2500; // 2.5 seconds transforming vortex
                    }
                }
            }
            // State 1: Swirling vortex of fire and blood in the center
            else if (this.patternState === 1) {
                this.patternTimer -= dt;
                
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 60 + Math.random() * 120;
                    
                    const sp = new SparkleParticle(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius, '#bf00ff');
                    sp.vx = -Math.cos(angle) * 3.5;
                    sp.vy = -Math.sin(angle) * 3.5;
                    gameEffects.push(sp);
                    
                    const bp = new BloodParticle(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius);
                    bp.vx = -Math.cos(angle) * 4.5;
                    bp.vy = -Math.sin(angle) * 4.5 - 0.1;
                    gameEffects.push(bp);
                }
                
                if (Math.random() < 0.65) {
                    const bp = new BloodParticle(this.x + (Math.random() - 0.5) * 30, this.y + this.h / 2);
                    bp.vy = -5 - Math.random() * 5;
                    bp.vx = (Math.random() - 0.5) * 3;
                    gameEffects.push(bp);
                }
                
                const frameInterval = 1000 / 6;
                this.frameTimeAcc += dt;
                if (this.frameTimeAcc >= frameInterval) {
                    this.frameTimeAcc -= frameInterval;
                    this.currentFrame = (this.currentFrame + 1) % 4;
                }
                
                if (this.patternTimer <= 0) {
                    this.currentPattern = 'none';
                    this.patternCooldown = 1000;
                    shakeIntensity = 20;
                }
            }
            return;
        }
        

        
        // Pattern 1: Jump -> Disappear -> 0.8s draw 15 warning lines -> 0.2s warn pulse -> 15x Thunderclap Flash thrusts
        else if (this.currentPattern === 'thunder_flash') {
            // State 0: Jump up and disappear
            if (this.patternState === 0) {
                this.state = 'jump';
                const frameInterval = 1000 / 10;
                this.frameTimeAcc += dt;
                
                if (this.frameTimeAcc >= frameInterval) {
                    this.frameTimeAcc -= frameInterval;
                    this.currentFrame++;
                    if (this.currentFrame >= 4) {
                        // Spawn a large burst of electric particles on takeoff
                        for (let i = 0; i < 20; i++) {
                            gameEffects.push(new LightningParticle(this.x, this.y));
                        }
                        playBossAppearSound();
                        
                        this.hidden = true;
                        this.patternState = 1;
                        this.patternTimer = 800; // 0.8s drawing warning lines
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                        
                        // Generate 10 warning lines by bouncing off the walls starting from a point on the ellipse boundary
                        const cx = WORLD_WIDTH * 0.500;
                        const cy = WORLD_HEIGHT * 0.541;
                        const rx = WORLD_WIDTH * 0.403;
                        const ry = WORLD_HEIGHT * 0.265;
                        
                        this.warningLines = [];
                        const startAngle = Math.random() * Math.PI * 2;
                        let sx = cx + rx * Math.cos(startAngle);
                        let sy = cy + ry * Math.sin(startAngle);
                        
                        // First line targets the player
                        const initialBounce = this.getNextBouncePoint(sx, sy, Math.atan2(py - sy, px - sx));
                        this.warningLines.push({
                            x1: sx,
                            y1: sy,
                            x2: initialBounce.x,
                            y2: initialBounce.y
                        });
                        
                        // Find the ellipse parameter angle for the first bounce point
                        let currentAngle = Math.atan2((initialBounce.y - cy) / ry, (initialBounce.x - cx) / rx);
                        
                        const stepDir = Math.random() < 0.5 ? 1 : -1;
                        
                        let prevX = initialBounce.x;
                        let prevY = initialBounce.y;
                        
                        for (let i = 1; i < 10; i++) {
                            // Randomize the step angle per bounce between 120 and 180 degrees to ensure multiple lines cross the center
                            const stepAngle = stepDir * ((120 + Math.random() * 60) * Math.PI / 180);
                            currentAngle += stepAngle;
                            const nextX = cx + rx * Math.cos(currentAngle);
                            const nextY = cy + ry * Math.sin(currentAngle);
                            
                            this.warningLines.push({
                                x1: prevX,
                                y1: prevY,
                                x2: nextX,
                                y2: nextY
                            });
                            
                            prevX = nextX;
                            prevY = nextY;
                        }
                    }
                }
            }
            // State 1: Draw 10 warning lines rapidly one by one (takes 0.8 seconds)
            else if (this.patternState === 1) {
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    this.patternState = 2;
                    this.patternTimer = 200; // 0.2s pause where lines pulse/glow (Total 1.0s warning)
                }
            }
            // State 2: Final Warning Pulse (takes 0.2 seconds)
            else if (this.patternState === 2) {
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    this.patternState = 3;
                    this.strikeCount = 0;
                    this.patternTimer = 0; // Trigger strikes immediately
                }
            }
            // State 3: Striking loop along warning lines (10 times total)
            else if (this.patternState === 3) {
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    if (this.strikeCount < 10) {
                        const line = this.warningLines[this.strikeCount];
                        this.strikeCount++;
                        
                        // Teleport boss to the start of this line (at the arena boundary)
                        this.x = line.x1;
                        this.y = line.y1;
                        this.hidden = false;
                        
                        // Set state to thrust ('cast') and direction
                        const strikeVx = line.x2 - line.x1;
                        const strikeVy = line.y2 - line.y1;
                        const strikeLength = Math.hypot(strikeVx, strikeVy) || 1;
                        
                        this.facing = (line.x2 > line.x1) ? 'right' : 'left';
                        this.state = 'cast'; // Thrusting frames
                        this.currentFrame = 2; // Fixed thrust frame
                        this.frameTimeAcc = 0;
                        
                        // Instantly teleport to the end of the line (opposite arena boundary)
                        this.x = line.x2;
                        this.y = line.y2;
                        
                        // Audio effects
                        playUltimateSound();
                        playSlashSound();
                        
                        // Visual effects: Thunderclap Flash line
                        gameEffects.push(new ThunderclapFlashEffect(line.x1, line.y1, line.x2, line.y2));
                        shakeIntensity = Math.max(shakeIntensity, 28);
                        
                        // Spawn lingering golden afterimages along the path
                        const img = lastBossCastFrames[2] || lastBossCastFrames[0];
                        for (let t = 0.15; t <= 0.85; t += 0.15) {
                            const ax = line.x1 + strikeVx * t;
                            const ay = line.y1 + strikeVy * t;
                            if (img && img.complete) {
                                gameEffects.push(new PlayerAfterimage(
                                    img, 0, 0, img.width, img.height,
                                    ax - this.w / 2, ay - this.h / 2,
                                    this.w, this.h,
                                    this.facing,
                                    0.065, // lingering decay
                                    'rgba(253, 224, 71, ALPHA)' // Golden yellow tint
                                ));
                            }
                        }
                        
                        // Spark particles at start and end boundary positions
                        for (let i = 0; i < 15; i++) {
                            gameEffects.push(new LightningParticle(line.x1, line.y1));
                            gameEffects.push(new LightningParticle(line.x2, line.y2));
                        }
                        
                        // Check player segment collision
                        const pCenterX = player.x + player.width / 2;
                        const pCenterY = player.y + player.height / 2;
                        const distToSeg = distanceToSegment(pCenterX, pCenterY, line.x1, line.y1, line.x2, line.y2);
                        if (distToSeg < 75 && !player.isInvincible) {
                            player.takeDamage(20, strikeVx / strikeLength, strikeVy / strikeLength);
                            gameEffects.push(new HitSlash(pCenterX, pCenterY, false));
                            for (let j = 0; j < 8; j++) {
                                gameEffects.push(new LightningParticle(pCenterX, pCenterY));
                            }
                            shakeIntensity = Math.max(shakeIntensity, 32);
                        }
                        
                        // Disappear again
                        this.hidden = true;
                        this.patternTimer = 150; // Delay between strikes (150ms for a rapid flurry!)
                    } else {
                        // All 10 strikes finished
                        this.hidden = false;
                        this.warningLines = null;
                        this.currentPattern = 'none';
                        this.patternCooldown = 1500 + Math.random() * 1000;
                        this.state = 'idle';
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                    }
                }
            }
        }
        
        // Pattern 3: Aim -> Short Warning Line -> Short Dash (3 times total)
        else if (this.currentPattern === 'thunder_3x') {
            // State 0: Initialize warning line pointing to player
            if (this.patternState === 0) {
                this.state = 'idle';
                this.currentFrame = 0;
                this.frameTimeAcc = 0;
                
                // Get angle to player
                const angle = Math.atan2(py - this.y, px - this.x);
                const length = 340; // Short distance (1.7x = 340px)
                const tx = this.x + Math.cos(angle) * length;
                const ty = this.y + Math.sin(angle) * length;
                
                // Clamp target point to arena
                const clamped = clampToArena(tx, ty, 30, 30);
                
                this.activeWarningLine = {
                    x1: this.x,
                    y1: this.y,
                    x2: clamped.x,
                    y2: clamped.y
                };
                
                this.patternTimer = 450; // 450ms warning line drawing/pulsing
                this.patternState = 1;
            }
            // State 1: Wait 350ms during warning phase
            else if (this.patternState === 1) {
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    this.patternState = 2; // Move to strike dash
                    this.patternTimer = 0;
                }
            }
            // State 2: Strike dash execution
            else if (this.patternState === 2) {
                const line = this.activeWarningLine;
                if (line) {
                    const strikeVx = line.x2 - line.x1;
                    const strikeVy = line.y2 - line.y1;
                    const strikeLength = Math.hypot(strikeVx, strikeVy) || 1;
                    
                    this.facing = (line.x2 > line.x1) ? 'right' : 'left';
                    this.state = 'cast'; // Thrust sprite
                    this.currentFrame = 2; // Fixed thrust frame
                    this.frameTimeAcc = 0;
                    
                    // Teleport to target
                    this.x = line.x2;
                    this.y = line.y2;
                    
                    // Audio effects
                    playUltimateSound();
                    playSlashSound();
                    
                    // Visual effects: Thunderclap Flash line
                    gameEffects.push(new ThunderclapFlashEffect(line.x1, line.y1, line.x2, line.y2));
                    shakeIntensity = Math.max(shakeIntensity, 15);
                    
                    // Spawn afterimages along the path
                    const img = lastBossCastFrames[2] || lastBossCastFrames[0];
                    for (let t = 0.25; t <= 0.75; t += 0.25) {
                        const ax = line.x1 + strikeVx * t;
                        const ay = line.y1 + strikeVy * t;
                        if (img && img.complete) {
                            gameEffects.push(new PlayerAfterimage(
                                img, 0, 0, img.width, img.height,
                                ax - this.w / 2, ay - this.h / 2,
                                this.w, this.h,
                                this.facing,
                                0.065,
                                'rgba(253, 224, 71, ALPHA)'
                            ));
                        }
                    }
                    
                    // Spark particles
                    for (let i = 0; i < 8; i++) {
                        gameEffects.push(new LightningParticle(line.x1, line.y1));
                        gameEffects.push(new LightningParticle(line.x2, line.y2));
                    }
                    
                    // Collision check
                    const pCenterX = player.x + player.width / 2;
                    const pCenterY = player.y + player.height / 2;
                    const distToSeg = distanceToSegment(pCenterX, pCenterY, line.x1, line.y1, line.x2, line.y2);
                    if (distToSeg < 75 && !player.isInvincible) {
                        player.takeDamage(15, strikeVx / strikeLength, strikeVy / strikeLength);
                        gameEffects.push(new HitSlash(pCenterX, pCenterY, false));
                        for (let j = 0; j < 5; j++) {
                            gameEffects.push(new LightningParticle(pCenterX, pCenterY));
                        }
                        shakeIntensity = Math.max(shakeIntensity, 20);
                    }
                }
                
                this.strikeCount++;
                this.activeWarningLine = null;
                
                if (this.strikeCount < 3) {
                    this.patternState = 3; // Go to delay state
                    this.patternTimer = 150; // 150ms delay before next warning
                } else {
                    // Pattern finished
                    this.currentPattern = 'none';
                    this.patternCooldown = 1500 + Math.random() * 1000;
                    this.state = 'idle';
                    this.currentFrame = 0;
                    this.frameTimeAcc = 0;
                }
            }
            // State 3: Delay between strikes
            else if (this.patternState === 3) {
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    this.patternState = 0; // Prepare next warning line
                }
            }
        }
        
        // Pattern 2: Perform 5 consecutive melee attacks in place
        else if (this.currentPattern === 'melee_5x') {
            this.state = 'attack';
            const frameInterval = 1000 / 12; // Rapid 12 fps strikes
            this.frameTimeAcc += dt;
            
            // Dash forward slightly during active strike frames (frames 0 to 3) towards the player
            if (this.currentFrame >= 0 && this.currentFrame <= 3 && dist > 40) {
                const dashSpeed = 4.5 * dtScale;
                const dirX = dx / dist;
                const dirY = dy / dist;
                this.x += dirX * dashSpeed;
                this.y += dirY * dashSpeed;
                
                // Keep the boss clamped to the arena boundary
                const clamped = clampToArena(this.x, this.y, this.w, this.h);
                this.x = clamped.x;
                this.y = clamped.y;
            }
            
            if (this.frameTimeAcc >= frameInterval) {
                this.frameTimeAcc -= frameInterval;
                this.currentFrame++;
                
                // Damage deal on frame 2 of the slash
                if (this.currentFrame === 2) {
                    if (dist < 140 && !player.isInvincible) {
                        player.takeDamage(15, dx / dist, dy / dist);
                        gameEffects.push(new HitSlash(px, py, false));
                        shakeIntensity = Math.max(shakeIntensity, 8);
                    }
                    playSlashSound();
                }
                
                // End of slash animation frame (6 frames total)
                if (this.currentFrame >= 6) {
                    this.meleeCount++;
                    if (this.meleeCount < 5) {
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                    } else {
                        // End pattern after 5 melee strikes
                        this.currentPattern = 'none';
                        this.patternCooldown = 1500;
                        this.state = 'idle';
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                    }
                }
            }
        }
        
        // Pattern 5: Instant Kill Dark Slash (즉사암흑 일격베기)
        else if (this.currentPattern === 'instant_kill') {
            // State 0: Gathering energy (기를 모으는 단계)
            if (this.patternState === 0) {
                this.state = 'cast';
                this.currentFrame = 0; // Standing still or cast frame
                
                // Energy sucking particles
                if (Math.random() < 0.8) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 180 + Math.random() * 120;
                    const sp = new SparkleParticle(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius, '#c084fc'); // Purple sparkle
                    sp.vx = -Math.cos(angle) * 5.0;
                    sp.vy = -Math.sin(angle) * 5.0;
                    gameEffects.push(sp);
                }
                if (Math.random() < 0.6) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 180 + Math.random() * 120;
                    const bp = new BloodParticle(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius);
                    bp.vx = -Math.cos(angle) * 6.0;
                    bp.vy = -Math.sin(angle) * 6.0;
                    gameEffects.push(bp);
                }
                
                // Play warning rumble
                shakeIntensity = Math.max(shakeIntensity, 3.0);
                
                // Track player position with the lock-on line
                this.lockOnLine = {
                    x1: this.x,
                    y1: this.y,
                    x2: px,
                    y2: py,
                    isLocked: false
                };
                
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    this.patternState = 1;
                    this.patternTimer = 1000; // 1 second locked warning
                    playBossAppearSound();
                }
            }
            // State 1: Locked-on (락온 상태에서 플레이어 추적 및 마지막 0.6초간 조준 고정)
            else if (this.patternState === 1) {
                this.state = 'cast';
                
                // Dense energy particles
                if (Math.random() < 0.9) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = 100 + Math.random() * 80;
                    const sp = new SparkleParticle(this.x + Math.cos(angle) * radius, this.y + Math.sin(angle) * radius, '#ec4899'); // Pink sparkle
                    sp.vx = -Math.cos(angle) * 6.0;
                    sp.vy = -Math.sin(angle) * 6.0;
                    gameEffects.push(sp);
                }
                
                // Stop tracking player for the final 400ms to allow them to dodge!
                if (this.patternTimer > 400) {
                    this.lockOnLine = {
                        x1: this.x,
                        y1: this.y,
                        x2: px,
                        y2: py,
                        isLocked: false
                    };
                } else {
                    if (this.lockOnLine) {
                        this.lockOnLine.isLocked = true; // Lock the warning line in place
                    }
                }
                
                shakeIntensity = Math.max(shakeIntensity, 6.0);
                
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    this.patternState = 2;
                    this.patternTimer = 200; // 0.2s hyper-speed dash slash
                    screenDarkness = 0.95; // Instant black screen overlay
                    playUltimateSound();
                    playSlashSound();
                    
                    // Store the starting and ending positions for the smooth dash!
                    this.dashStartX = this.x;
                    this.dashStartY = this.y;
                    
                    const lineDx = this.lockOnLine.x2 - this.lockOnLine.x1;
                    const lineDy = this.lockOnLine.y2 - this.lockOnLine.y1;
                    const lineLen = Math.hypot(lineDx, lineDy) || 1;
                    
                    this.dashEndX = this.lockOnLine.x2 + (lineDx / lineLen) * 60;
                    this.dashEndY = this.lockOnLine.y2 + (lineDy / lineLen) * 60;
                }
            }
            // State 2: Hyper-speed dash slash execution (0.2 seconds)
            else if (this.patternState === 2) {
                this.patternTimer -= dt;
                let progress = Math.min(1.0, (200 - this.patternTimer) / 200);
                
                // Move boss continuously along the line
                this.x = this.dashStartX + (this.dashEndX - this.dashStartX) * progress;
                this.y = this.dashStartY + (this.dashEndY - this.dashStartY) * progress;
                
                // Clamp boss to the arena
                const clamped = clampToArena(this.x, this.y, this.w, this.h);
                this.x = clamped.x;
                this.y = clamped.y;
                
                // Spawn boss afterimages along the path to visualize hyper-speed movement
                if (Math.random() < 0.45) {
                    const img = lastBossCastFrames[2] || lastBossCastFrames[0];
                    if (img && img.complete) {
                        gameEffects.push(new PlayerAfterimage(
                            img, 0, 0, img.width, img.height,
                            this.x - this.w / 2, this.y - this.h / 2,
                            this.w, this.h,
                            this.facing,
                            0.08,
                            'rgba(147, 51, 234, ALPHA)' // Purple afterimage
                        ));
                    }
                }
                
                shakeIntensity = 65; // Massive shake
                
                if (this.patternTimer <= 0) {
                    // Dash completed! Check hit & spawn blood explosion
                    this.patternState = 3;
                    this.patternTimer = 250; // 0.25s recovery / screen fade-in
                    
                    // Attack logic: Check distance from player to locked warning line
                    const lineDx = this.lockOnLine.x2 - this.lockOnLine.x1;
                    const lineDy = this.lockOnLine.y2 - this.lockOnLine.y1;
                    const lineLen = Math.hypot(lineDx, lineDy) || 1;
                    
                    const pCenterX = player.x + player.width / 2;
                    const pCenterY = player.y + player.height / 2;
                    const distToSlash = distanceToSegment(pCenterX, pCenterY, this.lockOnLine.x1, this.lockOnLine.y1, this.lockOnLine.x2, this.lockOnLine.y2);
                    
                    if (distToSlash < 60) {
                        if (!player.isDebugMode) {
                            // Instant Kill Damage!
                            player.hp = 0;
                            player.takeDamage(9999, lineDx / lineLen, lineDy / lineLen);
                        } else {
                            // In debug cheat mode, just take 0 damage but show hit effect
                            gameEffects.push(new HitSlash(pCenterX, pCenterY, true));
                        }
                    }
                    
                    // Spawn massive blood explosion at target position
                    for (let i = 0; i < 65; i++) {
                        const bp = new BloodParticle(this.lockOnLine.x2 + (Math.random() - 0.5) * 35, this.lockOnLine.y2 + (Math.random() - 0.5) * 35);
                        bp.vx *= 2.2;
                        bp.vy *= 2.2;
                        gameEffects.push(bp);
                    }
                    
                    // Spawn bloody trail along the slash line
                    for (let t = 0.1; t <= 0.9; t += 0.08) {
                        const sx = this.lockOnLine.x1 + lineDx * t;
                        const sy = this.lockOnLine.y1 + lineDy * t;
                        for (let j = 0; j < 3; j++) {
                            gameEffects.push(new BloodParticle(sx, sy));
                        }
                    }
                    
                    // Play blast sound or impact effects
                    playBossAppearSound();
                    gameEffects.push(new HitSlash(this.lockOnLine.x2, this.lockOnLine.y2, true));
                }
            }
            // State 3: Post-slash fade back to normal screen (0.25 seconds)
            else if (this.patternState === 3) {
                this.patternTimer -= dt;
                // Fade screen back
                screenDarkness = Math.max(0, this.patternTimer / 250);
                
                if (this.patternTimer <= 0) {
                    screenDarkness = 0;
                    this.lockOnLine = null;
                    this.currentPattern = 'none';
                    this.patternCooldown = 1500; // Normal boss state transition delay
                    this.state = 'idle';
                    this.currentFrame = 0;
                    this.frameTimeAcc = 0;
                }
            }
        }
        
        // Pattern 4: Teleport to Arena Edge -> Draw warning line -> Cast Ice Ultimate
        else if (this.currentPattern === 'ice_ultimate') {
            // State 0: Jump and teleport to a random point on the arena boundary
            if (this.patternState === 0) {
                this.state = 'jump';
                const frameInterval = 1000 / 10;
                this.frameTimeAcc += dt;
                
                if (this.frameTimeAcc >= frameInterval) {
                    this.frameTimeAcc -= frameInterval;
                    this.currentFrame++;
                    if (this.currentFrame >= 4) {
                        // Spawn electric/frost sparkles on takeoff
                        for (let i = 0; i < 20; i++) {
                            gameEffects.push(new LightningParticle(this.x, this.y));
                        }
                        playBossAppearSound();
                        
                        // Select a random angle on the elliptical arena edge
                        const cx = WORLD_WIDTH * 0.500;
                        const cy = WORLD_HEIGHT * 0.541;
                        const rx = WORLD_WIDTH * 0.403;
                        const ry = WORLD_HEIGHT * 0.265;
                        const theta = Math.random() * Math.PI * 2;
                        
                        this.x = cx + rx * Math.cos(theta);
                        this.y = cy + ry * Math.sin(theta);
                        
                        // Teleport boss instantly to the edge
                        // Calculate exact angle to the player
                        const angle = Math.atan2(py - this.y, px - this.x);
                        
                        // Calculate target line to boundary of the arena in the player's direction
                        const bounce = this.getNextBouncePoint(this.x, this.y, angle);
                        this.activeWarningLine = {
                            x1: this.x,
                            y1: this.y,
                            x2: bounce.x,
                            y2: bounce.y
                        };
                        
                        this.patternState = 1;
                        this.patternTimer = 800; // 0.8s warning indicator
                        this.currentFrame = 0;
                        this.frameTimeAcc = 0;
                    }
                }
            }
            // State 1: Delay and show warning indicator
            else if (this.patternState === 1) {
                this.patternTimer -= dt;
                if (this.patternTimer <= 0) {
                    this.patternState = 2;
                    this.patternTimer = 0;
                }
            }
            // State 2: Cast Ice Spikes
            else if (this.patternState === 2) {
                const line = this.activeWarningLine;
                if (line) {
                    const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
                    
                    // Determine visual facing based on angle
                    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
                        this.facing = Math.cos(angle) > 0 ? 'right' : 'left';
                    } else {
                        this.facing = Math.sin(angle) > 0 ? 'down' : 'up';
                    }
                    this.state = 'cast';
                    this.currentFrame = 0;
                    this.frameTimeAcc = 0;
                    
                    // Trigger sound effect
                    playFreezeMagicSound();
                    
                    // Spawn IceSpikeSequencer with the exact angle
                    gameEffects.push(new LastBossIceSpikeSequencer(this.x, this.y, angle));
                }
                
                this.activeWarningLine = null;
                this.currentPattern = 'none';
                this.patternCooldown = 2500 + Math.random() * 1000; // 2.5 - 3.5s cooldown
                this.state = 'idle';
                this.currentFrame = 0;
                this.frameTimeAcc = 0;
            }
        }
    }
    
    checkPlayerHit() {
        // Contact damage (몸빵 데미지) disabled per user request
        return;
    }
    
    takeDamage(amount, knockbackX, knockbackY, isMagic = false, isMultiHit = false, isCritical = false) {
        if (this.state === 'cleared' || this.hidden) return;
        
        if (this.state === 'groggy') {
            if (this.groggyInvincibleTime > 0) return; // Invincible during the first second
            
            let finalAmount = Math.max(5, Math.ceil(amount * 0.4));
            if (player.isDebugMode) finalAmount = 300;
            this.groggyHp = Math.max(0, this.groggyHp - finalAmount);
            this.flashTime = 200;
            
            // Bloodier violent hit effects
            shakeIntensity = Math.max(shakeIntensity, 15);
            playBossHurtSound();
            
            // Spawn lots of blood particles!
            for (let i = 0; i < 15; i++) {
                gameEffects.push(new BloodParticle(this.x + (Math.random() - 0.5) * 40, this.y + (Math.random() - 0.5) * 40));
            }
            
            gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            
            // Lifesteal on hit
            if (typeof upgrades !== 'undefined' && upgrades.lifeSteal > 0) {
                player.hp = Math.min(player.maxHp, player.hp + finalAmount * upgrades.lifeSteal);
            }
            
            gameEffects.push(new DamageNumber(this.x, this.y - 10, finalAmount, isMagic, isCritical));
            
            if (this.groggyHp <= 0) {
                this.state = 'cleared';
                triggerGameClear();
            }
            return;
        }
        
        let finalAmount = Math.max(5, Math.ceil(amount * 0.4));
        if (player.isDebugMode) finalAmount = 300;
        this.hp = Math.max(0, this.hp - finalAmount);
        this.flashTime = 200;
        
        this.knockbackX = knockbackX * 1.5;
        this.knockbackY = knockbackY * 1.5;
        
        if (!isMultiHit) {
            shakeIntensity = isMagic ? 22 : 14;
            hitStopDuration = isMagic ? 120 : 80;
            
            playBossHurtSound();
            
            const particleCount = isMagic ? 20 : 12;
            for (let i = 0; i < particleCount; i++) {
                gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            }
            
            gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            
            if (finalAmount >= 50) {
                gameEffects.push(new ShockwaveRing(this.x, this.y, 80, isMagic));
                shakeIntensity = Math.max(shakeIntensity, 28);
            }
        } else {
            shakeIntensity = Math.max(shakeIntensity, 3);
            if (Math.random() < 0.15) {
                playBossHurtSound();
            }
            gameEffects.push(new HitParticle(this.x, this.y, isMagic));
            if (Math.random() < 0.25) {
                gameEffects.push(new HitSlash(this.x, this.y, isMagic));
            }
        }
        
        // Lifesteal on hit
        if (typeof upgrades !== 'undefined' && upgrades.lifeSteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + finalAmount * upgrades.lifeSteal);
        }
        
        gameEffects.push(new DamageNumber(this.x, this.y - 10, finalAmount, isMagic, isCritical));
        
        if (this.hp <= 0) {
            this.state = 'groggy';
            this.currentFrame = 0;
            this.frameTimeAcc = 0;
            this.currentPattern = 'none';
            this.groggyInvincibleTime = 1000; // 1 second invincibility
            if (this.auraEffect) {
                this.auraEffect.active = false;
            }
            // Clear all active boss warning lines & ice spikes upon falling
            this.activeWarningLine = null;
            this.warningLines = null;
            gameEffects = gameEffects.filter(e => !(e instanceof LastBossIceSpike));
            
            // Intense final impact shake
            shakeIntensity = 35;
        }
    }
    
    draw() {
        // Draw telegraph warning lines if active (instant_kill)
        if (this.currentPattern === 'instant_kill') {
            if (this.patternState === 0 || this.patternState === 1) {
                if (this.lockOnLine) {
                    gameCtx.save();
                    // Semi-transparent dark purple outer glow
                    let alpha = 0.35 + Math.sin(Date.now() / 30) * 0.15;
                    if (this.patternState === 1) {
                        if (this.lockOnLine.isLocked) {
                            alpha = 0.8 + Math.sin(Date.now() / 10) * 0.2; // intense flashing when locked
                        } else {
                            alpha = 0.5 + Math.sin(Date.now() / 20) * 0.15;
                        }
                    }
                    
                    // If locked, use a dark red/purple color scheme to warn player of imminent doom
                    const glowColor = this.lockOnLine.isLocked ? `rgba(220, 38, 38, ${alpha})` : `rgba(147, 51, 234, ${alpha})`;
                    const coreColor = this.lockOnLine.isLocked ? `rgba(254, 240, 138, ${alpha * 1.5})` : `rgba(236, 72, 153, ${alpha * 1.5})`;
                    
                    gameCtx.strokeStyle = glowColor;
                    gameCtx.lineWidth = 45;
                    gameCtx.lineCap = 'round';
                    gameCtx.beginPath();
                    gameCtx.moveTo(this.lockOnLine.x1, this.lockOnLine.y1);
                    gameCtx.lineTo(this.lockOnLine.x2, this.lockOnLine.y2);
                    gameCtx.stroke();
                    
                    // Inner core line
                    gameCtx.strokeStyle = coreColor;
                    gameCtx.lineWidth = 12;
                    gameCtx.beginPath();
                    gameCtx.moveTo(this.lockOnLine.x1, this.lockOnLine.y1);
                    gameCtx.lineTo(this.lockOnLine.x2, this.lockOnLine.y2);
                    gameCtx.stroke();
                    
                    // Lock-on target reticle at player center
                    gameCtx.strokeStyle = this.lockOnLine.isLocked ? '#ef4444' : '#fb7185';
                    gameCtx.lineWidth = 3;
                    gameCtx.beginPath();
                    gameCtx.arc(this.lockOnLine.x2, this.lockOnLine.y2, 25, 0, Math.PI * 2);
                    gameCtx.stroke();
                    
                    // Crosshairs
                    gameCtx.beginPath();
                    gameCtx.moveTo(this.lockOnLine.x2 - 35, this.lockOnLine.y2);
                    gameCtx.lineTo(this.lockOnLine.x2 - 15, this.lockOnLine.y2);
                    gameCtx.moveTo(this.lockOnLine.x2 + 15, this.lockOnLine.y2);
                    gameCtx.lineTo(this.lockOnLine.x2 + 35, this.lockOnLine.y2);
                    gameCtx.moveTo(this.lockOnLine.x2, this.lockOnLine.y2 - 35);
                    gameCtx.lineTo(this.lockOnLine.x2, this.lockOnLine.y2 - 15);
                    gameCtx.moveTo(this.lockOnLine.x2, this.lockOnLine.y2 + 15);
                    gameCtx.lineTo(this.lockOnLine.x2, this.lockOnLine.y2 + 35);
                    gameCtx.stroke();
                    
                    gameCtx.restore();
                }
            }
        }

        // Draw telegraph warning lines if active (ice_ultimate)
        if (this.currentPattern === 'ice_ultimate' && this.activeWarningLine) {
            gameCtx.save();
            const elapsed = 800 - this.patternTimer;
            const line = this.activeWarningLine;
            
            // Draw progress: 0 to 1 over 300ms
            const progress = Math.min(1.0, elapsed / 300);
            
            // Pulse alpha if drawing is done
            let alpha = 0.35;
            if (elapsed > 300) {
                alpha = 0.35 + Math.sin(Date.now() / 45) * 0.15;
            }
            
            const dx = line.x2 - line.x1;
            const dy = line.y2 - line.y1;
            const curEx = line.x1 + dx * progress;
            const curEy = line.y1 + dy * progress;
            
            // 1. Wide translucent light blue/cyan indicator
            gameCtx.strokeStyle = `rgba(0, 245, 255, ${alpha})`;
            gameCtx.lineWidth = 70;
            gameCtx.lineCap = 'round';
            gameCtx.beginPath();
            gameCtx.moveTo(line.x1, line.y1);
            gameCtx.lineTo(curEx, curEy);
            gameCtx.stroke();
            
            // 2. Bright white core line
            gameCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 2.2})`;
            gameCtx.lineWidth = 4;
            gameCtx.beginPath();
            gameCtx.moveTo(line.x1, line.y1);
            gameCtx.lineTo(curEx, curEy);
            gameCtx.stroke();
            
            gameCtx.restore();
        }

        // Draw telegraph warning lines if active (thunder_3x)
        if (this.currentPattern === 'thunder_3x' && this.activeWarningLine) {
            gameCtx.save();
            const elapsed = 450 - this.patternTimer;
            const line = this.activeWarningLine;
            
            // Draw progress: 0 to 1 over 300ms
            const progress = Math.min(1.0, elapsed / 300);
            
            // Pulse alpha if drawing is done
            let alpha = 0.30;
            if (elapsed > 300) {
                alpha = 0.35 + Math.sin(Date.now() / 45) * 0.15;
            }
            
            const dx = line.x2 - line.x1;
            const dy = line.y2 - line.y1;
            const curEx = line.x1 + dx * progress;
            const curEy = line.y1 + dy * progress;
            
            // 1. Wide translucent indicator
            gameCtx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
            gameCtx.lineWidth = 60;
            gameCtx.lineCap = 'round';
            gameCtx.beginPath();
            gameCtx.moveTo(line.x1, line.y1);
            gameCtx.lineTo(curEx, curEy);
            gameCtx.stroke();
            
            // 2. Bright red core laser
            gameCtx.strokeStyle = `rgba(239, 68, 68, ${alpha * 2.2})`;
            gameCtx.lineWidth = 3.5;
            gameCtx.beginPath();
            gameCtx.moveTo(line.x1, line.y1);
            gameCtx.lineTo(curEx, curEy);
            gameCtx.stroke();
            
            gameCtx.restore();
        }

        // Draw telegraph warning lines if active
        if (this.currentPattern === 'thunder_flash' && this.warningLines) {
            gameCtx.save();
            const elapsed = 800 - this.patternTimer;
            const state = this.patternState;
            const lineInterval = 800 / 10;
            
            this.warningLines.forEach((line, idx) => {
                let drawLine = false;
                let progress = 1.0;
                let alpha = 0.30;
                
                if (state === 1) {
                    // 10 Lines draw sequentially in 0.8 seconds (80ms per line)
                    const startTime = idx * lineInterval;
                    if (elapsed > startTime) {
                        drawLine = true;
                        progress = Math.min(1.0, (elapsed - startTime) / lineInterval);
                    }
                } else if (state === 2) {
                    // Lines pulse during final 0.2s pause
                    drawLine = true;
                    alpha = 0.35 + Math.sin(Date.now() / 45) * 0.15;
                } else if (state === 3) {
                    // Only draw lines that haven't been dashed yet
                    if (idx >= this.strikeCount) {
                        drawLine = true;
                        alpha = 0.20;
                    }
                }
                
                if (drawLine) {
                    const dx = line.x2 - line.x1;
                    const dy = line.y2 - line.y1;
                    const curEx = line.x1 + dx * progress;
                    const curEy = line.y1 + dy * progress;
                    
                    // 1. Draw outer wide translucent highlight indicator (matching strike width)
                    gameCtx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
                    gameCtx.lineWidth = 60;
                    gameCtx.lineCap = 'round';
                    gameCtx.beginPath();
                    gameCtx.moveTo(line.x1, line.y1);
                    gameCtx.lineTo(curEx, curEy);
                    gameCtx.stroke();
                    
                    // 2. Draw inner bright red core laser
                    gameCtx.strokeStyle = `rgba(239, 68, 68, ${alpha * 2.2})`;
                    gameCtx.lineWidth = 3.5;
                    gameCtx.beginPath();
                    gameCtx.moveTo(line.x1, line.y1);
                    gameCtx.lineTo(curEx, curEy);
                    gameCtx.stroke();
                }
            });
            gameCtx.restore();
        }
        
        if (this.hidden) return;
        
        const drawW = this.w;
        const drawH = this.h;
        
        // Calculate upward visual offset during jumping animation
        let jumpOffsetY = 0;
        if (this.spawnTime > 0) {
            const progress = (this.spawnMaxTime - this.spawnTime) / this.spawnMaxTime;
            // Quadratic ease-in visual drop effect from sky
            jumpOffsetY = -700 * (1 - progress) * (1 - progress);
        } else if (this.state === 'jump') {
            const offsets = [-15, -35, -45, -35];
            jumpOffsetY = offsets[Math.min(this.currentFrame, offsets.length - 1)];
        }
        
        const drawX = this.x - drawW / 2;
        const drawY = this.y - drawH / 2 + jumpOffsetY;
        const flip = player.x + player.width / 2 < this.x;
        
        if (this.phase === 2 && this.state !== 'die' && this.state !== 'groggy') {
            const wingW = 338 * 1.3;
            const wingH = 203 * 1.3;
            if (lastBossGiantImg && lastBossGiantImg.complete && lastBossGiantImg.naturalWidth > 0) {
                gameCtx.save();
                gameCtx.globalAlpha = 0.85;
                gameCtx.drawImage(lastBossGiantImg, this.x - wingW / 2, this.y + jumpOffsetY - drawH * 0.45 - wingH / 2, wingW, wingH);
                gameCtx.restore();
            } else {
                // High-fidelity fallback: Pulsing giant dark energy field behind the boss
                gameCtx.save();
                gameCtx.globalAlpha = 0.6;
                const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
                const radius = 100 * pulse;
                const grad = gameCtx.createRadialGradient(this.x, this.y + jumpOffsetY - drawH * 0.1, 10, this.x, this.y + jumpOffsetY - drawH * 0.1, radius);
                grad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');   // Neon Red core
                grad.addColorStop(0.5, 'rgba(147, 51, 234, 0.25)'); // Deep purple
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                gameCtx.fillStyle = grad;
                gameCtx.beginPath();
                gameCtx.arc(this.x, this.y + jumpOffsetY - drawH * 0.1, radius, 0, Math.PI * 2);
                gameCtx.fill();
                gameCtx.restore();
            }
        }
        
        let frames = lastBossWalkFrames;
        if (this.state === 'idle') {
            frames = lastBossIdleFrames;
        } else if (this.state === 'attack') {
            frames = lastBossAttackFrames;
        } else if (this.state === 'cast') {
            frames = lastBossCastFrames;
        } else if (this.state === 'jump') {
            frames = lastBossJumpFrames;
        } else if (this.state === 'die' || this.state === 'groggy') {
            frames = lastBossDieFrames;
        }
        
        const frameIdx = Math.min(this.currentFrame, frames.length - 1);
        const img = frames[frameIdx];
        if (!img || !img.complete) return;
        
        const srcW = img.width;
        const srcH = img.height;
        
        gameCtx.save();
        if (this.spawnTime > 0) {
            const progress = (this.spawnMaxTime - this.spawnTime) / this.spawnMaxTime;
            // Smoothly fade in alpha over the spawning period
            gameCtx.globalAlpha = Math.min(1.0, progress * 1.5);
        }
        
        if (this.flashTime > 0) {
            const color = this.flashTime > 130 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(239, 68, 68, 0.85)';
            drawTintedImage(
                img,
                0, 0, srcW, srcH,
                drawX, drawY, drawW, drawH,
                color,
                flip
            );
        } else if (this.isFrozen) {
            drawTintedImage(
                img,
                0, 0, srcW, srcH,
                drawX, drawY, drawW, drawH,
                'rgba(147, 197, 253, 0.75)',
                flip
            );
        } else {
            gameCtx.save();
            if (this.phase === 2 && this.state !== 'die' && this.state !== 'groggy') {
                drawTintedImage(
                    img,
                    0, 0, srcW, srcH,
                    drawX, drawY, drawW, drawH,
                    'rgba(168, 85, 247, 0.35)',
                    flip
                );
            }
            
            gameCtx.save();
            if (flip) {
                gameCtx.translate(drawX + drawW, drawY);
                gameCtx.scale(-1, 1);
                gameCtx.drawImage(img, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
            } else {
                gameCtx.drawImage(img, 0, 0, srcW, srcH, drawX, drawY, drawW, drawH);
            }
            gameCtx.restore();
            gameCtx.restore();
        }
        gameCtx.restore();
    }
}

// ==========================================
// PLAYER OBJECT
// ==========================================

const player = {
    x: 0, 
    y: 0,
    knockbackX: 0,
    knockbackY: 0,
    width: CELL_W * PLAYER_SCALE, // 96
    height: CELL_H * PLAYER_SCALE, // 96
    facing: 'down',
    state: 'idle',
    
    currentFrame: 0,
    frameTimeAcc: 0,
    actionCooldown: false,
    fireballSpawned: false,
    ultimateChargeTime: 0,
    isChargingUltimate: false,
    
    // Frozen states for lastboss Pattern 4
    isFrozen: false,
    frozenTime: 0,
    isSlowed: false,
    slowedTime: 0,
    
    // Stats
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    isInvincible: false,
    invincibleTime: 0,
    isDebugMode: false,
    
    // Exact hitbox centered in the 96x96 sprite (40% width, 55% height)
    getHitbox() {
        const hw = this.width * 0.35;
        const hh = this.height * 0.5;
        return {
            x: this.x + (this.width - hw) / 2,
            y: this.y + (this.height - hh) / 2 + (8 * PLAYER_SCALE / 3.0), // offset down slightly to align feet
            w: hw,
            h: hh
        };
    },
    
    update(dt) {
        if (this.mp < this.maxMp) {
            const regenRate = 18 * (typeof upgrades !== 'undefined' ? upgrades.mpRegenBonus : 1.0);
            this.mp = Math.min(this.maxMp, this.mp + (regenRate * dt / 1000));
        }

        
        if (this.isInvincible) {
            this.invincibleTime -= dt;
            if (this.invincibleTime <= 0) {
                this.isInvincible = false;
            }
        }
        
        // Apply decaying knockback velocity (decay is faster for snappier recovery)
        // [CRITICAL BUG FIX: Moved knockback processing to the top so that hits immediately interrupt skill states & prevent movement freezes]
        if (Math.abs(this.knockbackX) > 0.1 || Math.abs(this.knockbackY) > 0.1) {
            const kdx = this.knockbackX * dtScale;
            const kdy = this.knockbackY * dtScale;
            
            // Try X movement first
            const prevX = this.x;
            this.x += kdx;
            let pHbox = this.getHitbox();
            let collidesX = false;
            for (let effect of gameEffects) {
                if (effect instanceof LastBossIceSpike && effect.active && effect.state === 'holding') {
                    const spikeHbox = effect.getCollisionBox();
                    if (rectOverlap(pHbox, spikeHbox)) {
                        collidesX = true;
                        break;
                    }
                }
            }
            if (collidesX) {
                this.x = prevX;
                this.knockbackX = 0;
            }
            
            // Try Y movement next
            const prevY = this.y;
            this.y += kdy;
            pHbox = this.getHitbox();
            let collidesY = false;
            for (let effect of gameEffects) {
                if (effect instanceof LastBossIceSpike && effect.active && effect.state === 'holding') {
                    const spikeHbox = effect.getCollisionBox();
                    if (rectOverlap(pHbox, spikeHbox)) {
                        collidesY = true;
                        break;
                    }
                }
            }
            if (collidesY) {
                this.y = prevY;
                this.knockbackY = 0;
            }
            
            this.knockbackX *= Math.pow(0.75, dtScale);
            this.knockbackY *= Math.pow(0.75, dtScale);
            
            // Limit controls during heavy knockback (stunned) and clear active/charging states
            this.state = 'idle';
            this.actionCooldown = false;
            this.isChargingUltimate = false;
            this.ultimateChargeTime = 0;
            this.isChargingMagicUltimate = false;
            this.magicUltimateChargeTime = 0;
            keys.attack = false;
            keys.magic = false;
            keys.finish = false;
            keys.magicFinish = false;
            
            this.advanceAnimationFrame(dt);
            
            // Elliptical arena clamp
            const clamped = clampToArena(this.x, this.y, this.width, this.height);
            this.x = clamped.x;
            this.y = clamped.y;
            
            if (this.isFrozen) {
                this.frozenTime -= dt;
                if (this.frozenTime <= 0) {
                    this.isFrozen = false;
                }
            }
            if (this.isSlowed) {
                this.slowedTime -= dt;
                if (this.slowedTime <= 0) {
                    this.isSlowed = false;
                }
            }
            return;
        } else {
            this.knockbackX = 0;
            this.knockbackY = 0;
        }
        
        // Handle freeze status (blocks all actions & movement)
        if (this.isFrozen) {
            this.frozenTime -= dt;
            if (this.frozenTime <= 0) {
                this.isFrozen = false;
            }
            
            this.state = 'idle';
            this.actionCooldown = false;
            this.isChargingUltimate = false;
            this.ultimateChargeTime = 0;
            this.isChargingMagicUltimate = false;
            this.magicUltimateChargeTime = 0;
            keys.attack = false;
            keys.magic = false;
            keys.finish = false;
            keys.magicFinish = false;
            
            this.advanceAnimationFrame(dt);
            return;
        }
        
        // Handle slow status decay
        if (this.isSlowed) {
            this.slowedTime -= dt;
            if (this.slowedTime <= 0) {
                this.isSlowed = false;
            }
        }
        
        // Check ultimate charging (U key holding)
        if (keys.finish && this.state !== 'finish') {
            if (this.mp >= 100) {
                if (!this.isChargingUltimate) {
                    this.isChargingUltimate = true;
                    this.ultimateChargeTime = 0;
                    playSwordSkillGrunt1();
                }
                
                this.ultimateChargeTime += dt;
                
                // Spawn charging sparks!
                if (Math.random() < 0.35) {
                    const px = this.x + Math.random() * this.width;
                    const py = this.y + this.height - Math.random() * 10;
                    const lp = new LightningParticle(px, py);
                    lp.vx = (Math.random() - 0.5) * 4;
                    lp.vy = -3 - Math.random() * 4; // Rise up
                    gameEffects.push(lp);
                }
                
                if (this.ultimateChargeTime >= 300) {
                    // Start finisher!
                    this.isChargingUltimate = false;
                    this.ultimateChargeTime = 0;
                    this.mp = 0;
                    this.state = 'finish';
                    this.actionCooldown = true;
                    this.currentFrame = 0;
                    this.frameTimeAcc = 0;
                    this.ultimateTriggered = false;
                    // Tutorial tracking
                    if (typeof tutorialUltUsed !== 'undefined') tutorialUltUsed = true;
                }
                
                // Block normal movement and other inputs while charging
                return;
            } else {
                if (this.isChargingUltimate) {
                    this.isChargingUltimate = false;
                    this.ultimateChargeTime = 0;
                }
                playFailSound();
                keys.finish = false;
            }
        } else {
            if (this.isChargingUltimate) {
                this.isChargingUltimate = false;
                this.ultimateChargeTime = 0;
            }
        }
        
        // Check magic ultimate charging (I key holding)
        if (keys.magicFinish && this.state !== 'finish') {
            if (this.mp >= 100) {
                if (!this.isChargingMagicUltimate) {
                    this.isChargingMagicUltimate = true;
                    this.magicUltimateChargeTime = 0;
                }
                
                this.magicUltimateChargeTime += dt;
                
                // Spawn charging frost particles!
                if (Math.random() < 0.45) {
                    const px = this.x + Math.random() * this.width;
                    const py = this.y + this.height - Math.random() * 10;
                    gameEffects.push(new FrostParticle(px, py));
                }
                
                if (this.magicUltimateChargeTime >= 500) {
                    // Trigger Glacier Shatter!
                    this.isChargingMagicUltimate = false;
                    this.magicUltimateChargeTime = 0;
                    this.mp = 0;
                    
                    playFreezeMagicSound();
                    playFreezeGrunt();
                    
                    // Spawn IceSpikeSequencer to erupt ground ice spikes consecutively in front of player
                    gameEffects.push(new IceSpikeSequencer(this.x + this.width / 2, this.y + this.height / 2, this.facing));
                    
                    shakeIntensity = 20;
                    hitStopDuration = 100;
                    // Tutorial tracking
                    if (typeof tutorialIceUsed !== 'undefined') tutorialIceUsed = true;
                }
                
                // Block normal movement and other inputs while charging
                return;
            } else {
                if (this.isChargingMagicUltimate) {
                    this.isChargingMagicUltimate = false;
                    this.magicUltimateChargeTime = 0;
                }
                playFailSound();
                keys.magicFinish = false;
            }
        } else {
            if (this.isChargingMagicUltimate) {
                this.isChargingMagicUltimate = false;
                this.magicUltimateChargeTime = 0;
            }
        }
        
        if (this.actionCooldown) {
            this.advanceAnimationFrame(dt);
            return;
        }
        
        let vx = 0;
        let vy = 0;
        
        let effectiveSpeed = PLAYER_SPEED * (typeof upgrades !== 'undefined' ? upgrades.moveSpeed : 1.0);
        if (this.isSlowed) {
            effectiveSpeed *= 0.4; // Apply 60% slow reduction
        }
        if (keys.up) {
            vy = -effectiveSpeed;
            this.facing = 'up';
        } else if (keys.down) {
            vy = effectiveSpeed;
            this.facing = 'down';
        }
        
        if (keys.left) {
            vx = -effectiveSpeed;
            this.facing = 'left';
        } else if (keys.right) {
            vx = effectiveSpeed;
            this.facing = 'right';
        }
        
        if (vx !== 0 && vy !== 0) {
            vx *= 0.7071;
            vy *= 0.7071;
        }
        
        const dx = vx * dtScale;
        const dy = vy * dtScale;
        
        // Try X movement first
        const prevX = this.x;
        this.x += dx;
        let pHbox = this.getHitbox();
        let collidesX = false;
        for (let effect of gameEffects) {
            if (effect instanceof LastBossIceSpike && effect.active && effect.state === 'holding') {
                const spikeHbox = effect.getCollisionBox();
                if (rectOverlap(pHbox, spikeHbox)) {
                    collidesX = true;
                    break;
                }
            }
        }
        if (collidesX) {
            this.x = prevX;
        }
        
        // Try Y movement next
        const prevY = this.y;
        this.y += dy;
        pHbox = this.getHitbox();
        let collidesY = false;
        for (let effect of gameEffects) {
            if (effect instanceof LastBossIceSpike && effect.active && effect.state === 'holding') {
                const spikeHbox = effect.getCollisionBox();
                if (rectOverlap(pHbox, spikeHbox)) {
                    collidesY = true;
                    break;
                }
            }
        }
        if (collidesY) {
            this.y = prevY;
        }
        
        // Elliptical arena clamp
        const clamped = clampToArena(this.x, this.y, this.width, this.height);
        this.x = clamped.x;
        this.y = clamped.y;

        if (keys.attack) {
            this.state = 'attack';
            this.actionCooldown = true;
            this.currentFrame = 0;
            this.frameTimeAcc = 0;
            
            gameEffects.push(new SwordSlash(this));
            
            playSlashSound();
            playSwordGrunt();
            return;
        }
        
        if (keys.magic) {
            if (this.mp >= 25) {
                this.mp -= 25;
                this.state = 'magic';
                this.actionCooldown = true;
                this.currentFrame = 0;
                this.frameTimeAcc = 0;
                this.fireballSpawned = false;
            } else {
                playFailSound();
                keys.magic = false;
            }
            return;
        }
        
        if (vx !== 0 || vy !== 0) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }
        
        this.advanceAnimationFrame(dt);
    },
    
    advanceAnimationFrame(dt) {
        // Double the speed if state is 'magic' (16 FPS instead of 8 FPS), Finisher at 10 FPS
        const fps = (this.state === 'magic') ? 16 : ((this.state === 'finish') ? 10 : 8);
        const frameInterval = 1000 / fps;
        
        this.frameTimeAcc += dt;
        if (this.frameTimeAcc >= frameInterval) {
            this.frameTimeAcc -= frameInterval;
            this.currentFrame++;
            
            if (this.state === 'magic' && this.currentFrame === 2 && !this.fireballSpawned) {
                gameEffects.push(new Fireball(this));
                playMagicSound();
                playFireballGrunt();
                this.fireballSpawned = true;
            }

            // 벽력일섬 (Thunderclap and Flash) - Dash & Slice at frame 5
            if (this.state === 'finish' && this.currentFrame === 5 && !this.ultimateTriggered) {
                this.ultimateTriggered = true;
                
                const startX = this.x;
                const startY = this.y;
                let dx = 0;
                let dy = 0;
                const dashDist = 380; // Dash length
                
                if (this.facing === 'left') dx = -dashDist;
                else if (this.facing === 'right') dx = dashDist;
                else if (this.facing === 'up') dy = -dashDist;
                else if (this.facing === 'down') dy = dashDist;
                
                const kx = dx !== 0 ? Math.sign(dx) : 0;
                const ky = dy !== 0 ? Math.sign(dy) : 0;
                
                // Clamp target position inside world bounds
                const clamped = clampToArena(this.x + dx, this.y + dy, this.width, this.height);
                let targetX = clamped.x;
                let targetY = clamped.y;
                
                // 1. Spawn afterimages along the path BEFORE moving
                const steps = 7;
                const img = finishFrames[this.currentFrame];
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const px = startX + (targetX - startX) * t;
                    const py = startY + (targetY - startY) * t;
                    gameEffects.push(new PlayerAfterimage(img, 0, 0, CELL_W, CELL_H, px, py, this.width, this.height, this.facing, 0.08 - t * 0.03));
                }
                
                // 2. Move player instantly to target position
                this.x = targetX;
                this.y = targetY;
                
                // 3. Play thunderclap sounds
                playUltimateSound();
                playSwordSkillGrunt2();
                
                // 4. Trigger electric flash effects
                const sxCenter = startX + this.width / 2;
                const syCenter = startY + this.height / 2;
                const exCenter = targetX + this.width / 2;
                const eyCenter = targetY + this.height / 2;
                
                gameEffects.push(new ThunderclapFlashEffect(sxCenter, syCenter, exCenter, eyCenter));
                shakeIntensity = 32; // Massive camera shake
                hitStopDuration = 350; // Crunchy impact pause
                
                // 5. Slice all enemies along the dash line segment
                ghosts.forEach(ghost => {
                    if (ghost.active) {
                        const gHbox = ghost.getHitbox();
                        const gx = gHbox.x + gHbox.w / 2;
                        const gy = gHbox.y + gHbox.h / 2;
                        
                        const dist = distanceToSegment(gx, gy, sxCenter, syCenter, exCenter, eyCenter);
                        
                        // Wide hit width: 70px
                        if (dist < 70) {
                            const critChance = 0.10 + (typeof upgrades !== 'undefined' ? upgrades.critBonus : 0);
                            const isCrit = Math.random() < critChance;
                            const ultMult = typeof upgrades !== 'undefined' && upgrades.ultimateDamage !== undefined ? upgrades.ultimateDamage : 1.0;
                            const baseDmg = Math.round(300 * ultMult);
                            const finalDmg = isCrit ? Math.round(baseDmg * 1.6) : baseDmg;
                            ghost.takeDamage(finalDmg, kx * 4, ky * 4, true, false, isCrit);
                            
                            // Spawn lightning particles around sliced ghost
                            for (let j = 0; j < 12; j++) {
                                gameEffects.push(new LightningParticle(gx, gy));
                            }
                        }
                    }
                });
                
                // 6. Spawn spark explosions at start and end of dash
                for (let i = 0; i < 20; i++) {
                    gameEffects.push(new LightningParticle(sxCenter, syCenter));
                    gameEffects.push(new LightningParticle(exCenter, eyCenter));
                }
            }
            
            const maxFrames = (this.state === 'finish') ? 10 : COLS;
            if (this.currentFrame >= maxFrames) {
                if (this.state === 'attack' || this.state === 'magic' || this.state === 'finish') {
                    this.actionCooldown = false;
                    keys.attack = false;
                    keys.magic = false;
                    keys.finish = false;
                    this.state = 'idle';
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = 0;
                }
            }
        }
        
        if (this.state === 'idle') {
            this.currentFrame = 0;
        }
    },
    
    takeDamage(amount, kx = 0, ky = 0) {
        if (gameState === 'TUTORIAL') return;
        if (this.isDebugMode) return;
        if (this.isInvincible || isGameOver) return;
        
        this.hp = Math.max(0, this.hp - amount);
        this.isInvincible = true;
        this.invincibleTime = 500; // 0.5 seconds
        shakeIntensity = 12; 
        
        // Apply knockback velocities (snappy bounce)
        this.knockbackX = kx * 1.8;
        this.knockbackY = ky * 1.8;
        
        // Reset action states and input keys on damage to prevent movement freeze bugs
        this.actionCooldown = false;
        this.isChargingUltimate = false;
        this.ultimateChargeTime = 0;
        this.isChargingMagicUltimate = false;
        this.magicUltimateChargeTime = 0;
        keys.attack = false;
        keys.magic = false;
        keys.finish = false;
        keys.magicFinish = false;
        
        playHitSound();
        
        if (this.hp <= 0) {
            triggerGameOver();
        }
    },
    
    getRowIndex() {
        const name = `${this.state === 'idle' ? 'walk' : this.state}_${this.facing}`;
        const found = ROW_DEFINITIONS.find(def => def.name === name);
        return found ? found.row : 0;
    },
    
    draw() {
        // Blink invincibility rendering
        if (this.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) {
            return;
        }

        if (this.isFrozen) {
            const rowIdx = this.getRowIndex();
            drawTintedImage(
                spritesheet,
                this.currentFrame * CELL_W, rowIdx * CELL_H, CELL_W, CELL_H,
                this.x, this.y, this.width, this.height,
                'rgba(147, 197, 253, 0.75)'
            );
            return;
        }

        // Draw charging pose and gauge bar
        if (this.isChargingUltimate) {
            const frame = Math.floor((this.ultimateChargeTime / 300) * 5); // 0 to 4
            const img = finishFrames[Math.min(4, frame)];
            if (img && img.complete) {
                gameCtx.save();
                
                // Translate to center of player
                const cx = this.x + this.width / 2;
                const cy = this.y + this.height / 2;
                gameCtx.translate(cx, cy);
                
                // Face the direction the player is looking
                let angle = 0;
                let flip = false;
                if (this.facing === 'left') {
                    flip = true;
                } else if (this.facing === 'up') {
                    angle = -Math.PI / 2;
                } else if (this.facing === 'down') {
                    angle = Math.PI / 2;
                }
                gameCtx.rotate(angle);
                if (flip) {
                    gameCtx.scale(-1, 1);
                }
                
                const halfW = this.width / 2;
                const halfH = this.height / 2;
                
                gameCtx.drawImage(
                    img, 0, 0, CELL_W, CELL_H,
                    -halfW, -halfH, this.width, this.height
                );
                gameCtx.restore();
            }
            
            // Draw the yellow gauge bar above the player's head
            const progress = Math.min(1.0, this.ultimateChargeTime / 300);
            const barW = 60;
            const barH = 8;
            const bx = this.x + this.width / 2 - barW / 2;
            const by = this.y - 14;
            
            // Border background
            gameCtx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            gameCtx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
            
            // Empty fill background
            gameCtx.fillStyle = 'rgba(71, 85, 105, 0.5)';
            gameCtx.fillRect(bx, by, barW, barH);
            
            // Yellow progress fill
            gameCtx.fillStyle = '#facc15';
            gameCtx.fillRect(bx, by, barW * progress, barH);
            
            return;
        }

        // Draw magic charging pose and cyan gauge bar
        if (this.isChargingMagicUltimate) {
            const oldState = this.state;
            this.state = 'magic';
            const rowIdx = this.getRowIndex();
            this.state = oldState;
            
            gameCtx.drawImage(
                spritesheet,
                2 * CELL_W, rowIdx * CELL_H, CELL_W, CELL_H,
                this.x, this.y, this.width, this.height
            );
            
            // Draw the cyan gauge bar above the player's head
            const progress = Math.min(1.0, this.magicUltimateChargeTime / 500);
            const barW = 60;
            const barH = 8;
            const bx = this.x + this.width / 2 - barW / 2;
            const by = this.y - 14;
            
            // Border background
            gameCtx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            gameCtx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
            
            // Empty fill background
            gameCtx.fillStyle = 'rgba(71, 85, 105, 0.5)';
            gameCtx.fillRect(bx, by, barW, barH);
            
            // Cyan progress fill
            gameCtx.fillStyle = '#38bdf8';
            gameCtx.fillRect(bx, by, barW * progress, barH);
            
            return;
        }

        // Draw Finisher Frame (Rotated & flipped based on facing)
        if (this.state === 'finish') {
            const img = finishFrames[this.currentFrame];
            if (img && img.complete) {
                gameCtx.save();
                
                // Translate to center of player
                const cx = this.x + this.width / 2;
                const cy = this.y + this.height / 2;
                gameCtx.translate(cx, cy);
                
                // Rotate based on facing direction
                let angle = 0;
                let flip = false;
                if (this.facing === 'left') {
                    flip = true;
                } else if (this.facing === 'up') {
                    angle = -Math.PI / 2;
                } else if (this.facing === 'down') {
                    angle = Math.PI / 2;
                }
                gameCtx.rotate(angle);
                
                // Flip horizontally if facing left
                if (flip) {
                    gameCtx.scale(-1, 1);
                }
                
                const halfW = this.width / 2;
                const halfH = this.height / 2;
                
                if (this.isInvincible && this.invincibleTime > 800) {
                    drawTintedImage(
                        img, 0, 0, CELL_W, CELL_H,
                        -halfW, -halfH, this.width, this.height,
                        'rgba(239, 68, 68, 0.85)'
                    );
                } else if (this.isSlowed) {
                    drawTintedImage(
                        img, 0, 0, CELL_W, CELL_H,
                        -halfW, -halfH, this.width, this.height,
                        'rgba(14, 165, 233, 0.45)'
                    );
                } else {
                    gameCtx.drawImage(
                        img, 0, 0, CELL_W, CELL_H,
                        -halfW, -halfH, this.width, this.height
                    );
                }
                gameCtx.restore();
            }
            return;
        }
        
        const rowIdx = this.getRowIndex();
        
        if (this.isInvincible && this.invincibleTime > 800) {
            // Flash red on initial damage frame
            drawTintedImage(
                spritesheet,
                this.currentFrame * CELL_W, rowIdx * CELL_H, CELL_W, CELL_H,
                this.x, this.y, this.width, this.height,
                'rgba(239, 68, 68, 0.85)'
            );
        } else if (this.isSlowed) {
            // Draw slow tinted blue image
            drawTintedImage(
                spritesheet,
                this.currentFrame * CELL_W, rowIdx * CELL_H, CELL_W, CELL_H,
                this.x, this.y, this.width, this.height,
                'rgba(14, 165, 233, 0.45)'
            );
        } else {
            gameCtx.drawImage(
                spritesheet,
                this.currentFrame * CELL_W, rowIdx * CELL_H, CELL_W, CELL_H,
                this.x, this.y, this.width, this.height
            );
        }
    }
};


// ==========================================
// BACKGROUND & CONTROLS
// ==========================================

const bgImage = new Image();
bgImage.src = 'area.png';

const background = {
    draw() {
        if (bgImage.complete) {
            gameCtx.drawImage(bgImage, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        } else {
            gameCtx.fillStyle = '#0b0f19';
            gameCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        }
    }
};

function resizeGameCanvas() {
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
    // Map size is now fixed for the background arena image.
}

window.addEventListener('resize', resizeGameCanvas);

let keys = {
    up: false, down: false, left: false, right: false,
    attack: false, magic: false, finish: false, magicFinish: false
};

// ============================================================
// DOM ELEMENT REFERENCES
// ============================================================
const titleScreen    = document.getElementById('title-screen');
const ingameHud      = document.getElementById('ingame-hud');
const tutorialScreen = document.getElementById('tutorial-screen');
const upgradeScreen  = document.getElementById('upgrade-screen');
const bossWarningEl  = document.getElementById('boss-warning');
const waveClearBanner= document.getElementById('wave-clear-banner');
const waveAnnounce   = document.getElementById('wave-announcement');
const upgradeToast   = document.getElementById('upgrade-toast');
const tutRecommendModal = document.getElementById('tutorial-recommend-modal');

const xpFill   = document.getElementById('xp-fill');
const xpText   = document.getElementById('xp-text');
const hudWave  = document.getElementById('hud-wave');
const hudScore = document.getElementById('hud-score');
const hudEnemies = document.getElementById('hud-enemies');
const hudLevelBadge = document.getElementById('hud-level-badge');
const hudLevelInfo  = document.getElementById('hud-level-info');

const comboDisplay = document.getElementById('combo-display');
const comboTimerFill = document.getElementById('combo-timer-fill');

// Gameover elements
const goScore  = document.getElementById('go-score');
const goWave   = document.getElementById('go-wave');
const goKills  = document.getElementById('go-kills');
const goCombo  = document.getElementById('go-combo');
const goMaxDmg = document.getElementById('go-maxdmg');
const goLevel  = document.getElementById('go-level');
const goRank   = document.getElementById('gameover-rank');
const goHighscore = document.getElementById('gameover-highscore');

// ============================================================
// HIGHSCORE
// ============================================================
function getHighScore() {
    return parseInt(localStorage.getItem('pixelknight_highscore') || '0');
}
function setHighScore(s) {
    const prev = getHighScore();
    if (s > prev) { localStorage.setItem('pixelknight_highscore', s); return true; }
    return false;
}

// ============================================================
// GAME STATE TRANSITIONS
// ============================================================
function triggerGameClear() {
    gameState = 'GAMEOVER'; // stop update processing loop
    
    // Clear all lingering ice spikes
    gameEffects = gameEffects.filter(e => !(e instanceof LastBossIceSpike));
    
    // Play clear heal fanfare / sound
    playHealSound();
    score += 5000; // Large score bonus for clearing the last boss!
    
    // Calculate play time
    const duration = Date.now() - sessionStartTime;
    const min = Math.floor(duration / 60000);
    const sec = Math.floor((duration % 60000) / 1000);
    const playtimeStr = `${min}분 ${sec}초`;
    
    // Inject victory statistics
    document.getElementById('gc-score').textContent = score.toLocaleString();
    document.getElementById('gc-kills').textContent = totalKills + ' 마리';
    document.getElementById('gc-maxdmg').textContent = maxDamageDealt.toLocaleString() + ' 피해';
    document.getElementById('gc-playtime').textContent = playtimeStr;
    
    // Show game clear banner
    const clearBanner = document.getElementById('game-clear-banner');
    if (clearBanner) {
        clearBanner.style.display = 'flex';
    }
    
    // Spawn festive particle explosion
    for (let i = 0; i < 150; i++) {
        const p = new Particle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 100, Math.random() < 0.5 ? '#facc15' : '#38bdf8');
        p.vx *= 4.0;
        p.vy *= 4.0;
        p.radius *= 2.0;
        gameEffects.push(p);
    }
    
    // 6 Seconds Countdown Timer and Button handling
    const timerFill = document.getElementById('game-clear-timer-fill');
    const btn = document.getElementById('game-clear-btn');
    
    let startTime = Date.now();
    let durationMax = 6000; // 6 seconds
    
    let timerInterval = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let progress = Math.max(0, 1 - elapsed / durationMax);
        if (timerFill) {
            timerFill.style.transform = `scaleX(${progress})`;
        }
        if (elapsed >= durationMax) {
            clearInterval(timerInterval);
            finishGameClear();
        }
    }, 16);
    
    const finishGameClear = () => {
        clearInterval(timerInterval);
        if (clearBanner) {
            clearBanner.style.display = 'none';
        }
        showTitleScreen();
    };
    
    if (btn) {
        btn.onclick = finishGameClear;
    }
}

function showTitleScreen() {
    gameState = 'TITLE';
    titleScreen.style.display = 'flex';
    ingameHud.style.display = 'none';
    tutorialScreen.style.display = 'none';
    upgradeScreen.style.display = 'none';
    gameoverScreen.style.display = 'none';
    if (tutRecommendModal) tutRecommendModal.style.display = 'none';
    bossWarningEl.classList.remove('show');
    waveClearBanner.classList.remove('show');
    waveAnnounce.classList.remove('show');
    document.getElementById('title-highscore').textContent = `BEST: ${getHighScore()}`;
    
    // Play title screen BGM
    playBGM('sound/Movie Theater Intro.mp3');
}

function tryStartGame() {
    gameState = 'TUTORIAL_MODAL';
    if (tutRecommendModal) {
        tutRecommendModal.style.display = 'flex';
    } else {
        startPlayingGame();
    }
}

function showIngameHud() {
    titleScreen.style.display = 'none';
    tutorialScreen.style.display = 'none';
    upgradeScreen.style.display = 'none';
    gameoverScreen.style.display = 'none';
    ingameHud.style.display = 'block';
}

// ============================================================
// START WAVE
// ============================================================
function buildSpawnQueue(config) {
    const queue = [];
    for (let i = 0; i < config.ghosts; i++)  queue.push('ghost');
    for (let i = 0; i < config.eyes; i++)    queue.push('eye');
    for (let i = 0; i < config.elites; i++)  queue.push('elite');
    if (config.arrows) {
        for (let i = 0; i < config.arrows; i++) queue.push('arrow');
    }
    // Shuffle
    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    return queue;
}

function spawnEnemy(type, config) {
    let e;
    if (type === 'ghost') {
        e = new Ghost();
    } else if (type === 'eye') {
        e = new EyeMonster();
    } else if (type === 'elite') {
        // Elite: Eye monster that's bigger and tougher
        e = new EyeMonster();
        e.hp = Math.round(e.hp * 2.0);
        e.speed = e.speed * 1.4;
    } else if (type === 'arrow') {
        e = new ArrowMonster();
    }
    if (e) {
        e.hp    = Math.round(e.hp * config.hpMultiplier);
        e.speed = e.speed * config.speedMultiplier;
        ghosts.push(e);
    }
}

function startWave(wave) {
    currentWave = wave;
    const config = getWaveConfig(wave);
    waveBossWave = config.hasBoss;
    waveActive = true;
    waveEnemiesKilled = 0;
    waveSpawnQueue = buildSpawnQueue(config);
    waveSpawnTimer = 0;
    waveTotalEnemies = waveSpawnQueue.length + (config.hasBoss ? 1 : 0);
    waveEnemiesRemaining = waveTotalEnemies;
    bossesSpawnedThisWave = false;

    // Reset wave clear timer and banner
    waveClearTimer = 0;
    waveBreakTimer = 0;
    if (waveClearBanner) {
        waveClearBanner.classList.remove('show');
    }

    // Show wave announcement
    const announceNum = document.getElementById('wave-announce-num');
    if (announceNum) {
        announceNum.textContent = waveBossWave ? `☠️ BOSS WAVE ${wave} ☠️` : `WAVE ${wave}`;
        announceNum.style.color = waveBossWave ? '#ef4444' : '#00f5ff';
    }
    waveAnnounce.classList.add('show');
    waveStartTimer = 1800;

    // Boss wave: spawn boss (delayed by 1800ms to prevent overlapping with wave announcement)
    if (config.hasBoss) {
        bossSpawned = true;
        setTimeout(() => {
            if (gameState !== 'PLAYING') return; // safety check
            bossWarningTimer = 1500;
            bossWarningEl.classList.add('show');
            setTimeout(() => {
                if (gameState !== 'PLAYING') return;
                const cx = WORLD_WIDTH * 0.500;
                const cy = WORLD_HEIGHT * 0.541;
                const rx = WORLD_WIDTH * 0.403;
                const ry = WORLD_HEIGHT * 0.265;
                const w = 96;
                const h = 96;
                
                if (wave === 6) {
                    // Wave 6: Spawn 1 Sorcerer in the center
                    let boss = new Sorcerer(cx, cy);
                    boss.hp = Math.round(boss.hp * config.hpMultiplier);
                    boss.speed = boss.speed * config.speedMultiplier;
                    ghosts.push(boss);
                } else if (wave === 7) {
                    // Wave 7: 3 Boss1s (left, right, top)
                    const spawnPoints = [
                        { x: cx - rx - w / 2 + 20, y: cy - h / 2 },
                        { x: cx + rx - w / 2 - 20, y: cy - h / 2 },
                        { x: cx - w / 2, y: cy - ry - h + 20 }
                    ];
                    spawnPoints.forEach(pos => {
                        let boss = new Boss(pos.x, pos.y);
                        boss.hp = Math.round(boss.hp * config.hpMultiplier);
                        boss.speed = boss.speed * config.speedMultiplier;
                        ghosts.push(boss);
                    });
                    waveTotalEnemies += 2;
                    waveEnemiesRemaining += 2;
                } else if (wave === 8) {
                    // Wave 8: 1 Boss1 at bottom, 2 Sorcerers at far right and left
                    let boss = new Boss(cx - w / 2, cy + ry - h - 20);
                    boss.hp = Math.round(boss.hp * config.hpMultiplier);
                    boss.speed = boss.speed * config.speedMultiplier;
                    ghosts.push(boss);
                    
                    const sorcererPoints = [
                        { x: cx - rx - w / 2 + 20, y: cy - h / 2 },
                        { x: cx + rx - w / 2 - 20, y: cy - h / 2 }
                    ];
                    sorcererPoints.forEach(pos => {
                        let s = new Sorcerer(pos.x, pos.y);
                        s.hp = Math.round(s.hp * config.hpMultiplier);
                        s.speed = s.speed * config.speedMultiplier;
                        ghosts.push(s);
                    });
                    waveTotalEnemies += 2;
                    waveEnemiesRemaining += 2;
                } else if (wave === 9) {
                    // Wave 9: Spawn 3 Sorcerers in a triangle at the edges of the map
                    const sw = 180;
                    const sh = 180;
                    const spawnPoints = [
                        { x: cx - rx - sw / 2 + 20, y: cy - sh / 2 },
                        { x: cx + rx - sw / 2 - 20, y: cy - sh / 2 },
                        { x: cx - sw / 2, y: cy - ry - sh + 20 }
                    ];
                    spawnPoints.forEach(pos => {
                        let s = new Sorcerer(pos.x, pos.y);
                        s.hp = Math.round(s.hp * config.hpMultiplier);
                        s.speed = s.speed * config.speedMultiplier;
                        ghosts.push(s);
                    });
                    waveTotalEnemies += 2;
                    waveEnemiesRemaining += 2;
                } else if (wave === 10) {
                    // Wave 10: Spawn 1 LastBoss in the center (Clear Round)
                    let boss = new LastBoss(cx, cy);
                    ghosts.push(boss);
                } else {
                    // Default boss wave
                    let boss = new Boss(cx, cy);
                    boss.hp = Math.round(boss.hp * config.hpMultiplier);
                    boss.speed = boss.speed * config.speedMultiplier;
                    ghosts.push(boss);
                }
                
                // Spawn 8 regular mobs in an octagon around it (skip for waves 6, 7, 8, 9, 10)
                if (wave !== 6 && wave !== 7 && wave !== 8 && wave !== 9 && wave !== 10) {
                    const R = 150;
                    const enemyTypes = ['ghost', 'eye', 'arrow'];
                    for (let i = 0; i < 8; i++) {
                        const angle = i * (Math.PI / 4);
                        const mx = cx + R * Math.cos(angle);
                        const my = cy + R * Math.sin(angle);
                        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                        
                        let mob;
                        if (type === 'ghost') {
                            mob = new Ghost(mx, my);
                        } else if (type === 'eye') {
                            mob = new EyeMonster(mx, my);
                        } else if (type === 'arrow') {
                            mob = new ArrowMonster(mx, my);
                        }
                        
                        if (mob) {
                            mob.hp = Math.round(mob.hp * config.hpMultiplier);
                            mob.speed = mob.speed * config.speedMultiplier;
                            ghosts.push(mob);
                            
                            waveTotalEnemies++;
                            waveEnemiesRemaining++;
                        }
                    }
                }
                
                if (wave === 6 || wave === 8 || wave === 9) {
                    playSorcererIntroSound();
                } else {
                    playBossAppearSound();
                }
                bossesSpawnedThisWave = true;
                bossWarningEl.classList.remove('show');
            }, 1500);
        }, 1800);
    }

    if (wave > 1) playHealSound();
}

function endWave() {
    waveActive = false;
    waveClearTimer = 2500; // Show clear for 2.5s before upgrade

    // Show wave clear banner
    const clearText = document.getElementById('wave-clear-text');
    const clearSub = document.querySelector('.wave-clear-sub');
    if (clearText) clearText.textContent = waveBossWave ? `☠️ BOSS CLEAR!` : `WAVE ${currentWave} CLEAR!`;
    if (clearSub) clearSub.textContent = "다음 웨이브 준비중...";
    waveClearBanner.classList.add('show');

    // Award bonus score
    const bonus = currentWave * 50 * getScoreMultiplier();
    score += bonus;
    gameEffects.push(new DamageNumber(
        player.x + player.width / 2,
        player.y - 20,
        bonus, false
    ));

    // Play level-up-style sound
    playClearSound();
}

function playClearSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const freqs = [523, 659, 784, 1047];
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
    } catch(e){}
}

function playLevelUpSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const freqs = [400, 600, 800, 1200, 1600];
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.06);
            osc.stop(ctx.currentTime + i * 0.06 + 0.12);
        });
    } catch(e){}
}

// ============================================================
// XP / LEVEL UP
// ============================================================
function gainXP(amount) {
    playerXP += amount;
    while (playerXP >= playerXPToNext) {
        playerXP -= playerXPToNext;
        playerLevel++;
        playerXPToNext = xpForLevel(playerLevel);
        triggerLevelUp();
    }
}

function triggerLevelUp() {
    playLevelUpSound();
    shakeIntensity = 8;

    // Spawn level-up sparkle explosion
    for (let i = 0; i < 20; i++) {
        const sp = new SparkleParticle(
            player.x + player.width / 2,
            player.y + player.height / 2,
            ['#a855f7', '#d8b4fe', '#ffffff', '#fbbf24'][Math.floor(Math.random()*4)]
        );
        sp.vx = (Math.random() - 0.5) * 10;
        sp.vy = (Math.random() - 0.5) * 10 - 3;
        gameEffects.push(sp);
    }

    // Show upgrade selection
    currentUpgradeChoices = getRandomUpgrades(3);
    showUpgradeScreen();
}

function showUpgradeScreen() {
    gameState = 'UPGRADE';
    upgradeScreen.style.display = 'flex';

    const title = document.getElementById('upgrade-wave-title');
    if (title) title.textContent = `LV.${playerLevel} UPGRADE!`;

    const container = document.getElementById('upgrade-cards-container');
    container.innerHTML = '';
    currentUpgradeChoices.forEach((upg, idx) => {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.style.setProperty('--card-color', upg.color);
        card.style.setProperty('--card-rgb', upg.rgb);
        card.innerHTML = `
            <span class="upgrade-card-key">[${idx+1}]</span>
            <span class="upgrade-card-icon">${upg.icon}</span>
            <div class="upgrade-card-name">${upg.name}</div>
            <div class="upgrade-card-desc">${upg.desc.replace(/\n/g,'<br>')}</div>
            <div class="upgrade-card-value">${upg.value}</div>
        `;
        card.addEventListener('click', () => selectUpgrade(idx));
        container.appendChild(card);
    });
}

function selectUpgrade(idx) {
    const upg = currentUpgradeChoices[idx];
    if (!upg) return;
    const result = upg.apply();

    // Show toast
    const toastIcon = document.getElementById('toast-icon');
    const toastName = document.getElementById('toast-name');
    const toastText = document.getElementById('toast-text');
    if (toastIcon) toastIcon.textContent = upg.icon;
    if (toastName) toastName.textContent = upg.name;
    
    if (upg.id === 'chaos' && Array.isArray(result) && result.length === 2) {
        if (toastText) {
            toastText.innerHTML = `${result[0].icon} ${result[0].name} (${result[0].value})<br>${result[1].icon} ${result[1].name} (${result[1].value})`;
        }
    } else {
        if (toastText) toastText.textContent = upg.value;
    }
    
    upgradeToast.classList.add('show');
    setTimeout(() => upgradeToast.classList.remove('show'), 2200);

    // Resume game
    upgradeScreen.style.display = 'none';

    if (tutorialActive) {
        gameState = 'TUTORIAL';
    } else {
        gameState = 'PLAYING';
        // Start next wave if we cleared the previous one
        if (!waveActive) {
            startWave(currentWave + 1);
        }
    }

    // Heal a bit on level up
    player.hp = Math.min(player.maxHp, player.hp + 15);
}

// ============================================================
// COMBO SYSTEM UI
// ============================================================
function registerKill(xpAmount, scoreAmount) {
    totalKills++;
    comboCount++;
    comboTimer = COMBO_WINDOW;
    if (comboCount > maxCombo) maxCombo = comboCount;

    const multiplier = getScoreMultiplier();
    const finalScore = scoreAmount * multiplier;
    score += finalScore;

    gainXP(xpAmount);

    // Update combo UI
    if (comboDisplay) {
        comboDisplay.textContent = `x${comboCount}`;
        comboDisplay.classList.add('show');
    }

    // Tutorial tracking
    if (tutorialActive && tutorialStep === 1) {
        // kill with sword ??tracked by totalKills check
    }
}

function updateComboUI(dt) {
    if (comboCount <= 0) {
        if (comboDisplay) comboDisplay.classList.remove('show');
        return;
    }
    comboTimer -= dt;
    if (comboTimer <= 0) {
        comboCount = 0;
        comboTimer = 0;
        if (comboDisplay) comboDisplay.classList.remove('show');
        return;
    }
    const pct = (comboTimer / COMBO_WINDOW) * 100;
    if (comboTimerFill) comboTimerFill.style.width = `${pct}%`;
    if (comboDisplay) comboDisplay.textContent = `x${comboCount}`;
}

// ============================================================
// TUTORIAL FLOW & INSTRUCTOR NPC
// ============================================================
class Instructor {
    constructor() {
        this.width = CELL_W * PLAYER_SCALE;
        this.height = CELL_H * PLAYER_SCALE;
        this.x = WORLD_WIDTH / 2 + 160; // Spawn 160px to the right of the center
        this.y = WORLD_HEIGHT / 2 - this.height / 2;
        this.facing = 'left';
        this.state = 'idle';
        this.currentFrame = 0;
        this.frameCount = 4;
        this.animTimer = 0;
    }
    
    update(dt) {
        // Simple idle walk loop
        this.animTimer += dt;
        if (this.animTimer > 150) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.animTimer = 0;
        }
    }
    
    getRowIndex() {
        const name = `walk_${this.facing}`;
        const found = ROW_DEFINITIONS.find(def => def.name === name);
        return found ? found.row : 0;
    }
    
    draw() {
        const rowIdx = this.getRowIndex();
        if (spritesheet.complete) {
            gameCtx.drawImage(
                spritesheet,
                this.currentFrame * CELL_W, rowIdx * CELL_H, CELL_W, CELL_H,
                this.x, this.y, this.width, this.height
            );
        }
        
        // Draw "훈련교관" name tag above its head
        gameCtx.save();
        gameCtx.font = "bold 14px 'Orbitron', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
        gameCtx.fillStyle = "#00f5ff";
        gameCtx.textAlign = "center";
        gameCtx.shadowColor = "rgba(0, 245, 255, 0.6)";
        gameCtx.shadowBlur = 8;
        
        const textX = this.x + this.width / 2;
        const textY = this.y - 12;
        
        // Background badge for the name tag
        const tagText = "훈련교관";
        const textWidth = gameCtx.measureText(tagText).width;
        gameCtx.fillStyle = "rgba(8, 12, 20, 0.85)";
        gameCtx.strokeStyle = "#00f5ff";
        gameCtx.lineWidth = 1.5;
        const padX = 10;
        const padY = 5;
        const rx = textX - textWidth / 2 - padX;
        const ry = textY - 14 - padY;
        const rw = textWidth + padX * 2;
        const rh = 18 + padY * 2;
        
        if (gameCtx.roundRect) {
            gameCtx.beginPath();
            gameCtx.roundRect(rx, ry, rw, rh, 6);
            gameCtx.fill();
            gameCtx.stroke();
        } else {
            gameCtx.fillRect(rx, ry, rw, rh);
            gameCtx.strokeRect(rx, ry, rw, rh);
        }
        
        gameCtx.fillStyle = "#00f5ff";
        gameCtx.fillText(tagText, textX, textY);
        gameCtx.restore();
    }
}

function startTutorial() {
    if (isTransitioning) return;
    isTransitioning = true;

    triggerScreenTransition(() => {
        gameState = 'TUTORIAL';
        tutorialActive = true;
        tutorialStep = 0;
        tutorialMoved = false;
        tutorialFireballKill = false;
        tutorialUltUsed = false;
        tutorialIceUsed = false;
        totalKills = 0;

        // Reset player position to map center and refill stats
        player.x = WORLD_WIDTH / 2 - player.width / 2;
        player.y = WORLD_HEIGHT / 2 - player.height / 2;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        player.state = 'idle';
        player.facing = 'down';
        player.knockbackX = 0;
        player.knockbackY = 0;
        player.actionCooldown = false;
        player.isChargingUltimate = false;
        player.ultimateChargeTime = 0;
        player.isChargingMagicUltimate = false;
        player.magicUltimateChargeTime = 0;
        playerLevel = 1;
        playerXP = 0;
        playerXPToNext = xpForLevel(1);
        
        // Clear old keys and ghosts
        keys = { up: false, down: false, left: false, right: false, attack: false, magic: false, finish: false, magicFinish: false };
        ghosts = [];

        // Create instructor NPC
        instructor = new Instructor();

        titleScreen.style.display = 'none';
        tutorialScreen.style.display = 'block';
        ingameHud.style.display = 'block';
        showTutorialStep(0);
        
        // Play game BGM
        playBGM('sound/game.mp3');
        
        isTransitioning = false;
    });
}

function showTutorialStep(step) {
    const s = TUTORIAL_STEPS[step];
    if (!s) {
        // Tutorial complete!
        finishTutorial();
        return;
    }
    tutorialStep = step;
    tutorialTaskDone = false;
    
    // Prevent early completion if player accidentally used a skill in previous steps
    if (step === 0) tutorialMoved = false;
    if (step === 1) totalKills = 0;
    if (step === 2) tutorialFireballKill = false;
    if (step === 3) tutorialUltUsed = false;
    if (step === 4) tutorialIceUsed = false;

    document.getElementById('tut-step-num').textContent = step + 1;
    document.getElementById('tut-title').textContent = s.title;
    document.getElementById('tut-desc').innerHTML = s.desc;

    const taskEl = document.getElementById('tut-task');
    taskEl.textContent = s.task;
    taskEl.className = 'tutorial-task';

    // Refill MP for skill steps
    if (step >= 3) player.mp = player.maxMp;
}

function updateTutorial(dt) {
    if (!tutorialActive) return;
    const s = TUTORIAL_STEPS[tutorialStep];
    if (!s) return;

    const taskEl = document.getElementById('tut-task');
    if (s.check()) {
        if (!tutorialTaskDone) {
            tutorialTaskDone = true;
            if (taskEl) {
                taskEl.className = 'tutorial-task done';
                taskEl.textContent = '🎯 완료! 2초 후 다음 단계로 진행합니다...';
            }
            // Refill MP for skill steps
            if (tutorialStep >= 2) player.mp = player.maxMp;
            
            // Auto advance after 2 seconds
            const currentStep = tutorialStep;
            setTimeout(() => {
                if (tutorialActive && tutorialStep === currentStep) {
                    showTutorialStep(tutorialStep + 1);
                }
            }, 2000);
        }
    }

    // Position speech bubble above instructor's head dynamically
    if (tutorialScreen && instructor) {
        const screenX = instructor.x + instructor.width / 2 - camera.x;
        const screenY = instructor.y - camera.y;
        tutorialScreen.style.left = `${screenX}px`;
        tutorialScreen.style.top = `${screenY - 35}px`; // Anchor above instructor name tag
    }

    // Keep spawning tutorial enemies only starting from Step 1 (기본 검격)
    if (tutorialStep >= 1) {
        if (ghosts.filter(g => g.active).length < 2) {
            ghosts.push(new Ghost());
        }
    }
}

function finishTutorial() {
    tutorialActive = false;
    tutorialScreen.style.display = 'none';
    ingameHud.style.display = 'none';
    
    playClearSound();
    
    // Show clear banner
    const clearText = document.getElementById('wave-clear-text');
    const clearSub = document.querySelector('.wave-clear-sub');
    if (clearText) clearText.textContent = "TUTORIAL CLEAR!";
    if (clearSub) clearSub.textContent = "타이틀 화면으로 돌아갑니다...";
    
    waveClearBanner.classList.add('show');
    
    ghosts = [];
    gameEffects = [];
    instructor = null;
    
    setTimeout(() => {
        waveClearBanner.classList.remove('show');
        showTitleScreen();
    }, 2500);
}

// ============================================================
// PLAYING STATE
// ============================================================
function startPlayingGame() {
    if (isTransitioning) return;
    isTransitioning = true;

    triggerScreenTransition(() => {
        gameState = 'PLAYING';
        currentWave = 1;
        score = 0;
        totalKills = 0;
        maxDamageDealt = 0;
        comboCount = 0;
        comboTimer = 0;
        maxCombo = 0;
        sessionStartTime = Date.now();
        bossSpawned = false;
        lastUpgradesUIString = "";

        // Reset upgrades
        upgrades.swordDamage    = 1.0;
        upgrades.fireballDamage = 1.0;
        upgrades.iceDamage      = 1.0;
        upgrades.moveSpeed      = 1.0;
        upgrades.lifeSteal      = 0.0;
        upgrades.maxHpBonus     = 0;
        upgrades.mpCostReduce   = 1.0;
        upgrades.mpRegenBonus   = 1.0;
        upgrades.critBonus      = 0.0;
        upgrades.ultimateDamage = 1.0;

        // Reset player
        player.maxHp = 100;
        player.hp = 100;
        player.mp = 100;
        player.isInvincible = false;
        player.actionCooldown = false;
        player.ultimateTriggered = false;
        player.isChargingUltimate = false;
        player.ultimateChargeTime = 0;
        player.isChargingMagicUltimate = false;
        player.magicUltimateChargeTime = 0;
        player.state = 'idle';
        player.x = WORLD_WIDTH / 2 - player.width / 2;
        player.y = WORLD_HEIGHT / 2 - player.height / 2;

        // Reset XP
        playerLevel = 1;
        playerXP = 0;
        playerXPToNext = xpForLevel(1);

        // Reset keys
        keys = { up:false,down:false,left:false,right:false,attack:false,magic:false,finish:false,magicFinish:false };

        ghosts = [];
        gameEffects = [];

        showIngameHud();
        startWave(1);
        
        // Play game BGM
        playBGM('sound/game.mp3');
        
        isTransitioning = false;
    });
}

// ============================================================
// GAME OVER
// ============================================================
function triggerGameOver() {
    gameState = 'GAMEOVER';
    isGameOver = true;

    // Calculate rank
    let rankClass = 'rank-D', rankText = 'RANK D';
    if (score >= 5000)       { rankClass = 'rank-S'; rankText = 'RANK SSS'; }
    else if (score >= 2500)  { rankClass = 'rank-S'; rankText = 'RANK SS'; }
    else if (score >= 1200)  { rankClass = 'rank-S'; rankText = 'RANK S'; }
    else if (score >= 600)   { rankClass = 'rank-A'; rankText = 'RANK A'; }
    else if (score >= 300)   { rankClass = 'rank-B'; rankText = 'RANK B'; }
    else if (score >= 100)   { rankClass = 'rank-C'; rankText = 'RANK C'; }

    if (goScore)  goScore.textContent  = score.toLocaleString();
    if (goWave)   goWave.textContent   = `${currentWave}`;
    if (goKills)  goKills.textContent  = `${totalKills}`;
    if (goCombo)  goCombo.textContent  = `x${maxCombo}`;
    if (goMaxDmg) goMaxDmg.textContent = `${maxDamageDealt}`;
    if (goLevel)  goLevel.textContent  = `${playerLevel}`;
    if (goRank)   { goRank.className = `gameover-rank ${rankClass}`; goRank.textContent = rankText; }

    const isNew = setHighScore(score);
    if (goHighscore) {
        goHighscore.textContent = `BEST: ${getHighScore().toLocaleString()}`;
        if (isNew) goHighscore.classList.add('new-record');
        else goHighscore.classList.remove('new-record');
    }

    gameoverScreen.style.display = 'flex';
    ingameHud.style.display = 'none';
}

let lastUpgradesUIString = "";
function updateUpgradesUI() {
    const container = document.getElementById('hud-upgrades');
    if (!container) return;
    
    let html = '';
    
    // 1. 검격
    if (upgrades.swordDamage > 1.0) {
        const val = Math.round((upgrades.swordDamage - 1) * 100);
        html += `<div class="upgrade-badge" style="border-color: #ef4444;"><span style="font-size:1.1em;">⚔️</span> <span>검격 강화 +${val}%</span></div>`;
    }
    // 2. 불길
    if (upgrades.fireballDamage > 1.0) {
        const val = Math.round((upgrades.fireballDamage - 1) * 100);
        html += `<div class="upgrade-badge" style="border-color: #f97316;"><span style="font-size:1.1em;">🔥</span> <span>파이어볼 +${val}%</span></div>`;
    }
    // 3. 빙결
    if (upgrades.iceDamage > 1.0) {
        const val = Math.round((upgrades.iceDamage - 1) * 100);
        html += `<div class="upgrade-badge" style="border-color: #00f5ff;"><span style="font-size:1.1em;">❄️</span> <span>빙결 강화 +${val}%</span></div>`;
    }
    // 4. 이동속도
    if (upgrades.moveSpeed > 1.0) {
        const val = Math.round((upgrades.moveSpeed - 1) * 100);
        html += `<div class="upgrade-badge" style="border-color: #4ade80;"><span style="font-size:1.1em;">💨</span> <span>이속 강화 +${val}%</span></div>`;
    }
    // 5. 흡혈
    if (upgrades.lifeSteal > 0.0) {
        const val = Math.round(upgrades.lifeSteal * 100);
        html += `<div class="upgrade-badge" style="border-color: #c026d3;"><span style="font-size:1.1em;">🩸</span> <span>흡혈 +${val}%</span></div>`;
    }
    // 6. 강인한 육체
    if (upgrades.maxHpBonus > 0) {
        html += `<div class="upgrade-badge" style="border-color: #fbbf24;"><span style="font-size:1.1em;">🛡️</span> <span>최대 HP +${upgrades.maxHpBonus}</span></div>`;
    }
    // 7. 마나 절약
    if (upgrades.mpCostReduce < 1.0) {
        const val = Math.round((1 - upgrades.mpCostReduce) * 100);
        html += `<div class="upgrade-badge" style="border-color: #a855f7;"><span style="font-size:1.1em;">⚡</span> <span>MP 소비 -${val}%</span></div>`;
    }
    // 8. 마나 시야
    if (upgrades.mpRegenBonus > 1.0) {
        const val = upgrades.mpRegenBonus.toFixed(1);
        html += `<div class="upgrade-badge" style="border-color: #3b82f6;"><span style="font-size:1.1em;">🔮</span> <span>MP 회복 x${val}</span></div>`;
    }
    // 9. 크리티컬
    if (upgrades.critBonus > 0.0) {
        const val = Math.round(upgrades.critBonus * 100);
        html += `<div class="upgrade-badge" style="border-color: #ff003c;"><span style="font-size:1.1em;">💥</span> <span>치명타 +${val}%</span></div>`;
    }
    // 10. 최후의 섬광
    if (upgrades.ultimateDamage > 1.0) {
        const val = Math.round((upgrades.ultimateDamage - 1) * 100);
        html += `<div class="upgrade-badge" style="border-color: #facc15;"><span style="font-size:1.1em;">⚡</span> <span>최후의섬광 +${val}%</span></div>`;
    }
    
    if (html !== lastUpgradesUIString) {
        lastUpgradesUIString = html;
        container.innerHTML = html;
    }
}

// ============================================================
// UPDATE HUD
// ============================================================
function updateHUD() {
    // HP Bar
    const hpFillEl  = document.getElementById('hp-fill');
    const hpTextEl  = document.getElementById('hp-text');
    const mpFillEl  = document.getElementById('mp-fill');
    const mpTextEl  = document.getElementById('mp-text');

    if (hpFillEl) {
        hpFillEl.style.width  = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
        if (player.isDebugMode) {
            hpFillEl.style.background = 'linear-gradient(90deg, #eab308, #fef08a)';
            hpFillEl.style.boxShadow = '0 0 6px #eab308';
        } else {
            hpFillEl.style.background = '';
            hpFillEl.style.boxShadow = '';
        }
    }
    if (hpTextEl)  hpTextEl.textContent  = `${Math.ceil(Math.max(0, player.hp))}/${player.maxHp}`;
    
    if (mpFillEl) {
        mpFillEl.style.width  = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
        if (player.isDebugMode) {
            mpFillEl.style.background = 'linear-gradient(90deg, #eab308, #fef08a)';
            mpFillEl.style.boxShadow = '0 0 6px #eab308';
        } else {
            mpFillEl.style.background = '';
            mpFillEl.style.boxShadow = '';
        }
    }
    if (mpTextEl)  mpTextEl.textContent  = `${Math.ceil(Math.max(0, player.mp))}/100`;

    // XP Bar
    if (xpFill)  xpFill.style.width  = `${(playerXP / playerXPToNext) * 100}%`;
    if (xpText)  xpText.textContent  = `${playerXP}/${playerXPToNext}`;

    // Level badge
    if (hudLevelBadge) hudLevelBadge.textContent = `LV.${playerLevel}`;
    if (hudLevelInfo)  hudLevelInfo.textContent  = `다음 레벨까지 ${playerXPToNext - playerXP}XP`;

    // Wave + score
    if (hudWave)  hudWave.textContent  = waveBossWave ? `☠️ BOSS WAVE ${currentWave}` : `WAVE ${currentWave}`;
    if (hudScore) hudScore.textContent = `SCORE: ${score.toLocaleString()}`;
    if (hudEnemies) {
        const activeEnemies = ghosts.filter(g => g.active).length;
        hudEnemies.textContent = `적: ${activeEnemies} | 남은 스폰: ${waveSpawnQueue.length}`;
    }
    
    // Update active upgrades list
    updateUpgradesUI();
}

// ============================================================
// INPUT HANDLERS
// ============================================================


window.addEventListener('keydown', (e) => {
    getAudioContext();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();

    const key = e.key.toLowerCase();

    // Cheat Keys detection
    const now = Date.now();
    if (key === 'n') {
        if (now - cheatKeys.n.lastTime > 1500) {
            cheatKeys.n.count = 0;
        }
        cheatKeys.n.count++;
        cheatKeys.n.lastTime = now;
        
        if (cheatKeys.n.count === 6) {
            player.isDebugMode = !player.isDebugMode;
            showNotification(`무적 모드: ${player.isDebugMode ? 'ON' : 'OFF'}`);
            cheatKeys.n.count = 0;
        }
    }
    
    if (key === 'm') {
        if (now - cheatKeys.m.lastTime > 1500) {
            cheatKeys.m.count = 0;
        }
        cheatKeys.m.count++;
        cheatKeys.m.lastTime = now;
        
        if (cheatKeys.m.count === 6) {
            if (gameState === 'PLAYING') {
                ghosts = [];
                gameEffects = [];
                bossSpawned = false;
                if (waveClearBanner) waveClearBanner.classList.remove('show');
                if (waveAnnounce) waveAnnounce.classList.remove('show');
                startWave(10);
                showNotification("스테이지 10 이동!");
            }
            cheatKeys.m.count = 0;
        }
    }

    // Tutorial Recommendation Modal shortcuts
    if (gameState === 'TUTORIAL_MODAL') {
        if (e.key === 'Enter' || e.key === ' ') {
            if (tutRecommendModal) tutRecommendModal.style.display = 'none';
            startTutorial();
            return;
        }
        if (e.key === 'Escape') {
            if (tutRecommendModal) tutRecommendModal.style.display = 'none';
            startPlayingGame();
            return;
        }
        return;
    }

    // Title screen shortcuts
    if (gameState === 'TITLE') {
        if (e.key === 'Enter' || e.key === ' ') { tryStartGame(); return; }
        if (key === 't') { startTutorial(); return; }
    }

    // Tutorial: Next step on Enter
    if (gameState === 'TUTORIAL' && (e.key === 'Enter' || e.key === ' ')) {
        const s = TUTORIAL_STEPS[tutorialStep];
        if (s && s.check()) {
            showTutorialStep(tutorialStep + 1);
        }
        return;
    }

    // Upgrade screen: select by 1/2/3
    if (gameState === 'UPGRADE') {
        if (key === '1') { selectUpgrade(0); return; }
        if (key === '2') { selectUpgrade(1); return; }
        if (key === '3') { selectUpgrade(2); return; }
        return;
    }



    handleKey(e, true);
});

window.addEventListener('keyup', (e) => {
    handleKey(e, false);
});

gameCanvas.addEventListener('mousedown', (e) => {
    getAudioContext();
    // Title screen click to start
    if (gameState === 'TITLE') { startPlayingGame(); return; }
    if (e.button === 0) keys.attack = true;
});

gameCanvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) keys.attack = false;
});

function handleKey(e, isDown) {
    const key = e.key.toLowerCase();
    if (key === 'w' || e.key === 'ArrowUp')    keys.up    = isDown;
    if (key === 's' || e.key === 'ArrowDown')  keys.down  = isDown;
    if (key === 'a' || e.key === 'ArrowLeft')  keys.left  = isDown;
    if (key === 'd' || e.key === 'ArrowRight') keys.right = isDown;
    if (key === 'j' || e.key === ' ')          keys.attack = isDown;
    if (key === 'k')                           keys.magic = isDown;
    if (key === 'u')                           keys.finish = isDown;
    if (key === 'i')                           keys.magicFinish = isDown;

    // Tutorial: track movement
    if (tutorialActive && isDown && (key === 'w'||key==='a'||key==='s'||key==='d'||
        e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight')) {
        tutorialMoved = true;
    }
}

// Button event listeners
document.getElementById('btn-start')?.addEventListener('click', () => {
    getAudioContext();
    tryStartGame();
});
document.getElementById('btn-tutorial')?.addEventListener('click', () => {
    getAudioContext();
    startTutorial();
});
document.getElementById('btn-modal-tutorial')?.addEventListener('click', () => {
    getAudioContext();
    if (tutRecommendModal) tutRecommendModal.style.display = 'none';
    startTutorial();
});
document.getElementById('btn-modal-skip')?.addEventListener('click', () => {
    getAudioContext();
    if (tutRecommendModal) tutRecommendModal.style.display = 'none';
    startPlayingGame();
});
document.getElementById('restart-btn')?.addEventListener('click', () => {
    gameoverScreen.style.display = 'none';
    isGameOver = false;
    startPlayingGame();
});
document.getElementById('title-btn')?.addEventListener('click', () => {
    gameoverScreen.style.display = 'none';
    isGameOver = false;
    showTitleScreen();
});
document.getElementById('tut-next-btn')?.addEventListener('click', () => {
    const s = TUTORIAL_STEPS[tutorialStep];
    if (s && s.check()) {
        showTutorialStep(tutorialStep + 1);
    }
});

// ============================================================
// BOSS SPAWN
// ============================================================
function triggerBossSpawn() {
    if (bossSpawned) return;
    bossSpawned = true;
    bossWarningTimer = 2000;
    bossWarningEl.classList.add('show');
    setTimeout(() => {
        ghosts.push(new Boss());
        playBossAppearSound();
        bossWarningEl.classList.remove('show');
    }, 2000);
}

function spawnSorcererDebug() {
    const pos = getRandomArenaSpawnPosition();
    ghosts.push(new Sorcerer(pos.x, pos.y));
    playSorcererIntroSound();
}

function spawnLastBossDebug() {
    const pos = getRandomArenaSpawnPosition();
    ghosts.push(new LastBoss(pos.x, pos.y));
    playSorcererIntroSound();
    bossSpawned = true;
}

// ============================================================
// WAVE UPDATE (called from game loop)
// ============================================================
function updateWave(dt) {
    if (gameState !== 'PLAYING') return;

    // Wave announcement timer
    if (waveStartTimer > 0) {
        waveStartTimer -= dt;
        if (waveStartTimer <= 0) {
            waveAnnounce.classList.remove('show');
        }
    }

    // Wave clear timer (transition to upgrade)
    if (waveClearTimer > 0) {
        waveClearTimer -= dt;
        if (waveClearTimer <= 0) {
            waveClearBanner.classList.remove('show');
            // Trigger level-up upgrade screen
            currentUpgradeChoices = getRandomUpgrades(3);
            showUpgradeScreen();
        }
        return;
    }

    if (!waveActive) return;

    // Spawn enemies from queue
    if (waveSpawnQueue.length > 0) {
        waveSpawnTimer -= dt;
        if (waveSpawnTimer <= 0) {
            const config = getWaveConfig(currentWave);
            waveSpawnTimer = config.spawnDelay;
            const type = waveSpawnQueue.shift();
            spawnEnemy(type, config);
        }
    }

    // Check wave clear: all spawned, all dead
    const activeCount = ghosts.filter(g => g.active).length;
    const config = getWaveConfig(currentWave);
    const bossPending = config.hasBoss && !bossesSpawnedThisWave;
    if (waveSpawnQueue.length === 0 && activeCount === 0 && waveActive && waveClearTimer <= 0 && !bossPending) {
        waveActive = false;
        endWave();
    }
}

// Called when a monster dies (from takeDamage logic)
function onMonsterKilled(monster) {
    waveEnemiesKilled++;
    waveEnemiesRemaining = Math.max(0, waveEnemiesRemaining - 1);

    // XP and score based on monster type
    let xp = 15, baseScore = 10;
    if (monster.isSummoned) {
        xp = 0;
        baseScore = 0;
    }
    else if (monster instanceof LastBoss) { xp = 300; baseScore = 1000; }
    else if (monster instanceof Boss || (monster instanceof Sorcerer && (currentWave === 6 || currentWave === 8 || currentWave === 9))) { xp = 200; baseScore = 500; }
    else if (monster instanceof EyeMonster) { xp = 25;  baseScore = 20; }
    else if (monster instanceof Sorcerer)   { xp = 60;  baseScore = 150; }

    registerKill(xp, baseScore);

    // Tutorial kill tracking
    if (tutorialActive && tutorialStep === 2 && tutorialLastAttackWasFireball) {
        tutorialFireballKill = true;
    }

    // NOTE: lifeSteal is now handled per-hit in takeDamage() for accuracy.
    // The old per-kill bonus here was removed to avoid double-counting.

    // Boss killed: next wave starts after a delay
    const isWave6Boss = (monster instanceof Sorcerer && currentWave === 6);
    const isWave7Boss = (monster instanceof Boss && currentWave === 7);
    const isWave8Boss = ((monster instanceof Boss || monster instanceof Sorcerer) && currentWave === 8);
    const isWave9Boss = ((monster instanceof Boss || monster instanceof Sorcerer) && currentWave === 9);
    
    if ((monster instanceof Boss || monster instanceof LastBoss || isWave6Boss || isWave7Boss || isWave8Boss || isWave9Boss) && gameState === 'PLAYING') {
        const otherBossesAlive = ghosts.some(g => g.active && (g instanceof Boss || g instanceof LastBoss || g instanceof Sorcerer));
        if (!otherBossesAlive) {
            bossSpawned = false;
        }
    }
}
let tutorialLastAttackWasFireball = false;

// ============================================================
// MAIN GAME LOOP
// ============================================================
function resetGame() {
    // Called for full restart - delegates to startPlayingGame
    startPlayingGame();
}

function startGame() {
    resizeGameCanvas();
    lastTime = performance.now();
    showTitleScreen();
    requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
    let dt = time - lastTime;
    if (dt > 100) dt = 16;
    lastTime = time;
    dtScale = dt / 16.666;

    const isPlaying = (gameState === 'PLAYING' || gameState === 'TUTORIAL');

    // HitStop frame freeze
    if (hitStopDuration > 0) {
        hitStopDuration -= dt;
        if (isPlaying && !isGameOver) player.update(dt);
    } else {
        if (isPlaying && !isGameOver) {
            // Update boss warning timer
            if (bossWarningTimer > 0) bossWarningTimer -= dt;

            // Wave system
            updateWave(dt);

            // Combo timer decay
            updateComboUI(dt);

            // Tutorial update
            if (tutorialActive) {
                updateTutorial(dt);
                if (instructor) instructor.update(dt);
            }

            // Update all entities
            player.update(dt);
            ghosts.forEach(g => g.update(dt));
            gameEffects.forEach(e => e.update(dt));
        }

        // Cleanup dead entities
        ghosts = ghosts.filter(g => {
            if (!g.active) { onMonsterKilled(g); return false; }
            return true;
        });
        gameEffects = gameEffects.filter(e => e.active);
    }

    // Update HUD (only while game is running)
    if (isPlaying && gameState !== 'UPGRADE') updateHUD();

    // Camera shake
    let sx = 0, sy = 0;
    if (shakeIntensity > 0) {
        sx = (Math.random() - 0.5) * shakeIntensity;
        sy = (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= Math.pow(0.88, dtScale);
        if (shakeIntensity < 0.1) shakeIntensity = 0;
    }

    camera.update();

    // ---- RENDER ----
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    if (gameState === 'TITLE') {
        // Title background particle effect on canvas
        drawTitleBackground();
    }

    if (isPlaying) {
        gameCtx.save();
        gameCtx.translate(sx - camera.x, sy - camera.y);
        background.draw();
        ghosts.forEach(g => g.draw());
        player.draw();
        if (gameState === 'TUTORIAL' && instructor) {
            instructor.draw();
        }
        gameEffects.forEach(e => e.draw());
        gameCtx.restore();
        
        // Full screen darkness effect for boss instant kill attack
        if (typeof screenDarkness !== 'undefined' && screenDarkness > 0) {
            gameCtx.fillStyle = `rgba(0, 0, 0, ${screenDarkness})`;
            gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        }
    }

    requestAnimationFrame(gameLoop);
}

// ============================================================
// TITLE SCREEN BACKGROUND PARTICLES
// ============================================================
const titleParticles = [];
for (let i = 0; i < 60; i++) {
    titleParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.5,
        size: 1 + Math.random() * 2.5,
        alpha: 0.1 + Math.random() * 0.5,
        color: ['#fbbf24','#a855f7','#3b82f6','#00f5ff'][Math.floor(Math.random()*4)],
    });
}

function drawTitleBackground() {
    titleParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = gameCanvas.height + 10; p.x = Math.random() * gameCanvas.width; }
        gameCtx.save();
        gameCtx.globalAlpha = p.alpha;
        gameCtx.fillStyle = p.color;
        gameCtx.shadowColor = p.color;
        gameCtx.shadowBlur = 6;
        gameCtx.fillRect(p.x, p.y, p.size, p.size);
        gameCtx.restore();
    });
}


