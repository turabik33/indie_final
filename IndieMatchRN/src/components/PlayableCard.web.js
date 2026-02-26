// src/components/PlayableCard.web.js
// iframe wrapper for HTML playables (WEB version).
// Metro automatically picks this file when bundling for web platform.

import React, { forwardRef, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

const PlayableCard = forwardRef(function PlayableCard(
    { uri, isActive, isMuted },
    ref
) {
    const iframeRef = useRef(null);

    React.useImperativeHandle(ref, () => ({
        injectJavaScript: (js) => {
            try {
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'eval', code: js }, '*'
                );
            } catch (e) { /* cross-origin */ }
        },
    }));

    useEffect(() => {
        if (!iframeRef.current?.contentWindow) return;
        try {
            iframeRef.current.contentWindow.postMessage(
                { type: 'mute', value: isMuted }, '*'
            );
        } catch (e) { /* cross-origin */ }
    }, [isMuted]);

    useEffect(() => {
        if (!iframeRef.current?.contentWindow) return;
        try {
            iframeRef.current.contentWindow.postMessage(
                isActive ? { type: 'resume' } : { type: 'pause' }, '*'
            );
        } catch (e) { /* cross-origin */ }
    }, [isActive]);

    return (
        <View style={styles.container}>
            <iframe
                ref={iframeRef}
                src={uri}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#000',
                }}
                allow="autoplay; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups"
            />
        </View>
    );
});

export default PlayableCard;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
