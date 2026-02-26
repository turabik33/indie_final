// src/storage/index.js
// AsyncStorage-based persistence layer - RN equivalent of the web app's localStorage usage.
// Keeps the same data model: arrays of playable IDs stored as JSON.

import AsyncStorage from '@react-native-async-storage/async-storage';

const LIKES_KEY = 'indieMatchLikes';
const REPOSTS_KEY = 'indieMatchReposts';

/** Load liked playable IDs. Returns a Set<string>. */
export async function loadLikes() {
    try {
        const stored = await AsyncStorage.getItem(LIKES_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return new Set(Array.isArray(parsed) ? parsed : []);
        }
    } catch (e) {
        console.error('[Storage] Error loading likes:', e);
    }
    return new Set();
}

/** Save liked playable IDs from a Set<string>. */
export async function saveLikes(likedSet) {
    try {
        await AsyncStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(likedSet)));
    } catch (e) {
        console.error('[Storage] Error saving likes:', e);
    }
}

/** Load reposted playable IDs. Returns a Set<string>. */
export async function loadReposts() {
    try {
        const stored = await AsyncStorage.getItem(REPOSTS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return new Set(Array.isArray(parsed) ? parsed : []);
        }
    } catch (e) {
        console.error('[Storage] Error loading reposts:', e);
    }
    return new Set();
}

/** Save reposted playable IDs from a Set<string>. */
export async function saveReposts(repostedSet) {
    try {
        await AsyncStorage.setItem(REPOSTS_KEY, JSON.stringify(Array.from(repostedSet)));
    } catch (e) {
        console.error('[Storage] Error saving reposts:', e);
    }
}
