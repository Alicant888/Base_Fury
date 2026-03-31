"use client";

import { useState } from "react";
import { appConfig } from "../../app.config";
import styles from "./page.module.css";

export default function Success() {
  const [shareLabel, setShareLabel] = useState("SHARE");

  const handleShare = async () => {
    const shareText = `I just started playing ${appConfig.name}. Jump in and try it yourself.`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: appConfig.name,
          text: shareText,
          url: appConfig.url,
        });
        setShareLabel("SHARED");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText} ${appConfig.url}`);
        setShareLabel("COPIED");
      } else {
        window.open(appConfig.url, "_blank", "noopener,noreferrer");
        setShareLabel("OPENED");
      }
    } catch (error) {
      console.error("Error sharing app:", error);
      setShareLabel("RETRY");
    }
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/");
  };

  return (
    <div className={styles.container}>
      <button className={styles.closeButton} type="button" onClick={handleClose}>
        ✕
      </button>
      
      <div className={styles.content}>
        <div className={styles.successMessage}>
          <div className={styles.checkmark}>
            <div className={styles.checkmarkCircle}>
              <div className={styles.checkmarkStem}></div>
              <div className={styles.checkmarkKick}></div>
            </div>
          </div>
          
          <h1 className={styles.title}>Welcome to {appConfig.name.toUpperCase()}!</h1>
          
          <p className={styles.subtitle}>
            Your session is ready and the app now shares like a standard web experience.<br />
            Launch the game, connect a wallet, and keep progress on Base.
          </p>

          <button onClick={handleShare} className={styles.shareButton}>
            {shareLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
