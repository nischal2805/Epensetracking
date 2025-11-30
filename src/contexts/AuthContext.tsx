/**
 * AUTHENTICATION CONTEXT - Firebase Auth Implementation
 * 
 * This module handles user authentication using Firebase Authentication.
 * 
 * ============================================================================
 * DBMS CONCEPTS: AUTHENTICATION & AUTHORIZATION
 * ============================================================================
 * 
 * 1. AUTHENTICATION vs AUTHORIZATION
 *    - Authentication: Verifying WHO the user is (login)
 *    - Authorization: Verifying WHAT the user can do (permissions)
 * 
 * 2. USER MANAGEMENT
 *    - Firebase Auth handles secure password hashing (bcrypt equivalent)
 *    - Session management via JWT tokens
 *    - User ID is the PRIMARY KEY in our database
 * 
 * 3. DATA INTEGRITY
 *    - User creation is atomic (auth + database profile)
 *    - Foreign keys reference the auth UID
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { userService } from '../services/database-service';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    // This is Firebase's way of maintaining session state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in - fetch their profile from database
        try {
          let dbUser = await userService.getUserById(firebaseUser.uid);
          
          // If user doesn't exist in database, create them
          // This handles edge cases where auth succeeded but db write failed
          if (!dbUser) {
            dbUser = await userService.createUser(
              firebaseUser.email || '',
              firebaseUser.displayName || 'User',
              firebaseUser.uid
            );
          }
          
          setUser(dbUser);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Still set a basic user object from auth data
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            created_at: new Date().toISOString(),
          });
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  /**
   * SIGN UP - Creates new user account
   * 
   * Transaction-like behavior:
   * 1. Create Firebase Auth account
   * 2. Create user profile in database
   * 
   * If step 2 fails, user can still sign in and profile will be created lazily
   */
  const signUp = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in database
    // The auth UID becomes the primary key in our users collection
    await userService.createUser(email, name, credential.user.uid);
  };

  /**
   * SIGN IN - Authenticates existing user
   * 
   * Firebase handles:
   * - Password verification (hashed comparison)
   * - Session token generation
   * - Rate limiting for security
   */
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle setting the user state
  };

  /**
   * SIGN OUT - Ends user session
   * 
   * Firebase handles:
   * - Token invalidation
   * - Local storage cleanup
   */
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
