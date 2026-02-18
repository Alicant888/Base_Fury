AUDIO_KEYS (точные ключи)
export const AUDIO_KEYS = {  startMenuMusic: "start_menu_music",  gameMusic: "game_music",  click: "sfx_click",  energyShield: "sfx_energy_shield",  explosionScout: "sfx_explosion_scout",  impactSmall: "sfx_impact_small",  laserShort: "sfx_laser_short",  gShot: "sfx_g_shot",  zpShot: "sfx_zp_shot",  bigsShot: "sfx_bigs_shot",  laserScout: "sfx_laser_scout",  torpedoShot: "sfx_torpedo_shot",  bcShot: "sfx_bc_shot",  dnShot: "sfx_dn_shot",} as const;
Загрузка аудио (какой файл к какому ключу)
this.load.audio(AUDIO_KEYS.startMenuMusic, "/assets/audio/music/start_menu.wav");this.load.audio(AUDIO_KEYS.gameMusic, "/assets/audio/music/2.wav");this.load.audio(AUDIO_KEYS.click, "/assets/audio/sfx/click.wav");this.load.audio(AUDIO_KEYS.energyShield, "/assets/audio/sfx/energy_shield.wav");this.load.audio(AUDIO_KEYS.explosionScout, "/assets/audio/sfx/explosion_scout.wav");this.load.audio(AUDIO_KEYS.impactSmall, "/assets/audio/sfx/impact_small.wav");this.load.audio(AUDIO_KEYS.laserShort, "/assets/audio/sfx/Mhot.wav");this.load.audio(AUDIO_KEYS.gShot, "/assets/audio/sfx/Gshot2.wav");this.load.audio(AUDIO_KEYS.zpShot, "/assets/audio/sfx/Zp.wav");this.load.audio(AUDIO_KEYS.bigsShot, "/assets/audio/sfx/Bigs.wav");this.load.audio(AUDIO_KEYS.laserScout, "/assets/audio/sfx/laser_scout.wav");this.load.audio(AUDIO_KEYS.torpedoShot, "/assets/audio/sfx/Torpedo.wav");this.load.audio(AUDIO_KEYS.bcShot, "/assets/audio/sfx/Bc.wav");this.load.audio(AUDIO_KEYS.dnShot, "/assets/audio/sfx/DnShot.wav");
Игрок: кадры выстрелов (weapon → projectile sync) + громкости SFX
Base shot (Main Ship)
SFX: AUDIO_KEYS.laserShort (это Mhot.wav)
Громкость: 0.35
private fireSingleShot() {  // ...  if (this.spawnBullet(x, y)) {    this.playSfx(AUDIO_KEYS.laserShort, 0.35);  }}
Auto Cannons
Кадр левой пули: ${SPRITE_FRAMES.autoCannonWeaponPrefix}1${...Suffix}
Кадр правой пули: ${SPRITE_FRAMES.autoCannonWeaponPrefix}2${...Suffix}
SFX: AUDIO_KEYS.gShot (это Gshot2.wav)
Громкость: 0.1
Важно: звук играет на каждый реальный выстрел (и левый, и правый).
Кадры:
Main Ship - Weapons - Auto Cannon-1 → левая
Main Ship - Weapons - Auto Cannon-2 → правая
(см. точные константы в GameScene.ts строки 107–108)
Zapper
Кадр выстрела (оба снаряда сразу): ...Zapper-7...
SFX: AUDIO_KEYS.zpShot (это Zp.wav)
Громкость: 0.3
Текущая реализация: звук проигрывается только при левом стволе (см. side === "left").
const fired = this.spawnZapperProjectile(x, y);if (fired && side === "left") {  this.playSfx(AUDIO_KEYS.zpShot, 0.3);}
Big Space Gun
Кадр выстрела: ...Big Space Gun-7...
SFX: AUDIO_KEYS.bigsShot (это Bigs.wav)
Громкость: 0.33
const fired = this.spawnBigSpaceGunProjectile(x, y);if (fired) this.playSfx(AUDIO_KEYS.bigsShot, 0.33);
Rockets (оружие игрока)
Кадр выстрела: ...Rockets-4... (пара ракет)
SFX: AUDIO_KEYS.torpedoShot (да, тот же что у Torpedo Ship)
Громкость: 0.18
if (firedL || firedR) {  this.playSfx(AUDIO_KEYS.torpedoShot, 0.18);}
Враги: кадры/громкости/хитбоксы
Hitbox multipliers (точные значения)
const TORPEDO_SHIP_HITBOX_W_MULT = 0.7;const TORPEDO_SHIP_HITBOX_H_MULT = 0.1;const FIGHTER_HITBOX_W_MULT = 0.7;const FIGHTER_HITBOX_H_MULT = 0.3;const SCOUT_HITBOX_W_MULT = 0.5;const SCOUT_HITBOX_H_MULT = 0.1;const FRIGATE_HITBOX_W_MULT = 0.7;const FRIGATE_HITBOX_H_MULT = 0.1;const BATTLECRUISER_HITBOX_W_MULT = 0.6;const BATTLECRUISER_HITBOX_H_MULT = 0.1;const DREADNOUGHT_HITBOX_W_MULT = 0.55;const DREADNOUGHT_HITBOX_H_MULT = 0.5;const DREADNOUGHT_SHIELD_BODY_RADIUS_MULT = 0.9;
Fighter
Кадры выстрелов:
правый: Weapons/...Fighter...-1.png
левый: Weapons/...Fighter...-3.png
SFX: AUDIO_KEYS.laserScout
Громкость: 0.35
Оффсет пули по X: FIGHTER_BULLET_OFFSET_X = 6
const playShotSfx = () => {  this.scene.sound.play(AUDIO_KEYS.laserScout, { volume: 0.35 });};if (frameKey === FIGHTER_WEAPON_FIRE_RIGHT_FRAME && !firedRight) {  const fired = this.spawnEnemyBulletAt(x + FIGHTER_BULLET_OFFSET_X, y);  if (fired) playShotSfx();}if (frameKey === FIGHTER_WEAPON_FIRE_LEFT_FRAME && !firedLeft) {  const fired = this.spawnEnemyBulletAt(x - FIGHTER_BULLET_OFFSET_X, y);  if (fired) playShotSfx();}
Torpedo Ship
SFX: AUDIO_KEYS.torpedoShot
Громкость: 0.15
Звук привязан к каждому реально заспавненному торпедо (на кадрах залпа).
const playShotSfx = () => {  this.scene.sound.play(AUDIO_KEYS.torpedoShot, { volume: 0.15 });};// ...const fired = this.spawnEnemyBulletAt(x, y, { /* ... */ });if (fired) playShotSfx();
Battlecruiser
Кадры выстрела: Weapons...-7, ...-15, ...-22 и ещё один выстрел после окончания анимации (“после 29” реализовано как ANIMATION_COMPLETE).
SFX: AUDIO_KEYS.bcShot
Громкость: 0.55 (на каждый выстрел)
this.weaponFx.on(Phaser.Animations.Events.ANIMATION_UPDATE, (..., frameKey) => {  const shouldFire =    frameKey === BATTLECRUISER_WEAPON_FIRE_FRAME_7 ||    frameKey === BATTLECRUISER_WEAPON_FIRE_FRAME_15 ||    frameKey === BATTLECRUISER_WEAPON_FIRE_FRAME_22;  if (!shouldFire) return;  fireWave(); // внутри: if (fired) this.scene.sound.play(AUDIO_KEYS.bcShot, { volume: 0.55 })});this.weaponFx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {  fireWave(); // “после 29”});
Dreadnought (босс)
Кадры выстрелов (Ray): Weapons...-27, -34, -41, -48, -55
Кадр звука (DnShot): Weapons...-28
SFX: AUDIO_KEYS.dnShot
Громкость: 0.65
Ray spawn Y factor: DREADNOUGHT_FIRE_Y_FACTOR = 0.3
const DREADNOUGHT_WEAPON_FIRE_FRAME_27 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}27${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;const DREADNOUGHT_WEAPON_FIRE_FRAME_34 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}34${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;const DREADNOUGHT_WEAPON_FIRE_FRAME_41 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}41${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;const DREADNOUGHT_WEAPON_FIRE_FRAME_48 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}48${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;const DREADNOUGHT_WEAPON_FIRE_FRAME_55 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}55${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;const DREADNOUGHT_WEAPON_SFX_FRAME_28 = `${SPRITE_FRAMES.dreadnoughtWeaponPrefix}28${SPRITE_FRAMES.dreadnoughtWeaponSuffix}`;
if (frameKey === DREADNOUGHT_WEAPON_SFX_FRAME_28) {  this.scene.sound.play(AUDIO_KEYS.dnShot, { volume: 0.65 });}const shouldFire =  frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_27 ||  frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_34 ||  frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_41 ||  frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_48 ||  frameKey === DREADNOUGHT_WEAPON_FIRE_FRAME_55;if (shouldFire) fireRay();
Дропы (GameScene.ts) — точные вероятности
const DROP_CHANCE_BIG_SPACE_GUN = 0.3;const DROP_CHANCE_ZAPPER = 0.01;const DROP_CHANCE_ROCKET = 0.01;const DROP_CHANCE_AUTO_CANNONS = 0.01;const DROP_CHANCE_BASE_ENGINE = 0.01;const DROP_CHANCE_SUPERCHARGED_ENGINE = 0.01;const DROP_CHANCE_BURST_ENGINE = 0.01;const DROP_CHANCE_BIG_PULSE_ENGINE = 0.01;const DROP_CHANCE_HEALTH = 0.03;const DROP_CHANCE_FIRING_RATE = 0.04;const DROP_CHANCE_SHIELD = 0.04;
Спавн врагов (EnemySpawner.ts) — точные вероятности
const DREADNOUGHT_SPAWN_CHANCE = 0.0001; // 0.01%const BATTLECRUISER_SPAWN_CHANCE = 0.0001; // 0.01%const FRIGATE_SPAWN_CHANCE = 0.0001; // 30%const TORPEDO_SPAWN_CHANCE = 0.0001; // 0.01%const FIGHTER_SPAWN_CHANCE = 0.0001; // 0.01%
> Примечание: в коде сейчас FRIGATE_SPAWN_CHANCE = 0.0001, но комментарий рядом “30%”. Если Frigate реально должен быть 30%, то значение должно быть 0.3.
UI/прочие громкости (точные)
По текущему коду GameScene.ts:
Клик кнопок: AUDIO_KEYS.click → 0.7 (в нескольких местах)
Удар по игроку: AUDIO_KEYS.impactSmall → 0.45
Поднятие щита: AUDIO_KEYS.energyShield → 0.6
Взрывы (враги): AUDIO_KEYS.explosionScout → 0.55
Взрывы (астероиды): AUDIO_KEYS.explosionScout → 0.45