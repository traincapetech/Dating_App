import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket, joinProfileSocial, leaveProfileSocial } from '../services/socket';
import { photoSocialService } from '../services/photoSocialService';

/**
 * usePhotoSocial Hook: Manages real-time social engagement for a profile
 * Implements: Safe Memory Management + Backend-Authoritative State Sync
 */
// ❗ Shared state to ensure "Single Source of Truth" across multiple hook instances (Home <-> Modal)
const globalStore = new Map(); // targetUserId -> stats
const subscribers = new Map(); // targetUserId -> Set of setState functions

const notifySubscribers = (userId) => {
  const stats = globalStore.get(userId) || {};
  const subs = subscribers.get(userId);
  if (subs) {
    subs.forEach(setter => setter(stats));
  }
};

export const usePhotoSocial = (targetUserId, onInteraction) => {
  const [photosStats, setPhotosStats] = useState(globalStore.get(targetUserId) || {});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const userData = await AsyncStorage.getItem('@pryvo_user');
        console.log("[usePhotoSocial] FETCH ME USER:", userData);
        if (userData) {
          const user = JSON.parse(userData);
          setCurrentUserId(user.id || user._id);
        }
      } catch (e) {
        console.error("[usePhotoSocial] Storage Error:", e);
      }
    };
    fetchMe();
  }, []);

  const loadProfileStats = useCallback(async () => {
    if (!targetUserId) return;
    try {
      setLoading(true);
      const res = await photoSocialService.getProfileStats(targetUserId);
      console.log("[usePhotoSocial] API RESPONSE (stats):", res);
      if (res.success) {
        // Update global store and notify others
        globalStore.set(targetUserId, res.stats || {});
        notifySubscribers(targetUserId);
      }
    } catch (e) {
      console.error('[usePhotoSocial] LoadStats Error:', e);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;

    // ➕ Add to subscribers
    if (!subscribers.has(targetUserId)) {
      subscribers.set(targetUserId, new Set());
    }
    subscribers.get(targetUserId).add(setPhotosStats);

    loadProfileStats();

    const socket = getSocket();
    socketRef.current = socket;
    joinProfileSocial(targetUserId);

    const handleSocialUpdate = (data) => {
      console.log("[usePhotoSocial] SOCKET EVENT:", data);
      
      const prev = globalStore.get(targetUserId) || {};
      const prevStat = prev[data.photoId] || { likes: 0, commentsCount: 0, isLiked: false };
      
      let newLikedStatus = prevStat.isLiked;
      if (data.type === 'like' && data.senderId === currentUserId) {
        newLikedStatus = (data.action === 'liked');
      }

      const newState = {
        ...prev,
        [data.photoId]: {
          likes: data.counts.likes,
          commentsCount: data.counts.comments,
          isLiked: newLikedStatus
        }
      };

      console.log("[usePhotoSocial] STATE UPDATE (Shared):", newState);
      globalStore.set(targetUserId, newState);
      notifySubscribers(targetUserId);

      if (onInteraction) {
        onInteraction(data);
      }
    };

    if (socket) {
      socket.on('photo:interaction', handleSocialUpdate);
    }

    return () => {
      if (socket) {
        socket.off('photo:interaction', handleSocialUpdate);
        leaveProfileSocial(targetUserId);
      }
      // ➖ Remove from subscribers
      const subs = subscribers.get(targetUserId);
      if (subs) {
        subs.delete(setPhotosStats);
      }
    };
  }, [targetUserId, loadProfileStats, currentUserId, onInteraction]);

  const handleLike = async (photoUrl) => {
    const photoId = photoSocialService.generatePhotoId(photoUrl);
    const prev = globalStore.get(targetUserId) || {};
    const prevStats = prev[photoId] || { likes: 0, commentsCount: 0, isLiked: false };
    const currentlyLiked = prevStats.isLiked;

    // 1. Optimistic Update (Global Sync)
    const optimisticState = {
      ...prev,
      [photoId]: {
        ...prevStats,
        likes: prevStats.likes + (currentlyLiked ? -1 : 1),
        isLiked: !currentlyLiked
      }
    };
    globalStore.set(targetUserId, optimisticState);
    notifySubscribers(targetUserId);

    try {
      const res = await photoSocialService.toggleLike(targetUserId, photoUrl);
      console.log("[usePhotoSocial] API RESPONSE (like):", res);
    } catch (err) {
      globalStore.set(targetUserId, prev); // Rollback
      notifySubscribers(targetUserId);
      console.error('[usePhotoSocial] Like Error:', err);
    }
  };

  const handleComment = async (photoUrl, text) => {
    try {
      const res = await photoSocialService.addComment(targetUserId, photoUrl, text);
      console.log("[usePhotoSocial] API RESPONSE (comment):", res);
      return res;
    } catch (err) {
      console.error('[usePhotoSocial] Comment Error:', err);
      throw err;
    }
  };

  return {
    photosStats,
    loading,
    handleLike,
    handleComment,
    loadProfileStats
  };
};

export default usePhotoSocial;
