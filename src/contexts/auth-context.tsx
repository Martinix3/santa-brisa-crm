
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  type Auth,
} from 'firebase/auth';
import { auth, ensureAuthPersistence, assertFirebaseEnv } from '@/lib/firebase-client';
import type { TeamMember, TeamMemberFormValues } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { getTeamMemberByAuthUidFS } from '@/services/client/team-member-service.client';
import { createTeamMemberAction } from '@/services/server/team-member-actions';
import type { RolUsuario } from "@ssot";

interface AuthContextType {
  user: FirebaseUser | null;
  teamMember: TeamMember | null;
  userRole: RolUsuario | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createUserInAuthAndFirestore: (userData: TeamMemberFormValues, pass: string) => Promise<{firebaseUser: FirebaseUser | null, teamMemberId: string | null}>;
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
    assertFirebaseEnv();
    void ensureAuthPersistence();
    
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
            setTeamMember(null);
            toast({ title: "Error de Perfil", description: "No se pudo encontrar tu perfil de usuario. Contacta con el administrador.", variant: "destructive" });
            await firebaseSignOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("AuthContext: Error fetching profile:", error);
          setTeamMember(null);
          toast({ title: "Error de Carga de Perfil", description: "Ocurrió un error al cargar tu perfil.", variant: "destructive" });
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
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      console.error("AuthContext: Login error:", error);
      let description = "Credenciales incorrectas o usuario no encontrado.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "El correo electrónico o la contraseña no son correctos.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Demasiados intentos fallidos. Por favor, inténtalo más tarde o restablece tu contraseña.";
      }
      toast({ title: "Error de Inicio de Sesión", description: description, variant: "destructive" });
      setLoading(false); 
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("AuthContext: Logout error:", error);
       toast({ title: "Error al Cerrar Sesión", description: error.message || "Ocurrió un problema.", variant: "destructive" });
    }
  };

  const createUserInAuthAndFirestore = async (userData: TeamMemberFormValues, pass: string): Promise<{firebaseUser: FirebaseUser | null, teamMemberId: string | null}> => {
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
    setDataSignature(prev => prev + 1);
  }, []);
  
  const value = useMemo(() => ({
    user, 
    teamMember,
    userRole: teamMember?.role || null,
    loading, 
    login, 
    logout, 
    createUserInAuthAndFirestore, 
    dataSignature, 
    refreshDataSignature,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, teamMember, loading, dataSignature, refreshDataSignature]); 

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
