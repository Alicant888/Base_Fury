export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

// Non-atlas assets served from /public/assets/.
export const IMAGE_KEYS = {
  menuBackground: "start_bcg",
} as const;

export const AUDIO_KEYS = {
  startMenuMusic: "start_menu_music",
  gameMusic: "game_music",
  click: "sfx_click",
  energyShield: "sfx_energy_shield",
  explosionScout: "sfx_explosion_scout",
  impactSmall: "sfx_impact_small",
  laserShort: "sfx_laser_short",
  laserScout: "sfx_laser_scout",
} as const;

// Atlas keys (DO NOT CHANGE): required by project docs.
export const ATLAS_KEYS = {
  ship: "MainShip",
  enemy: "Enemy",
  fx: "FX",
  ui: "ui",
  bg: "backgrounds",
} as const;

// Background frames (from bg atlas).
export const BG_FRAMES = {
  starfield: "bg_starfield",
  nebula: "bg_nebula",
  dust: "bg_dust",
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

  // Player round shield overlay (atlas: MainShip)
  playerShieldPrefix: "Main Ship - Shields/Main Ship - Shields - Round Shield/Main Ship - Shields - Round Shield-",
  playerShieldSuffix: ".png",
  playerShieldStart: 0,
  playerShieldEnd: 9,
} as const;

