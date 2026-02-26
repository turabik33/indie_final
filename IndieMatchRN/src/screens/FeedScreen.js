// src/screens/FeedScreen.js
// Main feed screen - TikTok-style vertical paging feed.
// Key behaviors:
//  - FlatList with pagingEnabled for full-screen snap per item
//  - Windowed WebView: only mounts prev/current/next WebViews (max 3 at a time)
//  - Right-swipe gesture (from left edge) opens Profile screen
//  - Mute state is broadcast to all mounted WebViews
//  - Likes/Reposts persisted via AsyncStorage

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    PanResponder,
    StyleSheet,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FeedItem from '../components/FeedItem';
import { playables } from '../data/playables';
import { loadLikes, saveLikes, loadReposts, saveReposts } from '../storage';
import { getPlayableUri } from '../utils/assetHelper';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// How far to the side of center each WebView window extends
const WINDOW_SIZE = 1; // prev + current + next = 3 mounted

export default function FeedScreen({ navigation }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true); // start muted (browser policy compat)
    const [likedSet, setLikedSet] = useState(new Set());
    const [repostedSet, setRepostedSet] = useState(new Set());
    const [toastMsg, setToastMsg] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const toastTimerRef = useRef(null);

    // Refs for each WebView (keyed by index)
    const webViewRefs = useRef({});
    const flatListRef = useRef(null);
    const currentIndexRef = useRef(0); // always-current copy for PanResponder closure

    // ── Load persisted data on mount ──────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const [likes, reposts] = await Promise.all([loadLikes(), loadReposts()]);
            setLikedSet(likes);
            setRepostedSet(reposts);
        })();
    }, []);

    // ── Navigate back from Profile → scroll to chosen item ───────────────────
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            const params = navigation.getState()?.routes?.find(r => r.name === 'Feed')?.params;
            if (params?.scrollToIndex !== undefined) {
                const idx = params.scrollToIndex;
                flatListRef.current?.scrollToIndex({ index: idx, animated: false });
                setCurrentIndex(idx);
                currentIndexRef.current = idx;
                navigation.setParams({ scrollToIndex: undefined });
            }
        });
        return unsubscribe;
    }, [navigation]);

    // ── Toast helper ──────────────────────────────────────────────────────────
    function showToast(msg) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMsg(msg);
        setToastVisible(true);
        toastTimerRef.current = setTimeout(() => setToastVisible(false), 2300);
    }

    // ── Sound toggle ──────────────────────────────────────────────────────────
    function toggleMute() {
        setIsMuted((prev) => {
            const next = !prev;
            // Broadcast to all currently mounted WebViews
            Object.values(webViewRefs.current).forEach((ref) => {
                ref?.injectJavaScript?.(`window.postMessage(${JSON.stringify({ type: 'mute', value: next })}, '*'); true;`);
            });
            return next;
        });
    }

    // ── Like / Repost ─────────────────────────────────────────────────────────
    function toggleLike() {
        const item = playables[currentIndexRef.current];
        if (!item) return;
        setLikedSet((prev) => {
            const next = new Set(prev);
            if (next.has(item.id)) {
                next.delete(item.id);
                showToast('Unliked!');
            } else {
                next.add(item.id);
                showToast('Liked!');
            }
            saveLikes(next);
            return next;
        });
    }

    function toggleRepost() {
        const item = playables[currentIndexRef.current];
        if (!item) return;
        setRepostedSet((prev) => {
            const next = new Set(prev);
            if (next.has(item.id)) {
                next.delete(item.id);
                showToast('Removed Repost');
            } else {
                next.add(item.id);
                showToast('Reposted!');
            }
            saveReposts(next);
            return next;
        });
    }

    // ── Viewability → update currentIndex ────────────────────────────────────
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            const idx = viewableItems[0].index ?? 0;
            setCurrentIndex(idx);
            currentIndexRef.current = idx;
        }
    }, []);

    // ── Right-swipe PanResponder (left-edge → open Profile) ──────────────────
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const { dx, dy, moveX } = gestureState;
                // Capture only right-swipes starting from left 25% of screen
                return moveX < SCREEN_WIDTH * 0.25 && dx > 20 && Math.abs(dy) < 40;
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dx > 60) {
                    // Enough swipe distance → navigate to Profile
                    navigation.navigate('Profile', {
                        currentIndex: currentIndexRef.current,
                    });
                }
            },
        })
    ).current;

    // ── Render each feed item ─────────────────────────────────────────────────
    const getItemLayout = useCallback(
        (_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index }),
        []
    );

    const renderItem = useCallback(
        ({ item, index }) => {
            const isMounted = Math.abs(index - currentIndex) <= WINDOW_SIZE;
            const isActive = index === currentIndex;
            const uri = isMounted ? getPlayableUri(item.localPath) : null;

            // Store/create a ref for this index
            if (!webViewRefs.current[index]) {
                webViewRefs.current[index] = React.createRef();
            }

            const scrollToNext = () => {
                const nextIdx = currentIndexRef.current + 1;
                if (nextIdx < playables.length) {
                    flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
                }
            };

            const scrollToPrev = () => {
                const prevIdx = currentIndexRef.current - 1;
                if (prevIdx >= 0) {
                    flatListRef.current?.scrollToIndex({ index: prevIdx, animated: true });
                }
            };

            return (
                <FeedItem
                    item={item}
                    isActive={isActive}
                    isMounted={isMounted}
                    isMuted={isMuted}
                    isLiked={likedSet.has(item.id)}
                    isReposted={repostedSet.has(item.id)}
                    uri={uri}
                    webViewRef={webViewRefs.current[index]}
                    onLike={toggleLike}
                    onRepost={toggleRepost}
                    onSoundToggle={toggleMute}
                    toastMsg={isActive ? toastMsg : ''}
                    toastVisible={isActive ? toastVisible : false}
                    onNavigateProfile={() =>
                        navigation.navigate('Profile', { currentIndex })
                    }
                    onScrollNext={scrollToNext}
                    onScrollPrev={scrollToPrev}
                />
            );
        },
        [currentIndex, isMuted, likedSet, repostedSet, toastMsg, toastVisible]
    );

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <FlatList
                ref={flatListRef}
                data={playables}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                bounces={false}
                decelerationRate="fast"
                snapToInterval={SCREEN_HEIGHT}
                snapToAlignment="start"
                viewabilityConfig={viewabilityConfig.current}
                onViewableItemsChanged={onViewableItemsChanged}
                // Limit items kept in memory (RN default windowSize=21 is too large for WebViews)
                windowSize={3}
                maxToRenderPerBatch={1}
                initialNumToRender={1}
                removeClippedSubviews={false} // Must be false when using WebViews
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
