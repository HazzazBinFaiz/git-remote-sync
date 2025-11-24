import { createKVStore, type IDataLayer, type KVStore, type Origin } from "..";
import PocketBase from 'pocketbase';


let pocketbaseUrl = "http://127.0.0.1:9090";
const authKey = 'pocketbase_auth_cookie';
const repositoryTable = 'repositories';

export class PocketbaseDataLayer implements IDataLayer {
    identifier = "pocketbase";
    app: PocketBase | undefined;
    kvStore: KVStore;

    constructor(baseUrl : string|undefined) {
        if (baseUrl) {
            pocketbaseUrl = baseUrl.toString().replace(/\/+$/, '');
        }
        this.kvStore = createKVStore();
    }
    async init(): Promise<boolean> {
        this.app = new PocketBase(pocketbaseUrl);
        const authData = await this.kvStore.get(authKey);
        if (authData) {
            this.app.authStore.loadFromCookie(authData);
        }
        return true;
    }
    async register(email: string, password: string): Promise<boolean> {
        const data = {
            "email": email,
            "emailVisibility": false,
            "password": password,
            "passwordConfirm": password
        };
        if (!this.app) {
            console.error('PocketBase not initialized');
            return false;
        }

        try {
            const user = await this.app.collection('users').create(data);
            if (user) {
                await this.app.collection('users').authWithPassword(
                    email,
                    password,
                );
                this.kvStore.set(authKey, this.app.authStore.exportToCookie());
                return this.app.authStore.isValid;
            }
            return user != null;
        } catch (e) {
            console.error('Unable to register user');
            return false;
        }
    }
    async login(email: string, password: string): Promise<boolean> {
        if (!this.app) return false;
        try {
            await this.app.collection('users').authWithPassword(
                email,
                password,
            );
            this.kvStore.set(authKey, this.app.authStore.exportToCookie());
            return this.app.authStore.isValid;
        } catch (e) {
            return false;
        }
    }
    isLoggedIn(): boolean {
        if (this.app) {
            return this.app.authStore.isValid;
        }
        return false;
    }
    async logout(): Promise<boolean> {
        if (this.app) {
            this.app.authStore.clear();
            await this.kvStore.delete(authKey);
            return true;
        }
        return false;
    }
    async getRemoteByOrigin(remoteIdentifier: string): Promise<Origin[]> {
        if (!this.app){
            return [];
        }
        try {
            const record = await this.app.collection(repositoryTable).getFirstListItem(`identifier="${remoteIdentifier}" && user_id="${this.app.authStore.record?.id}"`);
            return record?.remotes ?? []; 
        } catch (e) {
            return [];
        } 
    }
    async setRemotesByOrigin(remoteIdentifier: string, origins: Origin[], _:string|null): Promise<boolean> {
        if (!this.app){
            return false;
        }

        const recordData = {
            user_id: this.app.authStore.record?.id,
            identifier: remoteIdentifier,
            remotes: origins
        };

        try {
            const record = await this.app.collection(repositoryTable).getFirstListItem(`identifier="${remoteIdentifier}" && user_id="${this.app.authStore.record?.id}"`);
            await this.app.collection(repositoryTable).update(record.id, recordData);
        } catch (e) {
            await this.app.collection(repositoryTable).create(recordData);
        }
        return true;
    }
    async listRemotes(): Promise<{ [key: string]: Origin[]; }> {
        if (!this.app){
            return {};
        }
        const records = await this.app.collection(repositoryTable).getFullList();

        const remotesMap: {[key: string]: Origin[]} = {};

        records.forEach(record => {
            const remoteId = record.identifier;
            if (!remotesMap[remoteId]) {
                remotesMap[remoteId] = record.remotes;
            }
        });

        return remotesMap;
    }
    

    deleteRemoteByOrigin(remoteIdentifier: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}
