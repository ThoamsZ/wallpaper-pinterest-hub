import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export const AuthContext = React.createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);  // 确保在状态更新后再渲染
    });

    return () => unsubscribe();
  }, []);

  const signIn = () => {
    // Implementation of signIn
  };

  const signUp = () => {
    // Implementation of signUp
  };

  const logOut = () => {
    // Implementation of logOut
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 