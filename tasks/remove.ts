import simpleGit from "simple-git";
import { type IDataLayer, type Origin } from "../data";
import { getRemoteIdentifier, remotesSynced } from "./utils";

export function remove(remote: string, dataLayer: IDataLayer, remoteToRemove?: string) {
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

        if (remoteToRemove) {
            let remotes: Origin[] = [];
            try {
                remotes = await dataLayer.getRemoteByOrigin(remoteIdentifier);

                const registryRemote = remotes.find(r => r.name === remoteToRemove);
                if (!registryRemote) {
                    console.error(`Remote ${remoteToRemove} not found in registry for ${remoteIdentifier}`);
                    return;
                }

                console.info(`Removing remote ${remoteToRemove} for repository for : ${remoteIdentifier}`);

                const afterDeleteRemotes = remotes.filter(r => r.name != remoteToRemove);

                if (await dataLayer.setRemotesByOrigin(remoteIdentifier, afterDeleteRemotes, remoteToRemove)) {
                    console.log(`Remote ${remoteToRemove} removed from registry`);
                } else {
                    console.error('Unable to remove remote from registry');
                }
            } catch(error) {
                console.error('Unable to fetch remotes from registry');
                return;
            }
        } else {
            if (confirm(`Are you sure you want to remove all remotes for ${remoteIdentifier} from registry?`)) {
                console.info(`Removing remotes for repository for : ${remoteIdentifier}`);

                try {
                    if (await dataLayer.deleteRemoteByOrigin(remoteIdentifier)) {
                        console.log('Remove from registry Complete');
                    } else {
                        console.error('Unable to remove remotes from registry');
                    }
                } catch (error) {
                    console.error('Unable to remove remotes from registry');
                }
            } else {
                console.log('Skipped remove')
            }
        }
    }).catch((err) => {
        console.error(err.message);
    });
}