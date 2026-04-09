import * as Phaser from "phaser";
import { AUTH_SESSION_CHANGED_EVENT, getAuthSession, getPaymasterServiceUrlForAddress } from "@/src/platform/auth/client";
import { getConnectedWalletSession } from "@/src/platform/wallet";
import { createPublicClient, createWalletClient, custom, encodeFunctionData, http, numberToHex } from "viem";
import { base } from "viem/chains";
import { AUDIO_KEYS, GAME_WIDTH, IMAGE_KEYS, UI_SCALE, setGameHeight } from "../config";
import { getBuilderCodeDataSuffix } from "../onchain/builderCode";
import { sendCallsWithOptionalPaymaster } from "../onchain/sendCalls";
import { SaveManager, SaveData } from "../systems/SaveManager";

const DAY_MS = 86_400_000;
const START_UNLOCK_DELAY_MS = 250;
const CHECKIN_DAY_CACHE_KEY = "base_fury_daily_checkin_days";

function getCurrentDayNumber() {
  return Math.floor(Date.now() / DAY_MS);
}

function loadCheckInDayCache(): Record<string, number> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(CHECKIN_DAY_CACHE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
    );
  } catch {
    return {};
  }
}

function hasCachedCheckInForDay(account: `0x${string}`, dayNumber: number) {
  return loadCheckInDayCache()[account.toLowerCase()] === dayNumber;
}

function cacheCheckInForDay(account: `0x${string}`, dayNumber: number) {
  if (typeof window === "undefined") return;

  try {
    const nextCache = {
      ...loadCheckInDayCache(),
      [account.toLowerCase()]: dayNumber,
    };
    window.localStorage.setItem(CHECKIN_DAY_CACHE_KEY, JSON.stringify(nextCache));
  } catch {
    // localStorage unavailable
  }
}

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

  const session = await getConnectedWalletSession();
  if (!session || session.chainId !== base.id) return null;

  const { account, provider } = session;
  const transport = custom(provider);
  const publicClient = createPublicClient({ chain: base, transport: http() });
  const walletClient = createWalletClient({ chain: base, transport });
  const today = getCurrentDayNumber();

  if (hasCachedCheckInForDay(account, today)) {
    return null;
  }

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

  try {
    const lastDay = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "lastDay",
      args: [account],
    });
    if (lastDay >= BigInt(today)) {
      cacheCheckInForDay(account, today);
      return null;
    }
  } catch (error) {
    // If the contract doesn't expose `lastDay`, we can't preflight daily check-ins.
    // We'll attempt the write instead and let the contract enforce its own rules.
    console.warn("Onchain check-in preflight failed:", error);
  }

  const paymasterServiceUrl = process.env.NEXT_PUBLIC_PAYMASTER_PROXY_URL?.trim();
  const dataSuffix = getBuilderCodeDataSuffix();
  if (paymasterServiceUrl) {
    const authorizedPaymasterUrl = await getPaymasterServiceUrlForAddress(paymasterServiceUrl, account);
    if (authorizedPaymasterUrl) {
      const data = encodeFunctionData({
        abi,
        functionName: "checkIn",
        args: [],
      });
      return sendCallsWithOptionalPaymaster({
        provider,
        account,
        chainIdHex: numberToHex(base.id),
        calls: [{
          to: contractAddress,
          value: "0x0",
          data,
        }],
        paymasterServiceUrl: authorizedPaymasterUrl,
      }).then((txHash) => {
        cacheCheckInForDay(account, today);
        return txHash;
      });
    }
  }

  return walletClient.writeContract({
    chain: base,
    address: contractAddress,
    abi,
    functionName: "checkIn",
    args: [],
    dataSuffix: dataSuffix ?? undefined,
    account,
  }).then((txHash) => {
    cacheCheckInForDay(account, today);
    return txHash;
  });
}

export class MenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Image;
  private menuMusic?: Phaser.Sound.BaseSound;
  private keepMenuMusicOnShutdown = false;
  private hasUnlockedStart = false;
  private startButtonUnlockTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");
    this.keepMenuMusicOnShutdown = false;

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
      if (!this.hasUnlockedStart) return;
      this.startButton.setTint(0x888888);
      this.unlockAudioOnce();
      this.startButton.disableInteractive();
      void this.handleStartPressed();
    });

    this.setStartButtonUnlocked(false);

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

    const syncAuthGate = () => {
      void this.refreshStartButtonAuthState();
    };

    void this.refreshStartButtonAuthState();

    if (typeof window !== "undefined") {
      window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthGate);
    }

    // Cleanup on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      this.startButtonUnlockTimer?.remove(false);
      this.startButtonUnlockTimer = undefined;
      if (typeof window !== "undefined") {
        window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthGate);
      }
      if (!this.keepMenuMusicOnShutdown) {
        this.menuMusic?.stop();
        this.menuMusic?.destroy();
        this.menuMusic = undefined;
      }
    });
  }

  private onStart(level: number, save?: SaveData, showMenu = false) {
    this.unlockAudioOnce();
    this.playClick();
    const shouldShowOnboarding = !SaveManager.load().hasSeenOnboarding;
    if (shouldShowOnboarding) {
      // Keep menu music playing through onboarding (stop it when onboarding finishes).
      this.keepMenuMusicOnShutdown = true;
      this.scene.start("OnboardingScene", { level, save, showMenu });
      return;
    }

    this.menuMusic?.stop();
    this.menuMusic?.destroy();
    this.menuMusic = undefined;
    this.scene.start("GameScene", { level, save, showMenu });
  }

  private setStartButtonUnlocked(unlocked: boolean) {
    this.startButtonUnlockTimer?.remove(false);
    this.startButtonUnlockTimer = undefined;
    this.startButton.setActive(false);
    this.startButton.setVisible(false);
    this.startButton.setAlpha(1);
    this.startButton.clearTint();
    this.startButton.disableInteractive();
    this.hasUnlockedStart = false;

    if (!unlocked) {
      return;
    }

    this.startButtonUnlockTimer = this.time.delayedCall(START_UNLOCK_DELAY_MS, () => {
      this.startButtonUnlockTimer = undefined;
      if (!this.sys.isActive()) return;

      this.hasUnlockedStart = true;
      this.startButton.setVisible(true);
      this.startButton.setActive(true);
      this.startButton.clearTint();
      this.startButton.setInteractive({ useHandCursor: true });
    });
  }

  private async refreshStartButtonAuthState() {
    const session = await getAuthSession();
    if (!this.sys.isActive()) return;

    this.setStartButtonUnlocked(Boolean(session));
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
