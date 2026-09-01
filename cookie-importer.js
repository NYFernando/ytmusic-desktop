const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');
const initSqlJs = require('sql.js/dist/sql-asm.js');

function isPrintableAscii(s) {
  if (!s || typeof s !== 'string') return false;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code > 0x7E) return false;
  }
  return true;
}

function detectDefaultBrowserName() {
  try {
    const psScript = `
      try {
        $prog = (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice' -ErrorAction SilentlyContinue).ProgId;
        if ($prog) { $prog } else {
          (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.html\\UserChoice' -ErrorAction SilentlyContinue).ProgId
        }
      } catch { '' }
    `.replace(/\r?\n\s*/g, ' ');

    const progId = execSync(`powershell.exe -NoProfile -NonInteractive -Command "${psScript}"`, {
      encoding: 'utf8',
      windowsHide: true
    }).trim().toLowerCase();

    if (progId.includes('operagx') || progId.includes('opera gx')) return 'Opera GX';
    if (progId.includes('opera')) return 'Opera';
    if (progId.includes('chrome')) return 'Google Chrome';
    if (progId.includes('edge') || progId.includes('msedge')) return 'Microsoft Edge';
    if (progId.includes('brave')) return 'Brave';
    if (progId.includes('vivaldi')) return 'Vivaldi';
    if (progId.includes('firefox')) return 'Firefox';
  } catch (e) {}
  return null;
}

function isBrowserRunning(browserName) {
  try {
    const processMap = {
      'Opera GX': ['opera'],
      'Opera': ['opera'],
      'Google Chrome': ['chrome'],
      'Microsoft Edge': ['msedge'],
      'Brave': ['brave'],
      'Vivaldi': ['vivaldi']
    };

    const exes = processMap[browserName] || ['chrome', 'opera', 'msedge', 'brave'];
    const ps = `Get-Process ${exes.join(',')} -ErrorAction SilentlyContinue | Select-Object -First 1`;
    const out = execSync(`powershell.exe -NoProfile -NonInteractive -Command "${ps}"`, {
      encoding: 'utf8',
      windowsHide: true
    }).trim();
    return out.length > 0;
  } catch (e) {
    return false;
  }
}

function getBrowserRoots() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const appData = process.env.APPDATA || '';

  const defaultName = detectDefaultBrowserName();

  const allBrowsers = [
    { name: 'Opera GX', path: path.join(appData, 'Opera Software', 'Opera GX Stable') },
    { name: 'Google Chrome', path: path.join(localAppData, 'Google', 'Chrome', 'User Data') },
    { name: 'Microsoft Edge', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data') },
    { name: 'Opera', path: path.join(appData, 'Opera Software', 'Opera Stable') },
    { name: 'Brave', path: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data') },
    { name: 'Vivaldi', path: path.join(localAppData, 'Vivaldi', 'User Data') },
    { name: 'Chromium', path: path.join(localAppData, 'Chromium', 'User Data') },
    { name: 'Yandex', path: path.join(localAppData, 'Yandex', 'YandexBrowser', 'User Data') },
    { name: 'Google Chrome Beta', path: path.join(localAppData, 'Google', 'Chrome Beta', 'User Data') },
    { name: 'Google Chrome Dev', path: path.join(localAppData, 'Google', 'Chrome Dev', 'User Data') },
    { name: 'Microsoft Edge Dev', path: path.join(localAppData, 'Microsoft', 'Edge Dev', 'User Data') }
  ];

  if (defaultName) {
    allBrowsers.sort((a, b) => {
      if (a.name.toLowerCase().includes(defaultName.toLowerCase())) return -1;
      if (b.name.toLowerCase().includes(defaultName.toLowerCase())) return 1;
      return 0;
    });
  }

  return allBrowsers;
}

function getMasterKey(localStatePath) {
  if (!fs.existsSync(localStatePath)) return null;
  try {
    const raw = fs.readFileSync(localStatePath, 'utf8');
    const json = JSON.parse(raw);
    const encKeyB64 = json?.os_crypt?.encrypted_key;
    if (!encKeyB64) return null;

    const psScript = `
      Add-Type -AssemblyName System.Security;
      $b = [Convert]::FromBase64String('${encKeyB64}');
      $enc = $b[5..($b.Length-1)];
      $dec = [System.Security.Cryptography.ProtectedData]::Unprotect($enc, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser);
      [Convert]::ToBase64String($dec);
    `.replace(/\r?\n\s*/g, ' ');

    const outB64 = execSync(`powershell.exe -NoProfile -NonInteractive -Command "${psScript}"`, {
      encoding: 'utf8',
      windowsHide: true
    }).trim();

    return Buffer.from(outB64, 'base64');
  } catch (e) {
    return null;
  }
}

function decryptCookie(encBuf, aesKey) {
  if (!encBuf || encBuf.length === 0) return null;
  try {
    const prefix = encBuf.slice(0, 3).toString('ascii');
    if (prefix === 'v10' || prefix === 'v11') {
      const iv = encBuf.slice(3, 15);
      const ciphertextAndTag = encBuf.slice(15);
      if (ciphertextAndTag.length <= 16) return null;
      const tag = ciphertextAndTag.slice(ciphertextAndTag.length - 16);
      const ciphertext = ciphertextAndTag.slice(0, ciphertextAndTag.length - 16);

      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
      decipher.setAuthTag(tag);
      let decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      // Strip 32-byte header hash (Chromium 120+)
      if (decrypted.length > 32) {
        const candidate = decrypted.slice(32).toString('utf8');
        if (isPrintableAscii(candidate)) {
          return candidate;
        }
      }

      const raw = decrypted.toString('utf8');
      if (isPrintableAscii(raw)) {
        return raw;
      }
    }
  } catch (e) {
    // DPAPI fallback for older cookie records
    try {
      const psScript = `
        Add-Type -AssemblyName System.Security;
        $b = [Convert]::FromBase64String('${encBuf.toString('base64')}');
        $dec = [System.Security.Cryptography.ProtectedData]::Unprotect($b, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser);
        [Convert]::ToBase64String($dec);
      `.replace(/\r?\n\s*/g, ' ');
      const outB64 = execSync(`powershell.exe -NoProfile -NonInteractive -Command "${psScript}"`, {
        encoding: 'utf8',
        windowsHide: true
      }).trim();
      const dec = Buffer.from(outB64, 'base64').toString('utf8');
      if (isPrintableAscii(dec)) return dec;
    } catch (e2) {}
  }
  return null;
}

async function extractAllCookies() {
  const SQL = await initSqlJs();
  const roots = getBrowserRoots();

  for (const b of roots) {
    if (!fs.existsSync(b.path)) continue;

    // Check if the browser process is currently running
    if (isBrowserRunning(b.name)) {
      return {
        success: false,
        error: 'BrowserIsRunning',
        browser: b.name,
        message: `${b.name} is currently open. Please close ${b.name} so Windows releases the cookie database lock, then try again.`
      };
    }

    const localStatePath = path.join(b.path, 'Local State');
    const masterKey = getMasterKey(localStatePath);
    if (!masterKey) continue;

    const profileDirs = ['Default', ''];
    try {
      const entries = fs.readdirSync(b.path, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('Profile ')) {
          profileDirs.push(entry.name);
        }
      }
    } catch (e) {}

    for (const profile of profileDirs) {
      const pDir = profile ? path.join(b.path, profile) : b.path;
      const candidates = [
        path.join(pDir, 'Network', 'Cookies'),
        path.join(pDir, 'Cookies'),
        path.join(b.path, 'Default', 'Network', 'Cookies'),
        path.join(b.path, 'Network', 'Cookies'),
        path.join(b.path, 'Cookies')
      ];

      for (const dbPath of candidates) {
        if (!fs.existsSync(dbPath)) continue;

        const tmpPath = path.join(os.tmpdir(), `ytm_c_${Date.now()}_${Math.random().toString(36).substring(2)}.db`);
        try {
          fs.copyFileSync(dbPath, tmpPath);
        } catch (copyErr) {
          if (copyErr.code === 'EBUSY' || copyErr.code === 'EPERM') {
            return {
              success: false,
              error: 'BrowserIsRunning',
              browser: b.name,
              message: `${b.name} is currently open. Please close ${b.name} so Windows releases the cookie database lock, then try again.`
            };
          }
          continue;
        }

        try {
          const fileBuf = fs.readFileSync(tmpPath);
          const db = new SQL.Database(fileBuf);
          const res = db.exec(`
            SELECT host_key, name, path, encrypted_value, is_secure, is_httponly 
            FROM cookies 
            WHERE host_key LIKE '%youtube.com%' OR host_key LIKE '%google.com%'
          `);

          if (res && res.length > 0 && res[0].values) {
            const cookies = [];
            for (const row of res[0].values) {
              const [hostKey, name, cPath, encVal, isSec, isHttp] = row;
              if (!encVal) continue;
              const val = decryptCookie(Buffer.from(encVal), masterKey);
              if (val) {
                cookies.push({
                  name: name,
                  value: val,
                  domain: hostKey,
                  path: cPath || '/',
                  secure: Boolean(isSec),
                  httpOnly: Boolean(isHttp)
                });
              }
            }

            // Check for login session presence
            const hasLogin = cookies.some(c => ['SID', 'SAPISID', 'HSID', '__Secure-3PSID', 'LOGIN_INFO'].includes(c.name));
            if (hasLogin) {
              db.close();
              try { fs.unlinkSync(tmpPath); } catch (e) {}
              return {
                success: true,
                browser: profile ? `${b.name} (${profile})` : b.name,
                cookies: cookies
              };
            }
          }
          db.close();
        } catch (err) {
          // Continue searching next profile
        } finally {
          try { fs.unlinkSync(tmpPath); } catch (e) {}
        }
      }
    }
  }

  return { success: false, error: 'NoCookies', message: 'No signed-in YouTube session found. Please make sure you are logged into YouTube in Opera GX, Chrome, or Edge, close the browser, and try again.' };
}

async function exportNetscapeCookiesFile(outputPath) {
  try {
    const res = await extractAllCookies();
    if (!res.success || !res.cookies || res.cookies.length === 0) {
      return { success: false, error: res.error || 'NoCookies', message: res.message };
    }

    let cookieContent = '# Netscape HTTP Cookie File\n';
    for (const c of res.cookies) {
      const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
      const includeSubDomain = 'TRUE';
      const cPath = c.path || '/';
      const secure = c.secure ? 'TRUE' : 'FALSE';
      const expiration = Math.floor(Date.now() / 1000) + (3600 * 24 * 365);
      cookieContent += `${domain}\t${includeSubDomain}\t${cPath}\t${secure}\t${expiration}\t${c.name}\t${c.value}\n`;
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, cookieContent, 'utf8');

    return {
      success: true,
      browser: res.browser,
      cookieCount: res.cookies.length,
      path: outputPath
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

if (require.main === module) {
  extractAllCookies().then(res => {
    process.stdout.write(JSON.stringify(res));
  }).catch(err => {
    process.stdout.write(JSON.stringify({ success: false, error: err.message }));
  });
}

module.exports = { extractAllCookies, exportNetscapeCookiesFile, isBrowserRunning };
