import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
  StatusBar,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getSubscriptionStatus,
  getUserSubscriptions,
  setAutoRenewal,
  requestRefund,
} from '../../../services/subscription/subscriptionService';

const FEATURES = [
  {icon: 'heart-multiple-outline', label: 'Unlimited Likes', sub: 'Swipe without daily limits'},
  {icon: 'eye-outline', label: 'See Who Liked You', sub: 'View everyone who liked you'},
  {icon: 'tune-vertical', label: 'Advanced Filters', sub: 'Filter by height, interests & more'},
  {icon: 'lightning-bolt-outline', label: '3x Priority Boost', sub: 'Get seen by 3x more people'},
  {icon: 'message-check-outline', label: 'Read Receipts', sub: 'Know when messages are read'},
  {icon: 'undo-variant', label: 'Unlimited Rewinds', sub: 'Take back accidental swipes'},
];

const formatDate = d => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
};

const statusMap = {
  active:    {label: 'Active',      color: '#22C55E'},
  cancelled: {label: 'Cancelling',  color: '#F59E0B'},
  expired:   {label: 'Expired',     color: '#6B7280'},
  refunded:  {label: 'Refunded',    color: '#EF4444'},
};

export default function SubscriptionManagementScreen() {
  const navigation = useNavigation();
  const [loading, setLoading]       = useState(true);
  const [isPremium, setIsPremium]   = useState(false);
  const [sub, setSub]               = useState(null);
  const [history, setHistory]       = useState([]);
  const [userId, setUserId]         = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('@pryvo_user');
      if (!raw) return;
      const user = JSON.parse(raw);
      setUserId(user.id);
      const [s, h] = await Promise.all([
        getSubscriptionStatus(user.id),
        getUserSubscriptions(user.id),
      ]);
      if (s?.success)  { setIsPremium(s.isPremium); setSub(s.subscription); }
      if (h?.success)  { setHistory(h.subscriptions || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleAutoRenew = async val => {
    if (!sub) return;
    try {
      const r = await setAutoRenewal(sub.id, val);
      if (r?.success) {
        Alert.alert(
          val ? '✅ Auto-Renew Enabled' : '⏸ Auto-Renew Disabled',
          val
            ? 'Your subscription will renew automatically at end of each period.'
            : 'Your subscription will not renew. Access continues until the end date.',
        );
        loadData();
      }
    } catch { Alert.alert('Error', 'Could not update auto-renewal.'); }
  };

  const onRefund = () => {
    Alert.alert(
      'Request Refund',
      'Refunds are only available within 24 hours of purchase. Your premium access will be removed immediately.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Request Refund', style: 'destructive',
          onPress: async () => {
            try {
              const r = await requestRefund(sub.id, userId);
              if (r?.success) {
                Alert.alert('Done', 'Refund submitted. Check your email for confirmation.');
                loadData();
              } else {
                Alert.alert('Not Eligible', r?.message || 'Refund window (24h) may have passed.');
              }
            } catch { Alert.alert('Error', 'Could not process refund.'); }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#9411FA" />
        <Text style={s.loadingTxt}>Loading subscription…</Text>
      </View>
    );
  }

  const sc = statusMap[sub?.status] || {label: 'Unknown', color: '#6B7280'};

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D14" />
      <SafeAreaView style={{flex: 1}} edges={['top']}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={10}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>My Subscription</Text>
          <View style={{width: 40}} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}>

          {/* ── Status Card ── */}
          {isPremium && sub ? (
            <View style={s.premiumCard}>
              <LinearGradient
                colors={['#1e0533', '#2d0853']}
                style={s.premiumCardInner}>
                {/* Top row */}
                <View style={s.cardTop}>
                  <View style={s.iconWrap}>
                    <MaterialCommunityIcons name="crown" size={26} color="#FFD700" />
                  </View>
                  <View style={[s.statusPill, {backgroundColor: sc.color + '22', borderColor: sc.color + '66'}]}>
                    <View style={[s.dot, {backgroundColor: sc.color}]} />
                    <Text style={[s.statusPillTxt, {color: sc.color}]}>{sc.label}</Text>
                  </View>
                </View>

                <Text style={s.premiumTitle}>{sub.planName || 'Pryvo Premium'}</Text>
                <Text style={s.premiumExpiry}>
                  {sub.status === 'cancelled' ? 'Access ends' : 'Renews'} · {formatDate(sub.expiresAt)}
                </Text>

                {/* Billing row */}
                <View style={s.billingRow}>
                  <View style={s.billingCell}>
                    <Text style={s.billingLbl}>Price</Text>
                    <Text style={s.billingVal}>${sub.price}<Text style={s.billingPer}>/{sub.period || 'mo'}</Text></Text>
                  </View>
                  <View style={s.billingDivider} />
                  <View style={s.billingCell}>
                    <Text style={s.billingLbl}>Payment</Text>
                    <Text style={s.billingVal}>{sub.paymentMethod === 'google_play' ? 'Google Play' : 'Stripe'}</Text>
                  </View>
                  <View style={s.billingDivider} />
                  <View style={s.billingCell}>
                    <Text style={s.billingLbl}>Started</Text>
                    <Text style={s.billingVal}>{formatDate(sub.createdAt)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : (
            /* ── Free User CTA ── */
            <View style={s.freeCard}>
              <MaterialCommunityIcons name="star-circle-outline" size={48} color="#9411FA" />
              <Text style={s.freeTitle}>Unlock Premium</Text>
              <Text style={s.freeSub}>Get unlimited likes, advanced filters & more</Text>
              <Pressable
                onPress={() => navigation.navigate('SubscriptionUpsell')}
                style={s.upgradeBtn}>
                <LinearGradient colors={['#9411FA', '#7c3aed']} style={s.upgradeBtnGrad}>
                  <Text style={s.upgradeBtnTxt}>View Plans</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* ── Settings (Premium only) ── */}
          {isPremium && sub && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>MANAGE</Text>
              <View style={s.card}>

                {/* Auto-Renew toggle */}
                <View style={s.row}>
                  <View style={s.rowLeft}>
                    <View style={[s.rowIcon, {backgroundColor: '#9411FA18'}]}>
                      <MaterialCommunityIcons name="refresh" size={20} color="#9411FA" />
                    </View>
                    <View style={s.rowText}>
                      <Text style={s.rowTitle}>Auto-Renewal</Text>
                      <Text style={s.rowSub}>Renew automatically each cycle</Text>
                    </View>
                  </View>
                  <Switch
                    value={sub.autoRenew !== false}
                    onValueChange={toggleAutoRenew}
                    trackColor={{false: '#3a3a4a', true: '#9411FA'}}
                    thumbColor="#ffffff"
                  />
                </View>

                <View style={s.rowDivider} />

                {/* Refund */}
                {sub.status !== 'cancelled' && sub.status !== 'refunded' && (
                  <Pressable style={s.row} onPress={onRefund}>
                    <View style={s.rowLeft}>
                      <View style={[s.rowIcon, {backgroundColor: '#EF444418'}]}>
                        <MaterialCommunityIcons name="cash-refund" size={20} color="#EF4444" />
                      </View>
                      <View style={s.rowText}>
                        <Text style={[s.rowTitle, {color: '#EF4444'}]}>Request Refund</Text>
                        <Text style={s.rowSub}>Available within 24h of purchase</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#4a4a5a" />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* ── Features ── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>PREMIUM FEATURES</Text>
            <View style={s.card}>
              {FEATURES.map((f, i) => (
                <View key={i}>
                  <View style={s.featureRow}>
                    <View style={[s.rowIcon, {backgroundColor: '#9411FA12'}]}>
                      <MaterialCommunityIcons name={f.icon} size={20} color="#9411FA" />
                    </View>
                    <View style={s.featureText}>
                      <Text style={s.featureName}>{f.label}</Text>
                      <Text style={s.featureDesc}>{f.sub}</Text>
                    </View>
                    {isPremium && (
                      <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
                    )}
                  </View>
                  {i < FEATURES.length - 1 && <View style={s.rowDivider} />}
                </View>
              ))}
            </View>
          </View>

          {/* ── Transaction History ── */}
          {history.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>BILLING HISTORY</Text>
              <View style={s.card}>
                {history.slice(0, 6).map((item, i) => {
                  const sc2 = statusMap[item.status] || {label: item.status, color: '#6B7280'};
                  return (
                    <View key={i}>
                      <View style={s.historyRow}>
                        <View style={{flex: 1}}>
                          <Text style={s.historyPlan}>{item.planName || '—'}</Text>
                          <Text style={s.historyDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                          <Text style={s.historyPrice}>${item.price}</Text>
                          <Text style={[s.historyStatus, {color: sc2.color}]}>{sc2.label}</Text>
                        </View>
                      </View>
                      {i < history.slice(0, 6).length - 1 && <View style={s.rowDivider} />}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Support ── */}
          <View style={s.support}>
            <Text style={s.supportTxt}>Questions about billing?</Text>
            <Text style={s.supportEmail}>pryvo@traincapetech.in</Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        {flex: 1, backgroundColor: '#0D0D14'},
  center:      {flex: 1, backgroundColor: '#0D0D14', justifyContent: 'center', alignItems: 'center'},
  loadingTxt:  {color: '#aaa', marginTop: 12, fontSize: 14},

  header:      {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0D0D14'},
  backBtn:     {width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e1e2e', justifyContent: 'center', alignItems: 'center'},
  headerTitle: {flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#fff'},

  scroll: {paddingHorizontal: 16, paddingBottom: 50},

  /* Premium card */
  premiumCard:      {borderRadius: 20, overflow: 'hidden', marginBottom: 24, elevation: 8, shadowColor: '#9411FA', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: {width: 0, height: 4}},
  premiumCardInner: {padding: 22},
  cardTop:          {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  iconWrap:         {width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFD70022', justifyContent: 'center', alignItems: 'center'},
  statusPill:       {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1},
  dot:              {width: 6, height: 6, borderRadius: 3, marginRight: 5},
  statusPillTxt:    {fontSize: 12, fontWeight: '700'},
  premiumTitle:     {fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4},
  premiumExpiry:    {fontSize: 13, color: '#aaa', marginBottom: 20},
  billingRow:       {flexDirection: 'row', backgroundColor: '#ffffff0a', borderRadius: 12, padding: 14},
  billingCell:      {flex: 1, alignItems: 'center'},
  billingDivider:   {width: 1, backgroundColor: '#ffffff15'},
  billingLbl:       {fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4},
  billingVal:       {fontSize: 15, fontWeight: '700', color: '#fff'},
  billingPer:       {fontSize: 11, fontWeight: '400', color: '#888'},

  /* Free card */
  freeCard:     {backgroundColor: '#1a1a28', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#2a2a3a'},
  freeTitle:    {fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 14, marginBottom: 6},
  freeSub:      {fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 20},
  upgradeBtn:   {borderRadius: 14, overflow: 'hidden', width: '100%'},
  upgradeBtnGrad: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8},
  upgradeBtnTxt:  {fontSize: 15, fontWeight: '700', color: '#fff'},

  /* Section */
  section:      {marginBottom: 20},
  sectionLabel: {fontSize: 11, fontWeight: '700', color: '#555', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4},
  card:         {backgroundColor: '#1a1a28', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a3a'},

  /* Row (settings / features) */
  row:          {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14},
  rowLeft:      {flexDirection: 'row', alignItems: 'center', flex: 1},
  rowIcon:      {width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12},
  rowText:      {flex: 1},
  rowTitle:     {fontSize: 15, fontWeight: '600', color: '#f0f0f0'},
  rowSub:       {fontSize: 12, color: '#666', marginTop: 1},
  rowDivider:   {height: 1, backgroundColor: '#23233a', marginLeft: 16},

  /* Features */
  featureRow:   {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14},
  featureText:  {flex: 1},
  featureName:  {fontSize: 14, fontWeight: '600', color: '#e8e8f0'},
  featureDesc:  {fontSize: 12, color: '#666', marginTop: 1},

  /* History */
  historyRow:   {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14},
  historyPlan:  {fontSize: 14, fontWeight: '600', color: '#e8e8f0'},
  historyDate:  {fontSize: 12, color: '#555', marginTop: 2},
  historyPrice: {fontSize: 15, fontWeight: '700', color: '#fff'},
  historyStatus:{fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase'},

  /* Support */
  support:      {alignItems: 'center', paddingVertical: 24},
  supportTxt:   {fontSize: 13, color: '#555'},
  supportEmail: {fontSize: 13, color: '#9411FA', fontWeight: '600', marginTop: 4},
});