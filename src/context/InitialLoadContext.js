import React, { createContext, useContext, useState, useCallback } from 'react';

const InitialLoadContext = createContext();

export const InitialLoadProvider = ({ children }) => {
  const [visited, setVisited] = useState({
    home: false,
    chats: false,
    matches: false,
    profile: false,
  });

  const markVisited = useCallback((screen) => {
    setVisited((prev) => {
      if (prev[screen]) return prev;
      return { ...prev, [screen]: true };
    });
  }, []);

  const resetVisited = useCallback(() => {
    setVisited({
      home: false,
      chats: false,
      matches: false,
      profile: false,
    });
  }, []);

  return (
    <InitialLoadContext.Provider value={{ visited, markVisited, resetVisited }}>
      {children}
    </InitialLoadContext.Provider>
  );
};

export const useInitialLoad = () => useContext(InitialLoadContext);
