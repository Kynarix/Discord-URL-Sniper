const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const logContainer = document.getElementById('logs');
const clearLogsBtn = document.getElementById('clear-logs');
const restartBtn = document.getElementById('restart');
const statusEl = document.getElementById('status');
const connectionEl = document.querySelector('#connection span');
const configInputs = {
  token: document.getElementById('token'),
  serverid: document.getElementById('serverid'),
  password: document.getElementById('password'),
  webhook: document.getElementById('webhook')
};
const saveConfigBtn = document.getElementById('save-config');

const panels = {
  logs: document.getElementById('logs-panel'),
  config: document.getElementById('config-panel'),
  info: document.getElementById('info-panel')
};

const navButtons = {
  logs: document.getElementById('logs-btn'),
  config: document.getElementById('config-btn'),
  info: document.getElementById('info-btn')
};


Object.keys(navButtons).forEach(key => {
  navButtons[key].addEventListener('click', () => {
    Object.values(panels).forEach(panel => panel.classList.remove('active'));
    Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
    
    panels[key].classList.add('active');
    navButtons[key].classList.add('active');
    
    if (key === 'config') {
      loadConfigValues();
    }
  });
});


clearLogsBtn.addEventListener('click', () => {
  logContainer.innerHTML = '';
  appendLog('Log temizlendi', 'info');
});


restartBtn.addEventListener('click', () => {
  setStatus('Yeniden başlatılıyor...', 'warn');
  ipcRenderer.send('restart-process');
  logContainer.innerHTML = '';
  appendLog('Uygulama yeniden başlatılıyor...', 'info');
});


saveConfigBtn.addEventListener('click', () => {
  const config = {
    token: configInputs.token.value,
    serverid: configInputs.serverid.value,
    password: configInputs.password.value,
    webhook: configInputs.webhook.value
  };
  
  try {
    const filePath = path.join(__dirname, '../index.js');
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = content.replace(
      /const\s+config\s*=\s*{[\s\S]*?};/m,
      `const config = {
  token: "${config.token}",
  serverid: "${config.serverid}",
  password: "${config.password}",
  webhook: "${config.webhook}"
};`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    appendLog('Yapılandırma kaydedildi', 'success');
    setStatus('Yapılandırma kaydedildi. Yeniden başlatılıyor...', 'success');
    
    setTimeout(() => {
      ipcRenderer.send('restart-process');
    }, 1000);
  } catch (err) {
    appendLog('Yapılandırma kaydedilemedi: ' + err.message, 'error');
    setStatus('Yapılandırma kaydedilemedi!', 'error');
  }
});


function loadConfigValues() {
  try {
    const filePath = path.join(__dirname, '../index.js');
    const content = fs.readFileSync(filePath, 'utf8');
  
    const tokenMatch = content.match(/token:\s*"([^"]*)"/);
    const serveridMatch = content.match(/serverid:\s*"([^"]*)"/);
    const passwordMatch = content.match(/password:\s*"([^"]*)"/);
    const webhookMatch = content.match(/webhook:\s*"([^"]*)"/);
    
    if (tokenMatch) configInputs.token.value = tokenMatch[1];
    if (serveridMatch) configInputs.serverid.value = serveridMatch[1];
    if (passwordMatch) configInputs.password.value = passwordMatch[1];
    if (webhookMatch) configInputs.webhook.value = webhookMatch[1];
  } catch (err) {
    appendLog('Yapılandırma yüklenemedi: ' + err.message, 'error');
  }
}

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = '';
  statusEl.classList.add(type);
  
  if (type !== 'error') {
    setTimeout(() => {
      statusEl.textContent = 'Hazır';
      statusEl.className = '';
    }, 3000);
  }
}

function setConnectionStatus(connected) {
  connectionEl.textContent = connected ? 'Aktif' : 'Kapalı';
  connectionEl.className = connected ? 'connected' : 'disconnected';
}

loadConfigValues();

function setupInputVisibility() {
  console.log('Görünürlük düğmeleri ayarlanıyor...');
  
  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');
  
  if (togglePassword && passwordInput) {
    togglePassword.onclick = () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.innerHTML = type === 'password' ? 
        '<i class="fas fa-eye"></i>' : 
        '<i class="fas fa-eye-slash"></i>';
    };
  }

  const toggleToken = document.getElementById('toggle-token');
  const tokenInput = document.getElementById('token');
  
  if (toggleToken && tokenInput) {
    toggleToken.onclick = () => {
      const type = tokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
      tokenInput.setAttribute('type', type);
      toggleToken.innerHTML = type === 'password' ? 
        '<i class="fas fa-eye"></i>' : 
        '<i class="fas fa-eye-slash"></i>';
    };
  }
  
  const resetConfigBtn = document.getElementById('reset-config');
  if (resetConfigBtn) {
    resetConfigBtn.onclick = () => {
      configInputs.token.value = '';
      configInputs.serverid.value = '';
      configInputs.password.value = '';
      configInputs.webhook.value = '';
      setStatus('Ayarlar sıfırlandı', 'info');
    };
  }
}

setupInputVisibility();

navButtons.config.addEventListener('click', () => {
  setTimeout(setupInputVisibility, 100);
});

let currentServerList = [];
let isShowingServerList = false;
function appendLog(message, type = 'log', timestamp = null) {
  if (type === 'hidden') {
    return null;
  }
  
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;
  
  const timestampSpan = document.createElement('span');
  timestampSpan.className = 'timestamp';
  timestampSpan.textContent = timestamp || new Date().toLocaleTimeString();
  
  const contentSpan = document.createElement('span');
  contentSpan.className = 'content';
  contentSpan.textContent = message;
  
  logEntry.appendChild(timestampSpan);
  logEntry.appendChild(contentSpan);
  
  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
  
  return logEntry;
}

ipcRenderer.on('new-log', (event, log) => {
  if (log.type === 'server-list-begin') {
    isShowingServerList = true;
    currentServerList = [];
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'server-table-header';
    headerDiv.innerHTML = '<i class="fas fa-server"></i> Sunucu Listesi <span class="subtitle">(Vanity URL\'ler)</span>';
    logContainer.appendChild(headerDiv);
    
  } else if (log.type === 'server-list-data') {
    currentServerList = [...currentServerList];
    
    const serverListContainer = document.createElement('div');
    serverListContainer.className = 'server-list-container';
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'server-search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Vanity URL ara...';
    searchInput.className = 'server-search-input';
    
    searchContainer.appendChild(searchInput);
    serverListContainer.appendChild(searchContainer);
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'server-grid-container';
    
    const serverEntries = Object.entries(log.serverData);
    const totalServers = serverEntries.length;
    
    serverEntries.forEach(([id, vanity]) => {
      const serverCard = document.createElement('div');
      serverCard.className = 'server-card';
      serverCard.dataset.vanity = vanity.toLowerCase();
      
      const vanitySpan = document.createElement('span');
      vanitySpan.className = 'server-card-vanity';
      vanitySpan.textContent = vanity;
      
      serverCard.appendChild(vanitySpan);
      gridContainer.appendChild(serverCard);
      
      serverCard.setAttribute('title', `Sunucu ID: ${id}\nVanity URL: ${vanity}`);
      
      serverCard.addEventListener('click', () => {
        try {
          navigator.clipboard.writeText(vanity);
          setStatus(`"${vanity}" panoya kopyalandı`, 'success');
          setTimeout(() => setStatus('Hazır'), 2000);
        } catch (e) {
          console.error('Kopyalama hatası:', e);
        }
      });
    });
    
    searchInput.addEventListener('input', (e) => {
      const searchValue = e.target.value.toLowerCase().trim();
      
      const allCards = gridContainer.querySelectorAll('.server-card');
      let matchCount = 0;
      
      allCards.forEach(card => {
        const vanity = card.dataset.vanity;
        if (vanity.includes(searchValue)) {
          card.style.display = 'flex';
          matchCount++;
        } else {
          card.style.display = 'none';
        }
      });
      
      infoDiv.innerHTML = searchValue 
        ? `<i class="fas fa-info-circle"></i> "${searchValue}" için ${matchCount} sonuç bulundu. (Toplam ${totalServers} sunucu)` 
        : `<i class="fas fa-info-circle"></i> Toplam ${totalServers} sunucu. URL'ye tıklayarak kopyalayabilirsiniz.`;
    });
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'server-list-info';
    infoDiv.innerHTML = `<i class="fas fa-info-circle"></i> Toplam ${totalServers} sunucu. URL'ye tıklayarak kopyalayabilirsiniz.`;
    
    serverListContainer.appendChild(gridContainer);
    serverListContainer.appendChild(infoDiv);
    logContainer.appendChild(serverListContainer);
    
  } else if (log.type === 'server-item') {
    currentServerList.push({
      id: log.serverId,
      url: log.vanityUrl
    });
    
  } else if (log.type === 'server-list-end') {
    isShowingServerList = false;
    
  } else if (log.type === 'hidden') {
    
  } else {
    appendLog(log.content, log.type, log.time);
  }
});

ipcRenderer.send('get-logs');

ipcRenderer.on('logs', (event, logs) => {
  logs.forEach(log => {
    appendLog(log.content, log.type, log.time);
  });
});


setStatus('Hazır');
setConnectionStatus(true); 
