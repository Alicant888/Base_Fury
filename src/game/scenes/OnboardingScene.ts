import * as Phaser from "phaser";
import { formatWalletAddress, getConnectedWalletAddress } from "@/src/platform/wallet";
import { ATLAS_KEYS, AUDIO_KEYS, BG_FRAMES, GAME_WIDTH, setGameHeight } from "../config";
import { IMAGE_KEYS } from "../config";
import { SaveManager, SaveData } from "../systems/SaveManager";

type OnboardingSceneData = {
  level?: number;
  save?: SaveData;
  showMenu?: boolean;
};

type MiniAppUserInfo = {
  name: string;
  pfpUrl?: string;
};

export class OnboardingScene extends Phaser.Scene {
  private level = 1;
  private save?: SaveData;
  private showMenu = false;

  private pageIndex = 0;
  private bg!: Phaser.GameObjects.TileSprite;
  private blocker!: Phaser.GameObjects.Rectangle;
  private contentContainer!: Phaser.GameObjects.Container;
  private tapText!: Phaser.GameObjects.Text;

  private userInfo: MiniAppUserInfo = { name: "Player" };
  private avatarTextureKey = "onboarding_avatar";
  private avatarLoaded = false;

  constructor() {
    super("OnboardingScene");
  }

  init(data?: OnboardingSceneData) {
    this.level = data?.level ?? 1;
    this.save = data?.save;
    this.showMenu = data?.showMenu ?? false;
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Mark onboarding as seen immediately so it's not shown again on the next start.
    const sv = SaveManager.load();
    if (!sv.hasSeenOnboarding) {
      sv.hasSeenOnboarding = true;
      SaveManager.save(sv);
    }

    // Background (static BCG).
    this.bg = this.add
      .tileSprite(0, 0, GAME_WIDTH, 1, ATLAS_KEYS.bg, BG_FRAMES.bcg)
      .setOrigin(0)
      .setDepth(0);

    this.contentContainer = this.add.container(0, 0).setDepth(1);

    this.tapText = this.add.text(0, 0, "TAP TO CONTINUE", {
      fontFamily: "Orbitron",
      fontSize: "24px",
      color: "#CFE9F2",
      align: "center",
    }).setOrigin(0.5).setDepth(2);

    this.blocker = this.add
      .rectangle(0, 0, GAME_WIDTH, 1, 0x000000, 0)
      .setOrigin(0)
      .setDepth(3)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.playClick();
        this.advance();
      });

    const layout = (width: number, height: number) => {
      const zoom = width / GAME_WIDTH;
      const worldH = height / zoom;
      setGameHeight(worldH);

      this.cameras.main.setViewport(0, 0, width, height);
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(GAME_WIDTH / 2, worldH / 2);

      this.bg.setSize(GAME_WIDTH, worldH);
      this.blocker.setSize(GAME_WIDTH, worldH);
      const hitArea = this.blocker.input?.hitArea as Phaser.Geom.Rectangle | undefined;
      if (hitArea) hitArea.setTo(0, 0, GAME_WIDTH, worldH);

      this.renderPage(worldH);
    };

    layout(this.scale.width, this.scale.height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      layout(gameSize.width, gameSize.height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    });

    void this.loadPlayerProfile();
  }

  private async loadPlayerProfile() {
    try {
      const address = await getConnectedWalletAddress();
      if (!address) return;

      this.userInfo = { name: formatWalletAddress(address) };

      const zoom = this.scale.width / GAME_WIDTH;
      const worldH = this.scale.height / zoom;
      this.renderPage(worldH);
    } catch {
      // ignore
    }
  }

  private playClick() {
    try {
      this.sound.play(AUDIO_KEYS.click, { volume: 0.7 });
    } catch {
      // ignore
    }
  }

  private advance() {
    if (this.pageIndex < 3) {
      this.pageIndex += 1;
      const zoom = this.scale.width / GAME_WIDTH;
      const worldH = this.scale.height / zoom;
      this.renderPage(worldH);
      return;
    }

    // Stop the start menu music right before the game begins.
    this.sound.stopByKey(AUDIO_KEYS.startMenuMusic);
    this.sound.removeByKey(AUDIO_KEYS.startMenuMusic);
    this.scene.start("GameScene", { level: this.level, save: this.save, showMenu: this.showMenu });
  }

  private renderPage(worldH: number) {
    const centerX = GAME_WIDTH / 2;
    const centerY = worldH / 2;
    const bottomPad = 24;

    this.contentContainer.removeAll(true);

    let contentBottom = centerY;

    if (this.pageIndex === 0) {
      const hello = this.add.text(centerX, centerY - 24, "Hello", {
        fontFamily: "Orbitron",
        fontSize: "24px",
        color: "#CFE9F2",
        align: "center",
      }).setOrigin(0.5);

      const nameRow = this.buildNameRow(centerX, centerY + 10);

      this.contentContainer.add([hello, nameRow]);

      const rowBounds = nameRow.getBounds();
      contentBottom = Math.max(hello.y + hello.height / 2, rowBounds.bottom);
    } else {
      const key = this.pageIndex === 1
        ? IMAGE_KEYS.onboarding1
        : this.pageIndex === 2
          ? IMAGE_KEYS.onboarding2
          : IMAGE_KEYS.onboarding3;

      const img = this.add.image(centerX, centerY, key).setOrigin(0.5);
      this.contentContainer.add(img);
      contentBottom = img.y + img.displayHeight / 2;
    }

    const bottomEdge = worldH - bottomPad;
    const tapY = contentBottom + (bottomEdge - contentBottom) / 2;
    this.tapText.setPosition(centerX, tapY);
  }

  private buildNameRow(x: number, y: number): Phaser.GameObjects.Container {
    const row = this.add.container(x, y);

    const nameText = this.add.text(0, 0, this.userInfo.name, {
      fontFamily: "Orbitron",
      fontSize: "14px",
      color: "#FFFFFF",
      align: "left",
    }).setOrigin(0, 0.5);

    const gap = 8;
    const avatarSize = 26;

    let avatar: Phaser.GameObjects.GameObject | null = null;
    if (this.avatarLoaded && this.textures.exists(this.avatarTextureKey)) {
      const img = this.add.image(0, 0, this.avatarTextureKey).setOrigin(0.5);
      const scale = avatarSize / Math.max(1, Math.min(img.width, img.height));
      img.setScale(scale);
      avatar = img;
    }

    const avatarW = avatar ? avatarSize : 0;
    const totalW = avatarW + (avatar ? gap : 0) + nameText.width;

    let cursorX = -totalW / 2;
    if (avatar) {
      (avatar as Phaser.GameObjects.Image).setPosition(cursorX + avatarW / 2, 0);
      cursorX += avatarW + gap;
      row.add(avatar);
    }

    nameText.setPosition(cursorX, 0);
    row.add(nameText);

    return row;
  }
}
