import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';

const MediaUploadScreen = () => {
  const navigation = useNavigation();
  const [media, setMedia] = useState(Array(6).fill(null));

  const mediaTypes = [
    'Headshot',
    'Full body',
    'Smiling',
    'Just you',
    'Nature',
    'Candid',
  ];

  const showMediaOptions = index => {
    Alert.alert(
      'Select Media',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => handleCamera(index),
        },
        {
          text: 'Gallery',
          onPress: () => handleGallery(index),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      {cancelable: true},
    );
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Pryvo needs access to your camera to take photos and videos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  const handleCamera = async index => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      return;
    }

    const options = {
      mediaType: 'mixed', // 'photo' or 'video' or 'mixed'
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      videoQuality: 'high',
      durationLimit: 60, // 60 seconds max for video
      saveToPhotos: true,
    };

    launchCamera(options, response => {
      if (response.didCancel) {
        return;
      } else if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const mediaUri = asset.uri;
        const mediaType = asset.type?.startsWith('video/') ? 'video' : 'photo';

        setMedia(prev => {
          const newMedia = [...prev];
          newMedia[index] = {
            uri: mediaUri,
            type: mediaType,
            fileName: asset.fileName || `media_${index}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
          };
          return newMedia;
        });
      }
    });
  };

  const handleGallery = index => {
    const options = {
      mediaType: 'mixed', // 'photo' or 'video' or 'mixed'
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      videoQuality: 'high',
      selectionLimit: 1,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        return;
      } else if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const mediaUri = asset.uri;
        const mediaType = asset.type?.startsWith('video/') ? 'video' : 'photo';

        setMedia(prev => {
          const newMedia = [...prev];
          newMedia[index] = {
            uri: mediaUri,
            type: mediaType,
            fileName: asset.fileName || `media_${index}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
          };
          return newMedia;
        });
      }
    });
  };

  const handleMediaSelect = index => {
    showMediaOptions(index);
  };

  const handleRemoveMedia = (index, event) => {
    event.stopPropagation();
    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove this media?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setMedia(prev => {
              const newMedia = [...prev];
              newMedia[index] = null;
              return newMedia;
            });
          },
        },
      ],
    );
  };

  const handleContinue = () => {
    navigation.navigate(AppRoute.SubscriptionUpsell);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Pick your photos and videos</Text>
        <Text style={styles.subtitle}>
          There are 6 photos/videos we upload like headshots, full body, smiling,
          just you, nature, candid.
        </Text>
      </View>

      <View style={styles.mediaGrid}>
        {media.map((item, index) => (
          <Pressable
            key={index}
            style={styles.mediaSlot}
            onPress={() => handleMediaSelect(index)}>
            {item ? (
              <View style={styles.mediaContainer}>
                {item.type === 'video' ? (
                  <View style={styles.videoContainer}>
                    <Image
                      source={{uri: item.uri}}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                    <View style={styles.videoOverlay}>
                      <Text style={styles.videoIcon}>▶</Text>
                    </View>
                  </View>
                ) : (
                  <Image
                    source={{uri: item.uri}}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                )}
                <Pressable
                  style={styles.removeButton}
                  onPress={e => handleRemoveMedia(index, e)}>
                  <Text style={styles.removeButtonText}>×</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.mediaPlaceholder}>
                <Text style={styles.mediaPlaceholderText}>+</Text>
                <Text style={styles.mediaTypeText}>{mediaTypes[index]}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>
          Show off the person behind the profile
        </Text>
        <Text style={styles.infoText}>
          One gif or some image should be there.
        </Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>Fill out your profile</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  mediaSlot: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    fontSize: 40,
    color: colors.textInverse,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeButtonText: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  mediaPlaceholderText: {
    fontSize: 32,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  mediaTypeText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  infoSection: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
  },
});

export default MediaUploadScreen;

