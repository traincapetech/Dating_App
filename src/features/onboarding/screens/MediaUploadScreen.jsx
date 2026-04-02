import React, {useState, useEffect} from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppRoute} from '../../../constants/routes';
import {colors, typography, spacing} from '../../../theme';
import {
  uploadProfileImage,
  updateProfileApi,
} from '../../../services/profile/profileService';
import {decodeJWT} from '../../../utils/safeUtils';

const MediaUploadScreen = () => {
  const navigation = useNavigation();
  const [media, setMedia] = useState(Array(6).fill(null));
  const [uploading, setUploading] = useState(false);

  // Verify image picker module is available
  useEffect(() => {
    console.log('[MediaUpload] Component mounted');
    console.log(
      '[MediaUpload] launchCamera available:',
      typeof launchCamera === 'function',
    );
    console.log(
      '[MediaUpload] launchImageLibrary available:',
      typeof launchImageLibrary === 'function',
    );

    if (
      typeof launchCamera !== 'function' ||
      typeof launchImageLibrary !== 'function'
    ) {
      console.error(
        '[MediaUpload] ERROR: Image picker functions are not available!',
      );
      Alert.alert(
        'Configuration Error',
        'Image picker module is not properly configured. Please rebuild the app.',
        [{text: 'OK'}],
      );
    }
  }, []);

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
          onPress: () => {
            setTimeout(() => {
              handleCamera(index);
            }, 300);
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            setTimeout(() => {
              handleGallery(index);
            }, 300);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      {cancelable: true},
    );
  };

  const handleImageCrop = async (imageUri, index) => {
    try {
      const croppedImage = await ImagePicker.openCropper({
        path: imageUri,
        width: 1080,
        height: 1080,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageQuality: 0.8,
        includeBase64: true,
      });

      if (croppedImage) {
        const base64Data = croppedImage.data
          ? `data:${croppedImage.mime || 'image/jpeg'};base64,${
              croppedImage.data
            }`
          : null;

        setMedia(prev => {
          const newMedia = [...prev];
          newMedia[index] = {
            uri: croppedImage.path,
            type: 'photo',
            fileName: croppedImage.filename || `cropped_${index}.jpg`,
            base64: base64Data,
            cropped: true,
          };
          return newMedia;
        });
      }
    } catch (error) {
      if (error.message !== 'User cancelled image selection') {
        console.error('[Crop] Error:', error);
        Alert.alert(
          'Crop Error',
          'Failed to crop image. Using original image.',
        );
        // Continue with original image
      }
    }
  };

  const handleReorder = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === media.length - 1) return;

    setMedia(prev => {
      const newMedia = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newMedia[index], newMedia[targetIndex]] = [
        newMedia[targetIndex],
        newMedia[index],
      ];
      return newMedia;
    });
  };

  const checkCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Check if permission is already granted
        const checkResult = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );

        if (checkResult) {
          return true; // Already granted
        }

        // Request camera permission
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Pryvo needs access to your camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        return cameraGranted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Camera permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  const checkStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        console.log('[MediaUpload] Checking storage permission. API Level:', Platform.Version);
        
        // Android 13 (API 33) and above use READ_MEDIA_IMAGES
        if (Platform.Version >= 33) {
          const hasFullAccess = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
          
          // Android 14 (API 34) adds "Partial Access"
          if (Platform.Version >= 34) {
            const hasPartialAccess = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED);
            console.log('[MediaUpload] API 34+ Check:', { hasFullAccess, hasPartialAccess });
            if (hasFullAccess || hasPartialAccess) return true;
          } else {
            console.log('[MediaUpload] API 33 Check:', { hasFullAccess });
            if (hasFullAccess) return true;
          }

          // If not granted, request them
          const permissionsToRequest = Platform.Version >= 34 
            ? [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES, PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED]
            : [PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES];
            
          const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
          
          const granted = results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED ||
                        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED] === PermissionsAndroid.RESULTS.GRANTED;
          
          return granted;
        } else {
          // Legacy permission for Android 12 and below
          const hasLegacy = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
          if (hasLegacy) return true;
          
          const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.error('Storage permission error:', err);
        return false;
      }
    }
    return true; // iOS handles via Info.plist
  };

  const handleCamera = async index => {
    try {
      console.log('[Camera] Starting camera handler for index:', index);

      // Verify function exists
      if (typeof launchCamera !== 'function') {
        console.error('[Camera] ERROR: launchCamera is not a function!');
        Alert.alert(
          'Error',
          'Camera module is not available. Please rebuild the app.',
        );
        return;
      }

      const hasPermission = await checkCameraPermission();
      if (!hasPermission) {
        console.log('[Camera] Permission denied');
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to take photos',
        );
        return;
      }

      const options = {
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 1200, // Reduced to reduce file size
        maxWidth: 1200, // Reduced to reduce file size
        quality: 0.7, // Reduced to reduce file size
        saveToPhotos: true,
      };

      console.log(
        '[Camera] Launching camera with options:',
        JSON.stringify(options),
      );
      console.log('[Camera] launchCamera function type:', typeof launchCamera);

      // Ensure we're calling launchCamera correctly - wrap in try-catch
      try {
        console.log('[Camera] About to call launchCamera...');
        const result = launchCamera(options, response => {
          console.log('[Camera] Callback invoked!');
          console.log('[Camera] Response:', {
            didCancel: response.didCancel,
            errorMessage: response.errorMessage,
            hasAssets: !!response.assets,
          });

          if (response.didCancel) {
            console.log('[Camera] User cancelled');
            return;
          }

          if (response.errorMessage) {
            console.error('[Camera] Error:', response.errorMessage);
            Alert.alert('Camera Error', response.errorMessage);
            return;
          }

          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            console.log('[Camera] Asset selected:', {
              uri: asset.uri,
              type: asset.type,
              hasBase64: !!asset.base64,
            });

            // Fix 3: Validate URI to prevent crashes
            const mediaUri =
              asset.uri ||
              asset.fileName ||
              (asset.base64 ? 'base64://' : null);
            if (!mediaUri) {
              Alert.alert(
                'Error',
                'Failed to get image data. Please try again.',
              );
              return;
            }

            // Fix 4: Validate media type - prevent video uploads
            const mediaType = asset.type?.startsWith('video/')
              ? 'video'
              : 'photo';
            if (mediaType === 'video') {
              Alert.alert(
                'Videos not supported',
                'Please pick an image instead.',
              );
              return;
            }

            // Fix 5: Add proper base64 header
            const base64Data = asset.base64
              ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
              : null;

            // Offer to crop the image
            Alert.alert(
              'Crop Image?',
              'Would you like to crop this image?',
              [
                {
                  text: 'Skip',
                  onPress: () => {
                    setMedia(prev => {
                      const newMedia = [...prev];
                      newMedia[index] = {
                        uri: mediaUri,
                        type: mediaType,
                        fileName: asset.fileName || `media_${index}.jpg`,
                        base64: base64Data,
                        asset: asset,
                      };
                      return newMedia;
                    });
                  },
                },
                {
                  text: 'Crop',
                  onPress: () => {
                    handleImageCrop(mediaUri, index);
                  },
                },
              ],
              {cancelable: true},
            );
          } else {
            console.warn('[Camera] No assets in response');
          }
        });
        console.log('[Camera] launchCamera called, result:', result);
      } catch (launchError) {
        console.error('[Camera] Launch error:', launchError);
        console.error('[Camera] Error stack:', launchError.stack);
        Alert.alert(
          'Error',
          `Failed to launch camera: ${
            launchError.message || launchError.toString()
          }`,
        );
      }
    } catch (error) {
      console.error('[Camera] Exception:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleGallery = async index => {
    try {
      console.log('[Gallery] Starting gallery handler for index:', index);

      // Verify function exists
      if (typeof launchImageLibrary !== 'function') {
        console.error('[Gallery] ERROR: launchImageLibrary is not a function!');
        Alert.alert(
          'Error',
          'Gallery module is not available. Please rebuild the app.',
        );
        return;
      }

      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        console.log('[Gallery] Permission denied');
        Alert.alert(
          'Permission Denied',
          'Storage permission is required to select photos',
        );
        return;
      }

      const options = {
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 1200, // Reduced from 2000 to reduce file size
        maxWidth: 1200, // Reduced from 2000 to reduce file size
        quality: 0.7, // Reduced from 0.8 to reduce file size
        selectionLimit: 1,
      };

      console.log(
        '[Gallery] Launching image library with options:',
        JSON.stringify(options),
      );
      console.log(
        '[Gallery] launchImageLibrary function type:',
        typeof launchImageLibrary,
      );

      // Ensure we're calling launchImageLibrary correctly - wrap in try-catch
      try {
        console.log('[Gallery] About to call launchImageLibrary...');
        const result = launchImageLibrary(options, response => {
          console.log('[Gallery] Callback invoked!');
          console.log('[Gallery] Response:', {
            didCancel: response.didCancel,
            errorMessage: response.errorMessage,
            hasAssets: !!response.assets,
          });

          if (response.didCancel) {
            console.log('[Gallery] User cancelled');
            return;
          }

          if (response.errorMessage) {
            console.error('[Gallery] Error:', response.errorMessage);
            Alert.alert('Gallery Error', response.errorMessage);
            return;
          }

          if (response.assets && response.assets[0]) {
            const asset = response.assets[0];
            console.log('[Gallery] Asset selected:', {
              uri: asset.uri,
              type: asset.type,
              hasBase64: !!asset.base64,
            });

            // Fix 3: Validate URI to prevent crashes
            const mediaUri =
              asset.uri ||
              asset.fileName ||
              (asset.base64 ? 'base64://' : null);
            if (!mediaUri) {
              Alert.alert(
                'Error',
                'Failed to get image data. Please try again.',
              );
              return;
            }

            // Fix 4: Validate media type - prevent video uploads
            const mediaType = asset.type?.startsWith('video/')
              ? 'video'
              : 'photo';
            if (mediaType === 'video') {
              Alert.alert(
                'Videos not supported',
                'Please pick an image instead.',
              );
              return;
            }

            // Fix 5: Add proper base64 header
            const base64Data = asset.base64
              ? `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`
              : null;

            // Offer to crop the image
            Alert.alert(
              'Crop Image?',
              'Would you like to crop this image?',
              [
                {
                  text: 'Skip',
                  onPress: () => {
                    setMedia(prev => {
                      const newMedia = [...prev];
                      newMedia[index] = {
                        uri: mediaUri,
                        type: mediaType,
                        fileName:
                          asset.fileName ||
                          asset.uri?.split('/').pop() ||
                          `media_${index}.jpg`,
                        base64: base64Data,
                        asset: asset,
                      };
                      return newMedia;
                    });
                  },
                },
                {
                  text: 'Crop',
                  onPress: () => {
                    handleImageCrop(mediaUri, index);
                  },
                },
              ],
              {cancelable: true},
            );
          } else {
            console.warn('[Gallery] No assets in response');
          }
        });
        console.log('[Gallery] launchImageLibrary called, result:', result);
      } catch (launchError) {
        console.error('[Gallery] Launch error:', launchError);
        console.error('[Gallery] Error stack:', launchError.stack);
        Alert.alert(
          'Error',
          `Failed to launch gallery: ${
            launchError.message || launchError.toString()
          }`,
        );
      }
    } catch (error) {
      console.error('[Gallery] Exception:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const handleMediaSelect = index => {
    showMediaOptions(index);
  };

  const handleRemoveMedia = (index, event) => {
    event.stopPropagation();
    Alert.alert('Remove Media', 'Are you sure you want to remove this media?', [
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
    ]);
  };

  const handleContinue = async () => {
    // Get user ID from storage (stored during signup/login)
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      let userId = null;

      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        userId = user.id;
      } else {
        // Try to get from token (decode JWT)
        const token = await AsyncStorage.getItem('@pryvo/token');
        if (token && token !== 'undefined') {
          try {
            const payload = decodeJWT(token);
            userId = payload?.userId || payload?.id;
          } catch (e) {
            console.error('Failed to decode token:', e);
          }
        }
      }

      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please sign in again.');
        return;
      }

      // Filter out null media items
      const mediaToUpload = media.filter(item => item !== null);

      if (mediaToUpload.length < 5) {
        Alert.alert(
          'Missing Photos',
          'Please add at least 5 photos before continuing.',
        );
        return;
      }

      setUploading(true);

      // Upload images one by one in the correct order
      const uploadResults = [];
      const uploadErrors = [];
      const mediaWithOrder = [];

      // Find the actual indices of non-null media items to preserve order
      media.forEach((item, originalIndex) => {
        if (item !== null) {
          mediaWithOrder.push({item, originalIndex});
        }
      });

      for (let i = 0; i < mediaWithOrder.length; i++) {
        const {item, originalIndex} = mediaWithOrder[i];
        try {
          console.log(
            `[MediaUpload] Uploading image ${i + 1}/${
              mediaWithOrder.length
            } (order: ${originalIndex})`,
          );

          let result;
          // Prefer asset object (which includes base64), then base64, then URI
          if (item.asset) {
            result = await uploadProfileImage(
              userId,
              item.asset,
              item.fileName,
            );
          } else if (item.base64) {
            result = await uploadProfileImage(
              userId,
              item.base64,
              item.fileName,
            );
          } else {
            result = await uploadProfileImage(userId, item.uri, item.fileName);
          }

          uploadResults.push({
            index: originalIndex,
            order: i,
            success: true,
            result,
          });
          console.log(
            `[MediaUpload] Image ${
              i + 1
            } uploaded successfully with order ${i}`,
          );
        } catch (error) {
          console.error(`[MediaUpload] Error uploading image ${i + 1}:`, error);
          uploadErrors.push({
            index: originalIndex,
            order: i,
            error: error.message || 'Upload failed',
          });
          // Continue with next image even if one fails
        }
      }

      // After all uploads, update the profile with correct order
      if (uploadResults.length > 0) {
        try {
          const mediaArray = uploadResults
            .sort((a, b) => a.order - b.order)
            .map((result, idx) => ({
              type: 'photo',
              url: result.result?.url || result.result?.data?.url,
              order: idx,
            }))
            .filter(item => item.url); // Only include items with valid URLs

          if (mediaArray.length > 0) {
            await updateProfileApi({
              media: {media: mediaArray},
            });
            console.log(
              '[MediaUpload] Profile updated with correct media order',
            );
          }
        } catch (error) {
          console.error('[MediaUpload] Error updating profile order:', error);
          // Don't fail the whole upload if order update fails
        }
      }

      // Show results
      if (uploadResults.length > 0) {
        if (uploadErrors.length === 0) {
          // All successful
          Alert.alert(
            'Success',
            `All ${uploadResults.length} images uploaded successfully!`,
            [
              {
                text: 'OK',
                onPress: () =>
                  navigation.navigate(AppRoute.SubscriptionUpsell, {
                    fromOnboarding: true,
                  }),
              },
            ],
          );
        } else {
          // Partial success
          Alert.alert(
            'Partial Success',
            `${uploadResults.length} images uploaded successfully, ${uploadErrors.length} failed. Continue anyway?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Continue',
                onPress: () =>
                  navigation.navigate(AppRoute.SubscriptionUpsell, {
                    fromOnboarding: true,
                  }),
              },
            ],
          );
        }
      } else {
        // All failed
        Alert.alert(
          'Upload Failed',
          `Failed to upload images. ${
            uploadErrors.length > 0
              ? uploadErrors[0].error
              : 'Please try again.'
          }`,
          [{text: 'OK'}],
        );
      }
    } catch (error) {
      console.error('[MediaUpload] Unexpected error:', error);
      Alert.alert(
        'Error',
        error.message || 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#743A9A', '#9B5CC5']}
      style={styles.flex}>
      {/* Programmatic Botanical Shadows */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <MaterialCommunityIcons name="leaf" size={180} color="#000" style={{ position: 'absolute', opacity: 0.08, top: -20, left: -60, transform: [{ rotate: '45deg' }] }} />
        <MaterialCommunityIcons name="clover" size={140} color="#000" style={{ position: 'absolute', opacity: 0.08, top: 150, right: -40, transform: [{ rotate: '-20deg' }] }} />
        <MaterialCommunityIcons name="leaf-maple" size={200} color="#000" style={{ position: 'absolute', opacity: 0.08, bottom: 80, left: -80, transform: [{ rotate: '70deg' }] }} />
        <MaterialCommunityIcons name="cannabis" size={160} color="#000" style={{ position: 'absolute', opacity: 0.08, bottom: -30, right: 30, transform: [{ rotate: '-10deg' }] }} />
      </View>
      <LinearGradient
        colors={['rgba(26, 24, 33, 0.4)', 'rgba(10, 9, 13, 0.7)']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Pick your photos and videos</Text>
          <Pressable 
            onPress={() =>
              navigation.navigate(AppRoute.SubscriptionUpsell, {
                fromOnboarding: true,
              })
            }
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          In order to verify the real you, you must add at least 5 photos/videos
          to your profile.
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
                <View style={styles.mediaControls}>
                  {index > 0 && (
                    <Pressable
                      style={styles.reorderButton}
                      onPress={() => handleReorder(index, 'up')}>
                      <Text style={styles.reorderButtonText}>↑</Text>
                    </Pressable>
                  )}
                  {index < media.length - 1 && (
                    <Pressable
                      style={styles.reorderButton}
                      onPress={() => handleReorder(index, 'down')}>
                      <Text style={styles.reorderButtonText}>↓</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.removeButton}
                    onPress={e => handleRemoveMedia(index, e)}>
                    <Text style={styles.removeButtonText}>×</Text>
                  </Pressable>
                </View>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{index + 1}</Text>
                </View>
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
          Profiles with 5+ photos receive 60% more matches and look more
          authentic.
        </Text>
      </View>

      <Pressable
        style={uploading && styles.primaryButtonDisabled}
        onPress={handleContinue}
        disabled={uploading}>
        <LinearGradient
          colors={['#7C3AED', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButton}>
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Upload & Continue</Text>
          )}
        </LinearGradient>
      </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.headings.h2,
    color: '#FFFFFF',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  skipText: {
    color: '#E5C49F',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.medium,
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    color: '#FFFFFF',
  },
  mediaControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  reorderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  orderBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C084FC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  orderBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  mediaPlaceholderText: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xs,
  },
  mediaTypeText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.caption,
    color: 'rgba(255,255,255,0.6)',
  },
  infoSection: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  infoTitle: {
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.medium,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: typography.body.small,
    color: 'rgba(255,255,255,0.7)',
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: spacing.xl,
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: typography.body.large,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
});

export default MediaUploadScreen;