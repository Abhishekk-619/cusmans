import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './config'

export type UserRole = 'admin' | 'team_lead' | 'employee'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  team_lead_id?: string | null  // for employees: which team lead they belong to
}

interface AuthContextValue {
  currentUser: AppUser | null
  loading: boolean
  emailNotVerified: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailNotVerified, setEmailNotVerified] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            const role = (data.role ?? 'employee') as UserRole

            // ── Email verification gate (admins are exempt) ─────────
            if (!firebaseUser.emailVerified && role !== 'admin') {
              // Don't set currentUser → user stays on login page
              setCurrentUser(null)
              setEmailNotVerified(true)
              setLoading(false)
              return
            }

            setEmailNotVerified(false)
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              name: data.name ?? firebaseUser.email ?? '',
              role,
              team_lead_id: data.team_lead_id ?? null,
            })
          } else {
            // User exists in Auth but not in Firestore — block them
            setCurrentUser(null)
            setEmailNotVerified(false)
          }
        } catch {
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
        // Only clear the flag when the user explicitly signs out,
        // not during the initial load (loading=true means first check)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    setEmailNotVerified(false)
    const cred = await signInWithEmailAndPassword(auth, email, password)

    // After successful sign-in, check email verification immediately.
    // If not verified, send a verification email and sign them back out.
    // This runs BEFORE onAuthStateChanged finishes (due to await getDoc in there).
    const fbUser = cred.user
    if (!fbUser.emailVerified) {
      // Quick role check — admins bypass verification
      const userSnap = await getDoc(doc(db, 'users', fbUser.uid))
      const role = userSnap.exists() ? userSnap.data().role : 'employee'

      if (role !== 'admin') {
        // Send verification email (won't throw if already sent recently)
        try {
          await sendEmailVerification(fbUser)
        } catch {
          // Firebase rate-limits verification emails; ignore errors
        }
        await signOut(auth)
        setEmailNotVerified(true)
        throw new Error('EMAIL_NOT_VERIFIED')
      }
    }
  }

  const logout = async () => {
    setEmailNotVerified(false)
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, emailNotVerified, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
