import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
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
        <Text style={[styles.chevron, isExpanded && styles.chevronActive]}>
          {isExpanded ? '−' : '+'}
        </Text>
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
    backgroundColor: colors.background,
    borderRadius: 15,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  faqCardExpanded: {
    borderColor: colors.primary + '30',
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
    fontFamily: typography.fontFamilyMedium,
    color: colors.textPrimary,
    paddingRight: spacing.md,
  },
  questionTextActive: {
    color: colors.primary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  chevronActive: {
    color: colors.primary,
  },
  answerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  answerText: {
    fontSize: 15,
    fontFamily: typography.fontFamilyRegular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

export default FAQItem;
