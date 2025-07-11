const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    resizable: true,
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Export As...',
          click: async () => {
            const { canceled, filePath } = await dialog.showSaveDialog(win, {
              title: 'Export As...',
              defaultPath: 'pixel-art.png',
              filters: [
                { name: 'PNG Image', extensions: ['png'] },
                { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
              ],
            });
            if (!canceled && filePath) {
              win.webContents.send('export-image', filePath);
            }
          },
        },
        {
          label: 'Export as .pp',
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
        {
          label: 'Import .pp',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(win, {
              title: 'Import .pp',
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
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
  win.loadFile('index.html');
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
