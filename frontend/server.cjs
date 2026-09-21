/**
 * Production Server for React + Vite Frontend on Laravel Cloud
 *
 * Requirements:
 * - Reads process.env.PORT (defaults to 3000)
 * - Binds to host 0.0.0.0 (all network interfaces)
 * - Serves production /frontend/dist directory
 * - Provides SPA fallback routing for client-side routes
 * - Remains alive indefinitely for health checks and web traffic
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const DIST_DIR = path.resolve(__dirname, 'dist');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.xml': 'application/xml; charset=UTF-8',
  '.csv': 'text/csv; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
};

/**
 * Built-in static HTTP server with SPA fallback
 */
function startStaticServer() {
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[ERROR] dist/index.html not found at ${indexHtmlPath}. Please run "npm run build" first.`);
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    // Only accept GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    // Clean request URL path
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Security: prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(DIST_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      // If it is a directory, look for index.html inside it
      if (!err && stats.isDirectory()) {
        const potentialIndex = path.join(filePath, 'index.html');
        if (fs.existsSync(potentialIndex)) {
          filePath = potentialIndex;
        } else {
          filePath = indexHtmlPath;
        }
      } else if (err || !stats.isFile()) {
        // SPA Fallback: If static file is not found, serve index.html
        filePath = indexHtmlPath;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Set caching headers: cache hashed assets under /assets/, no-cache for index.html
      const headers = {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      };

      if (filePath.includes(path.sep + 'assets' + path.sep)) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else {
        headers['Cache-Control'] = 'no-cache';
      }

      res.writeHead(200, headers);

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on('error', (streamErr) => {
        console.error('[Stream Error]', streamErr);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      });
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`[Production Server] Listening on http://${HOST}:${PORT}`);
    console.log(`[Production Server] Serving directory: ${DIST_DIR}`);
    console.log(`[Production Server] SPA Fallback: Enabled (index.html)`);
  });

  // Handle termination signals cleanly
  const shutdown = (signal) => {
    console.log(`[Production Server] Received ${signal}, closing server...`);
    server.close(() => {
      console.log('[Production Server] Closed successfully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

/**
 * Start using Vite preview programmatically if possible, or fallback to static server
 */
async function main() {
  try {
    const { preview } = await import('vite');
    const viteServer = await preview({
      root: __dirname,
      preview: {
        port: PORT,
        host: HOST,
        strictPort: false,
        allowedHosts: [
          'gstrepotis.com',
          'www.gstrepotis.com',
          '.railway.app',
          '.up.railway.app',
          '.laravel.cloud',
        ],
      },
    });

    console.log(`[Vite Preview] Production server active on http://${HOST}:${PORT}`);
    viteServer.printUrls();

    const shutdown = (signal) => {
      console.log(`[Vite Preview] Received ${signal}, closing...`);
      viteServer.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.log(`[Notice] Vite preview import error (${err.message}). Starting robust native static server...`);
    startStaticServer();
  }
}

main();
