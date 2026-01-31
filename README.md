# de_rclone

A robust, retro-styled GUI manager for **Rclone**, styled with the nostalgic CS 1.6 aesthetic, distributed as AppImage for Linux and portable executable for Windows.

<img width="600" height="453" alt="36ec6d25-e185-4239-abfd-f187bb955959_removalai_preview" src="https://github.com/user-attachments/assets/eeffd72b-265c-4de5-b404-163d40e59d85" />


---

## Key Features

- **Manage your existing remotes**  
  App automatically detects your existing remotes by reading from `rclone.conf`. You can specify the path to conf yourself.

- **Parallel Latency Check**  
  Automatically checks availability and connection latency of all your remotes in parallel upon launch.

- **Remote management**  
  Add/Remove your rclone remotes, mount and unmount as you please and test connectivity directly from UI.

- **Secure & Plugin-Based**  
  Supports various Rclone providers (S3, SFTP, Webdav etc.) via a flexible plugin system. Plugin collection is growing.

- **Mount remote on startup**  
  Easily enable or disable auto-mount on startup (Cron integration) directly from the context menu.

- **Retro Aesthetics**  
  Nostalgic, fully themed UI based on the classic Counter-Strike 1.6 look.

- **Cross-Platform**  
  Supports Linux (AppImage) and Windows (portable executable).

---

## Quick Start

### "Just run the damn .EXE!"
Okok, Windows very gud yes.
1. Go to https://github.com/sier/de_rclone_windows/releases
2. Download the .zip file
3. Right-click and extract it in your Downloads folder.
4. Run the installer by double-clicking "de_rclone_installer.exe"
5. Note that I take absolutely no responsibility for how well the application functions, I just made this Windows build and installer to make it easier for peeps like you to run it.

### Recommended: Gear Lever

**[Gear Lever](https://github.com/mijorus/gearlever)** is the recommended way to manage your AppImages.  
It seamlessly integrates them into your system menu and handles updates.

1. Download the latest `.AppImage` from the [Releases](https://github.com/madroots/de_rclone/releases) page.  
2. Drag & Drop `de_rclone` into Gear Lever and click **Install/run**.

#### Automatic Updates

To take advantage of an update mechanism of Gear Lever and update de_rclone automatically when a new version is released, fill in these details in Gear Lever:

| Field | Value |
| :--- | :--- |
| **Repo URL** | `https://github.com/madroots/de_rclone` |
| **Release File Name** | `de_rclone-*.AppImage` |

---
  
### Manual Execution without launcher
1.  Download the `.AppImage`.
2.  Make it executable:
    ```bash
    chmod +x de_rclone-*.AppImage
    ```
3.  Run it:
    ```bash
    ./de_rclone-*.AppImage
    ```

### Windows

1. Download the latest installer (`.exe`) from the [Releases](https://github.com/madroots/de_rclone/releases) page.
2. Run the installer - select "Full Installation" to automatically download and install rclone and WinFsp.
3. Launch de_rclone from the desktop shortcut.

**Note**: The installer offers optional components to automatically download and install rclone and WinFsp. Rclone will be installed in the same directory as the application for reliable operation. WinFsp will be installed system-wide.

## Prerequisites
*   **Rclone**: You must have `rclone` installed on your system.
*   **FUSE (Linux)**: Required for mounting drives (usually pre-installed on most distros).
*   **WinFsp (Windows)**: Required for mounting drives on Windows. Download from https://winfsp.dev/
*   **Mounting on Windows**: Mounting is not supported yet; requires additional setup with WinFsp/Dokany.
---
## Development

### Prerequisites
- Node.js (v16 or higher)
- npm
- Git

### Setup Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/madroots/de_rclone.git
   cd de_rclone
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm start
   ```

### Building for Distribution

#### Linux (AppImage)
```bash
npm run dist
```
This creates a `.AppImage` file in the `dist/` directory.

#### Windows (Unpacked Directory)
```bash
npm run dist
```
This creates an unpacked directory in `dist/` containing the executable and all files. Run `de_rclone.exe` from within this directory.

##### Windows Installer
###### Prerequisites
- [NSIS](https://nsis.sourceforge.io/Download)
After compiling the Electron project, run the following to package it (make sure you are in the root directory):
```bash
"C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi
```


**Note**: Using "dir" target skips packaging and code signing entirely, avoiding the symlink permission issues. The unpacked app runs identically to a packaged version.

### Platform-Specific Notes
- On Windows, rclone config is expected at `%APPDATA%\rclone\rclone.conf`
- Mounting requires WinFsp to be installed on Windows
- Auto-mount (cron) is not supported on Windows (Linux-only feature)

---
## Credits
*   **Development**: [madroots](https://github.com/madroots)
*   **UI Framework**: [CS 1.6 CSS](https://github.com/ekmas/cs16.css) by ekmas
*   **Windows Build**: [sier](https://github.com/sier)
---
*Counter-Terrorists Win.*
