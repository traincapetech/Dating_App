import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Image,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiClient} from '../../../services/api/client';
import {getAccessToken} from '../../../services/storage/tokenStorage';
import {colors, spacing, typography} from '../../../theme';

const categories = [
  'Profile Issue',
  'Matching Problem',
  'Messages / Chat',
  'Safety / Harassment',
  'Payments',
  'Other',
];

const ReportProblemScreen = () => {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [details, setDetails] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (userData && userData !== 'undefined') {
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('Failed to load user data:', e);
      }
    };
    loadUser();
  }, []);

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.6}, response => {
      if (response.didCancel) return;
      if (response.assets && response.assets.length > 0) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const submitReport = async () => {
    if (!selectedCategory || !details.trim()) {
      Alert.alert(
        'Required',
        'Please select a category and describe your issue.',
      );
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await apiClient.post(
        '/support/report-problem',
        {
          userId: user?.id,
          userName: user?.fullName,
          userEmail: user?.email,
          category: selectedCategory,
          details: details.trim(),
          imageUri: imageUri,
        },
        {token},
      );

      if (response.success) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setTimeout(() => fadeAnim.setValue(0), 1500));

        setSelectedCategory(null);
        setDetails('');
        setImageUri(null);
        Alert.alert(
          'Success',
          'Your report has been submitted. Thank you for your feedback!',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to send report.');
      }
    } catch (error) {
      console.error('Report submission error:', error);
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Report a Problem</Text>
        <View style={{width: 40}} />
      </View>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.introSection}>
            <Text style={styles.introTitle}>Describe the issue</Text>
            <Text style={styles.introSub}>
              We're here to help. Select a category and tell us what's
              happening.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.selectedCategoryChip,
                  ]}
                  onPress={() => setSelectedCategory(cat)}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.selectedCategoryText,
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Tell us what's happening..."
              placeholderTextColor={colors.textTertiary}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Attachments (Optional)</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.imagePicker}
              onPress={pickImage}
              disabled={loading}>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{uri: imageUri}} style={styles.previewImage} />
                  <View style={styles.changeImageOverlay}>
                    <Text style={styles.changeImageText}>
                      Change Screenshot
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <Text style={styles.pickerIcon}>🖼️</Text>
                  <Text style={styles.pickerText}>
                    Add a screenshot to help us see the issue
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={submitReport}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.privacyNote}>
              Your report and any attached files will be reviewed by our support
              team.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Animated.View style={[styles.successToast, {opacity: fadeAnim}]}>
        <Text style={styles.successText}>Report Submitted ✔</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

export default ReportProblemScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  introSection: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  introTitle: {
    fontSize: 26,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  introSub: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamilyBold,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  categoryChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 99,
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
  },
  selectedCategoryText: {
    color: colors.textInverse,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 15,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyRegular,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  pickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  pickerIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  pickerText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  changeImageText: {
    color: colors.textInverse,
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: colors.textInverse,
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  privacyNote: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  successToast: {
    position: 'absolute',
    backgroundColor: colors.success,
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 99,
    elevation: 5,
  },
  successText: {
    color: colors.textInverse,
    fontFamily: typography.fontFamilyBold,
  },
});
