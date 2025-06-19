
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
// mockTeamMembers is no longer the source of truth for user details after login
import type { TeamMember, UserRole, TeamMemberFormValues } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { getTeamMemberByAuthUidFS, addTeamMemberFS, getTeamMemberByEmailFS } from '@/services/team-member-service';

interface AuthContextType {
  user: FirebaseUser | null; // Firebase Auth user
  teamMember: TeamMember | null; // App-specific user details from Firestore
  userRole: UserRole | null; // Derived from teamMember
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createUserInAuthAndFirestore: (userData: TeamMemberFormValues, pass: string) => Promise<{firebaseUser: FirebaseUser | null, teamMemberId: string | null}>;
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
        try {
          // Fetch app-specific user details (TeamMember) from Firestore using auth UID
          const memberDetails = await getTeamMemberByAuthUidFS(firebaseUser.uid);
          if (memberDetails) {
            setTeamMember(memberDetails);
            setUserRole(memberDetails.role);
          } else {
            // This case might happen if a user exists in Firebase Auth but not in teamMembers collection
            // Potentially create a basic profile here, or log an error.
            // For now, treat as if no specific app role/profile.
            console.warn(`User ${firebaseUser.email} (UID: ${firebaseUser.uid}) authenticated but no profile found in Firestore teamMembers collection.`);
            
            // Attempt to find by email if UID match failed (e.g. during seeding if UID wasn't set as doc ID)
            const memberByEmail = await getTeamMemberByEmailFS(firebaseUser.email || "");
            if (memberByEmail) {
                setTeamMember(memberByEmail);
                setUserRole(memberByEmail.role);
                // If found by email but UID mismatch, consider updating the Firestore doc with authUid
                if(memberByEmail.authUid !== firebaseUser.uid) {
                    // await updateTeamMemberFS(memberByEmail.id, { authUid: firebaseUser.uid });
                    console.log(`Associated ${firebaseUser.email} with existing Firestore record by email.`);
                }
            } else {
                setTeamMember(null);
                setUserRole(null);
            }
          }
        } catch (err) {
          console.error("Error fetching team member details from Firestore:", err);
          toast({ title: "Error de Perfil", description: "No se pudo cargar la información del perfil de usuario.", variant: "destructive" });
          setTeamMember(null);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setTeamMember(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user, teamMember, and role
    } catch (error: any) {
      console.error("Login error:", error);
      let description = "Credenciales incorrectas o usuario no encontrado.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "El correo electrónico o la contraseña no son correctos.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Demasiados intentos fallidos. Por favor, inténtalo más tarde o restablece tu contraseña.";
      }
      toast({
        title: "Error de Inicio de Sesión",
        description: description,
        variant: "destructive",
      });
      setLoading(false); 
      throw error; 
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Logout error:", error);
       toast({
        title: "Error al Cerrar Sesión",
        description: error.message || "Ocurrió un problema.",
        variant: "destructive",
      });
    }
  };

  const createUserInAuthAndFirestore = async (userData: TeamMemberFormValues, pass: string): Promise<{firebaseUser: FirebaseUser | null, teamMemberId: string | null}> => {
    let firebaseUser: FirebaseUser | null = null;
    let teamMemberId: string | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, pass);
      firebaseUser = userCredential.user;
      
      if (firebaseUser) {
        const memberDataForFirestore: TeamMemberFormValues = {
          ...userData,
          authUid: firebaseUser.uid, // Link Firestore doc to Auth UID
          email: userData.email.toLowerCase(), // Ensure email is stored in lowercase
        };
        // The addTeamMemberFS function in the service should ideally use firebaseUser.uid as the document ID
        // or store firebaseUser.uid in a field called 'authUid'
        teamMemberId = await addTeamMemberFS(memberDataForFirestore);
      }
      return { firebaseUser, teamMemberId };

    } catch (error: any) {
      console.error("Error creating user in Firebase Auth or Firestore:", error);
      let description = "No se pudo crear el usuario.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este correo electrónico ya está registrado en Firebase Authentication.";
      } else if (error.code === 'auth/weak-password') {
        description = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
      toast({
        title: "Error al Crear Usuario",
        description: description,
        variant: "destructive",
      });
      // If user was created in Auth but failed in Firestore, consider cleanup or manual handling
      if (firebaseUser && !teamMemberId) {
        console.warn(`User ${firebaseUser.email} created in Auth but failed to create in Firestore teamMembers collection.`);
        // Optionally, delete the Firebase Auth user if Firestore creation fails critically
        // await firebaseUser.delete(); 
      }
      return { firebaseUser: null, teamMemberId: null };
    }
  };
  
  const value = useMemo(() => ({
    user,
    teamMember,
    userRole,
    loading,
    login,
    logout,
    createUserInAuthAndFirestore,
  }), [user, teamMember, userRole, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  // createUserInAuthAndFirestore is stable, so no need to add to deps if it doesn't change context values

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
