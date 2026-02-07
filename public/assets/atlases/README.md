# UI + Background pack for Phaser 3 (RN WebView friendly)

Files:
- backgrounds.png / backgrounds.json  (2048x2048 atlas, 3 tiles 1024x1024)
  Frames: bg_starfield, bg_nebula, bg_dust
- ui.png / ui.json (1024x1024 atlas)
  Frames: ui_panel_window, ui_panel_header, ui_btn_large_normal/hover/pressed, ui_btn_small_normal/pressed,
          ui_icon_pause/back/sound_on/sound_off, ui_bar_hp, ui_bar_shield, ui_plate_score, ui_plate_weapon

Phaser loading:
```ts
this.load.atlas('bg', 'assets/atlases/backgrounds.png', 'assets/atlases/backgrounds.json');
this.load.atlas('ui', 'assets/atlases/ui.png', 'assets/atlases/ui.json');
```

Background usage (tileSprite):
```ts
const star = this.add.tileSprite(0,0, this.scale.width, this.scale.height, 'bg', 'bg_starfield').setOrigin(0,0);
const neb  = this.add.tileSprite(0,0, this.scale.width, this.scale.height, 'bg', 'bg_nebula').setOrigin(0,0);
const dust = this.add.tileSprite(0,0, this.scale.width, this.scale.height, 'bg', 'bg_dust').setOrigin(0,0);

// in update(dt):
star.tilePositionY -= 0.6;
neb.tilePositionY  -= 0.3;
dust.tilePositionY -= 1.0;
```

UI usage:
```ts
this.add.image(80, 40, 'ui', 'ui_icon_pause');
this.add.image(180, 40, 'ui', 'ui_icon_sound_on');
const btn = this.add.image(this.scale.width/2, 500, 'ui', 'ui_btn_large_normal').setInteractive();
btn.on('pointerdown', ()=> btn.setFrame('ui_btn_large_pressed'));
btn.on('pointerup', ()=> btn.setFrame('ui_btn_large_hover'));
btn.on('pointerout', ()=> btn.setFrame('ui_btn_large_normal'));
```

Pixel-art settings (recommended):
- pixelArt: true
- antialias: false
- roundPixels: true
