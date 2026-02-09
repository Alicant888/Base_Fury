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
    "Shield Generators/Pickup Icon - Shield Generator - All around shield/Pickup Icon - Shield Generator - All around shield-",
  shieldPickupSuffix: ".png",
  shieldPickupStart: 0,
  shieldPickupEnd: 9,

  // Player round shield overlay (atlas: MainShip)
  playerShieldPrefix: "Main Ship - Shields/Main Ship - Shields - Round Shield/Main Ship - Shields - Round Shield-",
  playerShieldSuffix: ".png",
  playerShieldStart: 0,
  playerShieldEnd: 9,
} as const;

