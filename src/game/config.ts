export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 800;
export const UI_SCALE = 0.5; // Global scale for UI buttons

// Non-atlas assets served from /public/assets/.
export const IMAGE_KEYS = {
  menuBackground: "start_bcg",
  pauseBackground: "pause_bcg",
  uiStart: "ui_start",
  uiHome: "ui_home",
  uiResume: "ui_resume",
  uiRestart: "ui_restart",
  uiPlay: "ui_play",
  uiPlayG: "ui_playg",
  uiPause: "ui_pause",
  uiPrev: "ui_prev",
  uiNext: "ui_next",
  uiExit: "ui_exit",
  uiMenu: "ui_menu",
  uiYes: "ui_yes",
  uiNo: "ui_no",
  ui1d: "ui_1d",
  ui2d: "ui_2d",
  uiXp: "ui_xp",
  // Shop pack buttons
  uiPackXp: "ui_pack_xp",
  uiPackBase: "ui_pack_base",
  uiPackMedium: "ui_pack_medium",
  uiPackBig: "ui_pack_big",
  uiPackMaxi: "ui_pack_maxi",
} as const;

export const AUDIO_KEYS = {
  startMenuMusic: "start_menu_music",
  gameMusic: "game_music",
  music1: "music_1",
  music2: "music_2",
  music3: "music_3",
  music4: "music_4",
  music5: "music_5",
  music6: "music_6",
  music7: "music_7",
  music8: "music_8",
  click: "sfx_click",
  energyShield: "sfx_energy_shield",
  explosionScout: "sfx_explosion_scout",
  impactSmall: "sfx_impact_small",
  laserShort: "sfx_laser_short",
  gShot: "sfx_g_shot",
  zpShot: "sfx_zp_shot",
  bigsShot: "sfx_bigs_shot",
  laserScout: "sfx_laser_scout",
  torpedoShot: "sfx_torpedo_shot",
  bcShot: "sfx_bc_shot",
  dnShot: "sfx_dn_shot",
} as const;

// Atlas keys (DO NOT CHANGE): required by project docs.
export const ATLAS_KEYS = {
  ship: "MainShip",
  enemy: "Enemy",
  fx: "FX",
  fx2: "FX2",
  ui: "ui",
  bg: "backgrounds",
} as const;

// Background frames (from bg atlas).
export const BG_FRAMES = {
  bcg: "BCG",
  l0: "L0",
  l1: "L1",
  l2: "L2",
  l3: "L3",
  l4: "L4",
  l5: "L5",
  l6: "L6",
} as const;

// UI frames (from ui atlas).
export const UI_FRAMES = {
  panelWindow: "ui_panel_window",
  panelHeader: "ui_panel_header",
  btnLargeNormal: "ui_btn_large_normal",
  btnLargeHover: "ui_btn_large_hover",
  btnLargePressed: "ui_btn_large_pressed",
  btnSmallNormal: "ui_btn_small_normal",
  btnSmallPressed: "ui_btn_small_pressed",
  iconPause: "ui_icon_pause",
  iconBack: "ui_icon_back",
  iconSoundOn: "ui_icon_sound_on",
  iconSoundOff: "ui_icon_sound_off",
  barHp: "ui_bar_hp",
  barShield: "ui_bar_shield",
  plateScore: "ui_plate_score",
  plateWeapon: "ui_plate_weapon",
} as const;

export const UI_COLORS = {
  mainBg: 0x0E1A22,
  mainOutline: 0x00E0FF,
  hoverOutline: 0x33F0FF,
  pressedOutline: 0x00B8D4,
  text: "#CFE9F2",
  accent: 0xFF2FD1,
  ok: 0x00FF9C,
  danger: 0xFF3B3B,
} as const;

// Gameplay sprite frames we use (must exist in the atlases).
export const SPRITE_FRAMES = {
  playerShip: "Main Ship - Bases/Main Ship - Base - Full health.png",
  playerShipSlightDamage: "Main Ship - Bases/Main Ship - Base - Slight damage.png",
  playerShipDamaged: "Main Ship - Bases/Main Ship - Base - Damaged.png",
  playerShipVeryDamaged: "Main Ship - Bases/Main Ship - Base - Very damaged.png",
  playerEnginePrefix:
    "Main Ship - Engine Effects/Main Ship - Engines - Base Engine - Idle/Main Ship - Engines - Base Engine - Idle-",
  playerEngineSuffix: ".png",
  playerEngineStart: 0,
  playerEngineEnd: 5,

  enemyBase: "Base/Kla'ed - Scout - Base.png",
  enemyEnginePrefix: "Engine/Kla'ed - Scout - Engine/Kla'ed - Scout - Engine-",
  enemyEngineSuffix: ".png",
  enemyEngineStart: 0,
  enemyEngineEnd: 9,

  enemyWeaponPrefix: "Weapons/Kla'ed - Scout - Weapons/Kla'ed - Scout - Weapons-",
  enemyWeaponSuffix: ".png",
  enemyWeaponStart: 0,
  enemyWeaponEnd: 5,

  enemyProjectilePrefix: "Projectiles/Kla'ed - Bullet/Kla'ed - Bullet-",
  enemyProjectileSuffix: ".png",
  enemyProjectileStart: 0,
  enemyProjectileEnd: 3,

  enemyShieldPrefix: "Shield/Kla'ed - Scout - Shield/Kla'ed - Scout - Shield-",
  enemyShieldSuffix: ".png",
  enemyShieldStart: 0,
  enemyShieldEnd: 9,

  enemyDestructionPrefix: "Destruction/Kla'ed - Scout - Destruction/Kla'ed - Scout - Destruction-",
  enemyDestructionSuffix: ".png",
  enemyDestructionStart: 0,
  enemyDestructionEnd: 8,

  fighterBase: "Base/Kla'ed - Fighter - Base.png",
  fighterEnginePrefix: "Engine/Kla'ed - Fighter - Engine/Kla'ed - Fighter - Engine-",
  fighterEngineSuffix: ".png",
  fighterEngineStart: 0,
  fighterEngineEnd: 9,

  fighterWeaponPrefix: "Weapons/Kla'ed - Fighter - Weapons/Kla'ed - Fighter - Weapons-",
  fighterWeaponSuffix: ".png",
  fighterWeaponStart: 0,
  fighterWeaponEnd: 5,

  // Fighter uses the same projectile frames as Scout (Kla'ed - Bullet).

  fighterShieldPrefix: "Shield/Kla'ed - Fighter - Shield/Kla'ed - Fighter - Shield-",
  fighterShieldSuffix: ".png",
  fighterShieldStart: 0,
  fighterShieldEnd: 9,

  fighterDestructionPrefix: "Destruction/Kla'ed - Fighter - Destruction/Kla'ed - Fighter - Destruction-",
  fighterDestructionSuffix: ".png",
  fighterDestructionStart: 0,
  fighterDestructionEnd: 7,

  torpedoShipBase: "Base/Kla'ed - Torpedo Ship - Base.png",
  torpedoShipEnginePrefix: "Engine/Kla'ed - Torpedo Ship - Engine/Kla'ed - Torpedo Ship - Engine-",
  torpedoShipEngineSuffix: ".png",
  torpedoShipEngineStart: 0,
  torpedoShipEngineEnd: 9,

  torpedoShipWeaponPrefix: "Weapons/Kla'ed - Torpedo Ship - Weapons/Kla'ed - Torpedo Ship - Weapons-",
  torpedoShipWeaponSuffix: ".png",
  torpedoShipWeaponStart: 0,
  torpedoShipWeaponEnd: 14,

  torpedoProjectilePrefix: "Projectiles/Kla'ed - Torpedo/Kla'ed - Torpedo-",
  torpedoProjectileSuffix: ".png",
  torpedoProjectileStart: 0,
  torpedoProjectileEnd: 14,

  torpedoShipShieldPrefix: "Shield/Kla'ed - Torpedo Ship - Shield/Kla'ed - Torpedo Ship - Shield-",
  torpedoShipShieldSuffix: ".png",
  torpedoShipShieldStart: 0,
  torpedoShipShieldEnd: 9,

  torpedoShipDestructionPrefix: "Destruction/Kla'ed - Torpedo Ship - Destruction/Kla'ed - Torpedo Ship - Destruction-",
  torpedoShipDestructionSuffix: ".png",
  torpedoShipDestructionStart: 0,
  torpedoShipDestructionEnd: 8,

  frigateBase: "Base/Kla'ed - Frigate - Base.png",
  frigateEnginePrefix: "Engine/Kla'ed - Frigate - Engine/Kla'ed - Frigate - Engine-",
  frigateEngineSuffix: ".png",
  frigateEngineStart: 0,
  frigateEngineEnd: 9,

  frigateWeaponPrefix: "Weapons/Kla'ed - Frigate - Weapons/Kla'ed - Frigate - Weapons-",
  frigateWeaponSuffix: ".png",
  frigateWeaponStart: 0,
  frigateWeaponEnd: 5,

  frigateShieldPrefix: "Shield/Kla'ed - Frigate - Shield/Kla'ed - Frigate - Shield-",
  frigateShieldSuffix: ".png",
  frigateShieldStart: 0,
  frigateShieldEnd: 9,

  frigateDestructionPrefix: "Destruction/Kla'ed - Frigate - Destruction/Kla'ed - Frigate - Destruction-",
  frigateDestructionSuffix: ".png",
  frigateDestructionStart: 0,
  frigateDestructionEnd: 8,

  bigBulletProjectilePrefix: "Projectiles/Kla'ed - Big Bullet/Kla'ed - Big Bullet-",
  bigBulletProjectileSuffix: ".png",
  bigBulletProjectileStart: 0,
  bigBulletProjectileEnd: 3,

  battlecruiserBase: "Base/Kla'ed - Battlecruiser - Base.png",
  battlecruiserEnginePrefix: "Engine/Kla'ed - Battlecruiser - Engine/Kla'ed - Battlecruiser - Engine-",
  battlecruiserEngineSuffix: ".png",
  battlecruiserEngineStart: 0,
  battlecruiserEngineEnd: 35,

  battlecruiserWeaponPrefix: "Weapons/Kla'ed - Battlecruiser - Weapons/Kla'ed - Battlecruiser - Weapons-",
  battlecruiserWeaponSuffix: ".png",
  battlecruiserWeaponStart: 0,
  battlecruiserWeaponEnd: 29,

  battlecruiserShieldPrefix: "Shield/Kla'ed - Battlecruiser - Shield/Kla'ed - Battlecruiser - Shield-",
  battlecruiserShieldSuffix: ".png",
  battlecruiserShieldStart: 0,
  battlecruiserShieldEnd: 9,

  battlecruiserDestructionPrefix: "Destruction/Kla'ed - Battlecruiser - Destruction/Kla'ed - Battlecruiser - Destruction-",
  battlecruiserDestructionSuffix: ".png",
  battlecruiserDestructionStart: 0,
  battlecruiserDestructionEnd: 9,

  waveProjectilePrefix: "Projectiles/Kla'ed - Wave/Kla'ed - Wave-",
  waveProjectileSuffix: ".png",
  waveProjectileStart: 0,
  waveProjectileEnd: 5,

  dreadnoughtBase: "Base/Kla'ed - Dreadnought - Base.png",
  dreadnoughtEnginePrefix: "Engine/Kla'ed - Dreadnought - Engine/Kla'ed - Dreadnought - Engine-",
  dreadnoughtEngineSuffix: ".png",
  dreadnoughtEngineStart: 0,
  dreadnoughtEngineEnd: 9,

  dreadnoughtWeaponPrefix: "Weapons/Kla'ed - Dreadnought - Weapons/Kla'ed - Dreadnought - Weapons-",
  dreadnoughtWeaponSuffix: ".png",
  dreadnoughtWeaponStart: 0,
  dreadnoughtWeaponEnd: 59,

  dreadnoughtShieldPrefix: "Shield/Kla'ed - Dreadnought - Shield/Kla'ed - Dreadnought - Shield-",
  dreadnoughtShieldSuffix: ".png",
  dreadnoughtShieldStart: 0,
  dreadnoughtShieldEnd: 9,

  dreadnoughtDestructionPrefix: "Destruction/Kla'ed - Dreadnought - Destruction/Kla'ed - Dreadnought - Destruction-",
  dreadnoughtDestructionSuffix: ".png",
  dreadnoughtDestructionStart: 0,
  dreadnoughtDestructionEnd: 9,

  rayProjectilePrefix: "Projectiles/Kla'ed - Ray/Kla'ed - Ray-",
  rayProjectileSuffix: ".png",
  rayProjectileStart: 0,
  rayProjectileEnd: 3,

  // Asteroid (atlas: FX)
  asteroid01Base: "Asteroid/Asteroid 01 Base.png",
  asteroid01ExplodePrefix: "Asteroid/Asteroid 01 - Explode-",
  asteroid01ExplodeSuffix: ".png",
  asteroid01ExplodeStart: 1,
  asteroid01ExplodeEnd: 6,

  // Shield pickup icon (atlas: FX)
  shieldPickupPrefix:
    "PickupsPack/Shield Generators/Pickup Icon - Shield Generator - All around shield/Pickup Icon - Shield Generator - All around shield-",
  shieldPickupSuffix: ".png",
  shieldPickupStart: 0,
  shieldPickupEnd: 9,

  // Health pickup icon (atlas: FX)
  healthPickupPrefix: "PickupsPack/Health/Pickup Icon - Health- ",
  healthPickupSuffix: ".png",
  healthPickupStart: 0,
  healthPickupEnd: 9,

  // Firing-rate pickup icon (atlas: FX)
  firingRatePickupPrefix: "PickupsPack/Firing rate/Pickup Icon - Firing Rate- ",
  firingRatePickupSuffix: ".png",
  firingRatePickupStart: 0,
  firingRatePickupEnd: 9,

  // Firing-rate 2 pickup icon (atlas: FX2) – secondary weapon speed
  firingRate2PickupPrefix: "Pickup Icon - Firing Rate2- ",
  firingRate2PickupSuffix: ".png",
  firingRate2PickupStart: 0,
  firingRate2PickupEnd: 9,

  // Base engine pickup icon (atlas: FX)
  baseEnginePickupPrefix: "PickupsPack/Engines/Pickup Icon - Engines - Base Engine/Pickup Icon - Engines - Base Engine-",
  baseEnginePickupSuffix: ".png",
  baseEnginePickupStart: 0,
  baseEnginePickupEnd: 9,

  // Base engine sprite (atlas: MainShip)
  baseEngineSprite: "Main Ship - Engines/Main Ship - Engines - Base Engine.png",

  // Base engine flame (atlas: MainShip)
  baseEngineFlamePrefix:
    "Main Ship - Engine Effects/Main Ship - Engines - Base Engine - Powering/Main Ship - Engines - Base Engine - Powering-",
  baseEngineFlameSuffix: ".png",
  baseEngineFlameStart: 0,
  baseEngineFlameEnd: 7,

  // Supercharged engine pickup icon (atlas: FX)
  superchargedEnginePickupPrefix:
    "PickupsPack/Engines/Pickup Icon - Engines - Supercharged Engine/Pickup Icon - Engines - Supercharged Engine-",
  superchargedEnginePickupSuffix: ".png",
  superchargedEnginePickupStart: 0,
  superchargedEnginePickupEnd: 9,

  // Supercharged engine sprite (atlas: MainShip)
  superchargedEngineSprite: "Main Ship - Engines/Main Ship - Engines - Supercharged Engine.png",

  // Supercharged engine flame (atlas: MainShip)
  superchargedEngineFlamePrefix:
    "Main Ship - Engine Effects/Main Ship - Engines - Supercharged Engine - Powering/Main Ship - Engines - Supercharged Engine - Powering-",
  superchargedEngineFlameSuffix: ".png",
  superchargedEngineFlameStart: 0,
  superchargedEngineFlameEnd: 7,

  // Burst engine pickup icon (atlas: FX)
  burstEnginePickupPrefix: "PickupsPack/Engines/Pickup Icon - Engines - Burst Engine/Pickup Icon - Engines - Burst Engine-",
  burstEnginePickupSuffix: ".png",
  burstEnginePickupStart: 0,
  burstEnginePickupEnd: 9,

  // Burst engine sprite (atlas: MainShip)
  burstEngineSprite: "Main Ship - Engines/Main Ship - Engines - Burst Engine.png",

  // Burst engine flame (atlas: MainShip)
  burstEngineFlamePrefix:
    "Main Ship - Engine Effects/Main Ship - Engines - Burst Engine - Powering/Main Ship - Engines - Burst Engine - Powering-",
  burstEngineFlameSuffix: ".png",
  burstEngineFlameStart: 0,
  burstEngineFlameEnd: 7,

  // Big Pulse engine pickup icon (atlas: FX)
  bigPulseEnginePickupPrefix:
    "PickupsPack/Engines/Pickup Icon - Engines - Big Pulse Engine/Pickup Icon - Engines - Big Pulse Engine-",
  bigPulseEnginePickupSuffix: ".png",
  bigPulseEnginePickupStart: 0,
  bigPulseEnginePickupEnd: 9,

  // Big Pulse engine sprite (atlas: MainShip)
  bigPulseEngineSprite: "Main Ship - Engines/Main Ship - Engines - Big Pulse Engine.png",

  // Big Pulse engine flame (atlas: MainShip) - atlas may have fewer than 0..7, animation creation is guarded.
  bigPulseEngineFlamePrefix:
    "Main Ship - Engine Effects/Main Ship - Engines - Big Pulse Engine - Powering/Main Ship - Engines - Big Pulse Engine - Powering-",
  bigPulseEngineFlameSuffix: ".png",
  bigPulseEngineFlameStart: 0,
  bigPulseEngineFlameEnd: 7,

  // Auto Cannons pickup icon (atlas: FX)
  autoCannonsPickupPrefix:
    "PickupsPack/Weapons/Pickup Icon - Weapons - Auto Cannons/Pickup Icon - Weapons - Auto Cannons-",
  autoCannonsPickupSuffix: ".png",
  autoCannonsPickupStart: 0,
  autoCannonsPickupEnd: 9,

  // Auto Cannon weapon (atlas: MainShip)
  autoCannonWeaponPrefix:
    "Main Ship - Weapons/Main Ship - Weapons - Auto Cannon/Main Ship - Weapons - Auto Cannon-",
  autoCannonWeaponSuffix: ".png",
  autoCannonWeaponStart: 0,
  autoCannonWeaponEnd: 6,

  // Auto Cannon bullet projectile (atlas: FX)
  autoCannonBulletPrefix:
    "Main ship weapons/Main ship weapon - Projectile - Auto cannon bullet/Main ship weapon - Projectile - Auto cannon bullet-",
  autoCannonBulletSuffix: ".png",
  autoCannonBulletStart: 0,
  autoCannonBulletEnd: 3,

  // Rocket pickup icon (atlas: FX)
  rocketPickupPrefix: "PickupsPack/Weapons/Pickup Icon - Weapons - Rocket/Pickup Icon - Weapons - Rocket-",
  rocketPickupSuffix: ".png",
  rocketPickupStart: 0,
  rocketPickupEnd: 9,

  // Rockets weapon (atlas: MainShip) - left uses even frames, right uses odd frames.
  rocketsWeaponPrefix: "Main Ship - Weapons/Main Ship - Weapons - Rockets/Main Ship - Weapons - Rockets-",
  rocketsWeaponSuffix: ".png",
  rocketsWeaponStart: 0,
  rocketsWeaponEnd: 9,

  // Rocket projectile (atlas: FX)
  rocketProjectilePrefix: "Main ship weapons/Main ship weapon - Projectile - Rocket/Main ship weapon - Projectile - Rocket-",
  rocketProjectileSuffix: ".png",
  rocketProjectileStart: 0,
  rocketProjectileEnd: 2,

  // Zapper pickup icon (atlas: FX)
  zapperPickupPrefix: "PickupsPack/Weapons/Pickup Icon - Weapons - Zapper/Pickup Icon - Weapons - Zapper-",
  zapperPickupSuffix: ".png",
  zapperPickupStart: 0,
  zapperPickupEnd: 9,

  // Zapper weapon (atlas: MainShip)
  zapperWeaponPrefix: "Main Ship - Weapons/Main Ship - Weapons - Zapper/Main Ship - Weapons - Zapper-",
  zapperWeaponSuffix: ".png",
  zapperWeaponStart: 0,
  zapperWeaponEnd: 9,

  // Zapper projectile (atlas: FX)
  zapperProjectilePrefix: "Main ship weapons/Main ship weapon - Projectile - Zapper/Main ship weapon - Projectile - Zapper-",
  zapperProjectileSuffix: ".png",
  zapperProjectileStart: 0,
  zapperProjectileEnd: 7,

  // Big Space Gun 2000 pickup icon (atlas: FX)
  bigSpaceGunPickupPrefix:
    "PickupsPack/Weapons/Pickup Icon - Weapons - Big Space Gun 2000/Pickup Icon - Weapons - Big Space Gun 2000-",
  bigSpaceGunPickupSuffix: ".png",
  bigSpaceGunPickupStart: 0,
  bigSpaceGunPickupEnd: 9,

  // Big Space Gun weapon (atlas: MainShip)
  bigSpaceGunWeaponPrefix: "Main Ship - Weapons/Main Ship - Weapons - Big Space Gun/Main Ship - Weapons - Big Space Gun-",
  bigSpaceGunWeaponSuffix: ".png",
  bigSpaceGunWeaponStart: 0,
  bigSpaceGunWeaponEnd: 9,

  // Big Space Gun projectile (atlas: FX)
  bigSpaceGunProjectilePrefix:
    "Main ship weapons/Main ship weapon - Projectile - Big Space Gun/Main ship weapon - Projectile - Big Space Gun-",
  bigSpaceGunProjectileSuffix: ".png",
  bigSpaceGunProjectileStart: 0,
  bigSpaceGunProjectileEnd: 9,

  // Player round shield overlay (atlas: MainShip)
  playerShieldPrefix: "Main Ship - Shields/Main Ship - Shields - Round Shield/Main Ship - Shields - Round Shield-",
  playerShieldSuffix: ".png",
  playerShieldStart: 0,
  playerShieldEnd: 9,
} as const;
