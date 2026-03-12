import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, typography, spacing} from '../../../theme';

const DATE_OPTIONS = (() => {
  const options = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    options.push(d);
  }
  return options;
})();

const TIME_SLOTS = [
  '10:00 AM',
  '12:00 PM',
  '2:00 PM',
  '4:00 PM',
  '6:00 PM',
  '8:00 PM',
];

const DateSchedulerModal = ({visible, onClose, onSchedule, loading}) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Select Both', 'Please pick a day and a time slot.');
      return;
    }
    // Parse selected time
    const [hourStr, modifier] = selectedTime.split(' ');
    const [h, m] = hourStr.split(':').map(Number);
    let hour = h;
    if (modifier === 'PM' && hour !== 12) hour += 12;
    if (modifier === 'AM' && hour === 12) hour = 0;

    const finalDate = new Date(selectedDate);
    finalDate.setHours(hour, m, 0, 0);
    onSchedule(finalDate);
  };

  const formatDay = d => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.titleRow}>
            <Icon name="calendar" size={24} color={colors.primary} />
            <Text style={styles.title}>Book a Date</Text>
          </View>
          <Text style={styles.subtitle}>
            Stop the timer! Pick a day and time to meet.
          </Text>

          <Text style={styles.sectionLabel}>Pick a Day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scrollRow}>
            {DATE_OPTIONS.map((d, i) => {
              const isSelected =
                selectedDate?.toDateString() === d.toDateString();
              return (
                <Pressable
                  key={i}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedDate(d)}>
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}>
                    {formatDay(d)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>Pick a Time</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map(t => {
              const isSelected = selectedTime === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedTime(t)}>
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}>
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Confirm Date</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: typography.fontFamilyBold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 4,
  },
  scrollRow: {
    marginBottom: spacing.md,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontFamily: typography.fontFamilyMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: '#fff',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: typography.fontFamilyMedium,
    color: colors.textSecondary,
    fontSize: 15,
  },
  confirmText: {
    fontFamily: typography.fontFamilyBold,
    color: '#fff',
    fontSize: 15,
  },
});

export default DateSchedulerModal;
