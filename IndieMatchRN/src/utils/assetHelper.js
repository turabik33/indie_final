// src/utils/assetHelper.js
// Copies playable HTML assets (and sub-resources) from the Expo bundle
// to the device's document directory — ONLY needed for production builds.
//
// In DEVELOPMENT (Expo Go), playables are served directly by the Metro
// dev server via the static middleware configured in metro.config.js.
// This avoids WKWebView's file:// access restrictions on iOS.
//
// NOTE: Large JS bundle files are renamed to .jsa so Metro treats them as
// raw assets (not source to be transpiled). The Metro middleware handles
// .js → .jsa fallback automatically.

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import Constants from 'expo-constants';

const ASSET_MANIFEST = [
    // ── p4: standalone single-file ──────────────────────────────────────────
    { module: require('../../assets/playables/p4/index.html'), dest: 'p4/index.html' },

    // ── p2: main + royalmatch_files/ ─────────────────────────────────────────
    { module: require('../../assets/playables/p2/index.html'), dest: 'p2/index.html' },
    { module: require('../../assets/playables/p2/royalmatch_files/mraid.jsa'), dest: 'p2/royalmatch_files/mraid.js' },
    { module: require('../../assets/playables/p2/royalmatch_files/network_rewriting.jsa'), dest: 'p2/royalmatch_files/network_rewriting.js' },
    { module: require('../../assets/playables/p2/royalmatch_files/730d60646e845712bc4101661eedd58345f01709_v1_js_load.jsa'), dest: 'p2/royalmatch_files/730d60646e845712bc4101661eedd58345f01709_v1_js_load.js' },

    // ── p1: main + Block Blast_files/ ────────────────────────────────────────
    { module: require('../../assets/playables/p1/index.html'), dest: 'p1/index.html' },
    { module: require('../../assets/playables/p1/Block Blast_files/mraid.jsa'), dest: 'p1/Block Blast_files/mraid.js' },
    { module: require('../../assets/playables/p1/Block Blast_files/network_rewriting.jsa'), dest: 'p1/Block Blast_files/network_rewriting.js' },
    { module: require('../../assets/playables/p1/Block Blast_files/7eb73a43de84059940641cd8347feff12e87f00e_v1_js_load.jsa'), dest: 'p1/Block Blast_files/7eb73a43de84059940641cd8347feff12e87f00e_v1_js_load.js' },
];

export const BASE_DIR = FileSystem.documentDirectory + 'playables/';
const SENTINEL = BASE_DIR + '_ready_v6'; // v6: force re-copy with verification

/**
 * Returns the Metro dev server base URL (e.g. "http://192.168.1.5:8081")
 * or null if not in dev mode / not available.
 */
function getDevServerBaseUrl() {
    if (!__DEV__) return null;
    try {
        const host =
            Constants.expoGoConfig?.debuggerHost ||
            Constants.manifest?.debuggerHost ||
            Constants.manifest?.hostUri;
        if (host) {
            // host is like "192.168.1.5:8081"
            return `http://${host}`;
        }
    } catch (e) {
        console.warn('[AssetHelper] Could not get dev server URL:', e.message);
    }
    return null;
}

/**
 * Call once on app startup.
 * In dev mode (Expo Go): no-op — Metro serves playables via HTTP.
 * In production: copies all playable assets to the document directory.
 */
export async function ensurePlayablesReady() {
    // On web, playables are served directly by Metro/webpack
    if (Platform.OS === 'web') return;

    // In development, Metro dev server serves playables via HTTP middleware
    const devUrl = getDevServerBaseUrl();
    if (devUrl) {
        console.log('[AssetHelper] Dev mode — playables served by Metro at:', devUrl + '/playables/');
        return;
    }

    // --- Production path: copy files to document directory ---
    const info = await FileSystem.getInfoAsync(SENTINEL);
    if (info.exists) {
        console.log('[AssetHelper] Sentinel found, skipping copy');
        return;
    }

    console.log('[AssetHelper] Copying assets to:', BASE_DIR);
    let allOk = true;

    for (const { module, dest } of ASSET_MANIFEST) {
        try {
            const asset = Asset.fromModule(module);
            await asset.downloadAsync();

            const destUri = BASE_DIR + dest;
            const parentDir = destUri.substring(0, destUri.lastIndexOf('/') + 1);
            await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });

            if (asset.localUri) {
                const existing = await FileSystem.getInfoAsync(destUri);
                if (existing.exists) {
                    await FileSystem.deleteAsync(destUri, { idempotent: true });
                }

                await FileSystem.copyAsync({ from: asset.localUri, to: destUri });

                const copied = await FileSystem.getInfoAsync(destUri);
                if (copied.exists) {
                    console.log('[AssetHelper] ✓ Copied:', dest, '(', copied.size, 'bytes)');
                } else {
                    console.error('[AssetHelper] ✗ Verify FAILED:', dest);
                    allOk = false;
                }
            } else {
                console.warn('[AssetHelper] ✗ No localUri for:', dest);
                allOk = false;
            }
        } catch (err) {
            console.error('[AssetHelper] ✗ Error copying', dest, ':', err.message);
            allOk = false;
        }
    }

    if (allOk) {
        await FileSystem.writeAsStringAsync(SENTINEL, '1');
        console.log('[AssetHelper] All assets copied, sentinel written');
    } else {
        console.warn('[AssetHelper] Some copies failed — sentinel NOT written (will retry)');
    }
}

/**
 * Returns the URI pointing to a playable's main HTML file.
 * - Web: relative URL served by Metro middleware
 * - Dev (Expo Go): HTTP URL from Metro dev server
 * - Production: file:// URI from document directory
 *
 * @param {string} localPath - e.g. 'p1/index.html'
 */
export function getPlayableUri(localPath) {
    if (Platform.OS === 'web') {
        return `/playables/${localPath}`;
    }

    // In development, use Metro dev server (avoids WKWebView file:// restrictions)
    const devUrl = getDevServerBaseUrl();
    if (devUrl) {
        const uri = `${devUrl}/playables/${localPath}`;
        console.log('[AssetHelper] getPlayableUri (HTTP):', localPath, '→', uri);
        return uri;
    }

    // Production: file:// from document directory
    const uri = BASE_DIR + localPath;
    console.log('[AssetHelper] getPlayableUri (file):', localPath, '→', uri);
    return uri;
}


