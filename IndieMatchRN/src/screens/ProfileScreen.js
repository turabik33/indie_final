// src/screens/ProfileScreen.js
// Full profile screen:
//   PART 1  — Header (avatar, name, bio button, stats, friends card)
//   PART 2  — 4-tab icon bar (grid | saved | liked | reposted)
//   PART 3  — Tab 1: Create Game placeholder
//   PART 4  — Tab 2: Saved grid → in-profile game modal
//   PART 5  — Tab 3: Liked grid → in-profile game modal
//   PART 6  — Tab 4: Reposted grid → in-profile game modal
//   PART 7  — Shared GameModal (full-screen WebView + functional eng bar)

import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlayableCard from '../components/PlayableCard';
import { playables } from '../data/playables';
import { loadLikes, saveLikes, loadReposts, saveReposts, loadSaved, saveSaved } from '../storage';
import { getPlayableUri } from '../utils/assetHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = Math.floor(SCREEN_WIDTH / 3);
const ENG_BAR_H = 52;
const CREATOR_BAR_H = 52;

// ── Comment / Share bottom sheets ─────────────────────────────────────────────
function CommentsSheet({ visible, onClose }) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={sheetStyles.sheet}>
                <View style={sheetStyles.handle} />
                <Text style={sheetStyles.title}>Yorumlar</Text>
                <ScrollView style={sheetStyles.scrollArea} contentContainerStyle={sheetStyles.emptyContainer}>
                    <Text style={sheetStyles.emptyText}>Henüz yorum yok</Text>
                </ScrollView>
                <View style={sheetStyles.inputRow}>
                    <View style={sheetStyles.inputAvatar} />
                    <TextInput
                        style={sheetStyles.textInput}
                        placeholder="Yorum ekle..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <TouchableOpacity onPress={onClose}>
                        <Text style={sheetStyles.sendBtn}>Gönder</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function ShareSheet({ visible, onClose }) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={sheetStyles.sheet}>
                <View style={sheetStyles.handle} />
                <Text style={sheetStyles.title}>Gönder</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={sheetStyles.friendsRow}
                    contentContainerStyle={{ gap: 20, paddingHorizontal: 20 }}
                >
                    {['Arkadaş 1', 'Arkadaş 2', 'Arkadaş 3', 'Arkadaş 4'].map(name => (
                        <View key={name} style={sheetStyles.friendItem}>
                            <View style={sheetStyles.friendAvatar} />
                            <Text style={sheetStyles.friendName} numberOfLines={1}>{name}</Text>
                        </View>
                    ))}
                </ScrollView>
                <View style={sheetStyles.inputRow}>
                    <TextInput
                        style={[sheetStyles.textInput, { flex: 1 }]}
                        placeholder="Mesaj ekle..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <TouchableOpacity onPress={onClose}>
                        <Text style={sheetStyles.sendBtn}>Gönder</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// ── PART 7: In-profile game modal ─────────────────────────────────────────────
function GameModal({ item, visible, onClose, isLiked, isSaved, isReposted, onLike, onSave, onRepost }) {
    const insets = useSafeAreaInsets();
    const [showComments, setShowComments] = useState(false);
    const [showShare, setShowShare] = useState(false);

    if (!item) return null;

    const username = `@${(item.creator || 'indie').replace(/\s+/g, '').toLowerCase()}`;
    const title = item.title || item.gameName || 'Indie Game';

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View style={gameModalStyles.container}>
                {/* ── Game WebView ──────────────────────────────────────── */}
                <View style={[gameModalStyles.gameArea, { marginTop: insets.top }]}>
                    <PlayableCard
                        uri={getPlayableUri(item.localPath)}
                        isActive={visible}
                        isMuted
                    />
                </View>

                {/* ── Close button floated over game ────────────────────── */}
                <TouchableOpacity
                    style={[gameModalStyles.closeBtn, { top: insets.top + 10 }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <Text style={gameModalStyles.closeBtnText}>✕</Text>
                </TouchableOpacity>

                {/* ── Engagement bar ────────────────────────────────────── */}
                <View style={gameModalStyles.engBar}>
                    <View style={gameModalStyles.engLeft}>
                        <TouchableOpacity style={gameModalStyles.engBtn} onPress={onLike}>
                            <Ionicons
                                name={isLiked ? 'heart' : 'heart-outline'}
                                size={23}
                                color={isLiked ? '#FF3040' : '#fff'}
                            />
                            <Text style={[gameModalStyles.engCount, isLiked && { color: '#FF3040' }]}>
                                {item.likes || '0'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={gameModalStyles.engBtn} onPress={() => setShowComments(true)}>
                            <Feather name="message-circle" size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={gameModalStyles.engBtn} onPress={onSave}>
                            <Ionicons
                                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                                size={22}
                                color={isSaved ? '#F59E0B' : '#fff'}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={gameModalStyles.engRight}>
                        <TouchableOpacity style={gameModalStyles.engBtn} onPress={onRepost}>
                            <Feather name="repeat" size={22} color={isReposted ? '#4ADE80' : '#fff'} />
                            <Text style={[gameModalStyles.engCount, isReposted && { color: '#4ADE80' }]}>
                                {item.reposts || '0'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={gameModalStyles.engBtn} onPress={() => setShowShare(true)}>
                            <Feather name="send" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Creator bar ───────────────────────────────────────── */}
                <View style={gameModalStyles.creatorBar}>
                    <Image source={item.thumbnail} style={gameModalStyles.creatorAvatar} />
                    <View style={gameModalStyles.creatorText}>
                        <Text style={gameModalStyles.creatorName}>{username}</Text>
                        <Text style={gameModalStyles.creatorTitle} numberOfLines={1}>{title}</Text>
                    </View>
                </View>

                <CommentsSheet visible={showComments} onClose={() => setShowComments(false)} />
                <ShareSheet visible={showShare} onClose={() => setShowShare(false)} />
            </View>
        </Modal>
    );
}

// ── Grid item ─────────────────────────────────────────────────────────────────
function GridItem({ item, fallbackIcon, onPress }) {
    return (
        <TouchableOpacity style={gridStyles.cell} onPress={() => onPress(item)} activeOpacity={0.8}>
            {item.thumbnail ? (
                <Image source={item.thumbnail} style={gridStyles.thumb} resizeMode="cover" />
            ) : (
                <View style={gridStyles.placeholder}>
                    <Feather name={fallbackIcon} size={20} color="#555" />
                </View>
            )}
        </TouchableOpacity>
    );
}

// ── Main ProfileScreen ────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('grid');
    const [likedSet, setLikedSet] = useState(new Set());
    const [savedSet, setSavedSet] = useState(new Set());
    const [repostedSet, setRepostedSet] = useState(new Set());
    const [modalItem, setModalItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Load data on mount (handles inline tab render — remounts on each tab switch)
    useEffect(() => {
        (async () => {
            const [likes, reposts, saved] = await Promise.all([
                loadLikes(), loadReposts(), loadSaved(),
            ]);
            setLikedSet(likes);
            setRepostedSet(reposts);
            setSavedSet(saved);
        })();
    }, []);

    // Also reload on stack navigation focus (handles navigate('Profile') case)
    useEffect(() => {
        if (!navigation?.addListener) return;
        const unsub = navigation.addListener('focus', async () => {
            const [likes, reposts, saved] = await Promise.all([
                loadLikes(), loadReposts(), loadSaved(),
            ]);
            setLikedSet(likes);
            setRepostedSet(reposts);
            setSavedSet(saved);
        });
        return unsub;
    }, [navigation]);

    function openGame(item) {
        setModalItem(item);
        setModalVisible(true);
    }

    function closeModal() {
        setModalVisible(false);
        setModalItem(null);
    }

    function toggleLike(item) {
        setLikedSet(prev => {
            const next = new Set(prev);
            next.has(item.id) ? next.delete(item.id) : next.add(item.id);
            saveLikes(next);
            return next;
        });
    }

    function toggleSave(item) {
        setSavedSet(prev => {
            const next = new Set(prev);
            next.has(item.id) ? next.delete(item.id) : next.add(item.id);
            saveSaved(next);
            return next;
        });
    }

    function toggleRepost(item) {
        setRepostedSet(prev => {
            const next = new Set(prev);
            next.has(item.id) ? next.delete(item.id) : next.add(item.id);
            saveReposts(next);
            return next;
        });
    }

    const tabConfig = [
        { id: 'grid',     icon: 'grid' },
        { id: 'saved',    icon: 'bookmark' },
        { id: 'liked',    icon: 'heart' },
        { id: 'reposted', icon: 'repeat' },
    ];

    const displayItems =
        activeTab === 'saved'    ? playables.filter(p => savedSet.has(p.id)) :
        activeTab === 'liked'    ? playables.filter(p => likedSet.has(p.id)) :
        activeTab === 'reposted' ? playables.filter(p => repostedSet.has(p.id)) :
        [];

    const emptyLabels = {
        saved:    'No saved games yet',
        liked:    'No liked games yet',
        reposted: 'No reposts yet',
    };

    const gridFallbackIcon =
        activeTab === 'reposted' ? 'repeat' : 'bookmark';

    return (
        <View style={profileStyles.container}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

                {/* ── PART 1: Top nav ──────────────────────────────────── */}
                <View style={profileStyles.navBar}>
                    <Text style={profileStyles.navTitle}>Profile</Text>
                    <View style={profileStyles.navRight}>
                        <View style={profileStyles.navIconWrap}>
                            <Feather name="user-plus" size={24} color="#fff" />
                            <View style={profileStyles.navDot} />
                        </View>
                        <TouchableOpacity style={profileStyles.navIconWrap} activeOpacity={0.7}>
                            <Feather name="settings" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Avatar ───────────────────────────────────────────── */}
                <View style={profileStyles.avatarSection}>
                    <View style={profileStyles.avatarWrap}>
                        <View style={profileStyles.avatarCircle}>
                            <Text style={profileStyles.avatarLetter}>D</Text>
                        </View>
                        <View style={profileStyles.cameraBadge}>
                            <Feather name="camera" size={13} color="#000" />
                        </View>
                    </View>
                </View>

                {/* ── Name + edit icon ──────────────────────────────────── */}
                <View style={profileStyles.nameRow}>
                    <Text style={profileStyles.displayName}>Developer</Text>
                    <Feather name="edit-2" size={14} color="#8E8E93" />
                </View>

                {/* ── + Add Bio pill ────────────────────────────────────── */}
                <View style={profileStyles.addBioWrap}>
                    <TouchableOpacity style={profileStyles.addBioBtn} activeOpacity={0.7}>
                        <Text style={profileStyles.addBioText}>+ Add Bio</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Stats row ─────────────────────────────────────────── */}
                <View style={profileStyles.statsRow}>
                    <View style={profileStyles.statItem}>
                        <Text style={profileStyles.statNum}>0</Text>
                        <Text style={profileStyles.statLabel}>Following</Text>
                    </View>
                    <View style={profileStyles.statDivider} />
                    <View style={profileStyles.statItem}>
                        <Text style={profileStyles.statNum}>0</Text>
                        <Text style={profileStyles.statLabel}>Followers</Text>
                    </View>
                    <View style={profileStyles.statDivider} />
                    <View style={profileStyles.statItem}>
                        <Text style={profileStyles.statNum}>0</Text>
                        <Text style={profileStyles.statLabel}>Likes & Saves</Text>
                    </View>
                </View>

                {/* ── Find your friends card ────────────────────────────── */}
                <View style={profileStyles.friendsCard}>
                    <View style={profileStyles.friendsIconCircle}>
                        <Feather name="user-plus" size={20} color="#fff" />
                    </View>
                    <View style={profileStyles.friendsCardBody}>
                        <Text style={profileStyles.friendsCardTitle}>Find your friends</Text>
                        <Text style={profileStyles.friendsCardSub}>Indie is better with friends</Text>
                    </View>
                    <TouchableOpacity style={profileStyles.findBtn} activeOpacity={0.7}>
                        <Text style={profileStyles.findBtnText}>Find</Text>
                    </TouchableOpacity>
                </View>

                {/* ── PART 2: Profile tab icon bar ─────────────────────── */}
                <View style={profileStyles.profileTabBar}>
                    {tabConfig.map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[profileStyles.profileTab, activeTab === tab.id && profileStyles.profileTabActive]}
                            onPress={() => setActiveTab(tab.id)}
                            activeOpacity={0.7}
                        >
                            <Feather
                                name={tab.icon}
                                size={22}
                                color={activeTab === tab.id ? '#fff' : '#8E8E93'}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Tab content ───────────────────────────────────────── */}

                {/* PART 3: grid tab → Create Game */}
                {activeTab === 'grid' && (
                    <View style={profileStyles.createGameSection}>
                        <Text style={profileStyles.noGamesTitle}>No Games Yet</Text>
                        <Text style={profileStyles.noGamesSub}>
                            Share your indie game with the world!
                        </Text>
                        <TouchableOpacity
                            style={profileStyles.createGameBtn}
                            onPress={() => Alert.alert('Coming Soon')}
                            activeOpacity={0.8}
                        >
                            <Text style={profileStyles.createGameBtnText}>Create Game</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* PARTS 4-6: saved / liked / reposted grids */}
                {activeTab !== 'grid' && displayItems.length === 0 && (
                    <View style={profileStyles.emptyState}>
                        <Text style={profileStyles.emptyText}>{emptyLabels[activeTab]}</Text>
                    </View>
                )}

                {activeTab !== 'grid' && displayItems.length > 0 && (
                    <View style={profileStyles.grid}>
                        {displayItems.map(item => (
                            <GridItem
                                key={item.id}
                                item={item}
                                fallbackIcon={gridFallbackIcon}
                                onPress={openGame}
                            />
                        ))}
                    </View>
                )}

            </ScrollView>

            {/* ── PART 7: In-profile game modal ─────────────────────────── */}
            {modalItem && (
                <GameModal
                    item={modalItem}
                    visible={modalVisible}
                    onClose={closeModal}
                    isLiked={likedSet.has(modalItem.id)}
                    isSaved={savedSet.has(modalItem.id)}
                    isReposted={repostedSet.has(modalItem.id)}
                    onLike={() => toggleLike(modalItem)}
                    onSave={() => toggleSave(modalItem)}
                    onRepost={() => toggleRepost(modalItem)}
                />
            )}
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const profileStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },

    // Top nav
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    navTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    navRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    navIconWrap: {
        position: 'relative',
    },
    navDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fe2c55',
    },

    // Avatar
    avatarSection: {
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 12,
    },
    avatarWrap: {
        position: 'relative',
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1B5E20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },

    // Name row
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 10,
    },
    displayName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },

    // Add Bio
    addBioWrap: {
        alignItems: 'center',
        marginBottom: 16,
    },
    addBioBtn: {
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    addBioText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNum: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    statLabel: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: '#2C2C2E',
    },

    // Friends card
    friendsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 20,
        gap: 12,
    },
    friendsIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4ADE80',
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendsCardBody: {
        flex: 1,
    },
    friendsCardTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    friendsCardSub: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 2,
    },
    findBtn: {
        borderWidth: 1.5,
        borderColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 7,
    },
    findBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Profile tab icon bar (4 tabs)
    profileTabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#1C1C1E',
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
        marginBottom: 2,
    },
    profileTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    profileTabActive: {
        borderBottomColor: '#fff',
    },

    // Create Game (Tab 1)
    createGameSection: {
        alignItems: 'center',
        paddingTop: 48,
        paddingHorizontal: 32,
        paddingBottom: 32,
    },
    noGamesTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 8,
    },
    noGamesSub: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    createGameBtn: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    createGameBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },

    // Grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    // Empty state
    emptyState: {
        paddingTop: 60,
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 15,
        textAlign: 'center',
    },
});

const gridStyles = StyleSheet.create({
    cell: {
        width: GRID_ITEM_SIZE,
        height: GRID_ITEM_SIZE,
        backgroundColor: '#1C1C1E',
        borderWidth: 0.5,
        borderColor: '#000',
        overflow: 'hidden',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2C2C2E',
    },
});

// ── Game modal styles ─────────────────────────────────────────────────────────
const gameModalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    gameArea: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    closeBtn: {
        position: 'absolute',
        left: 16,
        zIndex: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    engBar: {
        height: ENG_BAR_H,
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    engLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    engRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    engBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    engCount: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    creatorBar: {
        height: CREATOR_BAR_H,
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 10,
    },
    creatorAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#333',
    },
    creatorText: {
        flex: 1,
    },
    creatorName: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    creatorTitle: {
        color: '#888',
        fontSize: 11,
        marginTop: 1,
    },
});

// ── Bottom sheet styles (comments + share) ────────────────────────────────────
const sheetStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 32,
        minHeight: 320,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#3A3A3C',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        paddingTop: 16,
        paddingBottom: 12,
    },
    scrollArea: {
        minHeight: 120,
        maxHeight: 240,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 14,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 10,
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3A3A3C',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#2C2C2E',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 14,
        color: '#fff',
    },
    sendBtn: {
        color: '#4ADE80',
        fontSize: 14,
        fontWeight: '700',
    },
    friendsRow: {
        paddingVertical: 16,
    },
    friendItem: {
        alignItems: 'center',
        width: 60,
    },
    friendAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#3A3A3C',
        marginBottom: 6,
    },
    friendName: {
        color: '#fff',
        fontSize: 11,
        textAlign: 'center',
    },
});
