#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { createCanvas } = require('canvas');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'docs', 'user-manual-short.webm');
const FFMPEG =
  process.env.PLAYWRIGHT_FFMPEG ||
  path.join(process.env.HOME || '', '.cache', 'ms-playwright', 'ffmpeg-1011', 'ffmpeg-linux');

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 25;
const SECONDS_PER_SLIDE = 5;

const slides = [
  {
    title: 'FestLift Cliente',
    text: 'Guia rapido em video\nPainel do cliente em 35 segundos',
    colors: ['#123b66', '#2e7db2'],
  },
  {
    title: '1. Entrar',
    text: 'Use email e palavra-passe\npara aceder ao painel cliente',
    colors: ['#185f2a', '#4fa543'],
  },
  {
    title: '2. Dashboard',
    text: 'Veja elevadores, pedidos e alertas\nnuma unica vista',
    colors: ['#6b3f18', '#d08a3d'],
  },
  {
    title: '3. Os meus elevadores',
    text: 'Consulte estado, localizacao\ne manutencao por elevador',
    colors: ['#4d1f6f', '#9c5fcd'],
  },
  {
    title: '4. Pedidos',
    text: 'Crie e acompanhe pedidos\ncom atualizacoes de estado',
    colors: ['#7f2147', '#cd5c8a'],
  },
  {
    title: '5. Historico',
    text: 'Filtre eventos e exporte\nPDF/Excel quando necessario',
    colors: ['#0f645f', '#39afa2'],
  },
  {
    title: '6. Suporte',
    text: 'Abra tickets e acompanhe\na resposta da equipa tecnica',
    colors: ['#6a2e15', '#d48156'],
  },
];

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function blend(a, b, t) {
  return {
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
  };
}

function drawGradient(ctx, topHex, bottomHex) {
  const top = hexToRgb(topHex);
  const bottom = hexToRgb(bottomHex);
  for (let y = 0; y < HEIGHT; y += 1) {
    const t = y / (HEIGHT - 1);
    const c = blend(top, bottom, t);
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    ctx.fillRect(0, y, WIDTH, 1);
  }
}

function drawSlide(ctx, slide) {
  drawGradient(ctx, slide.colors[0], slide.colors[1]);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(90, 110, WIDTH - 180, HEIGHT - 220, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 68px Sans';
  const titleWidth = ctx.measureText(slide.title).width;
  ctx.fillText(slide.title, (WIDTH - titleWidth) / 2, 255);

  ctx.font = '500 40px Sans';
  const lines = slide.text.split('\n');
  let y = 360;
  for (const line of lines) {
    const width = ctx.measureText(line).width;
    ctx.fillText(line, (WIDTH - width) / 2, y);
    y += 64;
  }

  ctx.font = '500 28px Sans';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('festlift.pt', 42, HEIGHT - 45);
}

async function run() {
  if (!fs.existsSync(FFMPEG)) {
    throw new Error(
      `ffmpeg nao encontrado em ${FFMPEG}. Defina PLAYWRIGHT_FFMPEG com o caminho correto.`
    );
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const ffmpegArgs = [
    '-y',
    '-f',
    'image2pipe',
    '-vcodec',
    'mjpeg',
    '-r',
    String(FPS),
    '-i',
    'pipe:0',
    '-c:v',
    'libvpx',
    '-b:v',
    '1500k',
    OUTPUT,
  ];

  const ffmpeg = spawn(FFMPEG, ffmpegArgs, {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  for (const slide of slides) {
    for (let i = 0; i < FPS * SECONDS_PER_SLIDE; i += 1) {
      drawSlide(ctx, slide);
      const jpg = canvas.toBuffer('image/jpeg', { quality: 0.86 });
      ffmpeg.stdin.write(jpg);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg terminou com codigo ${code}`));
      }
    });
    ffmpeg.on('error', reject);
  });

  const size = fs.statSync(OUTPUT).size;
  console.log(`Video gerado: ${OUTPUT}`);
  console.log(`Tamanho: ${size} bytes`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
