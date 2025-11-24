import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { IDataLayer, Origin } from "..";

let FilePath = resolve(tmpdir(), 'remotes.json');


export class FileDataLayer implements IDataLayer {
    identifier = "file";
    remotes: any;
    constructor(filePath : string|undefined){
        if (filePath) {
            FilePath = filePath;
        }
    }
    async init(){
        try {
            if (existsSync(FilePath)) {
                const content = readFileSync(FilePath);
                try {
                    this.remotes = JSON.parse(content.toString());
                } catch(e) {
                    this.remotes = {};
                }
            } else {
                this.remotes = {};
                writeFileSync(FilePath, JSON.stringify(this.remotes));
            }
            return true;
        } catch(e) {
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
    async setRemotesByOrigin(remoteIdentifier: string, remotes: Origin[], _:string|null): Promise<boolean> {
        this.remotes[remoteIdentifier] = remotes;
        writeFileSync(FilePath, JSON.stringify(this.remotes));
        return true;
    }

    async listRemotes(): Promise<{[key: string]: Origin[]}> {
        return this.remotes;
    }

    async deleteRemoteByOrigin(remoteIdentifier: string): Promise<boolean> {
        delete this.remotes[remoteIdentifier];
        writeFileSync(FilePath, JSON.stringify(this.remotes));
        return true;
    }
}