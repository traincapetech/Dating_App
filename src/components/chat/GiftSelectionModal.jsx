import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography, spacing} from '../../theme';
import giftService from '../../services/giftService';
import giftImages from '../../assets/images/gifts';

const {width} = Dimensions.get('window');

const GiftSelectionModal = ({visible, onClose, onSend, userId}) => {
  const [gifts, setGifts] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [giftsData, walletData] = await Promise.all([
        giftService.fetchGifts(),
        giftService.fetchWallet(userId),
      ]);
      setGifts(giftsData);
      setWallet(walletData);
      if (giftsData.length > 0) {
        setSelectedGift(giftsData[0]);
      }
    } catch (error) {
      console.error('Error loading gift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedGift || sending) return;

    if (wallet.coinsBalance < selectedGift.coinValue) {
      alert('Insufficient coins! Please add more.');
      return;
    }

    setSending(true);
    try {
      await onSend(selectedGift);
      try {
        const { triggerSuccessHaptic } = require('../../utils/haptics');
        triggerSuccessHaptic();
      } catch (e) {}
      onClose();
    } catch (error) {
      console.error('Error sending gift:', error);
      try {
        const { triggerErrorHaptic } = require('../../utils/haptics');
        triggerErrorHaptic();
      } catch (e) {}
    } finally {
      setSending(false);
    }
  };

  const renderGiftItem = ({item}) => {
    const isSelected = selectedGift?._id === item._id;
    return (
      <Pressable
        style={[styles.giftItem, isSelected && styles.giftItemSelected]}
        onPress={() => {
          setSelectedGift(item);
          try { require('../../utils/haptics').triggerLightHaptic(); } catch(e) {}
        }}>
        <Image source={giftImages[item.slug]} style={styles.giftIcon} />
        <Text style={styles.giftName}>{item.name}</Text>
        <View style={styles.coinRow}>
          <Icon name="cash" size={12} color="#FFD700" />
          <Text style={styles.coinValueText}>{item.coinValue}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Send a Gift</Text>
              {wallet && (
                <View style={styles.balanceContainer}>
                  <Icon name="wallet" size={14} color={colors.textSecondary} />
                  <Text style={styles.balanceText}>
                    Balance: {wallet.coinsBalance} Coins
                  </Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={styles.loader}
            />
          ) : (
            <>
              <FlatList
                data={gifts}
                renderItem={renderGiftItem}
                keyExtractor={item => item._id}
                numColumns={3}
                contentContainerStyle={styles.listContent}
              />

              <View style={styles.footer}>
                <Pressable
                  style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={sending}>
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <LinearGradient
                      colors={[colors.primary, '#FF6B6B']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                      style={styles.gradient}>
                      <Text style={styles.sendButtonText}>
                        Send {selectedGift?.name} (
                        {selectedGift?.coinValue} Coins)
                      </Text>
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fontFamilyBold,
    color: '#1a1a1a',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  balanceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  closeButton: {
    padding: 4,
  },
  loader: {
    marginVertical: 40,
  },
  listContent: {
    padding: spacing.md,
  },
  giftItem: {
    flex: 1,
    margin: 6,
    padding: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  giftItemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  giftIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  giftName: {
    fontSize: 14,
    fontFamily: typography.fontFamilyMedium,
    color: '#333',
    textAlign: 'center',
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  coinValueText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sendButton: {
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: typography.fontFamilyBold,
  },
});

export default GiftSelectionModal;
