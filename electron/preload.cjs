const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (json) => ipcRenderer.invoke('data:save', json),
  saveSync: (json) => ipcRenderer.sendSync('data:saveSync', json),
  applySettings: (settings) => ipcRenderer.invoke('settings:apply', settings),
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  setStatus: (text) => ipcRenderer.invoke('tray:status', text),
  openDataFolder: () => ipcRenderer.invoke('data:openFolder'),
  dataPath: () => ipcRenderer.invoke('data:path'),
  onResume: (cb) => ipcRenderer.on('system:resume', () => cb()),
  onNavigate: (cb) => ipcRenderer.on('navigate', (_e, view) => cb(view)),
});
