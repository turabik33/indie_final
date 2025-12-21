import { config } from './config.js';
import './style.css';

const feedContainer = document.getElementById('feed-container');
const toastEl = document.getElementById('toast');
const edgeLeft = document.getElementById('edge-zone-left');
const edgeRight = document.getElementById('edge-zone-right');

// Dev Panel Elements
const devInfo = document.getElementById('dev-info');
const devLog = document.getElementById('dev-log');
const soundBtn = document.getElementById('sound-control');
const likeBtn = document.getElementById('like-btn');
const repostBtn = document.getElementById('repost-btn');
const tabFollowing = document.getElementById('tab-following');
const tabForYou = document.getElementById('tab-foryou');
const profileView = document.getElementById('profile-view');
const profileBackBtn = document.getElementById('profile-back');
const profileTabs = document.querySelectorAll('.profile-tabs .tab');

let isMuted = true; // Start muted by default (modern browser policy friendly)

let currentIndex = 0;
let isScrolling = false;
let scrollTimeout = null;

// Likes & Reposts State Management
let likedPlayables = new Set();
let repostedPlayables = new Set();
let currentProfileTab = 'likes';

// Load likes from localStorage
function loadLikes() {
    try {
        const stored = localStorage.getItem('indieMatchLikes');
        if (stored) {
            const parsed = JSON.parse(stored);
            likedPlayables = new Set(parsed);
            logDev(`Loaded ${likedPlayables.size} likes`);
        }
    } catch (e) {
        console.error('Error loading likes:', e);
    }
}

// Save likes to localStorage
function saveLikes() {
    try {
        const array = Array.from(likedPlayables);
        localStorage.setItem('indieMatchLikes', JSON.stringify(array));
    } catch (e) {
        console.error('Error saving likes:', e);
    }
}

// Load reposts from localStorage
function loadReposts() {
    try {
        const stored = localStorage.getItem('indieMatchReposts');
        if (stored) {
            const parsed = JSON.parse(stored);
            repostedPlayables = new Set(parsed);
            logDev(`Loaded ${repostedPlayables.size} reposts`);
        }
    } catch (e) {
        console.error('Error loading reposts:', e);
    }
}

// Save reposts to localStorage
function saveReposts() {
    try {
        const array = Array.from(repostedPlayables);
        localStorage.setItem('indieMatchReposts', JSON.stringify(array));
    } catch (e) {
        console.error('Error saving reposts:', e);
    }
}

// Toggle like for current playable
function toggleLike() {
    const currentItem = config.playables[currentIndex];
    if (!currentItem) return;

    const isLiked = likedPlayables.has(currentItem.id);

    if (isLiked) {
        likedPlayables.delete(currentItem.id);
        showToast("Unliked!");
    } else {
        likedPlayables.add(currentItem.id);
        showToast("Liked!");
    }

    saveLikes();
    updateLikeButton();
    updateProfileGrid();
}

// Toggle repost for current playable
function toggleRepost() {
    const currentItem = config.playables[currentIndex];
    if (!currentItem) return;

    const isReposted = repostedPlayables.has(currentItem.id);

    if (isReposted) {
        repostedPlayables.delete(currentItem.id);
        showToast("Removed Repost");
    } else {
        repostedPlayables.add(currentItem.id);
        showToast("Reposted!");
    }

    saveReposts();
    updateRepostButton();
    updateProfileGrid();
}

// Update like button appearance based on current playable
function updateLikeButton() {
    const currentItem = config.playables[currentIndex];
    if (!currentItem) return;

    const isLiked = likedPlayables.has(currentItem.id);
    const heartIcon = likeBtn.querySelector('.heart-icon');

    if (heartIcon) {
        heartIcon.style.color = isLiked ? '#fe2c55' : 'white';
    }
}

// Update repost button appearance
function updateRepostButton() {
    const currentItem = config.playables[currentIndex];
    if (!currentItem) return;

    const isReposted = repostedPlayables.has(currentItem.id);
    const repostIcon = repostBtn.querySelector('.repost-icon');

    if (repostIcon) {
        if (isReposted) {
            repostIcon.classList.add('repost-active');
        } else {
            repostIcon.classList.remove('repost-active');
        }
    }
}

function logDev(msg) {
    devLog.textContent = msg;
    console.log('[Dev]', msg);
    // Auto clear after 2s
    setTimeout(() => { if (devLog.textContent === msg) devLog.textContent = '-'; }, 3000);
}

function updateDevInfo() {
    const item = config.playables[currentIndex];
    devInfo.innerHTML = `Idx: ${currentIndex} <br> ID: ${item?.id} <br> Path: ${item?.path}`;
    updateFeedInfo(item);
}

function updateFeedInfo(item) {
    if (!item) return;

    const bottomInfo = document.querySelector('.bottom-info');
    if (!bottomInfo) return;

    const usernameEl = bottomInfo.querySelector('.username');
    const descEl = bottomInfo.querySelector('.description');

    // Use metadata if available, else static defaults
    const publisher = item.publisher || 'Indie Match';
    const gameName = item.gameName || 'Indie Game';

    // Using formatted text for aesthetics
    if (usernameEl) usernameEl.textContent = `@${publisher.replace(/\s+/g, '').toLowerCase()}`;
    if (descEl) descEl.innerHTML = `Playing <b>${gameName}</b> <br> Swipe right to play nicely! <span class="tag">#demo</span>`;
}

const loadingOverlay = document.getElementById('loading-overlay');

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// Update Profile Grid (Likes or Reposts)
function updateProfileGrid() {
    const gridContainer = document.querySelector('.video-grid');
    if (!gridContainer) return;

    // Clear existing items
    gridContainer.innerHTML = '';

    const sourceSet = currentProfileTab === 'likes' ? likedPlayables : repostedPlayables;
    const emptyMsg = currentProfileTab === 'likes' ? 'No likes yet' : 'No reposts yet';
    const emptySub = currentProfileTab === 'likes' ? 'Like playables to see them here' : 'Repost playables to see them here';

    // If no items, show empty state
    if (sourceSet.size === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-likes-state';
        emptyState.innerHTML = `
            <div class="empty-icon">${currentProfileTab === 'likes' ? '♥' : '↻'}</div>
            <p>${emptyMsg}</p>
            <p class="empty-subtitle">${emptySub}</p>
        `;
        gridContainer.appendChild(emptyState);
        return;
    }

    // Add items to grid
    sourceSet.forEach(playableId => {
        const playable = config.playables.find(p => p.id === playableId);
        if (!playable) return;

        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        gridItem.dataset.playableId = playableId;

        // Use thumbnail as background if available
        if (playable.thumbnail) {
            gridItem.style.backgroundImage = `url(${playable.thumbnail})`;
            gridItem.style.backgroundSize = 'cover';
            gridItem.style.backgroundPosition = 'center';
        }

        // Add play icon overlay and optional label (only if no thumbnail, or as overlay)
        // Design choice: Show play icon always, maybe hide text if thumbnail exists?
        // Let's keep text but make it subtle gradient bottom, or just play icon.
        // User asked to replace "small black screen" with image.

        gridItem.innerHTML = `
            <div class="grid-overlay">
                <div class="grid-play-icon">▶</div>
                <div class="grid-label">${playable.gameName || playable.id.toUpperCase()}</div>
            </div>
        `;

        // Click handler to navigate to that playable
        gridItem.addEventListener('click', () => {
            const index = config.playables.findIndex(p => p.id === playableId);
            if (index !== -1) {
                scrollToIndex(index);
                hideProfile();
                showToast(`Playing ${playable.gameName || playable.id}`);
            }
        });

        gridContainer.appendChild(gridItem);
    });
}

// Initialize Feed
function init() {
    config.playables.forEach((item, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'playable-wrapper';
        wrapper.dataset.index = index;

        const iframe = document.createElement('iframe');
        iframe.className = 'playable-iframe';
        // Load first item immediately, others lazy? or just load all for simplicity in demo
        // Requirement says preload next/prev. For 3 items, just load all is fine but let's be nice.
        if (index === 0) {
            iframe.src = item.path;
            showLoading(); // Show initial load
        } else {
            iframe.dataset.src = item.path; // Lazy
        }

        // Security & Permissions
        // "allow" attributes as requested
        iframe.allow = "autoplay; fullscreen; clipboard-read; clipboard-write; gamepad; accelerometer; gyroscope";
        // No sandbox, as requested

        iframe.onload = () => {
            logDev(`Loaded: ${item.id}`);
            if (index === currentIndex) hideLoading();
            attachIframeListeners(iframe);
        };
        iframe.onerror = (e) => {
            logDev(`Error: ${item.id}`);
            console.error('Iframe Error', e);
            if (index === currentIndex) hideLoading(); // Hide on error too
        };

        wrapper.appendChild(iframe);
        feedContainer.appendChild(wrapper);
    });

    // Initial load logic if needed
    loadNearbyIframes(0);
    updateDevInfo();

    // Load likes and update UI
    // Load likes/reposts and update UI
    loadLikes();
    loadReposts();
    updateLikeButton();
    updateRepostButton();
    updateProfileGrid();

    // Attach edge listeners
    attachEdgeListeners();
    attachUIListeners();
}

function attachUIListeners() {
    // Sound Toggle
    soundBtn.addEventListener('click', toggleMute);

    // Tab Switching
    tabFollowing.addEventListener('click', () => switchTab('following'));
    tabForYou.addEventListener('click', () => switchTab('foryou'));

    // Profile Back
    profileBackBtn.addEventListener('click', hideProfile);

    // Like Button
    likeBtn.addEventListener('click', () => {
        animateHeart(window.innerWidth / 2, window.innerHeight / 2);
        toggleLike();
    });

    // Repost Button
    repostBtn.addEventListener('click', () => {
        toggleRepost();
    });

    // Profile Tabs
    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            profileTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Switch content
            currentProfileTab = tab.dataset.tab;
            updateProfileGrid();
        });
    });

    // Double Tap on Feed
    let lastTap = 0;
    feedContainer.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            // Double Tap
            const x = e.clientX;
            const y = e.clientY;
            animateHeart(x, y);
            showToast("Liked!");
            e.preventDefault();
        }
        lastTap = currentTime;
    });

    // Explicitly attach wheel to Profile View to ensure capture
    profileView.addEventListener('wheel', handleWheel, { passive: false });
}

function toggleMute() {
    isMuted = !isMuted;
    soundBtn.innerHTML = isMuted ? '<span class="sound-icon">🔇</span>' : '<span class="sound-icon">🔊</span>';
    logDev(`Sound: ${isMuted ? 'OFF' : 'ON'}`);

    // Send message to all iframes (or just current)
    const wrappers = document.querySelectorAll('.playable-wrapper iframe');
    wrappers.forEach(iframe => {
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'mute', value: isMuted }, '*');
        }
    });
}

function switchTab(tab) {
    if (tab === 'following') {
        tabFollowing.classList.add('active');
        tabFollowing.classList.remove('inactive');
        tabForYou.classList.add('inactive');
        tabForYou.classList.remove('active');
        showToast("Switched to Following");
    } else {
        tabForYou.classList.add('active');
        tabForYou.classList.remove('inactive');
        tabFollowing.classList.add('inactive');
        tabFollowing.classList.remove('active');
        showToast("Back to For You");
    }
}

function animateHeart(x, y) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    document.body.appendChild(heart);

    // Remove after animation
    setTimeout(() => {
        heart.remove();
    }, 1000);
}

// Lazy Loading / Preloading
function loadNearbyIframes(index) {
    const indicesToLoad = [index, index + 1, index - 1];
    const wrappers = document.querySelectorAll('.playable-wrapper');

    indicesToLoad.forEach(i => {
        if (i >= 0 && i < wrappers.length) {
            const iframe = wrappers[i].querySelector('iframe');
            if (iframe && !iframe.src && iframe.dataset.src) {
                iframe.src = iframe.dataset.src;
                logDev(`Preloading: ${i}`);
            }
        }
    });
}

// Scroll Snap Detection
feedContainer.addEventListener('scroll', (e) => {
    // Debounce/Throttle index calculation
    if (scrollTimeout) clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
        const height = feedContainer.clientHeight;
        const scrollPos = feedContainer.scrollTop;
        const newIndex = Math.round(scrollPos / height);

        if (newIndex !== currentIndex) {
            currentIndex = newIndex;
            updateDevInfo();
            currentIndex = newIndex;
            updateDevInfo();
            updateLikeButton(); // Update like button state
            updateRepostButton(); // Update repost button state
            showLoading(); // Show when switching, will hide if already loaded or when distinct load event fires

            setTimeout(() => hideLoading(), 500);

            loadNearbyIframes(newIndex);
        }
    }, 50);
});

// Toast Helper
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    void toastEl.offsetWidth;
    toastEl.classList.add('visible');

    setTimeout(() => {
        toastEl.classList.remove('visible');
        setTimeout(() => {
            toastEl.classList.add('hidden');
        }, 300);
    }, 2000);
}

// Scroll & Swipe Logic
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;
let isScrollingGesture = false; // Vertical scroll
let isInteractingGesture = false; // Horizontal/Game interaction
let activeFrame = null;
let gestureStartX = 0;
let gestureStartY = 0;
let isSwipeLocked = false;

// Global State for Profile
let isProfileVisible = false; // Source of truth


// Mouse Support for Desktop Dragging
function attachMouseListeners() {
    const container = document.getElementById('app'); // Catch all

    // We can reuse handleTouchStart/Move/End if we normalize the event
    // But we need to handle "e.clientX" vs "e.touches[0].clientX"

    container.addEventListener('mousedown', (e) => {
        // Mock a touch event structure or adjust handler
        // Let's adjust the handler to be generic
        handlePointerStart(e);
    });

    window.addEventListener('mousemove', (e) => {
        handlePointerMove(e);
    });

    window.addEventListener('mouseup', (e) => {
        handlePointerEnd(e);
    });

    // Trackpad / Wheel Support
    window.addEventListener('wheel', handleWheel, { passive: false });
}

let wheelTimeout;
let wheelTranslatePercent = 100; // 100% means closed (hidden-right)



function handleWheel(e) {
    // Check if this is a horizontal swipe (two-finger left/right on trackpad)
    const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 2;

    // If it's a horizontal swipe, always allow it (for profile navigation)
    if (isHorizontalSwipe) {
        e.preventDefault();
        e.stopPropagation();

        // Debug info
        const dir = e.deltaX > 0 ? 'Right→' : 'Left←';
        const domOpen = !profileView.classList.contains('hidden-right');

        if (!wheelTimeout) {
            // Starting a new gesture sequence
            // Always check current DOM state fresh
            const currentTransform = profileView.style.transform;
            const hasTransform = currentTransform && currentTransform !== '';

            if (hasTransform) {
                // Extract the current percentage from transform
                const match = currentTransform.match(/translateX\(([0-9.]+)%\)/);
                if (match) {
                    wheelTranslatePercent = parseFloat(match[1]);
                    isProfileVisible = wheelTranslatePercent < 50;
                } else {
                    isProfileVisible = domOpen;
                    wheelTranslatePercent = domOpen ? 0 : 100;
                }
            } else {
                // No inline transform, use class
                isProfileVisible = domOpen;
                wheelTranslatePercent = domOpen ? 0 : 100;
            }

            profileView.dataset.startOpen = isProfileVisible;
            profileView.style.transition = 'none';

            devLog.innerHTML = `<span style="font-size:12px;color:#00ff00;background:rgba(0,0,0,0.8);padding:4px;position:fixed;top:60px;left:10px;z-index:9999;">${dir} Swipe (${isProfileVisible ? 'Closing' : 'Opening'}) ${wheelTranslatePercent}%</span>`;
        }

        // Two-finger swipe LEFT (negative deltaX) = open profile (decrease % from 100 to 0)
        // Two-finger swipe RIGHT (positive deltaX) = close profile (increase % from 0 to 100)
        const sensitivity = 1.2;
        wheelTranslatePercent -= (e.deltaX * sensitivity);

        // Clamp between 0 (fully open) and 100 (fully closed)
        wheelTranslatePercent = Math.max(0, Math.min(100, wheelTranslatePercent));
        profileView.style.transform = `translateX(${wheelTranslatePercent}%)`;

        // Clear previous timeout
        if (wheelTimeout) clearTimeout(wheelTimeout);

        // Snap to final position after gesture ends
        wheelTimeout = setTimeout(() => {
            wheelTimeout = null;
            profileView.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

            const startedOpen = profileView.dataset.startOpen === 'true';
            const threshold = 40; // 40% threshold for snapping

            if (startedOpen) {
                // Started open - should we close it?
                if (wheelTranslatePercent > threshold) {
                    hideProfile();
                    devLog.innerHTML = `<span style="font-size:12px;color:#ff0000;background:rgba(0,0,0,0.8);padding:4px;position:fixed;top:60px;left:10px;z-index:9999;">✓ Profile Kapatıldı (Playable)</span>`;
                } else {
                    showProfile();
                    devLog.innerHTML = `<span style="font-size:12px;color:#00ff00;background:rgba(0,0,0,0.8);padding:4px;position:fixed;top:60px;left:10px;z-index:9999;">✓ Profile Açık</span>`;
                }
            } else {
                // Started closed - should we open it?
                if (wheelTranslatePercent < (100 - threshold)) {
                    showProfile();
                    devLog.innerHTML = `<span style="font-size:12px;color:#00ff00;background:rgba(0,0,0,0.8);padding:4px;position:fixed;top:60px;left:10px;z-index:9999;">✓ Profile Açıldı</span>`;
                } else {
                    hideProfile();
                    devLog.innerHTML = `<span style="font-size:12px;color:#ff0000;background:rgba(0,0,0,0.8);padding:4px;position:fixed;top:60px;left:10px;z-index:9999;">✓ Playable (Kapalı)</span>`;
                }
            }

            // Clear debug message after a moment
            setTimeout(() => {
                if (devLog.innerHTML.includes('✓')) {
                    devLog.innerHTML = '-';
                }
            }, 1500);
        }, 100);
    }
    // Allow vertical scrolling with two fingers at all times
}

// Ensure these functions update the Global State
function showProfile() {
    isProfileVisible = true;
    wheelTranslatePercent = 0; // Explicitly set to 0%
    profileView.style.transform = 'translateX(0%)';
    profileView.classList.remove('hidden-right');
}

function hideProfile() {
    isProfileVisible = false;
    wheelTranslatePercent = 100; // Explicitly set to 100%
    profileView.style.transform = 'translateX(100%)';
    profileView.classList.add('hidden-right');
}

// Unified Pointer Handler
function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].screenX, y: e.touches[0].screenY };
    }
    // Mouse
    return { x: e.screenX, y: e.screenY };
}

// Global Touch Handler (for both Edge Zones and Iframes)
function handleTouchStart(e, sourceFrame = null) {
    handlePointerStart(e, sourceFrame);
}

function handlePointerStart(e, sourceFrame = null) {
    isDragging = true;
    isScrollingGesture = false;
    isInteractingGesture = false;
    activeFrame = sourceFrame;

    const pos = getPointerPos(e);
    touchStartX = pos.x;
    touchStartY = pos.y;

    // Disable Snap for smooth dragging
    feedContainer.style.scrollSnapType = 'none';
    feedContainer.style.scrollBehavior = 'auto'; // Disable smooth scroll for direct manipulation

    gestureStartX = pos.x;
    gestureStartY = pos.y;
    isSwipeLocked = false;
}

function handleTouchMove(e) {
    handlePointerMove(e);
}

function handlePointerMove(e) {
    if (!isDragging) return;

    // specific check for mouse: if buttons is 0, we are not dragging
    if (!e.touches && e.buttons === 0) {
        isDragging = false;
        return;
    }

    const pos = getPointerPos(e);
    // If undefined (e.g. touch ended midway?), abort
    if (!pos) return;

    const currentX = pos.x;
    const currentY = pos.y;

    const dx = currentX - touchStartX;
    const dy = currentY - touchStartY;

    // All click-and-drag gestures are disabled
    // Users can only interact with the game via clicks
    // Navigation (vertical and horizontal) requires two-finger trackpad scroll
}

function handlePointerEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    activeFrame = null;

    // Re-enable Snap
    feedContainer.style.scrollSnapType = 'y mandatory';
    feedContainer.style.scrollBehavior = 'smooth';

    // Re-enable transition for snap
    profileView.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    // All click-and-drag gestures are disabled
    // Only two-finger trackpad scroll works for navigation

    // Safety cleanup
    touchStartX = 0;
    touchStartY = 0;
    isScrollingGesture = false;
    isInteractingGesture = false;
}



function scrollToNext() { scrollToIndex(currentIndex + 1); }
function scrollToPrev() { scrollToIndex(currentIndex - 1); }

// Inject listeners into Iframe
function attachIframeListeners(iframe) {
    try {
        const iWindow = iframe.contentWindow;
        if (!iWindow) return;

        logDev("Attaching Touch Hooks");

        // Use Capture Phase to see events BEFORE the game does
        const opts = { capture: true, passive: false };

        iWindow.addEventListener('touchstart', (e) => {
            handleTouchStart(e, iframe);
        }, opts);

        iWindow.addEventListener('touchmove', (e) => {
            handleTouchMove(e);
        }, opts);

        iWindow.addEventListener('touchend', (e) => handlePointerEnd(e), opts);
        // Add Pointer Events support
        iWindow.addEventListener('pointerdown', (e) => {
            handleTouchStart(e, iframe);
        }, opts);
        iWindow.addEventListener('pointermove', (e) => {
            handleTouchMove(e);
        }, opts);
        iWindow.addEventListener('pointerup', (e) => handlePointerEnd(e), opts);

        // Trackpad / Wheel Support
        iWindow.addEventListener('wheel', (e) => {
            // Forward or handle directly
            // Since we use a global handler, we can just call it
            // ensuring we fix the context if needed, but handleWheel uses global state.
            handleWheel(e);
        }, opts);

    } catch (err) {
        console.error("Cannot access iframe", err);
        logDev("X-Origin Error?");
    }
}

// Edge Swipe Logic (Updating to use new unified handler)
function attachEdgeListeners() {
    [edgeLeft, edgeRight].forEach(zone => {
        // We can just reuse the same handlers, passing null as sourceFrame
        const opts = { passive: false };
        zone.addEventListener('touchstart', (e) => handleTouchStart(e, null), opts);
        zone.addEventListener('touchmove', handleTouchMove, opts);
        zone.addEventListener('touchend', handlePointerEnd, opts);
    });
}
// Old pointer events for mouse are less critical for mobile-first demo but we can keep minimal mouse support if needed
// For now focusing on Touch as requested.

// Profile Logic




function scrollToIndex(index) {
    if (index >= 0 && index < config.playables.length) {
        const height = feedContainer.clientHeight;
        feedContainer.scrollTo({
            top: index * height,
            behavior: 'smooth'
        });
    }
}

init();
attachMouseListeners();
