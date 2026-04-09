import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, typography, spacing} from '../../../theme';
import {getBlockedUsers, unblockUser} from '../../../services/blockService';
import ThemeBackground from '../../../components/layout/ThemeBackground';

const BlockedUsersScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadBlockedUsers();
    }, []),
  );

  const loadBlockedUsers = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (!userData || userData === 'undefined') return;

      const user = JSON.parse(userData);
      setCurrentUserId(user.id);

      const users = await getBlockedUsers(user.id);
      setBlockedUsers(users);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      Alert.alert('Error', 'Failed to load blocked users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnblock = (blockedId, name) => {
    Alert.alert('Unblock User', `Are you sure you want to unblock ${name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Unblock',
        style: 'destructive',
        onPress: async () => {
          try {
            await unblockUser(currentUserId, blockedId);
            await loadBlockedUsers();
            Alert.alert('Success', 'User has been unblocked');
          } catch (error) {
            console.error('Error unblocking user:', error);
            Alert.alert('Error', 'Failed to unblock user. Please try again.');
          }
        },
      },
    ]);
  };

  const renderItem = ({item}) => (
    <View style={styles.card}>
      <View style={styles.userItem}>
        <Image
          source={{
            uri:
              item.photo ||
              'https://ui-avatars.com/api/?background=667eea&color=fff&name=' +
                encodeURIComponent(item.name || 'User'),
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.reason && (
            <Text style={styles.reason}>Reason: {item.reason}</Text>
          )}
          <Text style={styles.blockedDate}>
            Blocked {new Date(item.blockedAt).toLocaleDateString()}
          </Text>
        </View>
        <Pressable
          style={styles.unblockButton}
          onPress={() => handleUnblock(item.blockedId, item.name)}>
          <Text style={styles.unblockButtonText}>Unblock</Text>
        </Pressable>
      </View>
    </View>
  );

  const Header = () => (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons
          name="arrow-left"
          size={28}
          color={colors.textPrimary}
        />
      </Pressable>
      <Text style={styles.headerTitle}>Blocked Users</Text>
      <View style={{width: 40}} />
    </View>
  );

  if (loading) {
    return (
      <ThemeBackground>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </ThemeBackground>
    );
  }

  return (
    <ThemeBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header />
        {blockedUsers.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="account-cancel-outline" size={80} color="rgba(107, 33, 168, 0.2)" />
            </View>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyText}>Users you block will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={item => item.blockedId}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              {paddingBottom: insets.bottom + spacing.xl},
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadBlockedUsers();
                }}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>
    </ThemeBackground>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  listContent: {
    paddingTop: spacing.md,
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
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 33, 168, 0.05)',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    fontSize: 16,
    fontFamily: typography.fontFamilySemiBold,
    color: '#333',
    marginBottom: 2,
  },
  reason: {
    fontSize: 12,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  blockedDate: {
    fontSize: 11,
    fontFamily: typography.fontFamilyRegular,
    color: '#AAA',
  },
  unblockButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 33, 168, 0.08)',
  },
  unblockButtonText: {
    color: colors.primary,
    fontFamily: typography.fontFamilyBold,
    fontSize: 13,
  },
  emptyIconContainer: {
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default BlockedUsersScreen;