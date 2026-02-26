import * as Phaser from "phaser";
import { AUDIO_KEYS, GAME_WIDTH, IMAGE_KEYS, UI_SCALE, setGameHeight } from "../config";
import { SaveManager, SaveData } from "../systems/SaveManager";

const DAY_MS = 86_400_000;

function getCheckInContractAddress(): `0x${string}` | null {
  const raw = process.env.NEXT_PUBLIC_CHECKIN_CONTRACT_ADDRESS?.trim();
  if (!raw) return null;
  if (!raw.startsWith("0x") || raw.length !== 42) {
    console.warn("Invalid NEXT_PUBLIC_CHECKIN_CONTRACT_ADDRESS:", raw);
    return null;
  }
  return raw as `0x${string}`;
}

async function ensureDailyOnchainCheckIn(): Promise<`0x${string}` | null> {
  const contractAddress = getCheckInContractAddress();
  if (!contractAddress) return null;

  const [{ sdk }, viem, { base }] = await Promise.all([
    import("@farcaster/miniapp-sdk"),
    import("viem"),
    import("viem/chains"),
  ]);

  if (!(await sdk.isInMiniApp())) return null;

  const provider = await sdk.wallet.getEthereumProvider();
  if (!provider) return null;

  const transport = viem.custom(provider);
  const walletClient = viem.createWalletClient({ chain: base, transport });
  const publicClient = viem.createPublicClient({ chain: base, transport });

  const existing = await walletClient.getAddresses();
  const [account] = existing.length ? existing : await walletClient.requestAddresses();
  if (!account) return null;

  const abi = [
    {
      type: "function",
      name: "checkIn",
      stateMutability: "nonpayable",
      inputs: [],
      outputs: [],
    },
    {
      type: "function",
      name: "lastDay",
      stateMutability: "view",
      inputs: [{ name: "user", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  const today = BigInt(Math.floor(Date.now() / DAY_MS));

  try {
    const lastDay = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "lastDay",
      args: [account],
    });
    if (lastDay >= today) return null;
  } catch (error) {
    // If the contract doesn't expose `lastDay`, we can't preflight daily check-ins.
    // We'll attempt the write instead and let the contract enforce its own rules.
    console.warn("Onchain check-in preflight failed:", error);
  }

  return walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: "checkIn",
    account,
  });
}

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Image;
  private menuMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    // Static menu background image.
    const bg = this.add.image(0, 0, IMAGE_KEYS.menuBackground).setDepth(0);
    bg.setOrigin(0.5);

    // Menu music: start immediately on load, stop on START click.
    try {
      this.menuMusic = this.sound.add(AUDIO_KEYS.startMenuMusic, { loop: true, volume: 0.65 });
      this.menuMusic.play();
    } catch {
      // ignore
    }

    // START (New Game) button
    this.startButton = this.add.image(0, 0, IMAGE_KEYS.uiStart)
      .setInteractive({ useHandCursor: true })
      .setDepth(2)
      .setScale(UI_SCALE);

    this.startButton.on("pointerover", () => this.startButton.setTint(0xcccccc));
    this.startButton.on("pointerout", () => this.startButton.clearTint());
    this.startButton.on("pointerdown", () => {
      this.startButton.setTint(0x888888);
      this.unlockAudioOnce();
      this.startButton.disableInteractive();
      void this.handleStartPressed();
    });

    const layout = (width: number, height: number) => {
      const zoom = width / GAME_WIDTH;
      const worldH = height / zoom;
      setGameHeight(worldH);

      this.cameras.main.setViewport(0, 0, width, height);
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(GAME_WIDTH / 2, worldH / 2);

      bg.setPosition(GAME_WIDTH / 2, worldH / 2);
      const scaleX = GAME_WIDTH / bg.width;
      const scaleY = worldH / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));

      const btnY = worldH * 0.67;
      this.startButton.setPosition(GAME_WIDTH / 2, btnY);
    };

    layout(this.scale.width, this.scale.height);

    const onResize = (gameSize: Phaser.Structs.Size) => {
      layout(gameSize.width, gameSize.height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.menuMusic?.stop();
      this.menuMusic?.destroy();
      this.menuMusic = undefined;
    });
  }

  private onStart(level: number, save?: SaveData, showMenu = false) {
    this.unlockAudioOnce();
    this.playClick();
    this.menuMusic?.stop();
    this.menuMusic?.destroy();
    this.menuMusic = undefined;
    this.scene.start("GameScene", { level, save, showMenu });
  }

  private async handleStartPressed() {
    const savedData = SaveManager.load();
    const level = savedData.currentLevel > 1 ? savedData.currentLevel : 1;
    const save = savedData.currentLevel > 1 ? savedData : undefined;

    try {
      const txHash = await ensureDailyOnchainCheckIn();
      if (txHash) console.log("Onchain check-in tx:", txHash);
      this.onStart(level, save);
    } catch (error) {
      console.warn("Onchain check-in failed:", error);
      this.startButton.clearTint();
      this.startButton.setInteractive({ useHandCursor: true });
    }
  }

  private playClick() {
    try {
      this.sound.play(AUDIO_KEYS.click, { volume: 0.7 });
    } catch {
      // ignore
    }
  }

  private unlockAudioOnce() {
    if (this.registry.get("audioUnlocked")) return;
    this.registry.set("audioUnlocked", true);
    try {
      (this.sound as unknown as { unlock?: () => void }).unlock?.();
      const ctx = (this.sound as unknown as { context?: AudioContext }).context;
      if (ctx?.state === "suspended") void ctx.resume().catch(() => {});
    } catch {
      // ignore
    }
  }
}


