// metro.config.js
// Extends Metro bundler to bundle HTML, HTM and JSA (raw JS asset) file types.
// 'jsa' is a renamed extension used for large playable JS bundles that
// should NOT be transpiled as source code by Metro.
// Also serves assets/playables/ as static files on web platform.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Add asset extensions for playable files
config.resolver.assetExts.push('html', 'htm', 'jsa');

// Serve assets/playables/ as static files for web platform
// This bypasses Metro's asset pipeline which can't serve .js files as raw assets
config.server = config.server || {};
const originalMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
    const enhanced = originalMiddleware ? originalMiddleware(middleware, server) : middleware;
    return (req, res, next) => {
        // Intercept requests to /playables/
        if (req.url && req.url.startsWith('/playables/')) {
            // Strip query strings for file resolution
            const urlPath = req.url.split('?')[0];
            const filePath = path.join(__dirname, 'assets', urlPath);
            const decodedPath = decodeURIComponent(filePath);

            // Try the exact path first, then fall back to .jsa for .js requests
            // (playable JS bundles are renamed to .jsa to prevent Metro transpilation)
            let resolvedPath = decodedPath;
            if (!fs.existsSync(resolvedPath) && resolvedPath.endsWith('.js')) {
                const jsaPath = resolvedPath.slice(0, -3) + '.jsa';
                if (fs.existsSync(jsaPath)) {
                    resolvedPath = jsaPath;
                }
            }

            if (fs.existsSync(resolvedPath)) {
                const ext = path.extname(decodedPath).toLowerCase();
                const mimeTypes = {
                    '.html': 'text/html',
                    '.htm': 'text/html',
                    '.js': 'application/javascript',
                    '.jsa': 'application/javascript',
                    '.css': 'text/css',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.json': 'application/json',
                    '.woff': 'font/woff',
                    '.woff2': 'font/woff2',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.ogg': 'audio/ogg',
                };
                res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
                res.setHeader('Access-Control-Allow-Origin', '*');
                fs.createReadStream(resolvedPath).pipe(res);
                return;
            }
        }
        enhanced(req, res, next);
    };
};

module.exports = config;
