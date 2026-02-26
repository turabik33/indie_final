// src/components/FeedItem.js
// Full-screen feed item wrapper.
// Contains the PlayableCard (WebView) + the TikTok-style UI overlay.
// Props:
//   item        - playable config object { id, gameName, publisher, thumbnail, ... }
//   isActive    - bool: this item is currently visible
//   isMounted   - bool: if false, renders a black placeholder (windowed WebView strategy)
//   isMuted     - bool
//   isLiked     - bool
//   isReposted  - bool
//   uri         - file:// URI for the playable HTML
//   webViewRef  - ref forwarded to PlayableCard
//   onLike      - callback
//   onRepost    - callback
//   onSoundToggle - callback
//   toastMsg    - string | null
//   toastVisible - bool
//   onNavigateProfile - callback to open profile screen

import React, { useRef, useState, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Dimensions,
    Animated, Image, PanResponder,
} from 'react-native';
import PlayableCard from './PlayableCard';
import Toast from './Toast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_ZONE_HEIGHT = SCREEN_HEIGHT * 0.12; // 12% of screen at top/bottom

// Heart animation component shown on double-tap
function FloatingHeart({ x, y, onDone }) {
    const anim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(onDone);
    }, []);

    const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.2, 0.8] });
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
    const opacity = anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });

    return (
        <Animated.Text
            style={[
                styles.floatingHeart,
                {
                    left: x - 40,
                    top: y - 40,
                    opacity,
                    transform: [{ scale }, { translateY }],
                },
            ]}
        >
            ♥
        </Animated.Text>
    );
}

export default function FeedItem({
    item,
    isActive,
    isMounted,
    isMuted,
    isLiked,
    isReposted,
    uri,
    webViewRef,
    onLike,
    onRepost,
    onSoundToggle,
    toastMsg,
    toastVisible,
    onNavigateProfile,
    onScrollNext,
    onScrollPrev,
}) {
    const [hearts, setHearts] = useState([]);
    const lastTapRef = useRef(0);

    const publisher = item.publisher || 'IndieMatch';
    const gameName = item.gameName || 'Indie Game';
    const username = `@${publisher.replace(/\s+/g, '').toLowerCase()}`;

    // ── Swipe zones at top/bottom for vertical feed navigation ──
    // Detects vertical swipes in edge zones and scrolls the feed
    const topSwipePan = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 15 && Math.abs(gs.dy) > Math.abs(gs.dx),
        onPanResponderRelease: (_, gs) => {
            if (gs.dy > 40 && onScrollPrev) onScrollPrev();   // swipe down → previous
            if (gs.dy < -40 && onScrollNext) onScrollNext();  // swipe up → next
        },
    }), [onScrollNext, onScrollPrev]);

    const bottomSwipePan = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 15 && Math.abs(gs.dy) > Math.abs(gs.dx),
        onPanResponderRelease: (_, gs) => {
            if (gs.dy > 40 && onScrollPrev) onScrollPrev();   // swipe down → previous
            if (gs.dy < -40 && onScrollNext) onScrollNext();  // swipe up → next
        },
    }), [onScrollNext, onScrollPrev]);

    function handleDoubleTap(e) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            // Double tap detected
            const { locationX, locationY } = e.nativeEvent;
            const id = now;
            setHearts((prev) => [...prev, { x: locationX, y: locationY, id }]);
            onLike && onLike();
        }
        lastTapRef.current = now;
    }

    function removeHeart(id) {
        setHearts((prev) => prev.filter((h) => h.id !== id));
    }

    return (
        <View style={styles.container}>
            {/* Playable or black placeholder */}
            {isMounted && uri ? (
                <PlayableCard
                    ref={webViewRef}
                    uri={uri}
                    isActive={isActive}
                    isMuted={isMuted}
                />
            ) : (
                <View style={styles.placeholder} />
            )}

            {/* Touch interceptor removed to allow game interaction */}

            {/* UI Overlay */}
            <View style={styles.overlay} pointerEvents="box-none">
                {/* Top Header */}
                <View style={styles.topHeader} pointerEvents="box-none">
                    <Text style={styles.tabInactive}>Following</Text>
                    <Text style={styles.separator}> | </Text>
                    <Text style={styles.tabActive}>For You</Text>
                </View>

                {/* Sound Toggle */}
                <TouchableOpacity style={styles.soundControl} onPress={onSoundToggle}>
                    <Text style={styles.soundIcon}>{isMuted ? '🔇' : '🔊'}</Text>
                </TouchableOpacity>

                {/* Right Action Bar */}
                <View style={styles.rightActions} pointerEvents="box-none">
                    {/* Profile pic */}
                    <TouchableOpacity style={styles.actionItem} onPress={onNavigateProfile}>
                        <Image
                            source={{ uri: 'https://ui-avatars.com/api/?name=Indie+Match&background=fe2c55&color=fff&size=96' }}
                            style={styles.profileCircle}
                        />
                    </TouchableOpacity>

                    {/* Like */}
                    <TouchableOpacity style={styles.actionItem} onPress={onLike}>
                        <Text style={[styles.icon, isLiked && styles.iconLiked]}>♥</Text>
                        <Text style={styles.count}>8.2M</Text>
                    </TouchableOpacity>

                    {/* Comment (static) */}
                    <View style={styles.actionItem}>
                        <Text style={styles.icon}>💬</Text>
                        <Text style={styles.count}>54K</Text>
                    </View>

                    {/* Repost */}
                    <TouchableOpacity style={styles.actionItem} onPress={onRepost}>
                        <Text style={[styles.icon, styles.repostIcon, isReposted && styles.iconReposted]}>↻</Text>
                        <Text style={styles.count}>21K</Text>
                    </TouchableOpacity>

                    {/* Share (static) */}
                    <View style={styles.actionItem}>
                        <Text style={styles.icon}>↗</Text>
                        <Text style={styles.count}>Share</Text>
                    </View>
                </View>

                {/* Bottom Info */}
                <View style={styles.bottomInfo} pointerEvents="none">
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.description}>
                        Playing <Text style={styles.bold}>{gameName}</Text>{'\n'}
                        Swipe right to play nicely! <Text style={styles.tag}>#demo</Text>
                    </Text>
                    <Text style={styles.musicNote}>♫ Original Sound - IndieMatch Demo</Text>
                </View>
            </View>

            {/* Vertical swipe zones — transparent strips at top & bottom edges */}
            <View style={styles.topSwipeZone} {...topSwipePan.panHandlers} />
            <View style={styles.bottomSwipeZone} {...bottomSwipePan.panHandlers} />

            {/* Floating hearts from double-tap */}
            {hearts.map((h) => (
                <FloatingHeart key={h.id} x={h.x} y={h.y} onDone={() => removeHeart(h.id)} />
            ))}

            {/* Toast */}
            <Toast message={toastMsg} visible={toastVisible} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    placeholder: {
        flex: 1,
        backgroundColor: '#111',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    topHeader: {
        position: 'absolute',
        top: 55,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabInactive: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        fontSize: 16,
    },
    separator: {
        color: 'rgba(255,255,255,0.4)',
        marginHorizontal: 8,
        fontSize: 16,
    },
    tabActive: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'white',
        paddingBottom: 2,
    },
    soundControl: {
        position: 'absolute',
        top: 55,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    soundIcon: {
        fontSize: 18,
    },
    rightActions: {
        position: 'absolute',
        right: 8,
        bottom: 100,
        alignItems: 'center',
        gap: 16,
    },
    actionItem: {
        alignItems: 'center',
        marginBottom: 8,
    },
    profileCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'white',
        backgroundColor: '#555',
        marginBottom: 4,
    },
    icon: {
        fontSize: 32,
        color: 'white',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    iconLiked: {
        color: '#fe2c55',
    },
    repostIcon: {
        fontSize: 28,
    },
    iconReposted: {
        color: '#00e676',
    },
    count: {
        fontSize: 12,
        color: 'white',
        fontWeight: '600',
        marginTop: 2,
    },
    bottomInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 50,
        paddingTop: 60,
        backgroundColor: 'transparent',
    },
    username: {
        color: 'white',
        fontWeight: '700',
        fontSize: 17,
        marginBottom: 6,
        textShadowColor: 'black',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    description: {
        color: 'white',
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 10,
        textShadowColor: 'black',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bold: {
        fontWeight: '700',
    },
    tag: {
        fontWeight: '700',
    },
    musicNote: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
    },
    floatingHeart: {
        position: 'absolute',
        fontSize: 60,
        color: '#fe2c55',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        zIndex: 50,
        pointerEvents: 'none',
    },
    topSwipeZone: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SWIPE_ZONE_HEIGHT,
        zIndex: 30,
        // backgroundColor: 'rgba(255,0,0,0.1)', // uncomment to debug
    },
    bottomSwipeZone: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SWIPE_ZONE_HEIGHT,
        zIndex: 30,
        // backgroundColor: 'rgba(0,0,255,0.1)', // uncomment to debug
    },
});
