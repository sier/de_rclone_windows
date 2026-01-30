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

1. Download the latest `.exe` from the [Releases](https://github.com/sier/de_rclone_windows/releases) page.
2. Extract the portable executable (if zipped).
3. Run `de_rclone.exe`.

## Prerequisites
*   **Rclone**: You must have `rclone` installed on your system.
*   **FUSE (Linux)**: Required for mounting drives (usually pre-installed on most distros).
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

#### Windows (Portable Executable)
```bash
npm run dist
```
This creates a portable `.exe` file in the `dist/` directory.

**Note**: Code signing is disabled for Windows builds. If you encounter issues with symbolic links during build (common on non-admin accounts), the application runs fine in development mode with `npm start`. For production builds, run the build command with administrator privileges or in an environment that supports symbolic links.

### Platform-Specific Notes
- On Windows, rclone config is expected at `%APPDATA%\rclone\rclone.conf`
- Mounting functionality is disabled on Windows (Linux-only feature)
- Auto-mount (cron) is disabled on Windows (Linux-only feature)

---
## Credits
*   **Development**: [madroots](https://github.com/madroots)
*   **UI Framework**: [CS 1.6 CSS](https://github.com/ekmas/cs16.css) by ekmas
*   **Windows Build**: [sier](https://github.com/sier)
---
*Counter-Terrorists Win.*
