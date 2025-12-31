import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking, StyleSheet } from "react-native";

const HelpCentreScreen = () => {
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "How does matching work?",
      answer: "You can like profiles within your radius. A match happens when both users like each other.",
    },
    {
      question: "How to update my profile?",
      answer: "Go to Profile → Edit Profile and update your information anytime.",
    },
    {
      question: "How can I change my location?",
      answer: "Location is updated automatically based on GPS permissions.",
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Settings → Account → Delete Account. This action is permanent.",
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Help Centre</Text>

      {/* Categories Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>

        {["Account", "Privacy & Safety", "Subscriptions", "App Usage"].map((cat, index) => (
          <TouchableOpacity key={index} style={styles.categoryBtn}>
            <Text style={styles.categoryText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>FAQs</Text>

        {faqs.map((item, index) => (
          <View key={index}>
            <TouchableOpacity
              onPress={() => toggleFAQ(index)}
              style={styles.faqQuestion}>
              <Text style={styles.questionText}>{item.question}</Text>
            </TouchableOpacity>

            {expandedFAQ === index && (
              <Text style={styles.answerText}>{item.answer}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Contact Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Still Need Help?</Text>
        <Text style={styles.supportText}>Our support team is here for you.</Text>

        <TouchableOpacity
          onPress={() => Linking.openURL("mailto:pryvo@traincapetech.in")}
          style={styles.supportBtn}>
          <Text style={styles.supportBtnText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default HelpCentreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  categoryBtn: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 16,
  },
  faqQuestion: {
    backgroundColor: "#f7f7f7",
    padding: 14,
    borderRadius: 10,
    marginBottom: 5,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  answerText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 10,
    marginTop: 5,
    paddingHorizontal: 10,
  },
  supportText: {
    fontSize: 14,
    color: "#555",
    marginVertical: 10,
  },
  supportBtn: {
    backgroundColor: "#ff4d6d",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  supportBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
