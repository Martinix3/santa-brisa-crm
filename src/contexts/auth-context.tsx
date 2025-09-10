// src/contexts/auth-context.tsx
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, ensureAuthPersistence, assertFirebaseEnv } from '@/lib/firebase-client';
import type { TeamMember, TeamMemberFormValues } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { getTeamMemberByAuthUidFS } from '@/services/client/team-member-service.client';
import { createTeamMemberAction, findOrCreateTeamMemberForSocialAuthAction } from '@/services/server/team-member-actions';
import type { RolUsuario } from "@ssot";

interface AuthContextType {
  user: FirebaseUser | null;
  teamMember: TeamMember | null;
  userRole: RolUsuario | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  createUserInAuthAndFirestore: (
    userData: TeamMemberFormValues,
    pass: string
  ) => Promise<{ firebaseUser: FirebaseUser | null; teamMemberId: string | null }>;
  dataSignature: number;
  refreshDataSignature: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSignature, setDataSignature] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Config/env y persistencia
    try {
      assertFirebaseEnv();
    } catch (e) {
      console.error("[AuthProvider] Variables de entorno incompletas:", e);
      // En producción podrías mostrar un toast más claro.
    }
    void ensureAuthPersistence();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profile = await getTeamMemberByAuthUidFS(firebaseUser.uid);
          if (profile) {
            setTeamMember(profile);
          } else {
            console.error("AuthContext: Profile not found for UID:", firebaseUser.uid);
            const newProfile = await findOrCreateTeamMemberForSocialAuthAction({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Nuevo Usuario',
              photoURL: firebaseUser.photoURL,
            });
            if (newProfile) {
              setTeamMember(newProfile);
            } else {
              toast({
                title: "Error de Perfil",
                description: "No se pudo encontrar ni crear tu perfil. Contacta con el administrador.",
                variant: "destructive",
              });
              await firebaseSignOut(auth);
              setUser(null);
            }
          }
        } catch (error) {
          console.error("AuthContext: Error fetching profile:", error);
          setTeamMember(null);
          toast({
            title: "Error de Carga de Perfil",
            description: "Ocurrió un error al cargar tu perfil.",
            variant: "destructive",
          });
        }
      } else {
        setUser(null);
        setTeamMember(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("AuthContext: Login error:", error);
      let description = "Credenciales incorrectas o usuario no encontrado.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "El correo electrónico o la contraseña no son correctos.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Demasiados intentos fallidos. Por favor, inténtalo más tarde o restablece tu contraseña.";
      } else if (error.code === 'auth/network-request-failed') {
        description = "Fallo de red al conectar con Firebase (¿emulador apagado o dominio no autorizado?).";
      }
      toast({ title: "Error de Inicio de Sesión", description, variant: "destructive" });
      setLoading(false);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("AuthContext: Google login error:", error);
      let description = "No se pudo iniciar sesión con Google.";
      if (error.code === 'auth/popup-closed-by-user') {
        description = "Has cerrado la ventana de inicio de sesión de Google.";
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        description = "Ya existe una cuenta con este correo electrónico pero con un método de inicio de sesión diferente.";
      }
      toast({ title: "Error de Inicio de Sesión", description, variant: "destructive" });
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("AuthContext: Logout error:", error);
      toast({
        title: "Error al Cerrar Sesión",
        description: error.message || "Ocurrió un problema.",
        variant: "destructive",
      });
    }
  };

  const createUserInAuthAndFirestore = async (
    userData: TeamMemberFormValues,
    pass: string
  ): Promise<{ firebaseUser: FirebaseUser | null; teamMemberId: string | null }> => {
    try {
      const result = await createTeamMemberAction(userData, pass);
      if (result.error) {
        throw new Error(result.error);
      }
      return { firebaseUser: result.user as FirebaseUser, teamMemberId: result.teamMemberId };
    } catch (error: any) {
      console.error("AuthContext: Error creating user via Server Action:", error);
      toast({ title: "Error al Crear Usuario", description: error.message, variant: "destructive" });
      return { firebaseUser: null, teamMemberId: null };
    }
  };

  const refreshDataSignature = useCallback(() => {
    setDataSignature((prev) => prev + 1);
  }, []);

  const value = useMemo(
    () => ({
      user,
      teamMember,
      userRole: teamMember?.role || null,
      loading,
      login,
      loginWithGoogle,
      logout,
      createUserInAuthAndFirestore,
      dataSignature,
      refreshDataSignature,
    }),
    [user, teamMember, loading, dataSignature, refreshDataSignature]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
