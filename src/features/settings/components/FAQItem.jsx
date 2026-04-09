import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, typography, spacing} from '../../../theme';

const FAQItem = ({question, answer, isExpanded, onToggle}) => {
  return (
    <View style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={styles.faqHeader}>
        <Text
          style={[
            styles.questionText,
            isExpanded && styles.questionTextActive,
          ]}>
          {question}
        </Text>
        <MaterialCommunityIcons
          name={isExpanded ? 'minus' : 'plus'}
          size={24}
          color={isExpanded ? colors.primary : '#AAA'}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.answerContainer}>
          <View style={styles.divider} />
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  faqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107, 33, 168, 0.1)',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  faqCardExpanded: {
    borderColor: 'rgba(107, 33, 168, 0.3)',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamilySemiBold,
    color: '#333',
    paddingRight: spacing.md,
  },
  questionTextActive: {
    color: colors.primary,
  },
  answerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(107, 33, 168, 0.05)',
    marginBottom: spacing.md,
  },
  answerText: {
    fontSize: 14,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

export default FAQItem;