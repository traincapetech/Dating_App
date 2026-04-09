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
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiClient} from '../../../services/api/client';
import {getAccessToken} from '../../../services/storage/tokenStorage';
import {colors, spacing, typography} from '../../../theme';
import ThemeBackground from '../../../components/layout/ThemeBackground';

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
  const insets = useSafeAreaInsets();
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
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={28}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Report a Problem</Text>
          <View style={{width: 40}} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              {paddingBottom: insets.bottom + spacing.xl},
            ]}>
            <View style={styles.introContainer}>
              <Text style={styles.introTitle}>Describe the issue</Text>
              <Text style={styles.introSub}>
                We're here to help. Select a category and tell us what's happening.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.card}>
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

            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                placeholder="Tell us what's happening..."
                placeholderTextColor="#AAA"
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            <Text style={styles.sectionLabel}>Attachments (Optional)</Text>
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.imagePicker}
                onPress={pickImage}
                disabled={loading}>
                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{uri: imageUri}} style={styles.previewImage} />
                    <View style={styles.changeImageOverlay}>
                      <Text style={styles.changeImageText}>Change Screenshot</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.pickerPlaceholder}>
                    <MaterialCommunityIcons name="image-plus" size={32} color={colors.primary} />
                    <Text style={styles.pickerText}>
                      Add a screenshot to help us see the issue
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Pressable
                style={[styles.submitBtn, loading && styles.disabledBtn]}
                onPress={submitReport}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Submit Report</Text>
                )}
              </Pressable>
              <Text style={styles.privacyNote}>
                Your report and any attached files will be reviewed by our support team.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Animated.View style={[styles.successToast, {opacity: fadeAnim}]}>
          <Text style={styles.successText}>Report Submitted ✔</Text>
        </Animated.View>
      </SafeAreaView>
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  introContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    marginBottom: spacing.sm,
  },
  introTitle: {
    fontSize: 28,
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
  sectionLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
    color: '#6B21A8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: spacing.xl + 4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
  },
  categoryChip: {
    backgroundColor: 'rgba(107, 33, 168, 0.05)',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
  },
  selectedCategoryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: '#555',
  },
  selectedCategoryText: {
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
  },
  input: {
    padding: spacing.lg,
    fontSize: 16,
    color: '#333',
    fontFamily: typography.fontFamilyRegular,
    minHeight: 120,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
    backgroundColor: 'rgba(107, 33, 168, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  pickerText: {
    fontSize: 13,
    fontFamily: typography.fontFamilyMedium,
    color: '#AAA',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  imagePreviewContainer: {
    flex: 1,
    width: '100%',
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
    color: '#FFF',
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
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
    color: '#FFF',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  privacyNote: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    opacity: 0.7,
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
    color: '#FFF',
    fontFamily: typography.fontFamilyBold,
  },
});

export default ReportProblemScreen;