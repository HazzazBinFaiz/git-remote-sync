// const FilePath = process.cwd()+'/remotes.json';
const FilePath = '/tmp/remotes.json';


export type Origin = {
    name: string,
    refs: {
        fetch: string,
        push: string,
    }
}

export interface IDataLayer {
    login(email: string, password: string): boolean;
    isLoggedIn(): boolean;
    logout(): boolean;
    getRemoteByOrigin(remoteIdentifier: string) : Promise<Origin[]>
    setRemotesByOrigin(remoteIdentifier: string, origins : Origin[]): Promise<boolean>
}

export function createDataLayer() : IDataLayer
{
    return new DataLayer();
}

export class DataLayer implements IDataLayer {
    remotes: any;
    constructor(){
        const file = Bun.file(FilePath);
        file.json().then(result => {
            this.remotes = result;
        }).catch(e => {
            this.remotes = {};
        })
    }
    login(email: string, password: string): boolean {
        throw new Error("Method not implemented.");
    }
    isLoggedIn(): boolean {
        return true;
    }
    logout(): boolean {
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
}
