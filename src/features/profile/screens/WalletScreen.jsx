import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useStripe} from '@stripe/stripe-react-native';
import {colors, typography, spacing} from '../../../theme';
import giftService from '../../../services/giftService';
import giftImages from '../../../assets/images/gifts';

const WalletScreen = ({navigation}) => {
  const [userId, setUserId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(null);
  const {initPaymentSheet, presentPaymentSheet} = useStripe();

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const userData = await AsyncStorage.getItem('@pryvo_user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id);
        const data = await giftService.fetchWallet(user.id);
        setWallet(data);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async inventoryItemId => {
    if (converting) return;

    setConverting(inventoryItemId);
    try {
      const res = await giftService.convertGiftApi(userId, inventoryItemId);
      if (res.success) {
        const giftConverted = wallet.inventory.find(i => i._id === inventoryItemId);
        const coinVal = giftConverted?.giftId?.coinValue || 0;
        Alert.alert('Success!', `Gift converted to ${coinVal} coins.`);
        // Refresh wallet
        const updatedWallet = await giftService.fetchWallet(userId);
        setWallet(updatedWallet);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to convert gift');
    } finally {
      setConverting(null);
    }
  };

  const handleAddCoins = async amount => {
    try {
      setLoading(true);

      // 1. Create order on backend
      const res = await giftService.createWalletOrderApi({
        userId,
        amount, // ₹ amount
        currency: 'INR',
      });

      if (!res.success) throw new Error(res.message);

      // 2. Initialize payment sheet
      const {paymentOrder} = res;
      const {error: initError} = await initPaymentSheet({
        merchantDisplayName: 'Pryvo Dating',
        paymentIntentClientSecret: paymentOrder.clientSecret,
        defaultBillingDetails: {
          name: 'Pryvo User',
        },
      });

      if (initError) {
        Alert.alert('Payment Initialization Failed', initError.message);
        return;
      }

      // 3. Present payment sheet
      const {error: presentError} = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
        return;
      }

      // 4. Verify payment on backend
      const verifyRes = await giftService.verifyWalletPaymentApi({
        userId,
        amount,
        orderId: paymentOrder.orderId,
        paymentId: paymentOrder.orderId, // In Stripe, paymentId is often the same as intent ID for verification
        gateway: 'stripe',
      });

      if (verifyRes.success) {
        setWallet(prev => ({...prev, coinsBalance: verifyRes.newBalance}));
        Alert.alert(
          'Success 🎉',
          `₹${amount} added successfully! Your new balance is ${verifyRes.newBalance} coins.`,
        );
      } else {
        throw new Error(verifyRes.message);
      }
    } catch (error) {
      console.error('Add coins error:', error);
      Alert.alert('Error', error.message || 'Failed to add coins');
    } finally {
      setLoading(false);
    }
  };

  const showTopUpOptions = () => {
    Alert.alert(
      'Add Coins',
      'Select an amount to top up your wallet (1 INR = 1 Coin)',
      [
        {text: '₹50 (50 Coins)', onPress: () => handleAddCoins(50)},
        {text: '₹100 (100 Coins)', onPress: () => handleAddCoins(100)},
        {text: '₹200 (200 Coins)', onPress: () => handleAddCoins(200)},
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  };

  const renderInventoryItem = ({item}) => {
    if (item.isConverted) return null;

    return (
      <View style={styles.inventoryItem}>
        <View style={styles.itemInfo}>
          <Image source={giftImages[item.giftId.slug]} style={styles.itemImage} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemName}>{item.giftId.name}</Text>
            <Text style={styles.itemReceived}>Received on {new Date(item.receivedAt).toLocaleDateString()}</Text>
          </View>
        </View>
        <Pressable 
          style={styles.convertButton} 
          onPress={() => handleConvert(item._id)}
          disabled={converting === item._id}
        >
          {converting === item._id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.convertButtonText}>Collect {item.giftId.coinValue} Coins</Text>
          )}
        </Pressable>
      </View>
    );
  };

  if (loading && !wallet) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const activeInventory = wallet?.inventory?.filter(item => !item.isConverted) || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-back" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{width: 28}} />
      </View>

      <View style={styles.balanceCard}>
        <LinearGradient
          colors={[colors.primary, '#FF6B6B']}
          style={styles.balanceGradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
        >
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <View style={styles.balanceRow}>
            <Icon name="cash" size={32} color="#FFD700" />
            <Text style={styles.balanceAmount}>{wallet?.coinsBalance || 0}</Text>
            <Text style={styles.coinsText}>Coins</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gifts Received</Text>
        <Text style={styles.sectionSubtitle}>Collect coins from your admirers</Text>

        {activeInventory.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="gift-outline" size={64} color="#ddd" />
            <Text style={styles.emptyText}>No gifts yet. Keep engaging!</Text>
          </View>
        ) : (
          <FlatList
            data={activeInventory}
            renderItem={renderInventoryItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <Pressable style={styles.addMoneyButton} onPress={showTopUpOptions}>
        <LinearGradient
          colors={[colors.primary, '#FF6B6B']}
          style={styles.addMoneyGradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
        >
          <Icon name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addMoneyText}>Add Money</Text>
        </LinearGradient>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Gifts can be converted back to coins at 100% value. Coins can be used for premium features.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 0, // Added for Dynamic Island safety
    height: Platform.OS === 'ios' ? 70 : 60,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  backButton: {padding: 4},
  balanceCard: {
    margin: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  balanceGradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontFamily: typography.fontFamilyMedium,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 48,
    fontFamily: typography.fontFamilyBold,
    marginHorizontal: 8,
  },
  coinsText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    marginTop: 18,
  },
  section: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemImage: {
    width: 50,
    height: 50,
    marginRight: spacing.md,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
    color: colors.textPrimary,
  },
  itemReceived: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  convertButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  convertButtonText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: typography.fontFamilyBold,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#999',
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  addMoneyButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addMoneyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addMoneyText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
});

export default WalletScreen;
