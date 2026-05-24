import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBC392K4HKXNCLBHObQbaeRN8PzNBLr8jY",
  authDomain: "bs-crm-4d900.firebaseapp.com",
  projectId: "bs-crm-4d900",
  storageBucket: "bs-crm-4d900.firebasestorage.app",
  messagingSenderId: "432235183962",
  appId: "1:432235183962:web:5295906f7fc24ab21f7d63"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

// Secondary app instance used ONLY for creating new users
// This prevents createUserWithEmailAndPassword from signing out the admin
const secondaryApp = initializeApp(firebaseConfig, 'secondary')
export const secondaryAuth = getAuth(secondaryApp)
