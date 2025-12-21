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
const tabFollowing = document.getElementById('tab-following');
const tabForYou = document.getElementById('tab-foryou');
const profileView = document.getElementById('profile-view');
const profileBackBtn = document.getElementById('profile-back');
const navHome = document.getElementById('nav-home');
const navProfile = document.getElementById('nav-profile');

let isMuted = true; // Start muted by default (modern browser policy friendly)

let currentIndex = 0;
let isScrolling = false;
let scrollTimeout = null;

function logDev(msg) {
    devLog.textContent = msg;
    console.log('[Dev]', msg);
    // Auto clear after 2s
    setTimeout(() => { if (devLog.textContent === msg) devLog.textContent = '-'; }, 3000);
}

function updateDevInfo() {
    const item = config.playables[currentIndex];
    devInfo.innerHTML = `Idx: ${currentIndex} <br> ID: ${item?.id} <br> Path: ${item?.path}`;
}

const loadingOverlay = document.getElementById('loading-overlay');

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
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

    // Bottom Nav
    navHome.addEventListener('click', hideProfile);
    navProfile.addEventListener('click', showProfile);

    // Like Button
    likeBtn.addEventListener('click', () => {
        animateHeart(window.innerWidth / 2, window.innerHeight / 2);
        showToast("Liked!");
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
feedContainer.addEventListener('scroll', () => {
    // Debounce/Throttle index calculation
    if (scrollTimeout) clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
        const height = feedContainer.clientHeight;
        const scrollPos = feedContainer.scrollTop;
        const newIndex = Math.round(scrollPos / height);

        if (newIndex !== currentIndex) {
            currentIndex = newIndex;
            updateDevInfo();
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

    // Direction Locking
    if (!isScrollingGesture && !isInteractingGesture) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Threshold to decide intent (e.g. 5-10px)
        if (Math.max(absX, absY) > 6) {
            if (absY > absX * 1.5) {
                // Vertical -> Scroll
                isScrollingGesture = true;
                logDev("Gesture: Scroll");
            } else if (absX > absY) {
                // Horizontal -> Interaction (Game or Swipe)
                isInteractingGesture = true;
                logDev("Gesture: Interactive");
            }
        }
    }

    if (isScrollingGesture) {
        // We are scrolling, so we manually scroll the feed
        // Prevent default to stop game from thinking it's a swipe
        if (e.cancelable) e.preventDefault();
        e.stopPropagation(); // Stop propagation

        feedContainer.scrollTop -= dy;

        // Reset start for next delta
        touchStartX = currentX;
        touchStartY = currentY;
    }
    // If isInteractingGesture, we do NOTHING here.
    // We let the event propagate to the game (if source was iframe) 
    // or we handle swipe logic (if source was edge).
}

function handleTouchEnd(e) {
    handlePointerEnd(e);
}

function handlePointerEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    activeFrame = null;

    // Re-enable Snap
    feedContainer.style.scrollSnapType = 'y mandatory';
    feedContainer.style.scrollBehavior = 'smooth';

    // Only handling Horizontal Swipes (Profile/Store) if we decided it was an Interaction
    if (isInteractingGesture) {
        // Logic for opening profile etc is optional here if we want to support it over the game
        // But usually we want game to handle horizontal.
        // EXCEPT event listener was attached to capture...

        // If capture was true, we might have prevented default if we deemed it a scroll.
        // But if it was interaction, we let it bubble.

        // If it was an Edge Zone touch, we definitely handle it.
        if (isInteractingGesture) {
            // Calculate final delta
            let endX = touchStartX; // Default to last known if no changedTouches
            let endY = touchStartY;

            if (e.changedTouches && e.changedTouches.length > 0) {
                endX = e.changedTouches[0].screenX;
                endY = e.changedTouches[0].screenY;
            } else {
                // For mouse, we use the last position from move, 
                // but since we updated touchStart in move, this logic is slightly flawed for swipe detection
                // standard swipe detection usually keeps ORIGINAL start.
                // Let's rely on simple dx/dy tracking if we want perfect swipes, 
                // but for now, let's just use what we have. 
                // The `touchStartX` is updated during Scroll, but NOT during Interaction?
                // Wait, line 298 updates touchStartX. 
                // Only if isScrollingGesture.
                // If isInteractingGesture, we DO NOT update touchStartX.
                // So touchStartX is still the ORIGINAL start.
                endX = e.screenX;
                endY = e.screenY;
            }

            const dx = endX - touchStartX;
            const dy = endY - touchStartY;

            // For mouse 'mouseup', e.screenX is valid.

            handleSwipe(dx, dy);
        }
    }
}

// Inject listeners into Iframe
function attachIframeListeners(iframe) {
    try {
        const iWindow = iframe.contentWindow;
        if (!iWindow) return;

        logDev("Attaching Touch Hooks");

        // Use Capture Phase to see events BEFORE the game does
        const opts = { capture: true, passive: false };

        iWindow.addEventListener('touchstart', (e) => handleTouchStart(e, iframe), opts);
        iWindow.addEventListener('touchmove', (e) => handleTouchMove(e), opts);
        iWindow.addEventListener('touchend', (e) => handleTouchEnd(e), opts);

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
        zone.addEventListener('touchend', handleTouchEnd, opts);
    });
}
// Old pointer events for mouse are less critical for mobile-first demo but we can keep minimal mouse support if needed
// For now focusing on Touch as requested.

// Profile Logic
function showProfile() {
    profileView.classList.remove('hidden-right');
    // Update Nav
    navProfile.classList.add('active');
    navHome.classList.remove('active');
}

function hideProfile() {
    profileView.classList.add('hidden-right');
    // Update Nav
    navProfile.classList.remove('active');
    navHome.classList.add('active');
}

function handleSwipe(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
        if (dx < 0) {
            // Finger moves LEFT (<---)
            // Swipe Left - User asked to DISABLE profile opening here.
            // We can just do nothing or show "Not Interested" toast.
            // For now, let's keep it safe and just log or do nothing, or maybe "Next Video"?
            // Let's bring back "Not Interested" toast behavior or just nothing.
            logDev("Swipe Left - No Action");
        } else {
            // Finger moves RIGHT (--->)
            // If Profile is Open -> Close Profile
            if (!profileView.classList.contains('hidden-right')) {
                hideProfile();
            } else {
                // On Main Feed -> Open Store
                const item = config.playables[currentIndex];
                showToast("Opening App Store...");
                window.open(item.storeUrl, '_blank');
            }
        }
    }
}

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
