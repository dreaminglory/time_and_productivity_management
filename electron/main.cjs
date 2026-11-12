const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage, shell, powerMonitor } = require('electron');
const fs = require('fs');
const path = require('path');

const APP_ID = 'com.dimitar.daytracker';
const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const ICON_PATH = path.join(__dirname, 'icon.png');

let win = null;
let tray = null;
let isQuitting = false;
let closeToTray = true;

const dataDir = () => app.getPath('userData');
const dataFile = () => path.join(dataDir(), 'data.json');

// ---------- storage ----------

function loadData() {
  const file = dataFile();
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    // Keep the last good copy from each app start as a safety net against corruption.
    fs.copyFileSync(file, file + '.bak');
    keepDailyBackup(file);
    return parsed;
  } catch {
    const bak = file + '.bak';
    if (fs.existsSync(bak)) return JSON.parse(fs.readFileSync(bak, 'utf8'));
    return null;
  }
}

/** One dated copy per day in backups/, newest 30 kept, so a single bad start can never wipe the only backup. */
function keepDailyBackup(file) {
  try {
    const dir = path.join(path.dirname(file), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const target = path.join(dir, `data-${stamp}.json`);
    if (!fs.existsSync(target)) fs.copyFileSync(file, target);
    const old = fs.readdirSync(dir).filter((n) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().slice(0, -30);
    for (const n of old) fs.unlinkSync(path.join(dir, n));
  } catch {
    // Backups are best-effort; never block the app from starting.
  }
}

function saveData(json) {
  fs.mkdirSync(dataDir(), { recursive: true });
  const file = dataFile();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, file);
}

// ---------- window & tray ----------

function showWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#0f1117',
    title: 'Day Tracker',
    icon: ICON_PATH,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.on('close', (e) => {
    if (closeToTray && !isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => {
    win = null;
  });
}

function createTray() {
  const image = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });
  tray = new Tray(image);
  tray.setToolTip('Day Tracker');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Day Tracker', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', showWindow);
}

// ---------- IPC ----------

ipcMain.handle('data:load', () => loadData());
ipcMain.handle('data:save', (_e, json) => saveData(json));
ipcMain.on('data:saveSync', (e, json) => {
  saveData(json);
  e.returnValue = true;
});
ipcMain.handle('data:path', () => dataFile());
ipcMain.handle('data:openFolder', () => shell.openPath(dataDir()));

ipcMain.handle('settings:apply', (_e, settings) => {
  closeToTray = !!settings.closeToTray;
  // Login items only make sense for the installed app, not the dev build.
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!settings.startWithWindows });
});

ipcMain.handle('notify', (_e, title, body, view) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: ICON_PATH });
  n.on('click', () => {
    showWindow();
    win?.webContents.send('navigate', view || 'today');
  });
  n.show();
});

ipcMain.handle('tray:status', (_e, text) => {
  tray?.setToolTip(text ? `Day Tracker — ${text}` : 'Day Tracker');
});

// ---------- lifecycle ----------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.setAppUserModelId(APP_ID);

  app.whenReady().then(() => {
    createWindow();
    createTray();
    powerMonitor.on('resume', () => win?.webContents.send('system:resume'));
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });
  app.on('activate', showWindow);
  app.on('window-all-closed', () => {
    if (!closeToTray) app.quit();
  });
}
