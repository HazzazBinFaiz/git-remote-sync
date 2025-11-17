import simpleGit from "simple-git";
import { type IDataLayer, type Origin } from "../data";
import { getRemoteIdentifier, remotesSynced } from "./utils";

export function status(remote: string, dataLayer: IDataLayer) {
    if (!dataLayer.isLoggedIn()) {
        console.error('User not logged in. Use login command to log in first');
        return;
    }

    const git = simpleGit();

    git.getRemotes(true).then(async (result) => {
        if (result.length === 0) {
            console.error("No remotes found in this repository.");
            return;
        }

        const remoteIdentifier = getRemoteIdentifier(result, remote);

        if (!remoteIdentifier) {
            return;
        }

        console.info(`Fetching remotes for repository for : ${remoteIdentifier}`);

        let remotes: Origin[] = [];
        try {
            remotes = await dataLayer.getRemoteByOrigin(remoteIdentifier);
        } catch(error) {
            console.error('Unable to fetch remotes from registry');
            return;
        }

        const localRemoteNames = result.filter(r => r.name != remote).map(r => r.name).sort();
        const registryRemoteNames = remotes.filter(r => r.name != remote).map(r => r.name).sort();

        if (localRemoteNames.length === 0 && registryRemoteNames.length === 0) {
            console.log('No remotes found locally or in registry to sync');
            return;
        }
        

        if (remotesSynced(result, remotes, remote)) {
            console.log('All remotes are synced with registry');
            console.log(`Registry has : ${registryRemoteNames.join(',')}`);
            console.log(`Local has    : ${localRemoteNames.join(',')}`);
        } else {
            // differences already printed
        }
        
    }).catch((err) => {
        console.error(err.message);
    });
}