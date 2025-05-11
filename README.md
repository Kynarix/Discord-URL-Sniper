# Discord Vanity URL Sniper & MFA Token Manager
![Discord Vanity URL Sniper & MFA Token Manager](https://i.imgur.com/12KJGWj.png)
## Özellikler
- Discord sunucularında vanity URL (özel davet linki) sniper
- Otomatik MFA (2FA) token alma ve yenileme
- Webhook ile bildirim gönderme
- Gerçek zamanlı sunucu listesi takibi

## Gereksinimler
- **Node.js v18+**
- Discord hesabı (MFA aktif olmalı, aksi halde MFA tokeni zorunlu değildir fakat çoğu sunucuda gereklidir)

## Kurulum
1. **Node.js v18 veya üzeri** kurulu olmalı. [Node.js İndir](https://nodejs.org/)
2. Proje klasöründe terminal aç:
   ```bash
   npm install
   ```
   Bu komut gerekli tüm bağımlılıkları yükler.
3. Hızlı başlatma için `start.bat` dosyasını çalıştırabilirsiniz.

## Yapılandırma
### GUI Üzerinden
1. Electron arayüzünü başlat: `npm run dev`
2. "Ayarlar" sekmesine tıkla
3. Discord hesap token, sunucu ID, hesap şifresi ve webhook bilgilerini doldur
4. "Kaydet" butonuna tıkla ve "Yeniden Başlat" ile değişiklikleri uygula

### Manuel Yapılandırma
`index.js` dosyasındaki `config` kısmını doldur:
```js
const config = {
  token: "DISCORD_TOKEN_BURAYA",
  serverid: "SUNUCU_ID_BURAYA",
  password: "HESAP_SIFRESI_BURAYA", // MFA aktif değilse zorunlu değildir
  webhook: "WEBHOOK_URL_BURAYA"
};
```
- **token**: Discord hesabının tokeni (aşağıda nasıl alınacağı anlatıldı)
- **serverid**: Snipe yapılacak sunucunun ID'si
- **password**: Hesabının şifresi (MFA aktifse zorunlu, değilse boş bırakılabilir)
- **webhook**: Discord webhook URL'si (bildirim için)

## Discord Tokeni Nasıl Alınır?
1. Discord'u web tarayıcıda aç.
2. F12 ile geliştirici araçlarını aç.
3. Network sekmesine gel, bir mesaj gönder.
4. Herhangi bir isteği seç, Headers kısmında `Authorization` satırını bul. Oradaki değer senin tokenindir.

Alternatif olarak konsola şunu yapıştır:
```js
window.webpackChunkdiscord_app.push([[Math.random()], {}, (req) => {for (const m of Object.keys(req.c).map((x) => req.c[x].exports).filter((x) => x)) {if (m.default && m.default.getToken !== undefined) {console.log(m.default.getToken())}}}]);
```
Çıkan değeri kopyala ve `config.token` kısmına yapıştır.

## Kullanım
Electron arayüzü ile çalıştırmak için:
```bash
npm run dev
```



## MFA Tokeni Nasıl Alınır?
- Script, MFA tokenini otomatik olarak alır ve `mfatoken.json` dosyasına kaydeder.
- Her 5 dakikada bir token yenilenir.
- MFA tokeni almak için şifrenin doğru olması gerekir.
- **Not:** Eğer hesabında MFA (2FA) aktif değilse, şifre ve MFA tokeni zorunlu değildir.

## Sıkça Sorulanlar ❓
- **Tokenim veya şifrem yanlışsa ne olur?**
  - MFA token alınamaz, konsolda uyarı görürsün.
- **Webhook bildirimleri gelmiyor?**
  - Webhook URL'sini doğru girdiğinden emin ol.
- **MFA token zorunlu mu?**
  - Hesabında iki faktörlü kimlik doğrulama (MFA/2FA) aktifse zorunludur. Eğer aktif değilse, şifre ve MFA tokeni zorunlu değildir.


## Katkı ve Destek
- Discord sunucumuz: [discord.gg/codejs](https://discord.gg/codejs)
- Yapımcı: Kynarix

---

> **Uyarı:** Bu yazılım Kynarix tarafından discord.gg/codejs için özel olarak yazılmıştır ve satışı kesinlikle yasaktır.
