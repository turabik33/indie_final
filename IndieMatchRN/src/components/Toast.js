// src/components/Toast.js
// Animated toast notification - RN equivalent of the web app's #toast element.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

export default function Toast({ message, visible }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-10)).current;

    useEffect(() => {
        if (visible && message) {
            // Fade in + slide down
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();

            // Auto-hide after 2s
            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: -10, duration: 300, useNativeDriver: true }),
                ]).start();
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [visible, message]);

    if (!message) return null;

    return (
        <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        top: '12%',
        alignSelf: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1000,
        pointerEvents: 'none',
    },
    text: {
        color: 'black',
        fontWeight: '600',
        fontSize: 15,
    },
});
