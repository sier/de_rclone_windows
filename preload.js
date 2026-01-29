const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    shell: {
        openExternal: (url) => ipcRenderer.invoke('open_external', url)
    }
});

// Also expose a flag to let the frontend know it's running in Electron
contextBridge.exposeInMainWorld('isElectron', true);
