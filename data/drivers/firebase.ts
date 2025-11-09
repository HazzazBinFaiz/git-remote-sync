import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore/lite';
import { createUserWithEmailAndPassword, EmailAuthProvider, getAuth, signInWithCredential, signInWithCustomToken, signInWithEmailAndPassword, signOut, updateCurrentUser } from 'firebase/auth';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IDataLayer, Origin } from '..';

const firebaseConfig = {
  apiKey: "AIzaSyAwRGfNrBW5zvL4Obwo1lhlINkqvjUMgHE",
  authDomain: "crypto-power-token.firebaseapp.com",
  projectId: "crypto-power-token",
  storageBucket: "crypto-power-token.firebasestorage.app",
  messagingSenderId: "249868986657",
  appId: "1:249868986657:web:0acc8cdd47ed734dd63660"
};

const userSessionPath = path.join(os.homedir(), '.myapp', 'session.json');

export class FireBaseDataLayer implements IDataLayer {
  app: any;
  db: any;
  auth: any;
  session: any;

  constructor() {

  }

  async init(): Promise<boolean> {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
    this.session = this.loadSession();
    if (this.session && this.session.stsTokenManager?.accessToken) {
      try {
        // Re-authenticate the user with the saved ID token
        const userCredential = await signInWithCredential(
          this.auth,
          EmailAuthProvider.credential(this.session.email, this.session.stsTokenManager?.accessToken)
        );

        console.log('User successfully re-authenticated:', userCredential.user);

        // Optionally, save the user session again to update any changes
        this.session.uid = userCredential.user.uid;
        this.saveSession(this.session);

        return true;
      } catch (error) {
        console.error('Error re-authenticating with ID token:', error);
        this.session = null; // Invalidate session if token is invalid
      }
    } else {
      console.log('No session data found or token is invalid');
    }
    return true;
  }

  private loadSession(): any {
    try {
      const sessionDir = path.dirname(userSessionPath);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      if (fs.existsSync(userSessionPath)) {
        const data = fs.readFileSync(userSessionPath, 'utf-8');
        return JSON.parse(data);
      }
      return null;
    } catch (err) {
      console.error('Error loading session:', err);
      return null;
    }
  }

  private saveSession(sessionData: any): void {
    try {
      const sessionDir = path.dirname(userSessionPath);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      fs.writeFileSync(userSessionPath, JSON.stringify(sessionData, null, 2));
    } catch (err) {
      console.error('Error saving session:', err);
    }
  }

  async register(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      this.session = {
        uid: user.uid,
        email: user.email,
        token: await user.getIdToken()
      };
      this.saveSession(this.session);
      return true;
    } catch (registerError: any) {
      return false;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      this.session = user.toJSON();
      this.saveSession(this.session);
      return true;
    } catch (error: any) {
      return false;

    }
  }

  isLoggedIn(): boolean {
    return this.session !== null;
  }

  async logout(): Promise<boolean> {
    try {
      await signOut(this.auth);
      this.session = null;
      this.saveSession(this.session);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRemoteByOrigin(remoteIdentifier: string): Promise<Origin[]> {
    const user = this.getCurrentUser();
    if (!user) {
      console.log('User not logged in');
      throw Error('User not logged in');
    }
    const remoteRef = collection(this.db, 'remotes', user.uid, 'remotes', remoteIdentifier);
    const remoteSnapshot = await getDocs(remoteRef);

    const originList: Origin[] = remoteSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.name,
        refs: {
          fetch: data.refs?.fetch || "",
          push: data.refs?.push || ""
        }
      };
    });

    return originList;
  }

  async setRemotesByOrigin(remoteIdentifier: string, origins: Origin[]): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      const remoteCollectionRef = collection(this.db, 'remotes', user.uid, 'remotes', remoteIdentifier);
      for (const origin of origins) {
        const remoteDocRef = doc(remoteCollectionRef, origin.name);
        await setDoc(remoteDocRef, {
          name: origin.name,
          refs: origin.refs
        }, { merge: true });
      }
      return true;
    } catch (error) {
      console.error('Error saving remotes:', error);
      return false;
    }
  }

  getCurrentUser(): any {
    return getAuth(this.app).currentUser;
  }
}
