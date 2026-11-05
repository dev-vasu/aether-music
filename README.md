# 🌌 Aether Music | 2026 Cosmic Soundscape

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live_in_Orbit-a855f7?style=for-the-badge&logo=opsgenie&logoColor=white" />
  <img src="https://img.shields.io/badge/Sync-Cloud_Active-6366f1?style=for-the-badge&logo=google-drive&logoColor=white" />
  <img src="https://img.shields.io/badge/Vibe-Gen_Z_Approved-FF0080?style=for-the-badge" />
</p>

Aether is a high-performance, visually immersive music streaming application built with **Angular 21+**, **NgRx State Management**, and **YouTube Data/IFrame APIs**. It features a "Frosted Aurora" aesthetic that intelligently adapts to the music you hear.

🚀 **Live Demo:** [https://aether-music-ruddy.vercel.app/](https://aether-music-ruddy.vercel.app/)

---

## 🎨 Visual Philosophy & Motion
Aether is not just a music player; it's a **Living Interface**.

*   **Adaptive Dynamic Aura:** Powered by ColorThief v3, Aether analyzes the album art of the currently playing track and extracts dominant hues to dynamically illuminate the background and glow effects.
*   **Live Audio Waveform Equalizer:** Cybernetic frequency bars pulse rhythmically beside the active track title and over active art cards while music is playing.
*   **Morphing Geometric Shields:** The Play/Pause button isn't a circle—it's a futuristic crystal that **physically shifts its shape** and glow intensity based on the playback state.
*   **Frosted Aurora Background:** Two drifting, animated nebula blobs create a deep space atmosphere that responds to the colors of the album art.
*   **Aether Zoom Crop:** Custom CSS math that automatically zooms and crops YouTube video stills by **35%**, transforming them into professional, square album covers.
*   **Pulsing Identity:** Your Cosmic Avatar **glows and breathes** in the navigation dock whenever music is active.

---

## ✨ Core Features

### 🆔 Cosmic Passport (Identity)
*   **Funky Personas:** Choose from 10+ unique, illustrative SVG avatars (Cyber Cat, Neon Samurai, Phonk Ghost, etc.).
*   **Magic Alias Generator:** Instantly generate creative nicknames like "Hyper Pulse" or "Stellar Maverick".
*   **Aether Cloud Sync:** Your identity is automatically backed up to your **Google Drive** (hidden app folder). Your persona follows you from Desktop to Mobile instantly.

### 🎧 The Music Engine
*   **Active Continuous Queue:** Clicking any track or row instantly loads the entire category, search result set, or playlist into the active queue with seamless next/previous track progression.
*   **Shuffle & Repeat Modes:** Full support for Shuffle (`🔀`), Repeat All (`🔁`), and Repeat One (`🔂`) playback modes.
*   **Quick-Favorite Heart:** Dedicated heart button right on the Player Bar for 1-click addition to your Favorites orbit.
*   **Vibe Match AI:** Powered by YouTube's recommendation engine, Aether auto-generates a continuous queue of similar songs for every track you play.
*   **Smart Vibe Guard:** Automated feeds are strictly filtered to exclude low-quality content, mashups, and off-theme genres.
*   **Curated Fallback Engine:** Gracefully falls back to high-fidelity curated audio presets if API quotas are exhausted.

### ⌨️ Cosmic Keyboard Shortcuts
*   `Space`: Play / Pause toggle
*   `Shift + →` / `Shift + ←`: Next / Previous track
*   `→` / `←`: Seek ±5 seconds
*   `M`: Mute / Unmute toggle
*   `L`: Quick-favorite currently playing track
*   `S`: Toggle Shuffle
*   `R`: Cycle Repeat Mode
*   `?`: View Keyboard Controls helper

---

## 🛠️ Tech Stack
*   **Framework:** Angular 21 (Standalone Components)
*   **State:** NgRx (Store, Effects, Selectors)
*   **Visuals:** Vanilla CSS (Glassmorphism, CSS Animations, Adaptive Gradients)
*   **Intelligence:** YouTube Data API v3 & IFrame API
*   **Color Dynamics:** ColorThief v3
*   **Cloud:** Google Drive REST API (AppData Space)
*   **Testing:** Vitest & Angular Testbed

---

## ⚙️ Setup & Installation

### Prerequisites
*   Node.js v20+
*   Google Cloud Project with **YouTube Data API v3** and **Google Drive API** enabled.

### Local Development
1.  **Clone the Repo:**
    ```bash
    git clone https://github.com/dev-vasu/aether-music.git
    cd aether-music
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Run the App:**
    ```bash
    ng serve
    ```
4.  **Run Tests:**
    ```bash
    npm test
    ```

---
*Built with ❤️ by Vasu*
