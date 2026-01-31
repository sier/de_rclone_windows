const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const os = require('os');

let mainWindow;

// Helper function to get rclone executable path
function getRclonePath() {
    // First check if rclone.exe exists in the same directory as the app
    const appDir = path.dirname(process.execPath);
    const rclonePath = path.join(appDir, 'rclone.exe');
    if (fs.existsSync(rclonePath)) {
        return rclonePath;
    }
    // Fallback to PATH
    return 'rclone';
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        title: "de_rclone",
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true, // Hide menu bar (File, Edit, etc.)
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Explicitly remove the menu for production feel
    mainWindow.setMenu(null);
    mainWindow.loadFile('renderer/index.html');
}

app.whenReady().then(() => {
    console.log("Current PATH:", process.env.PATH);
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- Helper Functions ---

function expandTilde(filePath) {
    if (filePath.startsWith('~')) {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}

function getRcloneConfigPath(customPath) {
    if (customPath) return expandTilde(customPath);
    if (process.platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', 'rclone', 'rclone.conf');
    } else {
        return path.join(os.homedir(), '.config', 'rclone', 'rclone.conf');
    }
}

function getMountDir(remoteName) {
    return path.join(os.homedir(), 'mnt', remoteName);
}

// --- IPC Handlers ---

ipcMain.handle('get_remotes', async (event, { configPathOpt }) => {
    const configPath = getRcloneConfigPath(configPathOpt);

    if (!fs.existsSync(configPath)) {
        throw new Error(`rclone.conf not found at ${configPath}`);
    }

    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const remotes = [];
        let currentSection = null;
        let currentType = null;

        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                // Save previous remote
                if (currentSection && currentType) {
                    const mountPoint = getMountDir(currentSection);
                    // Use robust check
                    const mounted = await isMounted(mountPoint);

                    remotes.push({
                        name: currentSection,
                        type: currentType,
                        mounted: mounted ? "Yes" : "No",
                        cron: "No", // Configured later
                        mount_point: mountPoint
                    });
                }
                currentSection = trimmed.slice(1, -1);
                currentType = null;
            } else if (trimmed.startsWith('type')) {
                const parts = trimmed.split('=');
                if (parts.length > 1) {
                    currentType = parts[1].trim();
                }
            }
        }

        // Add last one
        if (currentSection && currentType) {
            const mountPoint = getMountDir(currentSection);
            const mounted = await isMounted(mountPoint);
            remotes.push({
                name: currentSection,
                type: currentType,
                mounted: mounted ? "Yes" : "No",
                cron: "No",
                mount_point: mountPoint
            });
        }

        // Populate cron status
        if (process.platform !== 'win32') {
            try {
                const { stdout } = await execPromise('crontab -l');
                remotes.forEach(r => {
                    // Relaxed check: rclone mount ... remoteName: ...
                    // We check if the line contains "rclone mount" and "remoteName:"
                    // This covers manual entries with different flags or quoting
                    const lines = stdout.split('\n');
                    const isCron = lines.some(line => {
                        return line.includes('rclone mount') && line.includes(`${r.name}:`);
                    });

                    if (isCron) {
                        r.cron = "Yes";
                    }
                });
            } catch (e) {
                // Crontab might be empty or fail
            }
        }

        return remotes;

    } catch (e) {
        throw new Error(`Failed to read config: ${e.message}`);
    }
});

// Helper for exec to promise
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stderr });
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}

function isMounted(mountPoint) {
    return new Promise(resolve => {
        if (process.platform === 'win32') {
            // On Windows, check if rclone mount process is running for this mount point
            exec(`tasklist /fi "IMAGENAME eq rclone.exe" /fo csv /nh`, (err, stdout) => {
                if (err) {
                    resolve(false);
                    return;
                }

                // Check if any rclone process has our mount point in command line
                const lines = stdout.split('\n');
                const mountPointNormalized = mountPoint.replace(/\\/g, '\\\\');
                const isRcloneRunning = lines.some(line => {
                    return line.toLowerCase().includes('rclone.exe') &&
                           line.includes('mount') &&
                           line.includes(mountPointNormalized);
                });

                if (isRcloneRunning) {
                    // Additional check: try to access the mount point
                    try {
                        fs.accessSync(mountPoint, fs.constants.R_OK);
                        resolve(true);
                    } catch (e) {
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            });
        } else {
            exec(`mountpoint -q "${mountPoint}"`, (err) => {
                if (err) resolve(false);
                else resolve(true);
            });
        }
    });
}

ipcMain.handle('mount_remote', async (event, { remoteName, configPathOpt }) => {
    const mountPoint = getMountDir(remoteName);

    // Check if mounted
    if (await isMounted(mountPoint)) {
        return { success: true, message: `${remoteName} is already mounted at ${mountPoint}` };
    }

    // On Windows, rclone mount requires the mount point directory to NOT exist
    // On Linux/macOS, the directory should exist
    if (process.platform !== 'win32') {
        if (!fs.existsSync(mountPoint)) {
            fs.mkdirSync(mountPoint, { recursive: true });
        }
    } else {
        // On Windows, remove the directory if it exists so rclone can create it
        if (fs.existsSync(mountPoint)) {
            try {
                fs.rmdirSync(mountPoint);
            } catch (e) {
                // Directory might not be empty, try to remove contents
                try {
                    fs.rmSync(mountPoint, { recursive: true, force: true });
                } catch (e2) {
                    // If we can't remove it, the mount will likely fail
                }
            }
        }
    }

    const configPath = getRcloneConfigPath(configPathOpt);

    // Construct command
    // rclone mount remote: /path/to/mount --vfs-cache-mode writes --daemon --config ...
    const args = [
        'mount',
        `${remoteName}:`,
        mountPoint,
        '--vfs-cache-mode', 'writes',
        '--daemon'
    ];

    // Add Windows-specific arguments for better WinFsp compatibility
    if (process.platform === 'win32') {
        args.push('--vfs-cache-max-age', '1h');
        args.push('--vfs-cache-max-size', '100M');
        args.push('--log-level', 'INFO');
        args.push('--log-file', path.join(os.tmpdir(), `rclone-mount-${remoteName}.log`));
    }

    if (configPathOpt) {
        args.push('--config', configPath);
    }

    return new Promise((resolve, reject) => {
        // Capture output to see any errors
        const child = spawn(getRclonePath(), args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: true,
            shell: true
        });

        let stderr = '';
        let stdout = '';

        if (child.stdout) {
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
        }

        child.on('error', (err) => {
            return resolve({ success: false, message: `Failed to start rclone: ${err.message}` });
        });

        child.on('exit', (code) => {
            if (code !== 0 && code !== null) {
                return resolve({ success: false, message: `Rclone exited with code ${code}: ${stderr}` });
            }
        });

        child.unref();

        // Wait longer on Windows for mount to establish
        const waitTime = process.platform === 'win32' ? 3000 : 1000;

        setTimeout(async () => {
            if (await isMounted(mountPoint)) {
                resolve({ success: true, message: `Successfully mounted ${remoteName} at ${mountPoint}` });
            } else {
                const errorMsg = stderr || 'Unknown error';
                resolve({ success: false, message: `Mount command executed but mountpoint not detected. Error: ${errorMsg}` });
            }
        }, waitTime);
    });
});

ipcMain.handle('unmount_remote', async (event, { remoteName }) => {
    const mountPoint = getMountDir(remoteName);

    if (!(await isMounted(mountPoint))) {
        // Try cleanup if directory exists but not mounted (stale state)
        if (fs.existsSync(mountPoint)) {
            try { fs.rmdirSync(mountPoint); } catch (e) { }
        }
        return { success: false, message: `${remoteName} is not mounted.` };
    }

    try {
        if (process.platform === 'win32') {
            // On Windows, kill all rclone.exe processes (since we can't easily identify which one)
            // This is a bit aggressive but rclone mounts should be the only rclone processes
            try {
                await execPromise('taskkill /f /im rclone.exe');
            } catch (e) {
                // Ignore if no processes found
            }
        } else {
            await execPromise(`fusermount -u "${mountPoint}"`);
        }
        // Clean up point
        try { if (fs.existsSync(mountPoint)) fs.rmdirSync(mountPoint); } catch (e) { }
        return { success: true, message: `Successfully unmounted ${remoteName}` };
    } catch (e) {
        if (process.platform !== 'win32') {
            // Fallback to umount on Linux
            try {
                await execPromise(`umount "${mountPoint}"`);
                // Clean up point
                try { if (fs.existsSync(mountPoint)) fs.rmdirSync(mountPoint); } catch (e) { }
                return { success: true, message: `Successfully unmounted ${remoteName}` };
            } catch (e2) {
                return { success: false, message: `Unmount failed: ${e.stderr || e.message}` };
            }
        } else {
            // On Windows, just try to clean up directory
            try { if (fs.existsSync(mountPoint)) fs.rmdirSync(mountPoint); } catch (e) { }
            return { success: true, message: `Attempted to unmount ${remoteName}` };
        }
    }
});

ipcMain.handle('open_folder', async (event, { path: folderPath }) => {
    const error = await shell.openPath(folderPath);
    if (error) {
        throw new Error(error);
    }
    return { success: true, message: `Opened folder: ${folderPath}` };
});

ipcMain.handle('open_external', async (event, url) => {
    await shell.openExternal(url);
});

ipcMain.handle('test_connection', async (event, { remoteName, configPathOpt }) => {
    const configPath = getRcloneConfigPath(configPathOpt);
    try {
        const cmd = `rclone lsf "${remoteName}:" ${configPathOpt ? `--config "${configPath}"` : ''}`;
        await execPromise(cmd);
        return { success: true, message: `Connection to ${remoteName} successful` };
    } catch (e) {
        return { success: false, message: `Connection test failed: ${e.stderr}` };
    }
});

// Latency check handler
ipcMain.handle('check_latency', async (event, { remoteName, configPathOpt }) => {
    const configPath = getRcloneConfigPath(configPathOpt);
    const start = Date.now();
    try {
        // Test connection with a timeout. lsf is lightweight.
        // We use a shorter timeout for latency checks (3s)
        const cmd = `rclone lsf "${remoteName}:" --max-depth 1 ${configPathOpt ? `--config "${configPath}"` : ''}`;

        await new Promise((resolve, reject) => {
            exec(cmd, { timeout: 3000 }, (error, stdout, stderr) => {
                if (error) {
                    // Check if it was a timeout
                    if (error.signal === 'SIGTERM') {
                        reject(new Error('Timeout'));
                    } else {
                        reject({ error, stderr });
                    }
                    return;
                }
                resolve();
            });
        });

        const duration = Date.now() - start;
        return { success: true, latency: duration };
    } catch (e) {
        return { success: false, error: e.message || 'Error' };
    }
});

ipcMain.handle('is_rclone_installed', async () => {
    try {
        await execPromise(`"${getRclonePath()}" --version`);
        return true;
    } catch {
        return false;
    }
});

ipcMain.handle('get_app_version', () => {
    return app.getVersion();
});

ipcMain.handle('get_available_plugins', async () => {
    // Search for plugins
    const potentialPaths = [
        path.join(__dirname, 'plugins'),
        path.join(process.cwd(), 'plugins'),
        // Add more if needed depending on packaging
    ];

    const plugins = [];

    for (const p of potentialPaths) {
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
            const dirs = fs.readdirSync(p);
            for (const dir of dirs) {
                const configPath = path.join(p, dir, 'config.json');
                if (fs.existsSync(configPath)) {
                    try {
                        const content = fs.readFileSync(configPath, 'utf8');
                        plugins.push(JSON.parse(content));
                    } catch (err) {
                        console.error("Failed to load plugin", configPath, err);
                    }
                }
            }
            if (plugins.length > 0) break; // Use first found dir
        }
    }
    return plugins;
});

// --- Cron Functions ---

function getMountCmdString(remoteName, mountPoint, configPath) {
    // Construct the exact command line used for cron
    // We use full path for safety if possible, but 'rclone' is standard
    let cmd = `rclone mount ${remoteName}: "${mountPoint}" --vfs-cache-mode writes --daemon`;
    if (configPath) {
        cmd += ` --config "${configPath}"`;
    }
    return cmd;
}

ipcMain.handle('add_to_cron', async (event, { remoteName, configPathOpt }) => {
    if (process.platform === 'win32') {
        return { success: false, message: 'Auto-mount (cron) is not supported on Windows yet.' };
    }

    try {
        const mountPoint = getMountDir(remoteName);
        const configPath = getRcloneConfigPath(configPathOpt);
        const cmd = getMountCmdString(remoteName, mountPoint, configPath);
        // Add comment to identify entry
        const cronEntry = `@reboot ${cmd} # Added by de_rclone: ${remoteName}`;

        // Check if already exists (relaxed check)
        const list = await execPromise('crontab -l').catch(() => ({ stdout: '' }));
        if (list.stdout.includes(`rclone mount`) && list.stdout.includes(`${remoteName}:`)) {
            return { success: true, message: `${remoteName} is already enabled for auto-mount.` };
        }

        // Add to crontab
        await execPromise(`(crontab -l 2>/dev/null; echo "${cronEntry}") | crontab -`);

        return { success: true, message: `Enabled auto-mount for ${remoteName}.` };
    } catch (e) {
        return { success: false, message: `Failed to enable auto-mount: ${e.stderr || e.message}` };
    }
});

ipcMain.handle('remove_from_cron', async (event, { remoteName, configPathOpt }) => {
    if (process.platform === 'win32') {
        return { success: false, message: 'Auto-mount (cron) is not supported on Windows yet.' };
    }

    try {
        const list = await execPromise('crontab -l').catch(() => ({ stdout: '' }));

        // Relaxed check for removal
        if (!list.stdout.includes(`rclone mount`) || !list.stdout.includes(`${remoteName}:`)) {
            return { success: true, message: `${remoteName} is not enabled for auto-mount.` };
        }

        const tempFile = path.join(os.tmpdir(), `cron_${Date.now()}`);
        fs.writeFileSync(tempFile, list.stdout);

        const content = fs.readFileSync(tempFile, 'utf8');
        const lines = content.split('\n');
        // Filter out lines that look like a mount for this remote
        const newLines = lines.filter(line => {
            const isTarget = line.includes('rclone mount') && line.includes(`${remoteName}:`);
            return !isTarget && line.trim() !== '';
        });

        const newContent = newLines.join('\n') + (newLines.length > 0 ? '\n' : '');

        fs.writeFileSync(tempFile, newContent);
        await execPromise(`crontab "${tempFile}"`);
        fs.unlinkSync(tempFile);

        return { success: true, message: `Disabled auto-mount for ${remoteName}.` };

    } catch (e) {
        return { success: false, message: `Failed to disable auto-mount: ${e.stderr || e.message}` };
    }
});




// --- Plugin & Config Functions ---

ipcMain.handle('add_remote_with_plugin', async (event, { pluginName, config, configPathOpt }) => {
    // 1. Find plugin to validate and get details
    const potentialPaths = [
        path.join(__dirname, 'plugins'),
        path.join(process.cwd(), 'plugins'),
    ];
    let pluginDir = null;
    for (const p of potentialPaths) {
        const testPath = path.join(p, pluginName);
        if (fs.existsSync(testPath)) {
            pluginDir = testPath;
            break;
        }
    }

    if (!pluginDir) {
        throw new Error(`Plugin ${pluginName} not found`);
    }

    const pluginConfigPath = path.join(pluginDir, 'config.json');
    const pluginData = JSON.parse(fs.readFileSync(pluginConfigPath, 'utf8'));

    // 2. Validate
    const allFields = [...(pluginData.basic_fields || []), ...(pluginData.advanced_fields || [])];
    for (const field of allFields) {
        if (field.required && !config[field.name]) {
            throw new Error(`Required field '${field.name}' is missing`);
        }
        // Basic type validation could go here
    }

    // 3. Process Config (Password Obfuscation)
    const processedConfig = { ...config };
    if (processedConfig.pass) {
        try {
            const { stdout } = await execPromise(`"${getRclonePath()}" obscure "${processedConfig.pass}"`);
            processedConfig.pass = stdout.trim();
        } catch (e) {
            throw new Error(`Failed to obscure password: ${e.message}`);
        }
    }

    // 4. Update rclone.conf
    const configPath = getRcloneConfigPath(configPathOpt);
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    let currentConfigContent = "";
    if (fs.existsSync(configPath)) {
        currentConfigContent = fs.readFileSync(configPath, 'utf8');
    }

    const remoteName = processedConfig.remote_name;
    if (!remoteName) throw new Error("remote_name is required");

    let newBlock = `\n[${remoteName}]\ntype = ${pluginName}\n`;
    for (const key in processedConfig) {
        if (key === 'remote_name') continue;
        newBlock += `${key} = ${processedConfig[key]}\n`;
    }

    fs.writeFileSync(configPath, currentConfigContent + newBlock);

    return { success: true, message: `Successfully added remote '${remoteName}'` };
});

ipcMain.handle('delete_remote', async (event, { remoteName, configPathOpt }) => {
    const configPath = getRcloneConfigPath(configPathOpt);
    if (!fs.existsSync(configPath)) {
        return { success: false, message: 'Config file not found' };
    }

    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const lines = content.split('\n');
        const newLines = [];
        let deleting = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                const section = trimmed.slice(1, -1);
                if (section === remoteName) {
                    deleting = true;
                } else {
                    deleting = false;
                }
            }

            if (!deleting) {
                newLines.push(line);
            }
        }

        fs.writeFileSync(configPath, newLines.join('\n'));
        return { success: true, message: `Deleted remote ${remoteName}` };
    } catch (e) {
        return { success: false, message: `Failed to delete remote: ${e.message}` };
    }
});

ipcMain.handle('open_file_dialog', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Config Files', extensions: ['conf'] }]
    });
    return filePaths.length > 0 ? filePaths[0] : null;
});

ipcMain.handle('get_remote_config', async (event, { remoteName, configPathOpt }) => {
    const configPath = getRcloneConfigPath(configPathOpt);
    if (!fs.existsSync(configPath)) throw new Error(`rclone.conf not found`);

    const content = fs.readFileSync(configPath, 'utf8');
    const lines = content.split('\n');
    let inSection = false;
    const result = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const section = trimmed.slice(1, -1);
            if (inSection && section !== remoteName) break;
            inSection = section === remoteName;
        } else if (inSection) {
            const parts = trimmed.split('=');
            if (parts.length > 1) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                result[key] = value;
            }
        }
    }
    return result;
});
