import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { IDataLayer, Origin } from "..";

const FilePath = resolve(tmpdir(), 'remotes.json');


export class FileDataLayer implements IDataLayer {
    remotes: any;
    async init(){
        try {
            const file = Bun.file(FilePath);
            const result = await file.json();
            if (result) {
                this.remotes = result;
            } else {
                this.remotes = {};
            }
            return true;
        } catch(e) {
            console.error('Unable to connect to server');
            return false;
        }
    }
    register(email: string, password: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    login(email: string, password: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    isLoggedIn(): boolean {
        return true;
    }
    logout(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    async getRemoteByOrigin(remoteIdentifier: string): Promise<Origin[]> {
        const remotes = this.remotes[remoteIdentifier];
        if (remotes == undefined) {
            return [];
        }
        return this.remotes[remoteIdentifier];
    }
    async setRemotesByOrigin(remoteIdentifier: string, remotes: Origin[]): Promise<boolean> {
        this.remotes[remoteIdentifier] = remotes;
        await Bun.write(FilePath, JSON.stringify(this.remotes));
        return true;
    }

    async listRemotes(): Promise<{[key: string]: Origin[]}> {
        return this.remotes;
    }

    async deleteRemoteByOrigin(remoteIdentifier: string): Promise<boolean> {
        delete this.remotes[remoteIdentifier];
        await Bun.write(FilePath, JSON.stringify(this.remotes));
        return true;
    }
}