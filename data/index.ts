import { join } from "node:path";
import { FireBaseDataLayer } from "./drivers/firebase";
import { homedir } from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { RESTDataLayer } from "./drivers";

const FilePath = join(homedir(), '.git-remote', 'config.json');

export interface KVStore {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
}

class FileBasedKVStore implements KVStore {
    data: {};
    constructor(){
        if (existsSync(FilePath)) {
            const content = readFileSync(FilePath);
            try {
                this.data = JSON.parse(content.toString());
            } catch(e) {
                this.data = {};
            }
        } else {
            if (!existsSync(join(homedir(), '.git-remote'))) {
                mkdirSync(join(homedir(), '.git-remote'), { recursive: true });
            }
            writeFileSync(FilePath, '{}');
            this.data = {};
        }
    }

    async get(key: string): Promise<any> {
        return (this.data as any)[key];
    }

    async set(key: string, value: any): Promise<void> {
        (this.data as any)[key] = value;
        writeFileSync(FilePath, JSON.stringify(this.data));
    }

    async delete(key: string): Promise<void> {
        delete (this.data as any)[key];
        writeFileSync(FilePath, JSON.stringify(this.data));
    }
}

let store : FileBasedKVStore|null = null;

export function createKVStore(): KVStore
{
    if (store === null) {
        store = new FileBasedKVStore();
    }
    return store;
}

export type Origin = {
    name: string,
    refs: {
        fetch: string,
        push: string,
    }
}

export interface IDataLayer {
    init(): Promise<boolean>;
    register(email: string, password: string): Promise<boolean>;
    login(email: string, password: string): Promise<boolean>;
    isLoggedIn(): boolean;
    logout(): Promise<boolean>;
    getRemoteByOrigin(remoteIdentifier: string) : Promise<Origin[]>
    setRemotesByOrigin(remoteIdentifier: string, origins : Origin[]): Promise<boolean>
    listRemotes() : Promise<{[key: string]: Origin[]}>;
    deleteRemoteByOrigin(remoteIdentifier: string) : Promise<boolean>;
}

export function createDataLayer() : IDataLayer
{
    // return new RESTDataLayer();
    return new FireBaseDataLayer();
    // return new FileDataLayer();
    // return new PocketbaseDataLayer();
}
