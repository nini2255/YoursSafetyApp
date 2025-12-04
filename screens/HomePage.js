import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Platform, Pressable, PanResponder } from 'react-native';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  runOnJS, // <--- IMPORT THIS explicitly
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PageContainer = ({ children }) => (
  <View style={styles.pageContainer}>{children}</View>
);

export const HomePage = ({
  onFakeCall,
  screenHoldEnabled,
  screenHoldDuration,
  onNavigateToJournal,
  onOpenMenu,
  navigation,
  route,
  onTriggerSudoku
}) => {
  const pressTimeout = useRef(null);
  const translateY = useSharedValue(0);

  // Parameter listening effect
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route.params?.triggerFakeCall) {
        navigation.setParams({ triggerFakeCall: undefined });
        if (onFakeCall) onFakeCall();
      }
      else if (route.params?.triggerSudoku) {
        navigation.setParams({ triggerSudoku: undefined });
        if (onTriggerSudoku) onTriggerSudoku();
      }
    });

    return unsubscribe;
  }, [navigation, route, onFakeCall, onTriggerSudoku]);

  // Animation for the swipe indicator
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      true // Reverse animation on repeat
    );
  }, []);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // --- FIX: Separate navigation function ---
  const handleSwipeUp = () => {
    if (navigation) {
      navigation.navigate('SecondaryHome');
    }
  };

  const swipeUpGesture = Gesture.Fling()
    .direction(Directions.UP)
    .onEnd(() => {
      'worklet'; // Explicitly mark as running on UI thread
      runOnJS(handleSwipeUp)(); // Explicitly call the JS function back on the JS thread
    });
  // ----------------------------------------

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return gestureState.x0 < 50 && gestureState.dx > 10;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50 && onOpenMenu) {
          onOpenMenu();
        }
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  const handlePressIn = () => {
    if (screenHoldEnabled) {
      pressTimeout.current = setTimeout(() => {
        onFakeCall();
      }, screenHoldDuration * 1000);
    }
  };

  const handlePressOut = () => {
    if (pressTimeout.current) {
      clearTimeout(pressTimeout.current);
    }
  };

  return (
    <GestureDetector gesture={swipeUpGesture}>
      <View style={styles.pageContainer} {...panResponder.panHandlers}>
        <ImageBackground
          source={require('../assets/logo-version1.png')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <PageContainer>
              <Text style={styles.homeTitle}>Welcome toYours</Text>
              <Text style={styles.homeSubtitle}>You are in a safe space.</Text>
              <Pressable
                onPress={onNavigateToJournal}
                style={({ pressed }) => [
                  styles.journalButton,
                  pressed && styles.journalButtonPressed
                ]}
              >
                {({ pressed }) => (
                  <Text style={[styles.journalButtonText, pressed && styles.journalButtonTextPressed]}>
                    Go to Journal
                  </Text>
                )}
              </Pressable>
            </PageContainer>
          </TouchableOpacity>
        </ImageBackground>

        {/* Animated Swipe Up Indicator */}
        <Animated.View style={[styles.swipeIndicatorContainer, animatedIndicatorStyle]} pointerEvents="none">
          <MaterialCommunityIcons name="chevron-double-up" size={24} color="#CD5F66" />
          <Text style={styles.swipeIndicatorText}>Swipe up for more</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  homeTitle: {
    fontSize: 47,
    fontWeight: 'normal',
    color: '#CD5F66',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'SnellRoundhand' : 'cursive',
  },
  homeSubtitle: {
    fontSize: 18,
    color: '#291314',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImageStyle: {
    resizeMode: 'contain',
    opacity: 0.3,
  },
  journalButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#CD5F66',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  journalButtonPressed: {
    backgroundColor: '#CD5F66',
  },
  journalButtonText: {
    color: '#CD5F66',
    fontSize: 16,
    fontWeight: 'bold',
  },
  journalButtonTextPressed: {
    color: 'white',
  },
  swipeIndicatorContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
    zIndex: 10,
  },
  swipeIndicatorText: {
    color: '#CD5F66',
    fontSize: 12,
    marginTop: -2,
    opacity: 0.8,
  },
});