import apiClient from './api/client';

export const getMatchDetails = async matchId => {
  try {
    const response = await apiClient.get(`/match/detail/${matchId}`);
    return response?.match || response;
  } catch (error) {
    console.error('Error fetching match details:', error);
    return null;
  }
};

export const scheduleDate = async (matchId, date, description, type) => {
  try {
    const response = await apiClient.post(`/match/${matchId}/schedule`, {
      date,
      description,
      type,
    });
    return response || {};
  } catch (error) {
    console.error('Error scheduling date:', error);
    throw error;
  }
};
