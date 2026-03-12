import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {colors, typography, spacing} from '../../theme';

// Giphy API key - Replace with your own key from https://developers.giphy.com/
// For production, store this in environment variables
const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY'; // Replace with actual key
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

const GifPicker = ({visible, onSelect, onClose}) => {
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    if (visible) {
      loadTrendingGifs();
    }
  }, [visible]);

  const loadTrendingGifs = async () => {
    if (!GIPHY_API_KEY || GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') {
      console.warn('Giphy API key not configured. Using mock GIFs.');
      // Fallback to mock GIFs for development
      setGifs(getMockGifs());
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${GIPHY_BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=25&rating=g`,
      );
      const data = await response.json();
      if (data.data) {
        setGifs(
          data.data.map(gif => ({
            id: gif.id,
            url: gif.images.fixed_height.url,
            preview: gif.images.preview_gif.url,
            title: gif.title,
          })),
        );
      }
    } catch (error) {
      console.error('Error loading GIFs:', error);
      // Fallback to mock GIFs on error
      setGifs(getMockGifs());
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async query => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    if (!GIPHY_API_KEY || GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') {
      // Filter mock GIFs by query
      const filtered = getMockGifs().filter(gif =>
        gif.title.toLowerCase().includes(query.toLowerCase()),
      );
      setGifs(filtered);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${GIPHY_BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          query,
        )}&limit=25&rating=g`,
      );
      const data = await response.json();
      if (data.data) {
        setGifs(
          data.data.map(gif => ({
            id: gif.id,
            url: gif.images.fixed_height.url,
            preview: gif.images.preview_gif.url,
            title: gif.title,
          })),
        );
      }
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = text => {
    setSearchQuery(text);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      searchGifs(text);
    }, 500);
    setSearchTimeout(timeout);
  };

  const handleSelectGif = gif => {
    onSelect(gif.url);
    onClose();
  };

  const renderGif = ({item}) => (
    <Pressable style={styles.gifItem} onPress={() => handleSelectGif(item)}>
      <Image source={{uri: item.preview || item.url}} style={styles.gifImage} />
    </Pressable>
  );

  // Mock GIFs for development/testing when API key is not configured
  const getMockGifs = () => [
    {
      id: '1',
      url: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif',
      preview: 'https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif',
      title: 'Happy',
    },
    {
      id: '2',
      url: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif',
      preview: 'https://media.giphy.com/media/l0MYC0LajbaPoEADu/giphy.gif',
      title: 'Love',
    },
    {
      id: '3',
      url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
      preview: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif',
      title: 'Excited',
    },
    {
      id: '4',
      url: 'https://media.giphy.com/media/3o7abldb0xnta2S3zW/giphy.gif',
      preview: 'https://media.giphy.com/media/3o7abldb0xnta2S3zW/giphy.gif',
      title: 'Wink',
    },
    {
      id: '5',
      url: 'https://media.giphy.com/media/l0HlNQ03yu5VwX6py/giphy.gif',
      preview: 'https://media.giphy.com/media/l0HlNQ03yu5VwX6py/giphy.gif',
      title: 'Laugh',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choose a GIF</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search GIFs..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={gifs}
              renderItem={renderGif}
              keyExtractor={item => item.id}
              numColumns={2}
              contentContainerStyle={styles.gifList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No GIFs found</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.headings.h4,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    fontSize: typography.body.medium,
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifList: {
    padding: spacing.sm,
  },
  gifItem: {
    flex: 1,
    margin: spacing.xs,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.body.medium,
    color: colors.textSecondary,
  },
});

export default GifPicker;
