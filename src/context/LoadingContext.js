import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useRef,
} from 'react';
import SandClockLoader from '../components/SandClockLoader';

const LoadingContext = createContext();

export const LoadingProvider = ({children}) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const countRef = useRef(0);

  const setLoading = useCallback(visible => {
    // Disabled the global loading count to stop the blocking animation
    setLoadingCount(0);
  }, []);

  return (
    <LoadingContext.Provider value={{loading: false, setLoading}}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
