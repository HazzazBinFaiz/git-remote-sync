// const FilePath = process.cwd()+'/remotes.json';

import { FileDataLayer } from "./drivers/file";
import { FireBaseDataLayer } from "./drivers/firebase";



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
    return new FileDataLayer();
}
