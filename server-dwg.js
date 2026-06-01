/*
 * server-dwg.js — Máy chủ chuyển DXF → DWG cho DVDCAD
 * --------------------------------------------------------------
 * App DVDCAD gửi nội dung DXF lên (POST), máy chủ chuyển sang DWG và trả file DWG về.
 * Chỉ cần Node.js (không cần cài thư viện npm nào).
 *
 * Cần MỘT trong hai công cụ chuyển đổi đã cài sẵn trên máy:
 *   1) ODA File Converter (MIỄN PHÍ, khuyên dùng) — https://www.opendesign.com/guestfiles/oda_file_converter
 *   2) LibreDWG (dxf2dwg) — dự phòng, chỉ tạo được DWG tới bản r2000 và đôi khi AutoCAD không mở được.
 *
 * CHẠY:
 *   node server-dwg.js
 * Tuỳ chọn qua biến môi trường:
 *   PORT      cổng (mặc định 8787)
 *   ODA       đường dẫn tới ODAFileConverter
 *             vd Windows: "C:\\Program Files\\ODA\\ODAFileConverter 25.11.0\\ODAFileConverter.exe"
 *             vd Linux:   "/usr/bin/ODAFileConverter"  (Linux có thể cần: xvfb-run -a node server-dwg.js)
 *   ODA_VER   phiên bản DWG xuất ra (mặc định ACAD2018). Khác: ACAD2013, ACAD2010, ACAD2007, ACAD2004, ACAD2000
 *   DXF2DWG   đường dẫn tới dxf2dwg (LibreDWG) nếu muốn dùng dự phòng (mặc định "dxf2dwg")
 *
 * Sau khi chạy, mở DVDCAD → Xuất → "Cài đặt máy chủ chuyển DWG…" rồi nhập:
 *   http://<địa-chỉ-máy-chủ>:8787/convert
 * (cùng máy thì dùng http://localhost:8787/convert)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 8787;
const ODA = process.env.ODA || '';                 // đường dẫn ODAFileConverter (để trống = bỏ qua, dùng dxf2dwg)
const ODA_VER = process.env.ODA_VER || 'ACAD2018';
const DXF2DWG = process.env.DXF2DWG || 'dxf2dwg';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function convertWithODA(inDir, outDir, cb) {
  // ODAFileConverter <In> <Out> <OutVer> <OutType> <Recurse> <Audit> [<Filter>]
  execFile(ODA, [inDir, outDir, ODA_VER, 'DWG', '0', '1', '*.dxf'], { timeout: 120000 }, (err) => cb(err));
}
function convertWithLibreDWG(inFile, outFile, cb) {
  execFile(DXF2DWG, ['-y', '-o', outFile, inFile], { timeout: 120000 }, (err) => cb(err));
}

const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET') { res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'}); res.end('DVDCAD DWG server đang chạy. POST nội dung DXF tới /convert để nhận DWG.'); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end('Method Not Allowed'); return; }

  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const dxf = Buffer.concat(chunks);
    if (!dxf.length) { res.writeHead(400); res.end('Thiếu nội dung DXF'); return; }
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'dvdcad-'));
    const inDir = path.join(work, 'in');  fs.mkdirSync(inDir);
    const outDir = path.join(work, 'out'); fs.mkdirSync(outDir);
    const inFile = path.join(inDir, 'drawing.dxf');
    fs.writeFileSync(inFile, dxf);

    const sendDwg = () => {
      // tìm file .dwg đầu ra
      let dwgPath = null;
      for (const d of [outDir, inDir]) {
        if (!fs.existsSync(d)) continue;
        const f = fs.readdirSync(d).find(n => /\.dwg$/i.test(n));
        if (f) { dwgPath = path.join(d, f); break; }
      }
      if (!dwgPath || !fs.existsSync(dwgPath)) { res.writeHead(500); res.end('Không tạo được DWG'); cleanup(); return; }
      const data = fs.readFileSync(dwgPath);
      res.writeHead(200, { 'Content-Type': 'image/vnd.dwg', 'Content-Disposition': 'attachment; filename="drawing.dwg"' });
      res.end(data);
      cleanup();
    };
    const cleanup = () => { try { fs.rmSync(work, { recursive: true, force: true }); } catch (_) {} };
    const fail = (msg) => { try { res.writeHead(500); res.end(String(msg)); } catch (_) {} cleanup(); };

    if (ODA) {
      convertWithODA(inDir, outDir, (err) => {
        if (err) { console.error('ODA lỗi:', err.message); return fail('ODA File Converter lỗi: ' + err.message); }
        sendDwg();
      });
    } else {
      const outFile = path.join(outDir, 'drawing.dwg');
      convertWithLibreDWG(inFile, outFile, (err) => {
        if (err) { console.error('dxf2dwg lỗi:', err.message); return fail('dxf2dwg (LibreDWG) lỗi: ' + err.message + ' — hãy cài ODA File Converter và đặt biến ODA.'); }
        sendDwg();
      });
    }
  });
});

server.listen(PORT, () => {
  console.log('DVDCAD DWG server chạy tại cổng ' + PORT);
  console.log('  Endpoint:  http://localhost:' + PORT + '/convert');
  console.log('  Bộ chuyển: ' + (ODA ? ('ODA File Converter (' + ODA_VER + ')') : ('LibreDWG dxf2dwg (dự phòng) — nên đặt biến ODA để dùng ODA File Converter')));
});
