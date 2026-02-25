import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

const GetHelpScreen = () => {
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.7 },
      (response) => {
        if (response.assets && response.assets.length > 0) {
          setScreenshot(response.assets[0]);
        }
      }
    );
  };

  const sendHelpRequest = async () => {
    if (!message.trim()) {
      Alert.alert('Message required', 'Please describe your issue.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('message', message);

    if (screenshot) {
      formData.append('screenshot', {
        uri: screenshot.uri,
        name: screenshot.fileName || 'screenshot.jpg',
        type: screenshot.type,
      });
    }

    try {
      const res = await fetch(
        'https://your-backend-url.com/api/help',
        {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data' },
          body: formData,
        }
      );

      if (res.ok) {
        Alert.alert('Sent', 'Our team will contact you shortly.');
        setMessage('');
        setScreenshot(null);
      } else {
        Alert.alert('Error', 'Failed to send request.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>
        Get help from Pryvo
      </Text>

      <TextInput
        placeholder="Describe your issue..."
        multiline
        value={message}
        onChangeText={setMessage}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          height: 120,
          marginTop: 16,
        }}
      />

      <Pressable
        onPress={pickImage}
        style={{
          marginTop: 12,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderRadius: 8,
        }}
      >
        <Text>📎 Upload Screenshot (Optional)</Text>
      </Pressable>

      {screenshot && (
        <Image
          source={{ uri: screenshot.uri }}
          style={{ height: 150, marginTop: 12, borderRadius: 8 }}
        />
      )}

      <Pressable
        onPress={sendHelpRequest}
        style={{
          marginTop: 20,
          backgroundColor: '#2563eb',
          padding: 14,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          {loading ? 'Sending...' : 'Send'}
        </Text>
      </Pressable>
    </View>
  );
};

export default GetHelpScreen;
