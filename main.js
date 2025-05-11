const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
let mainWindow;
let childProcess = null;
let logBuffer = [];

let collectingServerList = false;
let tempServerList = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#2b2b2b',
    autoHideMenuBar: true,
    title: 'Discord URL Sniper - Kynarix',
  });

  mainWindow.loadFile('ui/index.html');
  
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.key.toLowerCase() === 'r') || 
        (input.key === 'F5') || 
        (input.key === 'F12')) {
      event.preventDefault();
    }
  });
  
}

app.whenReady().then(() => {
  createWindow();
  
  startProcess();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  if (childProcess) {
    try {
      childProcess.kill();
      childProcess = null;
    } catch (error) {
      console.error('Çocuk işlem kapatılırken hata:', error);
    }
  }
});

ipcMain.on('restart-process', () => {
  if (childProcess) {
    childProcess.kill();
  }
  startProcess();
});

ipcMain.on('get-logs', () => {
  mainWindow.webContents.send('logs', logBuffer);
});

function processLogLine(line) {
  const timestamp = new Date().toLocaleTimeString();

  if (line.includes("SERVERLIST_BEGIN")) {
    collectingServerList = true;
    tempServerList = [];
    return { type: 'server-list-begin', content: "Sunucu Listesi:", time: timestamp };
  }
  
  if (line.includes("SERVERLIST_END")) {
    collectingServerList = false;
    return { 
      type: 'server-list-end', 
      content: "Sunucu listesi sonu", 
      time: timestamp,
      serverList: tempServerList 
    };
  }

  if (collectingServerList && line.includes("SERVERLIST_DATA:")) {
    try {
      const jsonStr = line.replace("SERVERLIST_DATA:", "");
      const serverData = JSON.parse(jsonStr);
      
      Object.entries(serverData).forEach(([id, vanity]) => {
        tempServerList.push({ id, url: vanity });
      });
      
      return { 
        type: 'server-list-data', 
        content: `${Object.keys(serverData).length} sunucu bulundu.`, 
        time: timestamp,
        serverData
      };
    } catch (e) {
      return { type: 'error', content: `Sunucu verileri ayrıştırılamadı: ${e.message}`, time: timestamp };
    }
  }
  
  if (collectingServerList && line.includes("Sunucu:") && line.includes("Vanity URL:")) {
    const parts = line.split("→");
    if (parts.length === 2) {
      const serverPart = parts[0].trim().replace("Sunucu: ", "");
      const urlPart = parts[1].trim().replace("Vanity URL: ", "");
      
      tempServerList.push({ id: serverPart, url: urlPart });
      
      return { 
        type: 'server-item', 
        content: line, 
        time: timestamp,
        serverId: serverPart,
        vanityUrl: urlPart
      };
    }
  }
  
  if (line.includes('URL başarıyla alındı')) {
    return { type: 'success', content: line, time: timestamp };
  } else if (line.includes('URL alınamadı')) {
    return { type: 'error', content: line, time: timestamp };
  } else if (line.includes('Yeni URL fırsatı')) {
    return { type: 'warn', content: line, time: timestamp };
  } else if (line.includes('==========')) {
    return { type: 'header', content: line, time: timestamp };
  } else if (line.includes('MFA')) {
    return { type: 'info', content: line, time: timestamp };
  } else if (line.includes('Sunuculardaki vanity URL')) {
    return { type: 'info', content: line, time: timestamp, isTableHeader: true };
  } else if (line.startsWith('│') || line.startsWith('┌') || line.startsWith('└') || line.startsWith('├')) {
    return { type: 'hidden', content: line, time: timestamp };
  } else {
    return { type: 'log', content: line, time: timestamp };
  }
}

function startProcess() {
  logBuffer = []; 
  
  childProcess = spawn('node', ['index.js']);
  
  childProcess.stdout.on('data', (data) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    const lines = data.toString().split('\n').filter(line => line.trim() !== '');
    
    lines.forEach(line => {
      const logEntry = processLogLine(line);
      logBuffer.push(logEntry);
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('new-log', logEntry);
      }
    });
  });
  
  childProcess.stderr.on('data', (data) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    const line = data.toString().trim();
    const logEntry = { type: 'error', content: line, time: new Date().toLocaleTimeString() };
    logBuffer.push(logEntry);
    mainWindow.webContents.send('new-log', logEntry);
  });
  
  childProcess.on('close', (code) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    
    const logEntry = { 
      type: 'info', 
      content: `Process exited with code ${code}`, 
      time: new Date().toLocaleTimeString() 
    };
    logBuffer.push(logEntry);
    mainWindow.webContents.send('new-log', logEntry);
  });
} 