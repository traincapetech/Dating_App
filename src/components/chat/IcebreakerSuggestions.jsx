import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {fetchIcebreakers, trackIcebreakerClick} from '../../services/icebreakerService';

// ─── Skeleton Placeholder ─────────────────────────────────────────────────────
const SkeletonBubble = ({width = '90%'}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {toValue: 1, duration: 800, useNativeDriver: false}),
        Animated.timing(shimmer, {toValue: 0, duration: 800, useNativeDriver: false}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.14)'],
  });

  return (
    <Animated.View
      style={[
        styles.skeletonBubble,
        {width, backgroundColor: bg},
      ]}
    />
  );
};

/**
 * IcebreakerSuggestions
 */
const IcebreakerSuggestions = ({targetUserId, matchId, onSelect, visible}) => {

  const [suggestions, setSuggestions] = useState([]);
  const [interactionId, setInteractionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tone, setTone] = useState('flirty'); // 'flirty' | 'funny'
  const [error, setError] = useState(false);

  // Entry animation
  const slideIn = useRef(new Animated.Value(30)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  // Button press scale animations
  const scales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const animateIn = () => {
    slideIn.setValue(20);
    fadeIn.setValue(0);
    Animated.parallel([
      Animated.spring(slideIn, {toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6}),
      Animated.timing(fadeIn, {toValue: 1, duration: 300, useNativeDriver: true}),
    ]).start();
  };

  const pressIn = idx =>
    Animated.spring(scales[idx], {toValue: 0.97, useNativeDriver: true, speed: 30}).start();

  const pressOut = idx =>
    Animated.spring(scales[idx], {toValue: 1, useNativeDriver: true, speed: 30}).start();

  const loadSuggestions = async (selectedTone, force = false) => {
    if (!targetUserId || !matchId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetchIcebreakers(targetUserId, matchId, selectedTone, force);
      if (res.suggestions?.length > 0) {
        setSuggestions(res.suggestions);
        setInteractionId(res.interactionId);
        animateIn();
      } else {
        setError(true);
      }
    } catch (err) {
      console.warn('[Icebreaker] Load failed:', err.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && targetUserId && matchId) {
      loadSuggestions(tone);
    }
  }, [targetUserId, matchId, visible]);

  const handleToneToggle = val => {
    const newTone = val ? 'funny' : 'flirty';
    setTone(newTone);
    loadSuggestions(newTone);
  };

  const handleSelect = msg => {
    // Analytics
    if (interactionId) {
      trackIcebreakerClick(interactionId, msg);
    }
    // Haptic
    try {
      require('../../utils/haptics').triggerLightHaptic();
    } catch {}
    onSelect(msg);
  };

  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sparkIcon}>✨</Text>
          <Text style={styles.headerTitle}>AI PICK FOR YOU</Text>
        </View>
        <View style={styles.toneRow}>
          <Text style={[styles.toneLabel, tone === 'flirty' && styles.toneLabelActive]}>
            😏 Flirty
          </Text>
          <Switch
            value={tone === 'funny'}
            onValueChange={handleToneToggle}
            trackColor={{false: 'rgba(147, 51, 234, 0.6)', true: 'rgba(251, 146, 60, 0.7)'}}
            thumbColor="#FFFFFF"
            style={styles.toneSwitch}
          />
          <Text style={[styles.toneLabel, tone === 'funny' && styles.toneLabelActive]}>
            😂 Funny
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonBubble width="88%" />
          <SkeletonBubble width="75%" />
          <SkeletonBubble width="82%" />
        </View>
      ) : error ? (
        <Pressable style={styles.retryRow} onPress={() => loadSuggestions(tone, true)}>
          <Text style={styles.retryText}>Retry generating suggestions ↺</Text>
        </Pressable>
      ) : (
        <Animated.View
          style={{
            opacity: fadeIn,
            transform: [{translateY: slideIn}],
          }}>
          {suggestions.map((msg, idx) => {
            const isBestPick = idx === 0; // Use first one as "Best Pick" logic for conversion
            return (
              <Animated.View
                key={idx}
                style={[styles.bubbleWrapper, {transform: [{scale: scales[idx]}]}]}>
                <Pressable
                  onPressIn={() => pressIn(idx)}
                  onPressOut={() => pressOut(idx)}
                  onPress={() => handleSelect(msg)}
                  style={styles.bubblePressable}>
                  <LinearGradient
                    colors={
                      tone === 'funny'
                        ? ['rgba(251,146,60,0.18)', 'rgba(252,211,77,0.12)']
                        : isBestPick 
                          ? ['rgba(147,51,234,0.35)', 'rgba(236,72,153,0.22)'] // Highlight best pick
                          : ['rgba(147,51,234,0.18)', 'rgba(236,72,153,0.10)']
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={[styles.bubble, isBestPick && styles.bestPickBubble]}>
                    <View style={styles.bubbleContent}>
                      {isBestPick && (
                        <View style={styles.bestPickBadge}>
                          <Text style={styles.bestPickBadgeText}>BEST PICK 🔥</Text>
                        </View>
                      )}
                      <Text style={styles.bubbleText}>{msg}</Text>
                    </View>
                    <View style={styles.tapHint}>
                      <Text style={styles.tapHintText}>Send</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            );
          })}

          {/* Refresh button - bypasses cache */}
          <Pressable style={styles.refreshRow} onPress={() => loadSuggestions(tone, true)}>
            <Text style={styles.refreshText}>↺  Not feeling these? Regenerate</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};


// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 10, 30, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(147, 51, 234, 0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sparkIcon: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toneLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  toneLabelActive: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
  toneSwitch: {
    transform: [{scaleX: 0.8}, {scaleY: 0.8}],
  },
  skeletonContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  skeletonBubble: {
    height: 42,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  retryRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  retryText: {
    color: 'rgba(147, 51, 234, 0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  bubbleWrapper: {
    marginBottom: 7,
  },
  bubblePressable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestPickBubble: {
    borderColor: 'rgba(236, 72, 153, 0.5)',
    borderWidth: 1.5,
  },
  bubbleContent: {
    flex: 1,
    marginRight: 8,
  },
  bestPickBadge: {
    backgroundColor: 'rgba(236, 72, 153, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  bestPickBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 18,
  },

  tapHint: {
    backgroundColor: 'rgba(147, 51, 234, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tapHintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  refreshRow: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  refreshText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
});

export default IcebreakerSuggestions;
