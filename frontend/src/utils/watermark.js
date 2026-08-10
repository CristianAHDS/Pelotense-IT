export async function applyWatermark(file, tecnico = 'Cris') {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const maxW = 1200;
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR');
      const text = `${tecnico} · ${dateStr} · ${timeStr}`;

      const fontSize = Math.max(16, Math.floor(w / 40));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      const metrics = ctx.measureText(text);
      const textW = metrics.width + 20;
      const textH = fontSize + 16;
      const x = w - textW - 10;
      const y = h - 10;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(x - 6, y - textH, textW + 12, textH + 8, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffffcc';
      ctx.fillText(text, x, y - 6);

      canvas.toBlob((blob) => {
        const watermarked = new File([blob], file.name, { type: 'image/jpeg' });
        resolve(watermarked);
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
