import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {
  getProfile,
  updateProfileApi,
  uploadProfileImage,
  updateMedia,
} from '../../../services/profile/profileService';
import {launchImageLibrary} from 'react-native-image-picker';
import {DraggableGrid} from 'react-native-draggable-grid';
import {useAuth} from '../../../context/AuthContext';
import { usePhotoSocial } from '../../../hooks/usePhotoSocial';
import { photoSocialService } from '../../../services/photoSocialService';
import PhotoInteractionViewer from '../../../components/profile/PhotoInteractionViewer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3;

const ProfileDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {loadProfile: reloadGlobalProfile} = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const userId = route.params?.userId || profile?._id || profile?.id;

  // 📸 Social Interaction System
  const { photosStats } = usePhotoSocial(userId);
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

      if (!targetId) {
        Alert.alert('Error', 'User ID not found');
        return;
      }

      const response = await getProfile(targetId);
      const profileData = response?.profile || response;
      setProfile(profileData);

      // Check if it's the current user's profile
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
      // Actually, DraggableGrid works best with existing items. We can handle "Add" separately or as a special item type?
      // For simplicity, let's just initialize with existing photos.
      // If we want empty slots to be draggable or droppable, we'd need them in the data array.
      // But usually "Add Photo" is a static slot or a specific action.
      // Let's populate up to 6 slots.
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
      const currentPhotos = editedProfile.photos || [];
      const mediaPayload = {
        media: currentPhotos
          .filter(p => p.url) // Only save slots with URLs
          .map((p, index) => ({
            type: 'photo',
            url: p.url,
            order: index,
          })),
      };

      if (mediaPayload.media.length > 0 || profile?.photos?.length > 0) {
        // Only update if we have photos or had photos (allow deleting all)
        await updateMedia(mediaPayload);
      }

      console.log(
        '[ProfileDetails] Updating profile with payload:',
        JSON.stringify(payload, null, 2),
      );

      await updateProfileApi(payload);
      Alert.alert('Success', 'Profile updated successfully');

      // Reload global state if it's our own profile
      if (isOwnProfile) {
        await reloadGlobalProfile(currentUserId);
      }

      setIsEditing(false);
      loadProfile();
    } catch (error) {
      console.error('[ProfileDetails] Update error:', error);
      const errorMessage =
        error?.message || error?.data?.error || 'Failed to update profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = index => {
    // Check if deleting this photo would drop them below 5 photos total
    const currentValidPhotosCount = editedProfile.photos.filter(
      p => p.url,
    ).length;
    if (currentValidPhotosCount <= 5) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least 5 photos on your profile.',
        [{text: 'OK'}],
      );
      return;
    }

    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEditedProfile(prev => {
            const newPhotos = [...prev.photos];
            // Remove the photo url but keep the slot
            newPhotos[index] = {
              ...newPhotos[index],
              url: null,
            };

            // Shift photos to fill the gap?
            // Or just leave empty slot?
            // "Drag and drop" suggests we want them compact.
            // Let's shift up.
            const validPhotos = newPhotos.filter(p => p.url);
            const emptySlots = newPhotos.filter(p => !p.url);
            // Reconstruct with valid photos first, then empty slots
            const compacted = [...validPhotos, ...emptySlots].map((p, i) => ({
              ...p, // keep existing key/id structure if possible, but actually pure index might be safer for grid
              // Actually DraggableGrid relies on stable keys.
              // Let's just create a new array ensuring 6 items.
            }));

            // Re-create the 6-item array with new order
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

        // Get user ID
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

        // Show loading
        setSaving(true);

        try {
          // Upload the image
          const uploadResult = await uploadProfileImage(
            currentUserId,
            asset,
            asset.fileName || `photo_${index}_${Date.now()}.jpg`,
          );

          console.log(
            '[ProfileDetails] Photo uploaded successfully:',
            uploadResult,
          );

          if (isEditing) {
            // In edit mode, update the local state without reloading everything
            setEditedProfile(prev => {
              const newPhotos = [...prev.photos];
              newPhotos[index] = {
                ...newPhotos[index],
                url: uploadResult.url, // Assuming uploadResult returns { url: ... }
              };
              return {...prev, photos: newPhotos};
            });
            Alert.alert('Success', 'Photo uploaded');
          } else {
            Alert.alert('Success', 'Photo uploaded successfully');
            // Refresh profile to show new photo
            loadProfile();
          }
        } catch (uploadError) {
          console.error('[ProfileDetails] Photo upload failed:', uploadError);
          Alert.alert('Error', uploadError.message || 'Failed to upload photo');
        } finally {
          setSaving(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
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
  const bio = profile?.bio || '';
  const interests = profile?.interests || [];
  const location = profile?.basicInfo?.location || '';
  const occupation = profile?.personalDetails?.jobTitle || '';
  const education = profile?.personalDetails?.school || '';
  const gender = profile?.basicInfo?.gender || '';
  const whoToDate = profile?.datingPreferences?.whoToDate || [];
  const datingIntention = profile?.datingPreferences?.datingIntention || '';
  const relationshipType = profile?.datingPreferences?.relationshipType || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'My Profile' : profile?.name || 'Profile'}
        </Text>
        <View style={styles.headerRight}>
          {isOwnProfile && (
            <Pressable
              onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
              style={styles.editButton}>
              <Text style={styles.editText}>
                {saving ? 'Saving...' : isEditing ? 'Done' : 'Edit'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}>
        {/* Photos Grid */}
        <View style={styles.photosSection}>
          {isEditing ? (
            <View style={{height: (PHOTO_SIZE * 1.3 + spacing.sm) * 2}}>
              <DraggableGrid
                numColumns={3}
                renderItem={(item, index) => (
                  <View style={styles.photoSlot}>
                    {item.url ? (
                      <>
                        <Image
                          source={{uri: item.url}}
                          style={styles.photo}
                        />
                        <Pressable
                          style={styles.deletePhotoButton}
                          onPress={() => handleDeletePhoto(index)}>
                          <Text style={styles.deletePhotoText}>✕</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        style={styles.emptyPhoto}
                        onPress={() => handleAddPhoto(index)}>
                        <Text style={styles.addPhotoIcon}>📷</Text>
                        <Text style={styles.addPhotoText}>Add a photo</Text>
                      </Pressable>
                    )}
                    {index === 0 && (
                      <View style={styles.mainPhotoBadge}>
                        <Text style={styles.mainPhotoBadgeText}>Main</Text>
                      </View>
                    )}
                  </View>
                )}
                data={editedProfile.photos || []}
                onDragStart={() => setScrollEnabled(false)}
                onDragRelease={data => {
                  setScrollEnabled(true);
                  setEditedProfile(prev => ({...prev, photos: data}));
                }}
                itemHeight={PHOTO_SIZE * 1.3}
                style={{zIndex: 100}}
              />
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {[0, 1, 2, 3, 4, 5].map(index => {
                const photoUrl = photos[index];
                if (!isOwnProfile && !photoUrl) return null;
                const photoId = photoSocialService.generatePhotoId(photoUrl);
                const photoStats = photosStats[photoId] || { likes: 0, commentsCount: 0 };

                return (
                  <Pressable
                    key={index}
                    style={styles.photoSlot}
                    onPress={() => {
                      if (photoUrl) {
                        setSelectedPhoto(photoUrl);
                        setViewerVisible(true);
                      } else if (isOwnProfile) {
                        handleAddPhoto(index);
                      }
                    }}
                  >
                    {photoUrl ? (
                      <>
                        <Image
                          source={{uri: photoUrl}}
                          style={styles.photo}
                        />
                        {/* 📸 Social Notification Badges (Owner can see them) */}
                        {(photoStats.likes > 0 || photoStats.commentsCount > 0) && (
                          <View style={styles.miniStatsOverlay}>
                            {photoStats.likes > 0 && (
                              <View style={styles.miniStat}>
                                <MaterialCommunityIcons name="heart" size={10} color="#fff" />
                                <Text style={styles.miniStatText}>{photoStats.likes}</Text>
                              </View>
                            )}
                            {photoStats.commentsCount > 0 && (
                              <View style={styles.miniStat}>
                                <MaterialCommunityIcons name="comment" size={10} color="#fff" />
                                <Text style={styles.miniStatText}>{photoStats.commentsCount}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.emptyPhoto}>
                        <Text style={styles.addPhotoIcon}>📷</Text>
                        <Text style={styles.addPhotoText}>Add a photo</Text>
                      </View>
                    )}
                    {index === 0 && isOwnProfile && (
                      <View style={styles.mainPhotoBadge}>
                        <Text style={styles.mainPhotoBadgeText}>Main</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Name, DOB, Age */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          {isEditing ? (
            <>
              <TextInput
                style={styles.input}
                value={editedProfile.firstName}
                onChangeText={text =>
                  setEditedProfile(prev => ({...prev, firstName: text}))
                }
                placeholder="First name"
              />
              <TextInput
                style={[styles.input, {marginTop: spacing.sm}]}
                value={editedProfile.lastName}
                onChangeText={text =>
                  setEditedProfile(prev => ({...prev, lastName: text}))
                }
                placeholder="Last name"
              />
              <TextInput
                style={[styles.input, {marginTop: spacing.sm}]}
                value={editedProfile.dob}
                onChangeText={text =>
                  setEditedProfile(prev => ({...prev, dob: text}))
                }
                placeholder="Date of birth (YYYY-MM-DD)"
              />
            </>
          ) : (
            <Text style={styles.nameText}>
              {name}
              {age ? `, ${age}` : ''}
            </Text>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📍 Location</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedProfile.location}
              onChangeText={text =>
                setEditedProfile(prev => ({...prev, location: text}))
              }
              placeholder="Add your location"
            />
          ) : (
            <Text style={styles.valueText}>
              {location || 'Add your location'}
            </Text>
          )}
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About Me</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={editedProfile.bio}
              onChangeText={text =>
                setEditedProfile(prev => ({...prev, bio: text}))
              }
              placeholder="Tell others about yourself"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Pressable style={styles.emptyField}>
              <Text style={bio ? styles.valueText : styles.placeholderText}>
                {bio || 'Add a bio to tell others about yourself'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Occupation */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>💼 Work</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedProfile.occupation}
              onChangeText={text =>
                setEditedProfile(prev => ({...prev, occupation: text}))
              }
              placeholder="Add your occupation"
            />
          ) : (
            <Text style={styles.valueText}>
              {occupation || 'Add your occupation'}
            </Text>
          )}
        </View>

        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🎓 Education</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedProfile.education}
              onChangeText={text =>
                setEditedProfile(prev => ({...prev, education: text}))
              }
              placeholder="Add your education"
            />
          ) : (
            <Text style={styles.valueText}>
              {education || 'Add your education'}
            </Text>
          )}
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Interests</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={editedProfile.interests}
              onChangeText={text =>
                setEditedProfile(prev => ({...prev, interests: text}))
              }
              placeholder="Add interests separated by commas"
              multiline
            />
          ) : interests.length > 0 ? (
            <View style={styles.interestsContainer}>
              {interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Pressable style={styles.emptyField}>
              <Text style={styles.placeholderText}>
                Add interests to find better matches
              </Text>
            </Pressable>
          )}
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gender</Text>
          {isEditing ? (
            <View style={styles.chipRow}>
              {['Man', 'Woman', 'Non Binary'].map(option => (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    editedProfile.gender === option && styles.chipSelected,
                  ]}
                  onPress={() =>
                    setEditedProfile(prev => ({...prev, gender: option}))
                  }>
                  <Text
                    style={[
                      styles.chipText,
                      editedProfile.gender === option &&
                        styles.chipTextSelected,
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.valueText}>{gender || 'Not set'}</Text>
          )}
        </View>

        {/* Dating Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Who you want to date</Text>
          {isEditing ? (
            <View style={styles.chipRow}>
              {['Men', 'Women', 'Nonbinary People', 'Everyone'].map(option => (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    editedProfile.whoToDate?.includes(option) &&
                      styles.chipSelected,
                  ]}
                  onPress={() => {
                    const current = editedProfile.whoToDate || [];
                    let next = [];
                    if (option === 'Everyone') {
                      next = ['Everyone'];
                    } else if (current.includes(option)) {
                      next = current.filter(i => i !== option);
                    } else {
                      next = [...current.filter(i => i !== 'Everyone'), option];
                    }
                    setEditedProfile(prev => ({...prev, whoToDate: next}));
                  }}>
                  <Text
                    style={[
                      styles.chipText,
                      editedProfile.whoToDate?.includes(option) &&
                        styles.chipTextSelected,
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.valueText}>
              {whoToDate.join(', ') || 'Not set'}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dating intention</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedProfile.datingIntention}
              onChangeText={text =>
                setEditedProfile(prev => ({...prev, datingIntention: text}))
              }
              placeholder="e.g., Long-term relationship"
            />
          ) : (
            <Text style={styles.valueText}>{datingIntention || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Relationship type</Text>
          {isEditing ? (
            <View style={styles.chipRow}>
              {['Monogamy', 'Non-Monogamy'].map(option => (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    editedProfile.relationshipType === option &&
                      styles.chipSelected,
                  ]}
                  onPress={() =>
                    setEditedProfile(prev => ({
                      ...prev,
                      relationshipType:
                        prev.relationshipType === option ? '' : option,
                    }))
                  }>
                  <Text
                    style={[
                      styles.chipText,
                      editedProfile.relationshipType === option &&
                        styles.chipTextSelected,
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.valueText}>
              {relationshipType || 'Not set'}
            </Text>
          )}
        </View>

        {/* Premium Upsell */}
        {isOwnProfile && (
          <View style={styles.premiumSection}>
            <Pressable style={styles.premiumButton}>
              <Text style={styles.premiumButtonText}>
                💎 Upgrade to Premium
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      <PhotoInteractionViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        photoUrl={selectedPhoto}
        targetUserId={userId}
        currentUserId={currentUserId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 60,
    padding: spacing.sm,
  },
  headerLeft: {
    width: 60,
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  backText: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
  },
  editButton: {
    padding: spacing.sm,
  },
  editText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
    color: colors.primary,
  },
  photosSection: {
    padding: spacing.lg,
    backgroundColor: '#f8f8f8',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoSlot: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emptyPhoto: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  addPhotoText: {
    fontSize: 12,
    fontFamily: typography.fontFamilyMedium,
    color: '#999',
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mainPhotoBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
    marginBottom: spacing.sm,
  },
  nameText: {
    fontSize: 24,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
  },
  valueText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: '#1a1a1a',
    lineHeight: 24,
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: '#999',
  },
  input: {
    fontSize: 16,
    fontFamily: typography.fontFamilyRegular,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: '#f8f8f8',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  emptyField: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  deletePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniStatsOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    gap: 4,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  miniStatText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: typography.fontFamilyBold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#1a1a1a',
  },
  chipTextSelected: {
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interestTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  interestText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#1a1a1a',
  },
  premiumSection: {
    padding: spacing.xl,
  },
  premiumButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 30,
    alignItems: 'center',
  },
  premiumButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
  },
});

export default ProfileDetailsScreen;