const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const pkg = require('./package.json');
  const win = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    resizable: true,
    title: `Pixel Painter v${pkg.version}`
  });

  let updateMode = 'release';

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript('localStorage.getItem("updateMode")').then(mode => {
      if (mode) updateMode = mode;
      runUpdater(updateMode);
    });
  });
  win.webContents.on('console-message', (e, level, message) => {
    if (message.startsWith('updateMode:')) {
      updateMode = message.split(':')[1];
      runUpdater(updateMode);
    }
  });
  win.webContents.on('ipc-message', (event, channel, data) => {
    if (channel === 'window-message' && data && data.type === 'updateMode') {
      updateMode = data.value;
      runUpdater(updateMode);
    }
  });

  function runUpdater(mode) {
    if (mode === 'release') {
      autoUpdater.checkForUpdatesAndNotify();
    } else if (mode === 'commit') {
      // would require custom update server, not implemented
    } else if (mode === 'never') {
      // nothing
    }
  }
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Export',
          click: async () => {
            const { canceled, filePath } = await dialog.showSaveDialog(win, {
              title: 'Export',
              defaultPath: 'pixel-art.pp',
              filters: [
                { name: 'PixelPainterPP', extensions: ['pp'] },
              ],
            });
            if (!canceled && filePath) {
              win.webContents.send('export-pp', filePath);
            }
          },
        },
        {
          label: 'Import',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(win, {
              title: 'Import',
              filters: [
                { name: 'PixelPainterPP', extensions: ['pp'] },
              ],
              properties: ['openFile'],
            });
            if (!canceled && filePaths && filePaths[0]) {
              fs.readFile(filePaths[0], 'utf8', (err, data) => {
                if (err) {
                  dialog.showErrorBox('Import Failed', err.message);
                } else {
                  win.webContents.send('import-pp-data', data);
                }
              });
            }
          },
        },
        {
          label: 'Export As',
          submenu: [
            {
              label: 'PNG',
              click: async () => {
                const { canceled, filePath } = await dialog.showSaveDialog(win, {
                  title: 'Export as PNG',
                  defaultPath: 'pixel-art.png',
                  filters: [
                    { name: 'PNG Image', extensions: ['png'] },
                  ],
                });
                if (!canceled && filePath) {
                  win.webContents.send('export-image', filePath);
                }
              },
            },
            {
              label: 'JPG',
              click: async () => {
                const { canceled, filePath } = await dialog.showSaveDialog(win, {
                  title: 'Export as JPG',
                  defaultPath: 'pixel-art.jpg',
                  filters: [
                    { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
                  ],
                });
                if (!canceled && filePath) {
                  win.webContents.send('export-image', filePath);
                }
              },
            },
            {
              label: 'PP',
              click: async () => {
                const { canceled, filePath } = await dialog.showSaveDialog(win, {
                  title: 'Export as .pp',
                  defaultPath: 'pixel-art.pp',
                  filters: [
                    { name: 'PixelPainterPP', extensions: ['pp'] },
                  ],
                });
                if (!canceled && filePath) {
                  win.webContents.send('export-pp', filePath);
                }
              },
            },
          ],
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
  win.loadFile('index.html');
  win.setTitle(`Pixel Painter v${pkg.version}`);
}

ipcMain.on('export-image-data', (event, { filePath, dataUrl }) => {
  const base64 = dataUrl.split(',')[1];
  const ext = path.extname(filePath).toLowerCase();
  let buffer = Buffer.from(base64, 'base64');
  fs.writeFile(filePath, buffer, err => {
    if (err) {
      dialog.showErrorBox('Export Failed', err.message);
    }
  });
});

ipcMain.on('export-pp-data', (event, { filePath, ppData }) => {
  fs.writeFile(filePath, ppData, 'utf8', err => {
    if (err) {
      dialog.showErrorBox('Export Failed', err.message);
    }
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
