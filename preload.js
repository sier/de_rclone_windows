const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    // Add other necessary APIs here if needed, but 'invoke' should cover most Tauri porting
});

// Also expose a flag to let the frontend know it's running in Electron
contextBridge.exposeInMainWorld('isElectron', true);
