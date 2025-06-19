
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
import type { TeamMember, UserRole, TeamMemberFormValues } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { getTeamMemberByAuthUidFS, addTeamMemberFS, getTeamMemberByEmailFS, updateTeamMemberFS } from '@/services/team-member-service';

interface AuthContextType {
  user: FirebaseUser | null; 
  teamMember: TeamMember | null; 
  userRole: UserRole | null; 
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
        console.log(`AuthContext: Firebase user authenticated. UID: ${firebaseUser.uid}, Email: ${firebaseUser.email}`);
        try {
          let memberDetails = await getTeamMemberByAuthUidFS(firebaseUser.uid);
          
          if (memberDetails) {
            console.log(`AuthContext: Profile found for UID ${firebaseUser.uid}:`, memberDetails);
            setTeamMember(memberDetails);
            setUserRole(memberDetails.role);
          } else {
            console.warn(`AuthContext: No profile found in Firestore for UID: ${firebaseUser.uid}. Attempting fallback to email: ${firebaseUser.email}`);
            if (firebaseUser.email) {
                const memberByEmail = await getTeamMemberByEmailFS(firebaseUser.email.toLowerCase()); // Search with lowercase email
                if (memberByEmail) {
                    console.log(`AuthContext: Profile found via email fallback for ${firebaseUser.email}:`, memberByEmail);
                    setTeamMember(memberByEmail);
                    setUserRole(memberByEmail.role);
                    // If authUid is missing or different, update it in Firestore
                    if (!memberByEmail.authUid || memberByEmail.authUid !== firebaseUser.uid) {
                        console.log(`AuthContext: Updating Firestore record ${memberByEmail.id} for ${memberByEmail.email} with new authUid: ${firebaseUser.uid}`);
                        try {
                          await updateTeamMemberFS(memberByEmail.id, { authUid: firebaseUser.uid, email: memberByEmail.email.toLowerCase() }); 
                          setTeamMember({ ...memberByEmail, authUid: firebaseUser.uid, email: memberByEmail.email.toLowerCase() }); 
                        } catch (updateError) {
                          console.error("AuthContext: Error updating authUid/email in Firestore:", updateError);
                        }
                    }
                } else {
                    console.error(`AuthContext: CRITICAL - User ${firebaseUser.email} (UID: ${firebaseUser.uid}) authenticated but no profile found in Firestore teamMembers collection even after email fallback.`);
                    toast({ title: "Error de Perfil", description: `No se encontró el perfil para ${firebaseUser.email}. Contacte al administrador.`, variant: "destructive", duration: 10000 });
                    setTeamMember(null);
                    setUserRole(null);
                }
            } else {
                 console.error(`AuthContext: CRITICAL - User UID ${firebaseUser.uid} has no email associated in Firebase Auth. Cannot perform email fallback.`);
                 toast({ title: "Error de Autenticación", description: "El usuario no tiene un email asociado. Contacte al administrador.", variant: "destructive", duration: 10000 });
                 setTeamMember(null);
                 setUserRole(null);
            }
          }
        } catch (err) {
          console.error("AuthContext: Error fetching team member details from Firestore:", err);
          toast({ title: "Error de Perfil", description: "No se pudo cargar la información del perfil de usuario.", variant: "destructive" });
          setTeamMember(null);
          setUserRole(null);
        }
      } else {
        console.log("AuthContext: No user authenticated. Clearing user state.");
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
      // User state will be set by onAuthStateChanged
    } catch (error: any) {
      console.error("AuthContext: Login error:", error);
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
    // setLoading(false) will be handled by onAuthStateChanged after successful login
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // User state will be cleared by onAuthStateChanged
    } catch (error: any) {
      console.error("AuthContext: Logout error:", error);
       toast({
        title: "Error al Cerrar Sesión",
        description: error.message || "Ocurrió un problema.",
        variant: "destructive",
      });
       setLoading(false); // Ensure loading is set to false on logout error
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
          authUid: firebaseUser.uid, 
          email: userData.email.toLowerCase(), // Ensure email is stored in lowercase
        };
        teamMemberId = await addTeamMemberFS(memberDataForFirestore);
      }
      return { firebaseUser, teamMemberId };

    } catch (error: any) {
      console.error("AuthContext: Error creating user in Firebase Auth or Firestore:", error);
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
      if (firebaseUser && !teamMemberId) {
        console.warn(`AuthContext: User ${firebaseUser.email} created in Auth but FAILED to create in Firestore teamMembers collection.`);
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
  }), [user, teamMember, userRole, loading]); // Dependencies for useMemo

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
