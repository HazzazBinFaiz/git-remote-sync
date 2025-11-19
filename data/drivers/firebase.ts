import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore/lite';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type Auth, type Persistence, initializeAuth, getAuth, onAuthStateChanged } from 'firebase/auth';
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
const authKey = 'auth';

class LocalFilePersistence implements Persistence {
  storage: any;
  initiallyLoaded: boolean;
  type: "NONE";
  constructor() {
    this.type = "NONE" /* PersistenceType.NONE */;
    this.storage = {};
    this.initiallyLoaded = false;
  }
  async _isAvailable() {
    const file = Bun.file(userSessionPath);
    if (!await file.exists()) {
      await Bun.write(userSessionPath, '{}');
    }
    return true;
  }
  async _set(key: any, value: any) {
    this.storage[key] = value;
    const content = await Bun.file(userSessionPath).json();
    content[authKey] = this.storage;
    await Bun.write(userSessionPath, JSON.stringify(content));
  }

  async _get(key: string | number) {
    if (!this.initiallyLoaded) {
      this.storage = (await Bun.file(userSessionPath).json())[authKey] ?? {};
    }
    const value = this.storage[key];
    return value === undefined ? null : value;
  }
  async _remove(key: string | number) {
    delete this.storage[key];
  }
  _addListener(_key: any, _listener: any) {
    return;
  }
  _removeListener(_key: any, _listener: any) {
    return;
  }
}


export class FireBaseDataLayer implements IDataLayer {
  app: any;
  db: any;
  auth: Auth | undefined;
  constructor() {
  }

  init(): Promise<boolean> {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    this.auth = initializeAuth(this.app, {
      persistence: LocalFilePersistence as unknown as Persistence
    });
    if (this.auth !== undefined) {
      return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(this.auth as Auth, user => {
          unsubscribe();
          resolve(true);
        }, reject);
      });
    }
    return Promise.resolve(false);
  }

  async register(email: string, password: string): Promise<boolean> {
    try {
      if (!this.auth) {
        console.error('Login error');
        return false;
      }
      await createUserWithEmailAndPassword(this.auth, email, password);
      return true;
    } catch (registerError: any) {
      return false;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      if (!this.auth) {
        console.error('Login error');
        return false;
      }
      await signInWithEmailAndPassword(this.auth, email, password);
      return true;
    } catch (error: any) {
      return false;

    }
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  async logout(): Promise<boolean> {
    try {
      if (!this.auth) {
        console.error('Login error');
        return false;
      }
      await signOut(this.auth);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRemoteByOrigin(remoteIdentifier: string): Promise<Origin[]> {
    remoteIdentifier = remoteIdentifier.replace('/', ':');
    const user = this.getCurrentUser();
    const remoteRef = collection(this.db, 'remotes', user.uid, remoteIdentifier);
    
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
    remoteIdentifier = remoteIdentifier.replace('/', ':');
    try {
      const user = this.getCurrentUser();

      const userDocRef = doc(this.db, 'remotes', user.uid);
      const document = await getDoc(userDocRef);
      if (document.exists() === false){
        await setDoc(userDocRef, {
          list: [remoteIdentifier]
        }, { merge: true });
      } else {
        const data = document.data();
        const list: string[] = data.list || [];
        if (!list.includes(remoteIdentifier)) {
          list.push(remoteIdentifier);
          await setDoc(userDocRef, {
            list: list
          }, { merge: true });
        }
      }

      const remoteCollectionRef = collection(this.db, 'remotes', user.uid, remoteIdentifier);
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
    return this.auth?.currentUser;
  }

  async listRemotes(): Promise<{ [key: string]: Origin[] }> {
    const user = this.getCurrentUser();
    if (!user) {
      console.log('User not logged in');
      throw Error('User not logged in');
    }

    const remotesMap: { [key: string]: Origin[] } = {};

    const documentRef = doc(this.db, 'remotes', user.uid);
    const snapShot = await getDoc(documentRef);


    if(snapShot.exists()){
      const identifiers = snapShot.data()?.list ?? [];
      for (const remoteIdentifier of identifiers) {
        const originList: Origin[] = [];
        const remoteCollectionRef = collection(this.db, 'remotes', user.uid, remoteIdentifier);
        const originSnapshot = await getDocs(remoteCollectionRef);

        for (const originDoc of originSnapshot.docs) {
          const data = originDoc.data();
          originList.push({
            name: data.name,
            refs: {
              fetch: data.refs?.fetch || "",
              push: data.refs?.push || ""
            }
          });
        }

        remotesMap[remoteIdentifier.replace(':', '/')] = originList;
      } 
    }

    return remotesMap;
  }

  async deleteRemoteByOrigin(remoteIdentifier: string): Promise<boolean> {
    remoteIdentifier = remoteIdentifier.replace('/', ':');
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('User not logged in');
        throw Error('User not logged in');
      }
      const remoteCollectionRef = collection(this.db, 'remotes', user.uid, remoteIdentifier);
      const originSnapshot = await getDocs(remoteCollectionRef);

      for (const originDoc of originSnapshot.docs) {
        const originDocRef = doc(remoteCollectionRef, originDoc.id);
        await deleteDoc(originDocRef);
      }
      
      const userDocRef = doc(this.db, 'remotes', user.uid);
      const document = await getDoc(userDocRef);

      if (document.exists()){
        const data = document.data();
        const list: string[] = data.list || [];
        const index = list.indexOf(remoteIdentifier);
        if (index > -1) {
          list.splice(index, 1);
          await setDoc(userDocRef, {
            list: list
          }, { merge: true });
        }
      } 
      return true;
    } catch (error) {
      console.error('Error deleting remotes:', error);
      return false;
    }
  }
}
