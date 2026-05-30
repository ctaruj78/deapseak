const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function captureScreens(browser, outDir) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1365, height: 768 });

  const shots = [
    { name: '01-dashboard.png', url: 'https://crm.festlift.pt/pages/client/dashboard.html', title: 'Dashboard do Cliente' },
    { name: '02-my-lifts.png', url: 'https://crm.festlift.pt/pages/client/my-lifts.html', title: 'Os meus elevadores' },
    { name: '03-requests.png', url: 'https://crm.festlift.pt/pages/client/requests.html', title: 'Pedidos e acompanhamento' },
    { name: '04-history.png', url: 'https://crm.festlift.pt/pages/client/history.html', title: 'Historico e analise' },
    { name: '05-support.png', url: 'https://crm.festlift.pt/pages/client/support.html', title: 'Suporte e tickets' },
  ];

  const meta = [];
  for (const s of shots) {
    await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2500));
    const filePath = path.join(outDir, s.name);
    await page.screenshot({ path: filePath, fullPage: false });
    meta.push({ ...s, filePath });
  }

  await page.close();
  return meta;
}

async function buildWebm(browser, slides, outFile) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1365, height: 768 });

  const slidesData = slides.map(s => ({
    title: s.title,
    dataUrl: 'data:image/png;base64,' + fs.readFileSync(s.filePath).toString('base64')
  }));

  const base64Webm = await page.evaluate(async (inputSlides) => {
    const width = 1365;
    const height = 768;
    const fps = 30;
    const perSlideMs = 2800;
    const introMs = 1200;
    const outroMs = 1200;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    document.body.style.margin = '0';
    document.body.appendChild(canvas);

    function drawCover(title, subtitle) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, 'rgba(59,130,246,0.35)');
      grad.addColorStop(1, 'rgba(16,185,129,0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 56px Arial';
      ctx.fillText(title, 90, 320);

      ctx.font = '400 28px Arial';
      ctx.fillStyle = '#dbeafe';
      ctx.fillText(subtitle, 90, 370);
    }

    function drawSlide(img, title, progress) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      const scale = Math.max(width / img.width, height / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      ctx.fillStyle = 'rgba(15,23,42,0.72)';
      ctx.fillRect(0, 0, width, 88);
      ctx.fillStyle = '#fff';
      ctx.font = '700 34px Arial';
      ctx.fillText(title, 30, 56);

      ctx.fillStyle = 'rgba(17,24,39,0.7)';
      ctx.fillRect(0, height - 18, width, 18);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, height - 18, Math.round(width * progress), 18);
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    const prepared = [];
    for (const s of inputSlides) {
      const img = await loadImage(s.dataUrl);
      prepared.push({ img, title: s.title });
    }

    const stream = canvas.captureStream(fps);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm;codecs=vp8';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_500_000 });
    const chunks = [];

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopPromise = new Promise(resolve => {
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const arr = await blob.arrayBuffer();
        const bytes = new Uint8Array(arr);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        resolve(btoa(binary));
      };
    });

    recorder.start(250);

    const frameDur = 1000 / fps;

    const introFrames = Math.floor(introMs / frameDur);
    for (let i = 0; i < introFrames; i++) {
      drawCover('FestLift', 'Guia rapido do painel de cliente');
      await new Promise(r => setTimeout(r, frameDur));
    }

    for (let s = 0; s < prepared.length; s++) {
      const slide = prepared[s];
      const frames = Math.floor(perSlideMs / frameDur);
      for (let i = 0; i < frames; i++) {
        drawSlide(slide.img, slide.title, (s + i / frames) / prepared.length);
        await new Promise(r => setTimeout(r, frameDur));
      }
    }

    const outroFrames = Math.floor(outroMs / frameDur);
    for (let i = 0; i < outroFrames; i++) {
      drawCover('Manual disponivel em /docs/user-manual.pdf', 'Suporte: info@festlift.pt');
      await new Promise(r => setTimeout(r, frameDur));
    }

    recorder.stop();
    return await stopPromise;
  }, slidesData);

  fs.writeFileSync(outFile, Buffer.from(base64Webm, 'base64'));
  await page.close();
}

(async () => {
  const outDir = path.join(process.cwd(), 'docs', 'media');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const slides = await captureScreens(browser, outDir);
    const outVideo = path.join(process.cwd(), 'docs', 'user-manual-short.webm');
    await buildWebm(browser, slides, outVideo);
    console.log('VIDEO_OK', outVideo);
  } catch (e) {
    console.error('VIDEO_FAIL', e && e.message ? e.message : e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
