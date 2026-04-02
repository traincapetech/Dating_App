import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Animated,
  FlatList,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {useNavigation, useRoute} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {
  getProfile,
  updateProfileApi,
  uploadProfileImage,
  updateMedia,
  deleteImage,
} from '../../../services/profile/profileService';
import {launchImageLibrary} from 'react-native-image-picker';
import {DraggableGrid} from 'react-native-draggable-grid';
import {useAuth} from '../../../context/AuthContext';
import {usePhotoSocial} from '../../../hooks/usePhotoSocial';
import {photoSocialService} from '../../../services/photoSocialService';
import PhotoInteractionViewer from '../../../components/profile/PhotoInteractionViewer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import ThemeBackground from '../../../components/layout/ThemeBackground';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const GRID_PADDING = 20; // Matches bodyContent padding
const GRID_GAP = 10;    
const CONTAINER_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const PHOTO_SIZE = CONTAINER_WIDTH / 3;
const HERO_HEIGHT = Dimensions.get('window').height * 0.55; 

const ProfileDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {loadProfile: reloadGlobalProfile} = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [newUploadedPhotos, setNewUploadedPhotos] = useState([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;

// Cleanup and navigation prevention if unsaved changes exist
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only do special cleanup if we have unsaved uploads
      if (isEditing && newUploadedPhotos.length > 0) {
        // We don't block navigation, we just trigger cleanup in the background
        console.log(`[Nav Cleanup] Abandoning ${newUploadedPhotos.length} uploads`);
        const cleanupPromises = newUploadedPhotos.map(url => 
            deleteImage(userId || profile?._id, url)
        );
        Promise.all(cleanupPromises).catch(err => 
            console.error('[Cleanup] Error during navigation cleanup:', err)
        );
      }
    });

    return unsubscribe;
  }, [navigation, isEditing, newUploadedPhotos, userId, profile?._id]);

  const userId = route.params?.userId || profile?._id || profile?.id;

  // 📸 Social Interaction System
  const {photosStats} = usePhotoSocial(userId);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadProfile();

    // Refresh profile whenever screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      // Use the actual profile ID we have if userId param is missing
      const currentTarget = route.params?.userId || profile?._id || profile?.id;
      loadProfile(currentTarget);
    });

    return unsubscribe;
  }, [navigation, route.params?.userId, profile?._id, profile?.id]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(contentY, {
          toValue: 0,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadProfile = async (specificTargetId = null) => {
    try {
      setLoading(true);
      let targetId = specificTargetId || route.params?.userId;

      if (!targetId) {
        // Ultimate fallback to local storage
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          targetId = user.id || user._id;
        }
      }

      // Also ensure our global currentUserId state is set for the social viewer
      const myData = await AsyncStorage.getItem('@pryvo_user');
      if (myData) {
        const me = JSON.parse(myData);
        setCurrentUserId(me.id || me._id);
      }

      if (!targetId || targetId === 'undefined') {
        console.warn('User ID not found, skipping profile fetch');
        setLoading(false);
        return;
      }

      const response = await getProfile(targetId);
      const profileData = response?.profile || response;
      setProfile(profileData);

      // Check if it's the current user's profile
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData && userData !== 'undefined') {
        const user = JSON.parse(userData);
        const meId = user.id || user._id;
        setIsOwnProfile(meId === targetId);
        setCurrentUserId(meId);
      }

      setEditedProfile({
        firstName: profileData?.basicInfo?.firstName || '',
        lastName: profileData?.basicInfo?.lastName || '',
        dob: profileData?.basicInfo?.dob || '',
        bio: profileData?.bio || '',
        occupation: profileData?.personalDetails?.jobTitle || '',
        education: profileData?.personalDetails?.school || '',
        location: profileData?.basicInfo?.location || '',
        gender: profileData?.basicInfo?.gender || '',
        showGenderOnProfile:
          profileData?.basicInfo?.showGenderOnProfile ?? true,
        interests: (profileData?.interests || []).join(', '),
        datingIntention: profileData?.datingPreferences?.datingIntention || '',
        relationshipType:
          profileData?.datingPreferences?.relationshipType || '',
        whoToDate: profileData?.datingPreferences?.whoToDate || [],
        showIntentionOnProfile:
          profileData?.datingPreferences?.showIntentionOnProfile ?? true,
        showRelationshipTypeOnProfile:
          profileData?.datingPreferences?.showRelationshipTypeOnProfile ?? true,
        // Initialize photos for draggable grid
        photos: (
          profileData?.photos ||
          profileData?.media?.media?.map(m => m.url).filter(Boolean) ||
          []
        ).map((url, index) => ({
          key: `photo_${index}`,
          url,
          id: index.toString(),
        })),
      });

      // Pad photos with placeholders for the grid if needed (up to 6)
      const existingPhotos =
        profileData?.photos ||
        profileData?.media?.media?.map(m => m.url).filter(Boolean) ||
        [];
      const gridPhotos = Array(6)
        .fill(null)
        .map((_, i) => ({
          key: i.toString(),
          url: existingPhotos[i] || null,
          id: i.toString(),
        }));

      setEditedProfile(prev => ({...prev, photos: gridPhotos}));
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect GPS location and reverse geocode to city name
  const handleDetectLocation = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {title: 'Location Permission', message: 'Pryvo needs your location to show nearby matches.', buttonPositive: 'Allow'},
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Please enable location in device settings.');
          return;
        }
      }
      setIsDetectingLocation(true);
      const position = await new Promise((resolve, reject) =>
        Geolocation.getCurrentPosition(resolve, reject, {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}),
      );
      const {latitude, longitude} = position.coords;
      // Reverse geocode using open API (no key required)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {headers: {'Accept-Language': 'en'}},
        );
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.state ||
          'Your Location';
        const locationStr = data.address?.state
          ? `${city}, ${data.address.state}`
          : city;
        setEditedProfile(prev => ({
          ...prev,
          location: locationStr,
          locationDetails: {lat: latitude, lng: longitude, source: 'gps', timestamp: Date.now()},
        }));
        Alert.alert('📍 Location Detected', locationStr);
      } catch {
        // Fallback: just store coordinates as label
        setEditedProfile(prev => ({
          ...prev,
          location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          locationDetails: {lat: latitude, lng: longitude, source: 'gps', timestamp: Date.now()},
        }));
      }
    } catch (error) {
      Alert.alert('Location Error', 'Could not detect location. Make sure GPS is enabled.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Get current userId
      let currentUserId = userId;
      if (!currentUserId) {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          currentUserId = user.id;
        }
      }

      if (!currentUserId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }

      // Check minimum photos before saving
      const validPhotos = (editedProfile.photos || []).filter(p => p.url);
      if (validPhotos.length < 5) {
        Alert.alert(
          'Minimum Photos Required',
          'Please upload at least 5 photos before saving.',
        );
        setSaving(false);
        return;
      }

      // Build payload with proper validation
      const payload = {
        userId: currentUserId,
        basicInfo: {},
        profilePrompts: {},
        personalDetails: {},
        lifestyle: {},
        datingPreferences: {},
      };

      // Basic Info - send empty strings to allow clearing
      if (editedProfile.firstName !== undefined) {
        payload.basicInfo.firstName = editedProfile.firstName.trim();
      }
      if (editedProfile.lastName !== undefined) {
        payload.basicInfo.lastName = editedProfile.lastName.trim();
      }
      if (editedProfile.dob !== undefined) {
        payload.basicInfo.dob = editedProfile.dob.trim();
      }
      if (editedProfile.location !== undefined) {
        payload.basicInfo.location = editedProfile.location.trim();
      }
      // Also sync GPS coordinates if available
      if (editedProfile.locationDetails?.lat && editedProfile.locationDetails?.lng) {
        payload.basicInfo.locationDetails = editedProfile.locationDetails;
      }
      if (editedProfile.gender) {
        payload.basicInfo.gender = editedProfile.gender;
      }
      if (editedProfile.showGenderOnProfile !== undefined) {
        payload.basicInfo.showGenderOnProfile =
          editedProfile.showGenderOnProfile;
      }

      // Profile Prompts
      if (editedProfile.bio !== undefined) {
        payload.profilePrompts.aboutMe = {
          answer: editedProfile.bio.trim(),
        };
      }

      // Personal Details
      if (editedProfile.occupation !== undefined) {
        payload.personalDetails.jobTitle = editedProfile.occupation.trim();
      }
      if (editedProfile.education !== undefined) {
        payload.personalDetails.school = editedProfile.education.trim();
      }

      // Lifestyle
      if (editedProfile.interests?.trim()) {
        payload.lifestyle.interests = editedProfile.interests
          .split(',')
          .map(i => i.trim())
          .filter(Boolean);
      }

      // Dating Preferences
      if (editedProfile.whoToDate && editedProfile.whoToDate.length > 0) {
        payload.datingPreferences.whoToDate = editedProfile.whoToDate;
      }
      if (editedProfile.datingIntention !== undefined) {
        payload.datingPreferences.datingIntention =
          editedProfile.datingIntention.trim();
      }
      if (editedProfile.relationshipType !== undefined) {
        payload.datingPreferences.relationshipType =
          editedProfile.relationshipType;
      }
      if (editedProfile.showIntentionOnProfile !== undefined) {
        payload.datingPreferences.showIntentionOnProfile =
          editedProfile.showIntentionOnProfile;
      }
      if (editedProfile.showRelationshipTypeOnProfile !== undefined) {
        payload.datingPreferences.showRelationshipTypeOnProfile =
          editedProfile.showRelationshipTypeOnProfile;
      }

      // Remove empty objects
      if (Object.keys(payload.basicInfo).length === 0) delete payload.basicInfo;
      if (Object.keys(payload.profilePrompts).length === 0)
        delete payload.profilePrompts;
      if (Object.keys(payload.personalDetails).length === 0)
        delete payload.personalDetails;
      if (Object.keys(payload.lifestyle).length === 0) delete payload.lifestyle;
      if (Object.keys(payload.datingPreferences).length === 0)
        delete payload.datingPreferences;

      // Save photos (media)
      const mediaPayload = {
        media: validPhotos.map((p, index) => ({
          type: 'photo',
          url: p.url,
          order: index,
        })),
      };
 
      if (mediaPayload.media.length > 0) {
        await updateMedia(mediaPayload);
      }
 
      await updateProfileApi(payload);
      setNewUploadedPhotos([]); // Successfully saved, clear cleanup tracking
      Alert.alert('Success', 'Profile updated successfully');

      // Reload global state if it's our own profile
      if (isOwnProfile) {
        await reloadGlobalProfile(currentUserId);
      }

      setIsEditing(false);
      loadProfile();
    } catch (error) {
      console.error('[ProfileDetails] Update error:', error);
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = index => {

    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEditedProfile(prev => {
            const newPhotos = [...prev.photos];
            newPhotos[index] = {
              ...newPhotos[index],
              url: null,
            };

            const validPhotos = newPhotos.filter(p => p.url);
            const reordered = Array(6)
              .fill(null)
              .map((_, i) => ({
                key: i.toString(),
                id: i.toString(),
                url: validPhotos[i]?.url || null,
              }));

            return {...prev, photos: reordered};
          });
        },
      },
    ]);
  };

  const handleCancelEditing = async () => {
    // Cleanup any orphaned uploads that were not persisted
    if (newUploadedPhotos.length > 0) {
      console.log(`[Cleanup] Deleting ${newUploadedPhotos.length} unsaved uploads`);
      try {
        const cleanupPromises = newUploadedPhotos.map(url => 
          deleteImage(userId || profile?._id, url)
        );
        // We don't await so the UI feels snappy, but we catch errors
        Promise.all(cleanupPromises).catch(err => 
          console.error('[Cleanup] Error during cancel:', err)
        );
      } catch (err) {
        console.error('[Cleanup] Error mapping deletions:', err);
      }
    }
    
    setNewUploadedPhotos([]);
    setIsEditing(false);
    loadProfile(); // Refresh to restore saved state
  };

  const handleAddPhoto = async index => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: true,
      });

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let targetUserId = userId;
        if (!targetUserId) {
          const userData = await AsyncStorage.getItem('@pryvo_user');
          if (userData && userData !== 'undefined') {
            const user = JSON.parse(userData);
            targetUserId = user.id;
          }
        }

        if (!targetUserId) {
          Alert.alert('Error', 'User ID not found');
          return;
        }

        setPhotoUploading(true);

        try {
          const uploadResult = await uploadProfileImage(
            targetUserId,
            asset,
            asset.fileName || `photo_${index}_${Date.now()}.jpg`,
          );

          if (isEditing) {
            // Track newly uploaded photos for cleanup if user cancels
            setNewUploadedPhotos(prev => [...prev, uploadResult.url]);

            setEditedProfile(prev => {
              const newPhotos = [...prev.photos];
              newPhotos[index] = {
                ...newPhotos[index],
                url: uploadResult.url,
              };
              return {...prev, photos: newPhotos};
            });
          } else {
            Alert.alert('Success', 'Photo uploaded successfully');
            loadProfile();
          }
        } catch (uploadError) {
          console.error('[ProfileDetails] Photo upload failed:', uploadError);
          Alert.alert('Error', uploadError.message || 'Failed to upload photo');
        } finally {
          setPhotoUploading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const renderSectionHeader = (title, icon) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color="#C084FC"
        style={{marginRight: 8}}
      />
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
    </View>
  );

  const renderInfoItem = (label, value, icon) => (
    <View style={styles.entryRow}>
      <View style={styles.entryLabelLine}>
        <MaterialCommunityIcons name={icon} size={14} color="#1A1A1A" />
        <Text style={styles.entryLabelText}>{label}</Text>
      </View>
      <Text style={styles.entryValueText}>{value || 'Not set'}</Text>
    </View>
  );

  if (loading) {
    return (
      <ThemeBackground style={styles.centerContent}>
        <ActivityIndicator size="large" color="#C084FC" />
      </ThemeBackground>
    );
  }

  const photos =
    profile?.photos ||
    profile?.media?.media?.map(m => m.url).filter(Boolean) ||
    [];
  const name = profile?.basicInfo?.firstName || profile?.name || 'Add Name';
  const age =
    profile?.basicInfo?.age ||
    profile?.personalDetails?.age ||
    profile?.age ||
    null;
  const bio = profile?.bio || profile?.profilePrompts?.aboutMe?.answer || '';
  const interests = profile?.interests || profile?.lifestyle?.interests || [];
  const location = profile?.basicInfo?.location || '';
  const occupation = profile?.personalDetails?.jobTitle || '';
  const education = profile?.personalDetails?.school || '';
  const gender = profile?.basicInfo?.gender || '';
  const whoToDate = profile?.datingPreferences?.whoToDate || [];
  const datingIntention = profile?.datingPreferences?.datingIntention || '';
  const relationshipType = profile?.datingPreferences?.relationshipType || '';

  return (
    <ThemeBackground>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        style={{opacity: fadeAnim, transform: [{translateY: contentY}]}}>
        {!isEditing ? (
          <View style={styles.heroWrapper}>
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={photos.length > 0 ? photos : [null]}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({item}) => (
                <View style={styles.heroSlide}>
                  {item ? (
                    <Image source={{uri: item}} style={styles.heroImg} />
                  ) : (
                    <View style={[styles.heroImg, styles.heroPlaceholder]}>
                      <MaterialCommunityIcons
                        name="account"
                        size={100}
                        color="rgba(255,255,255,0.2)"
                      />
                    </View>
                  )}
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(0,0,0,0.4)',
                      'rgba(0,0,0,0.8)',
                    ]}
                    style={styles.heroFade}
                  />
                </View>
              )}
            />

            <View style={styles.heroText}>
              <View style={styles.nameLine}>
                <Text style={styles.nameHeader}>
                  {name}
                  {age ? `, ${age}` : ''}
                </Text>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={24}
                  color="#4AA9FF"
                  style={{marginLeft: 8}}
                />
              </View>
              <Text style={styles.locHeader}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color="#FFF"
                />{' '}
                {location || 'Add location'}
              </Text>
            </View>

            {isOwnProfile && (
              <Pressable
                style={styles.heroEditAction}
                onPress={() => setIsEditing(true)}>
                <LinearGradient
                  colors={['#C084FC', '#E040C8']}
                  style={styles.editActionPill}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color="#FFF"
                  />
                  <Text style={styles.editActionTxt}>Edit</Text>
                </LinearGradient>
              </Pressable>
            )}

            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.heroBackBtn}>
              <View style={styles.blurCircle}>
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={28}
                  color="#FFF"
                />
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.simpleEditHeader}>
            <View style={styles.headerSideContainer}>
              <Pressable
                onPress={handleCancelEditing}
                style={styles.headerIconBtn}>
                <MaterialCommunityIcons
                  name="close"
                  size={26}
                  color="#000000"
                />
              </Pressable>
            </View>

            <View style={styles.headerCenterContainer}>
              <Text style={styles.headerTitleTxt}>Edit Profile</Text>
            </View>

            <View
              style={[styles.headerSideContainer, {alignItems: 'flex-end'}]}>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={styles.headerSaveBtnWrapper}>
                {saving ? (
                  <ActivityIndicator size="small" color="#9333EA" />
                ) : (
                  <LinearGradient
                    colors={['#C084FC', '#E040C8']}
                    style={styles.headerSavePill}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}>
                    <Text style={styles.headerSaveTxt}>Save</Text>
                  </LinearGradient>
                )}
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.bodyContent}>
          {isEditing && (
            <View style={styles.editModule}>
              {renderSectionHeader('Photos', 'camera')}
              <View style={[styles.photoGridContainer, {height: (PHOTO_SIZE * 1.35) * 2 + 20}]}>
                <DraggableGrid
                  numColumns={3}
                  renderItem={(item, index) => (
                    <View key={item.key} style={styles.photoGridItemWrapper}>
                      <View style={styles.profilePhotoSlot}>
                        {item.url ? (
                          <>
                            <Image
                              source={{uri: item.url}}
                              style={styles.profilePhotoImg}
                            />
                            <Pressable
                              style={styles.photoRemoveBtn}
                              onPress={() => handleDeletePhoto(index)}>
                              <MaterialCommunityIcons
                                name="close"
                                size={12}
                                color="#FFF"
                              />
                            </Pressable>
                          </>
                        ) : (
                          <Pressable
                            style={styles.photoPlaceholderBtn}
                            onPress={() => handleAddPhoto(index)}>
                            {photoUploading ? (
                              <ActivityIndicator size="small" color="#C084FC" />
                            ) : (
                              <MaterialCommunityIcons
                                name="plus"
                                size={32}
                                color="#1A1A1A"
                              />
                            )}
                          </Pressable>
                        )}
                        {index === 0 && (
                          <View style={styles.featuredBadge}>
                            <Text style={styles.featuredBadgeTxt}>Main</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  data={editedProfile.photos || []}
                  onDragStart={() => setScrollEnabled(false)}
                  onDragRelease={data => {
                    setScrollEnabled(true);
                    setEditedProfile(prev => ({...prev, photos: data}));
                  }}
                  itemHeight={PHOTO_SIZE * 1.35}
                  style={styles.draggableGrid}
                />
              </View>
            </View>
          )}

          {/* About Me Section */}
          {renderSectionHeader('About Me', 'account')}
          <View style={styles.structuredCard}>
            {isEditing ? (
              <TextInput
                style={styles.bioTextEntry}
                value={editedProfile.bio}
                onChangeText={text =>
                  setEditedProfile(prev => ({...prev, bio: text}))
                }
                multiline
                placeholder="Tell us about yourself..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                underlineColorAndroid="transparent"
              />
            ) : (
              <Text style={bio ? styles.primaryBioTxt : styles.mutedEmptyTxt}>
                {bio || 'Add a bio to tell others about yourself'}
              </Text>
            )}
          </View>

          {/* Work & Education Section */}
          {renderSectionHeader('Work & Education', 'briefcase')}
          <View style={styles.structuredCard}>
            <View style={styles.horizontalSplit}>
              <View style={styles.splitCol}>
                {isEditing ? (
                  <View style={styles.stackedInput}>
                    <Text style={styles.miniLabel}>Job Title</Text>
                    <TextInput
                      style={styles.cleanBottomInput}
                      value={editedProfile.occupation}
                      onChangeText={text =>
                        setEditedProfile(prev => ({...prev, occupation: text}))
                      }
                      placeholder="Title"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                ) : (
                  renderInfoItem('Job Title', occupation, 'briefcase-outline')
                )}
              </View>
              <View style={styles.splitCol}>
                {isEditing ? (
                  <View style={styles.stackedInput}>
                    <Text style={styles.miniLabel}>School</Text>
                    <TextInput
                      style={styles.cleanBottomInput}
                      value={editedProfile.education}
                      onChangeText={text =>
                        setEditedProfile(prev => ({...prev, education: text}))
                      }
                      placeholder="School"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                ) : (
                  renderInfoItem('School', education, 'school-outline')
                )}
              </View>
            </View>
          </View>

          {/* Interests Section */}
          {renderSectionHeader('Interests', 'star')}
          <View style={styles.structuredCard}>
            {isEditing ? (
              <TextInput
                style={styles.cleanBottomInput}
                value={editedProfile.interests}
                onChangeText={text =>
                  setEditedProfile(prev => ({...prev, interests: text}))
                }
                placeholder="Comma separated interests"
                placeholderTextColor="rgba(255,255,255,0.3)"
                underlineColorAndroid="transparent"
              />
            ) : (
              <View style={styles.pillContainer}>
                {interests.length > 0 ? (
                  interests.map((interest, idx) => (
                    <View key={idx} style={styles.staticPill}>
                      <Text style={styles.staticPillTxt}>{interest}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedEmptyTxt}>No interests added</Text>
                )}
              </View>
            )}
          </View>

          {/* Preferences Section */}
          {renderSectionHeader('Preferences', 'heart')}
          <View style={styles.structuredCard}>
            <View style={styles.fieldUnit}>
              <Text style={styles.miniLabel}>Gender</Text>
              {isEditing ? (
                <View style={styles.pillContainer}>
                  {['Man', 'Woman', 'Non Binary'].map(opt => (
                    <Pressable
                      key={opt}
                      onPress={() =>
                        setEditedProfile(prev => ({...prev, gender: opt}))
                      }>
                      <LinearGradient
                        colors={
                          editedProfile.gender === opt
                            ? ['#C084FC', '#E040C8']
                            : [
                                'rgba(255,255,255,0.08)',
                                'rgba(255,255,255,0.08)',
                              ]
                        }
                        style={styles.choicePillGradient}>
                        <Text
                          style={[
                            styles.choiceLabel,
                            editedProfile.gender === opt && styles.chosenLabel,
                          ]}>
                          {opt}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.staticValueTxt}>{gender || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldUnit}>
              <Text style={styles.miniLabel}>Looking for</Text>
              {isEditing ? (
                <View style={styles.pillContainer}>
                  {['Men', 'Women', 'Everyone'].map(opt => (
                    <Pressable
                      key={opt}
                      onPress={() => {
                        let next = editedProfile.whoToDate || [];
                        if (next.includes(opt))
                          next = next.filter(i => i !== opt);
                        else next = [...next, opt];
                        setEditedProfile(prev => ({...prev, whoToDate: next}));
                      }}>
                      <LinearGradient
                        colors={
                          editedProfile.whoToDate?.includes(opt)
                            ? ['#C084FC', '#E040C8']
                            : [
                                'rgba(255,255,255,0.08)',
                                'rgba(255,255,255,0.1)',
                              ]
                        }
                        style={styles.choicePillGradient}>
                        <Text
                          style={[
                            styles.choiceLabel,
                            editedProfile.whoToDate?.includes(opt) &&
                              styles.chosenLabel,
                          ]}>
                          {opt}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.pillContainer}>
                  {whoToDate.map((item, idx) => (
                    <View key={idx} style={styles.accentBadge}>
                      <Text style={styles.accentBadgeTxt}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.horizontalSplitSpacing}>
              <View style={styles.splitCol}>
                <Text style={styles.miniLabel}>Intention</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.cleanBottomInput}
                    value={editedProfile.datingIntention}
                    onChangeText={text =>
                      setEditedProfile(prev => ({
                        ...prev,
                        datingIntention: text,
                      }))
                    }
                    placeholder="e.g. Long-term"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    underlineColorAndroid="transparent"
                  />
                ) : (
                  <Text style={styles.staticValueTxt}>
                    {datingIntention || 'Not set'}
                  </Text>
                )}
              </View>
              <View style={styles.splitCol}>
                <Text style={styles.miniLabel}>Type</Text>
                {isEditing ? (
                  <View style={styles.pillContainer}>
                    {['Monogamy', 'Non-Monogamy'].map(opt => (
                      <Pressable
                        key={opt}
                        onPress={() =>
                          setEditedProfile(prev => ({
                            ...prev,
                            relationshipType: opt,
                          }))
                        }>
                        <LinearGradient
                          colors={
                            editedProfile.relationshipType === opt
                              ? ['#C084FC', '#E040C8']
                              : [
                                  'rgba(255,255,255,0.08)',
                                  'rgba(255,255,255,0.1)',
                                ]
                          }
                          style={styles.microChoicePillGradient}>
                          <Text
                            style={[
                              styles.microChoiceLabel,
                              editedProfile.relationshipType === opt &&
                                styles.chosenLabel,
                            ]}>
                            {opt === 'Non-Monogamy' ? 'Non-Mono' : opt}
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.staticValueTxt}>
                    {relationshipType || 'Not set'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={{height: 120}} />
      </Animated.ScrollView>

      {isEditing && (
        <View style={styles.floatingActionFooter}>
          <Pressable onPress={handleSave} disabled={saving}>
            <LinearGradient
              colors={['#C084FC', '#E040C8']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.mainActionButton}>
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="check-bold"
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.mainActionTxt}>Update Profile</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      )}

      <PhotoInteractionViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        photoUrl={selectedPhoto}
        targetUserId={userId}
        currentUserId={currentUserId}
      />
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrapper: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'relative',
    overflow: 'hidden',
  },
  heroSlide: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  heroText: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameHeader: {
    fontSize: 32,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
  },
  locHeader: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 6,
  },
  heroEditAction: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  editActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  editActionTxt: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: 15,
    marginLeft: 6,
  },
  heroBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
  },
  blurCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#9333EA',
    letterSpacing: 2,
    fontWeight: '800',
  },
  structuredCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 27, 75, 0.15)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  entryRow: {
    marginBottom: 14,
  },
  entryLabelLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryLabelText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: 'rgba(30, 27, 75, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 6,
  },
  entryValueText: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000000',
    marginLeft: 20,
  },
  primaryBioTxt: {
    fontSize: 18,
    fontFamily: typography.fontFamilyMedium,
    color: '#000000',
    lineHeight: 28,
  },
  bioTextEntry: {
    fontSize: 18,
    fontFamily: typography.fontFamilyMedium,
    color: '#000000',
    minHeight: 140,
    textAlignVertical: 'top',
    padding: 0,
    backgroundColor: 'transparent',
  },
  mutedEmptyTxt: {
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: 'rgba(30, 27, 75, 0.5)',
    fontStyle: 'italic',
  },
  horizontalSplit: {
    flexDirection: 'row',
    gap: 20,
  },
  horizontalSplitSpacing: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  splitCol: {
    flex: 1,
  },
  stackedInput: {
    marginBottom: 8,
  },
  miniLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: 'rgba(30, 27, 75, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  cleanBottomInput: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 27, 75, 0.2)',
    fontSize: 18,
    color: '#000000',
    fontFamily: typography.fontFamilyBold,
    paddingVertical: 10,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  fieldUnit: {
    marginBottom: 24,
  },
  staticValueTxt: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000000',
    lineHeight: 24,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  staticPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(30, 27, 75, 0.15)',
  },
  staticPillTxt: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: '#000000',
  },
  choicePillGradient: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(30, 27, 75, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  microChoicePillGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 27, 75, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceLabel: {
    fontSize: 15,
    color: 'rgba(0, 0, 0, 0.6)',
    fontFamily: typography.fontFamilyBold,
  },
  microChoiceLabel: {
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.6)',
    fontFamily: typography.fontFamilyBold,
  },
  chosenLabel: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
  },
  accentBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.25)',
  },
  accentBadgeTxt: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: '#000000',
  },
  photoGridContainer: {
    marginTop: 10,
    marginBottom: 20,
    width: CONTAINER_WIDTH,
  },
  photoGridItemWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.35,
    padding: 5, // Consistent gap on all sides
  },
  profilePhotoSlot: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderColor: '#F3F4F6',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  draggableGrid: {
    zIndex: 10,
    width: CONTAINER_WIDTH,
  },
  profilePhotoImg: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholderBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  featuredBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(192, 132, 252, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredBadgeTxt: {
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
    color: '#FFF',
    textTransform: 'uppercase',
  },
  floatingActionFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 25,
    left: 20,
    right: 20,
  },
  mainActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 35,
    shadowColor: '#C084FC',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  mainActionTxt: {
    color: '#FFF',
    fontSize: 17,
    fontFamily: typography.fontFamilyBold,
    marginLeft: 10,
  },
  // Simple Edit Header
  simpleEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: 'transparent',
  },
  headerSideContainer: {
    flex: 1,
  },
  headerCenterContainer: {
    flex: 2,
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleTxt: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#000',
  },
  headerSaveBtnWrapper: {
    alignSelf: 'flex-end',
  },
  headerSavePill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerSaveTxt: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
    fontSize: 14,
  },
  editModule: {
    marginTop: 0,
  },
});

export default ProfileDetailsScreen;