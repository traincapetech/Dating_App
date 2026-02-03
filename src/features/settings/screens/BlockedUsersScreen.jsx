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
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, typography, spacing} from '../../../theme';
import {getBlockedUsers, unblockUser} from '../../../services/blockService';

const BlockedUsersScreen = () => {
  const navigation = useNavigation();
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
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const Header = () => (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>←</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Blocked Users</Text>
      <View style={{width: 40}} />
    </View>
  );

  if (blockedUsers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🚫</Text>
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyText}>Users you block will appear here</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <FlatList
        data={blockedUsers}
        keyExtractor={item => item.blockedId}
        renderItem={renderItem}
        contentContainerStyle={{paddingVertical: spacing.sm}}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: spacing.sm,
  },
  backText: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.body?.large || 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.body?.large || 16,
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reason: {
    fontSize: typography.body?.small || 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  blockedDate: {
    fontSize: typography.body?.small || 12,
    color: colors.textSecondary,
  },
  unblockButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  unblockButtonText: {
    color: colors.surface,
    fontFamily: typography.fontFamilyMedium,
    fontSize: typography.body?.small || 14,
  },
});

export default BlockedUsersScreen;
