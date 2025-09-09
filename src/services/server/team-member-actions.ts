
'use server';
import 'server-only';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { addTeamMemberFS, getTeamMemberByAuthUidFS as getTeamMemberByAuthUidFromServiceFS } from '@/services/team-member-service';
import type { TeamMember, TeamMemberFormValues } from '@/types';
import type { RolUsuario } from "@ssot";

/**
 * Fetches a team member profile from Firestore using their Firebase Authentication UID.
 * This is a server-side action.
 * @param authUid The Firebase Authentication UID of the user.
 * @returns The team member profile or null if not found.
 */
export async function getTeamMemberByAuthUidFS(authUid: string): Promise<TeamMember | null> {
    return getTeamMemberByAuthUidFromServiceFS(authUid);
}

/**
 * A Server Action to create a new user in Firebase Authentication and a corresponding
 * team member profile in Firestore. This ensures server-side security and logic.
 * @param userData The data for the new team member profile.
 * @param password The password for the new user.
 * @returns An object containing the new user and team member ID, or an error message.
 */
export async function createTeamMemberAction(
  userData: TeamMemberFormValues,
  password: string
): Promise<{ user?: any; teamMemberId?: string; error?: string }> {
  const lowerCaseEmail = userData.email.toLowerCase();

  try {
    // 1. Create the user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: lowerCaseEmail,
      emailVerified: false,
      password: password,
      displayName: userData.name,
      disabled: false,
    });

    // 2. Create the team member profile in Firestore
    const memberDataForFirestore: TeamMemberFormValues = {
      ...userData,
      email: lowerCaseEmail,
      authUid: userRecord.uid,
    };
    const teamMemberId = await addTeamMemberFS(memberDataForFirestore);
    
    console.log(`Server Action: User ${lowerCaseEmail} created successfully. UID: ${userRecord.uid}, Firestore ID: ${teamMemberId}`);
    
    // Return a serializable user object (don't return the full userRecord)
    return {
      user: { uid: userRecord.uid, email: userRecord.email },
      teamMemberId: teamMemberId,
    };

  } catch (error: any) {
    console.error("Error in createTeamMemberAction:", error);
    let errorMessage = "No se pudo crear el usuario.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = `El correo electrónico ${lowerCaseEmail} ya está registrado.`;
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = "La contraseña no es válida. Debe tener al menos 6 caracteres.";
    }
    return { error: errorMessage };
  }
}

interface SocialAuthUserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

export async function findOrCreateTeamMemberForSocialAuthAction(
    authUserData: SocialAuthUserData
): Promise<TeamMember | null> {
    const existingMember = await getTeamMemberByAuthUidFromServiceFS(authUserData.uid);
    if (existingMember) {
        return existingMember;
    }

    // User does not exist, create a new profile.
    console.log(`Creating new team member profile for social auth user: ${authUserData.email}`);
    try {
        const userDataForFirestore: TeamMemberFormValues = {
            name: authUserData.displayName,
            email: authUserData.email,
            role: 'Ventas', // Assign a default role
            avatarUrl: authUserData.photoURL || undefined,
            authUid: authUserData.uid,
        };
        const teamMemberId = await addTeamMemberFS(userDataForFirestore);
        const newMember = await getTeamMemberByAuthUidFromServiceFS(authUserData.uid);
        return newMember;
    } catch (error) {
        console.error("Error creating team member profile for social auth user:", error);
        return null;
    }
}
