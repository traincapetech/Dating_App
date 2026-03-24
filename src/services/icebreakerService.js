import apiClient from './api/client';

/**
 * Fetch 3 AI-generated icebreaker messages for a target user.
 * Returns the suggestions and an interactionId for analytics.
 */
export const fetchIcebreakers = async (targetUserId, matchId, tone = 'flirty', force = false) => {
  try {
    const res = await apiClient.get(
      `/icebreaker?targetUserId=${encodeURIComponent(
        targetUserId,
      )}&matchId=${matchId}&tone=${tone}&forceRegenerate=${force}`,
    );
    return res || {suggestions: []};
  } catch (err) {
    console.error('[IcebreakerService] Error:', err?.message);
    return {suggestions: []};
  }
};

/**
 * Track user interaction (click) with a suggestion.
 */
export const trackIcebreakerClick = async (interactionId, value) => {
  try {
    await apiClient.post('/icebreaker/track-action', {
      interactionId,
      action: 'click',
      value,
    });
  } catch (err) {
    console.warn('[IcebreakerService] Tracking failed:', err.message);
  }
};


