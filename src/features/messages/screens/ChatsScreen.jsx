import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '../../../theme';
import { fetchMatches } from '../../../services/chatService';

const ChatsScreen = ({ navigation }) => {
  const [matches, setMatches] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        if (!userData) return;

        const user = JSON.parse(userData);
        setCurrentUserId(user.id);

        const response = await fetchMatches(user.id);
        const list = response?.matches || [];

        setMatches(list);
      } catch (error) {
        console.log('Error fetching matches', error);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!matches.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No matches yet 😕</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const theirId = item.users.find((u) => u !== currentUserId);

    return (
      <Pressable
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('ChatScreen', {
            matchId: item._id,
            theirId,
            // you can also pass theirName, avatar later
          })
        }
      >
        <Image
          source={{ uri: 'https://placekitten.com/200/200' }} // TODO: replace with their profile photo from profile API
          style={styles.avatar}
        />
        <View style={styles.textContainer}>
          <Text style={styles.name}>User {theirId.slice(0, 6)}</Text>
          <Text style={styles.lastMessage}>Tap to start chatting</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: spacing.md }}
      />
    </View>
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
  },
  emptyText: {
    fontSize: typography.body.large,
    color: colors.textSecondary,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: typography.body.large,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  lastMessage: {
    fontSize: typography.body.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default ChatsScreen;
