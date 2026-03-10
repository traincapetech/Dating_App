import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import {useAuth} from './AuthContext';
import {initSocket, getSocket} from '../services/socket';
import {Platform} from 'react-native';

const SocketContext = createContext({
  socket: null,
  onlineUsers: new Set(),
  lastMessage: null,
});

export const SocketProvider = ({children}) => {
  const {user, isAuthenticated} = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('[SocketContext] Initializing socket for user:', user.id);
      const s = initSocket(user.id);
      socketRef.current = s;
      setSocket(s);

      s.on('receiveMessage', msg => {
        console.log('[SocketContext] Global message received:', msg.text);
        setLastMessage(msg);
      });

      s.on('userStatusChanged', ({userId, status}) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          if (status === 'online') {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.off('receiveMessage');
          socketRef.current.off('userStatusChanged');
        }
      };
    } else {
      setSocket(null);
      socketRef.current = null;
    }
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider
      value={{socket, onlineUsers, lastMessage, setLastMessage}}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
