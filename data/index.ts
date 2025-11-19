// const FilePath = process.cwd()+'/remotes.json';

import { resolve } from "node:path";
import { FileDataLayer } from "./drivers/file";
import { FireBaseDataLayer } from "./drivers/firebase";
import { tmpdir } from "node:os";
import { write } from "node:console";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import PocketbaseDataLayer from "./drivers/pocketbase";

const FilePath = resolve(tmpdir(), 'config.json');

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
    return new FireBaseDataLayer();
    // return new FileDataLayer();
    // return new PocketbaseDataLayer();
}
