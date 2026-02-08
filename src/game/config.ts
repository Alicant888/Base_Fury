export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

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
  enemyBase: "Base/Kla'ed - Scout - Base.png",
  enemyDestructionPrefix: "Destruction/Kla'ed - Scout - Destruction/Kla'ed - Scout - Destruction-",
  enemyDestructionSuffix: ".png",
  enemyDestructionStart: 0,
  enemyDestructionEnd: 8,
} as const;

