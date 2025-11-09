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
    getRemoteByOrigin(remoteidentifier: string) : Promise<Origin[]>
    setRemotesByOrigin(remoteidentifier: string, origins : Origin[]): Promise<boolean>
}

export function createDataLayer() : IDataLayer
{
    return new DataLayer();
}

export class DataLayer implements IDataLayer {
    remotes: any;
    constructor(){
        const file = Bun.file(process.cwd()+'/remotes.json');
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
    async getRemoteByOrigin(remoteidentifier: string): Promise<Origin[]> {
        const remotes = this.remotes[remoteidentifier];
        if (remotes == undefined) {
            return [];
        }
        return this.remotes[remoteidentifier];
    }
    async setRemotesByOrigin(remoteidentifier: string, remotes: Origin[]): Promise<boolean> {
        this.remotes[remoteidentifier] = remotes;
        await Bun.write(process.cwd()+'/remotes.json', JSON.stringify(this.remotes));
        return true;
    }
}
