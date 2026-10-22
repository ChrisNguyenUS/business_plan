// Crop a generated 16:9 image to 1200x630 and add the Manna logo card top-left
// (same placement as the existing blog covers: card ~148x138 at 36,32).
const sharp = require(require.resolve("sharp", { paths: [process.argv[5]] }));
const [src, logo, out] = process.argv.slice(2, 5);

(async () => {
  const base = await sharp(src).resize(1200, 630, { fit: "cover", position: "centre" }).toBuffer();
  const card = Buffer.from(`
    <svg width="160" height="150" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.12"/></filter></defs>
      <rect x="6" y="4" width="148" height="138" rx="14" fill="#FFFFFF" fill-opacity="0.82"
            stroke="#000" stroke-opacity="0.06" filter="url(#s)"/>
    </svg>`);
  const logoBuf = await sharp(logo).resize(124, 112, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp(base)
    .composite([
      { input: card, left: 30, top: 28 },
      { input: logoBuf, left: 36 + 12, top: 32 + 13 },
    ])
    .webp({ quality: 82 })
    .toFile(out);
  console.log("ok", out);
})();
