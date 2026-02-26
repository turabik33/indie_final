// src/screens/ProfileScreen.js
// Profile screen - shows liked and reposted playables in a grid.
// Accessible via swipe-right from Feed screen.
// Mirrors the web app's #profile-view with its tabs + video-grid layout.

import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playables } from '../data/playables';
import { loadLikes, loadReposts } from '../storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 2) / 3; // 3 columns, 1px gaps

export default function ProfileScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('likes');
    const [likedSet, setLikedSet] = useState(new Set());
    const [repostedSet, setRepostedSet] = useState(new Set());

    // Refresh storage every time we enter the screen
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {
            const [likes, reposts] = await Promise.all([loadLikes(), loadReposts()]);
            setLikedSet(likes);
            setRepostedSet(reposts);
        });
        return unsubscribe;
    }, [navigation]);

    // Items to display based on active tab
    const sourceSet = activeTab === 'likes' ? likedSet : repostedSet;
    const displayItems = playables.filter((p) => sourceSet.has(p.id));

    // Tapping a grid item → go back to feed at that index
    function handleGridItemPress(item) {
        const index = playables.findIndex((p) => p.id === item.id);
        navigation.navigate('Feed', { scrollToIndex: index });
    }

    const renderGridItem = useCallback(
        ({ item }) => (
            <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleGridItemPress(item)}
                activeOpacity={0.8}
            >
                <Image source={item.thumbnail} style={styles.gridThumb} resizeMode="cover" />
                <View style={styles.gridOverlay}>
                    <Text style={styles.gridPlayIcon}>▶</Text>
                    <Text style={styles.gridLabel} numberOfLines={1}>
                        {item.gameName || item.id.toUpperCase()}
                    </Text>
                </View>
            </TouchableOpacity>
        ),
        []
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{activeTab === 'likes' ? '♥' : '↻'}</Text>
            <Text style={styles.emptyTitle}>{activeTab === 'likes' ? 'No likes yet' : 'No reposts yet'}</Text>
            <Text style={styles.emptySub}>
                {activeTab === 'likes' ? 'Like playables to see them here' : 'Repost playables to see them here'}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Nav Bar */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.navTitle}>Profile</Text>
                <Text style={styles.settingsIcon}>≡</Text>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
                <Image
                    source={{ uri: 'https://ui-avatars.com/api/?name=Indie+Match&background=fe2c55&color=fff&size=192' }}
                    style={styles.avatar}
                />
                <Text style={styles.displayName}>Developer</Text>
                <Text style={styles.usernameTag}>@developer</Text>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>142</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>8.2M</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>1.4B</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                </View>

                <Text style={styles.bio}>{'Building the future of indie games! 🛠️\nPlay nicely.'}</Text>

                <View style={styles.profileActions}>
                    <TouchableOpacity style={styles.btnPrimary}>
                        <Text style={styles.btnPrimaryText}>Follow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSecondary}>
                        <Text style={styles.btnSecondaryText}>Message</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
                    onPress={() => setActiveTab('likes')}
                >
                    <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>Likes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reposts' && styles.tabActive]}
                    onPress={() => setActiveTab('reposts')}
                >
                    <Text style={[styles.tabText, activeTab === 'reposts' && styles.tabTextActive]}>Reposts</Text>
                </TouchableOpacity>
            </View>

            {/* Grid */}
            <FlatList
                data={displayItems}
                keyExtractor={(item) => item.id}
                renderItem={renderGridItem}
                numColumns={3}
                columnWrapperStyle={styles.columnWrapper}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={displayItems.length === 0 ? styles.emptyContainer : undefined}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    backBtnText: {
        fontSize: 30,
        color: 'white',
        lineHeight: 34,
    },
    navTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
    },
    settingsIcon: {
        fontSize: 24,
        color: 'white',
    },
    profileInfo: {
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 12,
    },
    displayName: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    usernameTag: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 16,
    },
    statBox: {
        alignItems: 'center',
    },
    statNum: {
        fontSize: 17,
        fontWeight: '700',
        color: 'white',
    },
    statLabel: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    bio: {
        fontSize: 14,
        color: 'white',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 20,
    },
    profileActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    btnPrimary: {
        backgroundColor: '#fe2c55',
        paddingVertical: 10,
        paddingHorizontal: 32,
        borderRadius: 4,
    },
    btnPrimaryText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
    btnSecondary: {
        backgroundColor: '#333',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    btnSecondaryText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 15,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: 'white',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#777',
    },
    tabTextActive: {
        color: 'white',
    },
    columnWrapper: {
        gap: 1,
    },
    gridItem: {
        width: GRID_ITEM_WIDTH,
        aspectRatio: 3 / 4,
        backgroundColor: '#222',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 1,
    },
    gridThumb: {
        width: '100%',
        height: '100%',
    },
    gridOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
        paddingBottom: 8,
        paddingHorizontal: 6,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    gridPlayIcon: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        color: 'white',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    gridLabel: {
        position: 'absolute',
        bottom: 8,
        left: 6,
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        maxWidth: GRID_ITEM_WIDTH - 30,
    },
    emptyContainer: {
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 64,
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#888',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptySub: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
    },
});
