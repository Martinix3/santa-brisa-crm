
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { mockTeamMembers } from '@/lib/data';
import type { TeamMember, UserRole } from '@/types';
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: FirebaseUser | null;
  teamMember: TeamMember | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createUserInAuth: (email: string, pass: string) => Promise<FirebaseUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Simulate fetching role from mockTeamMembers based on email
        const member = mockTeamMembers.find(m => m.email === firebaseUser.email);
        if (member) {
          setTeamMember(member);
          setUserRole(member.role);
        } else {
          // Handle case where user exists in Firebase Auth but not in mockTeamMembers
          // For now, assign a default or deny access if not in the list
          // This could be a fallback role, or null to indicate no specific app role found
          setTeamMember(null); 
          setUserRole(null); // Or a default guest role if you had one
          console.warn(`User ${firebaseUser.email} authenticated but not found in mockTeamMembers. Role not assigned.`);
        }
      } else {
        setUser(null);
        setTeamMember(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user, teamMember, and role
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error de Inicio de Sesión",
        description: error.message || "Credenciales incorrectas o usuario no encontrado.",
        variant: "destructive",
      });
      setLoading(false); // Ensure loading is false on error
      throw error; // Re-throw to handle in UI if needed
    }
    // setLoading(false) will be handled by onAuthStateChanged's effect
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle resetting user, teamMember, and role
    } catch (error: any) {
      console.error("Logout error:", error);
       toast({
        title: "Error al Cerrar Sesión",
        description: error.message || "Ocurrió un problema.",
        variant: "destructive",
      });
    }
    // setLoading(false) will be handled by onAuthStateChanged's effect
  };

  const createUserInAuth = async (email: string, pass: string): Promise<FirebaseUser | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      return userCredential.user;
    } catch (error: any) {
      console.error("Error creating user in Firebase Auth:", error);
      toast({
        title: "Error al Crear Usuario en Firebase",
        description: error.message || "No se pudo crear el usuario en Firebase.",
        variant: "destructive",
      });
      return null;
    }
  };
  
  const value = useMemo(() => ({
    user,
    teamMember,
    userRole,
    loading,
    login,
    logout,
    createUserInAuth,
  }), [user, teamMember, userRole, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
