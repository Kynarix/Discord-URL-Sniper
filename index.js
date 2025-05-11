const WebSocket=require('ws'),tls=require('tls'),extractJson=require('extract-json-string'),fs=require('fs'),https=require('https');
let chalk;
(async () => {
  chalk = (await import('chalk')).default;
  const open = (await import('open')).default;
  open('https://discord.gg/codejs');
})();

const config = {
  token: "",
  serverid: "",
  password: "",
  webhook: ""
};

let guilds={},lastSeq=null,hbInterval=null,mfaToken=null,mfaTokenLastChecked=0,lastMfaFileTime=0;

function logHeader(title) {
  console.log(chalk.bgBlue.white.bold(`\n========== ${title} ==========`));
}
function logSuccess(msg) {
  console.log(chalk.greenBright('✔ ') + chalk.white(msg));
}
function logError(msg) {
  console.log(chalk.redBright('✖ ') + chalk.white(msg));
}
function logWarn(msg) {
  console.log(chalk.yellowBright('! ') + chalk.white(msg));
}
function logInfo(msg) {
  console.log(chalk.cyanBright('ℹ ') + chalk.white(msg));
}

function safeExtract(d){if(typeof d!=='string')try{return JSON.stringify(d)}catch(e){return null}try{return extractJson.extract(d)}catch(e){return null}}
function readMfaToken(force=false){const now=Date.now();try{const stats=fs.statSync('mfatoken.json');if(mfaToken&&stats.mtimeMs<=lastMfaFileTime&&!force)return mfaToken;lastMfaFileTime=stats.mtimeMs;const data=fs.readFileSync('mfatoken.json','utf8');const tokenData=JSON.parse(data);if(tokenData&&tokenData.token){if(tokenData.token!==mfaToken){mfaToken=tokenData.token;logInfo(`MFA: ${mfaToken}`);}else{mfaToken=tokenData.token;}mfaTokenLastChecked=now;return mfaToken;}}catch(e){}return mfaToken;}

async function getMFAToken(token, serverID, password) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'discord.com',
            path: `/api/v9/guilds/${serverID}/vanity-url`,
            method: 'PATCH',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'X-Super-Properties': 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6InRyLVRSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkiLCJicm93c2VyX3ZlcnNpb24iOiIxMjEuMC4wLjAiLCJvc192ZXJzaW9uIjoiMTAiLCJyZWZlcnJlciI6IiIsInJlZmVycmluZ19kb21haW4iOiIiLCJyZWZlcnJlcl9jdXJyZW50IjoiIiwicmVmZXJyaW5nX2RvbWFpbl9jdXJyZW50IjoiIiwicmVsZWFzZV9jaGFubmVsIjoic3RhYmxlIiwiY2xpZW50X2J1aWxkX251bWJlciI6MjAwODQyLCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsfQ=='
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    const response = JSON.parse(data);
                    let ticket = '';
                    
                    if (response.mfa && response.mfa.ticket) {
                        ticket = response.mfa.ticket;
                    } else if (response.ticket) {
                        ticket = response.ticket;
                    }

                    if (!ticket) {
                        logWarn("kynarix & .gg/code.js: MFA alma işlemi başarısız.");
                        resolve("");
                        return;
                    }

                    logSuccess("kynarix & .gg/code.js: MFA başarıyla alındı.");

                    const mfaOptions = {
                        hostname: 'discord.com',
                        path: '/api/v9/mfa/finish',
                        method: 'POST',
                        headers: {
                            'Authorization': token,
                            'Content-Type': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                            'X-Super-Properties': 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6InRyLVRSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkiLCJicm93c2VyX3ZlcnNpb24iOiIxMjEuMC4wLjAiLCJvc192ZXJzaW9uIjoiMTAiLCJyZWZlcnJlciI6IiIsInJlZmVycmluZ19kb21haW4iOiIiLCJyZWZlcnJlcl9jdXJyZW50IjoiIiwicmVmZXJyaW5nX2RvbWFpbl9jdXJyZW50IjoiIiwicmVsZWFzZV9jaGFubmVsIjoic3RhYmxlIiwiY2xpZW50X2J1aWxkX251bWJlciI6MjAwODQyLCJjbGllbnRfZXZlbnRfc291cmNlIjpudWxsfQ=='
                        }
                    };

                    const mfaReq = https.request(mfaOptions, (mfaRes) => {
                        let mfaData = '';
                        mfaRes.on('data', (chunk) => mfaData += chunk);
                        mfaRes.on('end', () => {
                            try {
                                const mfaResponse = JSON.parse(mfaData);
                                if (mfaResponse.token) {
                                    logSuccess("kynarix & .gg/code.js: mfa aldim la sonunda");
                                    resolve(mfaResponse.token);
                                } else {
                                    logError("kynarix & .gg/code.js: mfa alınamadı");
                                    resolve("");
                                }
                            } catch (e) {
                                logError("json hatasi");
                                resolve("");
                            }
                        });
                    });

                    mfaReq.write(JSON.stringify({
                        ticket: ticket,
                        mfa_type: "password",
                        data: password
                    }));
                    mfaReq.end();

                } catch (e) {
                    logError("JSON hatası: " + e);
                    resolve("");
                }
            });
        });

        req.write(JSON.stringify({ code: null }));
        req.end();
    });
}

async function updateMFAToken() {
    const newToken = await getMFAToken(config.token, config.serverid, config.password);
    if (newToken) {
        mfaToken = newToken;
        const tokenData = { token: mfaToken };
        fs.writeFileSync('mfatoken.json', JSON.stringify(tokenData));
        logSuccess("kynarix & .gg/code.js: Mfa kaydedildi");
    } else {
        logWarn("kynarix & .gg/code.js: MFA token alınamadı tekrar deniyom");
    }
}

setInterval(updateMFAToken, 5 * 60 * 1000);

updateMFAToken();

async function req(m, p, b=null) {
  return new Promise(r => {
    const s = tls.connect({host:'canary.discord.com',port:443,rejectUnauthorized:false}, () => {
      const h = [
        `${m} ${p} HTTP/1.1`,
        'Host: canary.discord.com',
        `Authorization: ${config.token}`,
        `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0`,
        `X-Super-Properties: eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRmlyZWZveCIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJ0ci1UUiIsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQ7IHJ2OjEzMy4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94LzEzMy4wIiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTMzLjAiLCJvc192ZXJzaW9uIjoiMTAiLCJyZWZlcnJlciI6Imh0dHBzOi8vd3d3Lmdvb2dsZS5jb20vIiwicmVmZXJyaW5nX2RvbWFpbiI6Ind3dy5nb29nbGUuY29tIiwic2VhcmNoX2VuZ2luZSI6Imdvb2dsZSIsInJlZmVycmVyX2N1cnJlbnQiOiIiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJjYW5hcnkiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjozNTYxNDAsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGwsImhhc19jbGllbnRfbW9kcyI6ZmFsc2V9`
      ];
      
      if(mfaToken) h.push(`X-Discord-MFA-Authorization: ${mfaToken}`);
      if(b) h.push('Content-Type: application/json', `Content-Length: ${Buffer.byteLength(b)}`);
      h.push('Connection: close', '', b || '');
      s.write(h.join('\r\n'));
      
      let d = ''; s.on('data', c => d += c.toString());
      s.on('end', () => {
        const i = d.indexOf('\r\n\r\n'); if(i === -1) { r('{}'); return s.destroy(); }
        let body = d.slice(i + 4);
        if(d.toLowerCase().includes('transfer-encoding: chunked')) {
          let res = '', o = 0;
          while(o < body.length) {
            const e = body.indexOf('\r\n', o); if(e === -1) break;
            const z = parseInt(body.substring(o, e), 16); if(z === 0) break;
            res += body.substring(e + 2, e + 2 + z); o = e + 2 + z + 2;
          }
          body = res || '{}';
        }
        if(!p.includes('/vanity-url')) { const ext = safeExtract(body); if(ext) { r(ext); return s.destroy(); } }
        r(body); s.destroy();
      });
      s.on('error', () => { r('{}'); s.destroy(); });
    });
    s.setTimeout(1000, () => { r('{}'); s.destroy(); });
  });
}

function connect() {
  req("GET", "/api/v9/gateway").then(res => {
    let url; try { url = JSON.parse(res)?.url; } catch(e) { const ext = safeExtract(res); if(ext) try { url = JSON.parse(ext)?.url; } catch(e) {} }
    const ws = new WebSocket(url || "wss://gateway.discord.gg/?v=9&encoding=json");
    
    ws.on("open", () => ws.send(JSON.stringify({op: 2, d: {token: config.token, intents: 513, properties: {os: "Windows", browser: "Discord.js", device: "Desktop"}}})));
    
    ws.on("message", async d => {
      try {
        let p;
        try { 
            p = typeof d === 'string' ? JSON.parse(d) : JSON.parse(d.toString()); 
        } catch(e) { 
            const j = safeExtract(d.toString()); 
            if(j) p = JSON.parse(j); 
            else return; 
        }

        if(p.s) lastSeq = p.s;
        if(p.op === 10) { 
            clearInterval(hbInterval); 
            hbInterval = setInterval(() => ws.send(JSON.stringify({op: 1, d: lastSeq})), p.d.heartbeat_interval); 
        }
        
        if(p.t === "READY") {
          p.d.guilds.filter(g => g.vanity_url_code).forEach(g => {
            guilds[g.id] = g.vanity_url_code;
          });
          
          logInfo("Sunuculardaki vanity URL'ler:");
          
          console.log("SERVERLIST_BEGIN");
          
          
          const serverListData = JSON.stringify(guilds);
          console.log(`SERVERLIST_DATA:${serverListData}`);
          
          console.log("SERVERLIST_END");
          
          const DEBUG = false;
          if (DEBUG) {
            console.table(guilds);
          }
        }
        
        if(p.t === "GUILD_UPDATE") {
          const id = p.d.id || p.d.guild_id;
          const oldCode = guilds[id];
          const newCode = p.d.vanity_url_code;

          if(oldCode && oldCode !== newCode) {
            logWarn(`Yeni URL fırsatı: ${oldCode}`);
            await sendWebhookMessage(`🎯 Yeni URL fırsatı: ${oldCode}`, 0xffff00);
            readMfaToken();
            
            if(mfaToken) {
              const req1 = snipeVanityURL(oldCode);
              const req2 = snipeVanityURL(oldCode);
              const [r1, r2] = await Promise.all([req1, req2]);
              
              if(r1 || r2) {
                logSuccess(`URL başarıyla alındı: ${oldCode}`);
              } else {
                logError(`URL alınamadı: ${oldCode}`);
              }
            }
          }

          if(newCode) guilds[id] = newCode;
          else if(guilds[id]) delete guilds[id];
        }
      } catch(e) {
        logError(`Hata: ${e.message}`);
        await sendWebhookMessage(`💥 Hata: ${e.message}`, 0xff0000);
      }
    });
    
    ws.on("close", () => { clearInterval(hbInterval); setTimeout(connect, 5000); });
    ws.on("error", () => ws.close());
  }).catch(() => setTimeout(connect, 5000));
}

async function sendWebhookMessage(content, color = 0x00ff00) {
    try {
        const embed = {
            title: "Discord URL Sniper",
            description: content,
            color: color,
            timestamp: new Date().toISOString()
        };

        const payload = {
            embeds: [embed]
        };

        const options = {
            hostname: 'discord.com',
            path: config.webhook.split('discord.com')[1],
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 204) {
                    logError(`Webhook hatası: ${data}`);
                }
            });
        });

        req.write(JSON.stringify(payload));
        req.end();
    } catch (error) {
        logError(`Webhook gönderme hatası: ${error.message}`);
    }
}

async function snipeVanityURL(code) {
    try {
        const response = await req("PATCH", `/api/v9/guilds/${config.serverid}/vanity-url`, JSON.stringify({code: code}));
        const data = JSON.parse(response);
        
        if (data.code && typeof data.code === 'string') {
            logSuccess(`URL başarıyla alındı: ${data.code}`);
            await sendWebhookMessage(`🎯 URL başarıyla alındı: ${data.code}`, 0x00ff00);
            return true;
        } else if (data.code && typeof data.code === 'number') {
            logError(`URL alınamadı: ${data.code} - ${data.errors ? data.errors.join(', ') : 'No additional information'}`);
            await sendWebhookMessage(`❌ URL alınamadı: ${data.code} - ${data.errors ? data.errors.join(', ') : 'No additional information'}`, 0xff0000);
            return false;
        } else if (data.errors) {
            logError(`URL alınamadı: ${JSON.stringify(data.errors)}`);
            await sendWebhookMessage(`❌ URL alınamadı: ${JSON.stringify(data.errors)}`, 0xff0000);
            return false;
        }
    } catch (error) {
        logError(`Hata: ${error.message}`);
        await sendWebhookMessage(`💥 Hata: ${error.message}`, 0xff0000);
        return false;
    }
}

(async()=>{readMfaToken(true);connect();setInterval(()=>readMfaToken(false),15000);})();
process.on('uncaughtException',()=>{});