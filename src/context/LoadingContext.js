import React, {createContext, useState, useContext} from 'react';
import SandClockLoader from '../components/SandClockLoader';

const LoadingContext = createContext();

export const LoadingProvider = ({children}) => {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{loading, setLoading}}>
      {children}
      <SandClockLoader visible={loading} />
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
