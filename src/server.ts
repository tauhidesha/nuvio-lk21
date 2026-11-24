/**
 * Local Development Server.
 * Runs the Express Addon on localhost:7000.
 */

import app from '../api/index.js';

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎬 LK21 Nuvio & Stremio Add-on Server Running!`);
  console.log(`🌐 Local Web Dashboard: http://localhost:${PORT}`);
  console.log(`📋 Manifest URL:        http://localhost:${PORT}/manifest.json`);
  console.log(`=======================================================`);
});
