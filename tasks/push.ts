import simpleGit from "simple-git";
import { type IDataLayer, type Origin } from "../data";
import { getRemoteIdentifier, remotesSynced } from "./utils";

export function push(remote: string, dataLayer: IDataLayer, forceOverride = false) {
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

        let registryRemotes : Origin[] = [];
        try {
            registryRemotes = await dataLayer.getRemoteByOrigin(remoteIdentifier);
        } catch(error) {
            console.error('Unable to fetch remotes from registry');
            return;
        }

        let updated = false;
        let ignoredConflict = false;

        result.forEach(localRemote => {
            if (localRemote.name == remote) return; // ignore origin sync

            const existingRemote = registryRemotes.find(r => r.name === localRemote.name);
            if (existingRemote) {
                if (existingRemote.refs.push == localRemote.refs.push && existingRemote.refs.fetch == localRemote.refs.fetch) {
                    // GOOD: local and registry has same
                } else {
                    if (!forceOverride) {
                        console.log(`Registry : ${existingRemote.refs.push}`)
                        console.log(`Local    : ${localRemote.refs.push}`)
                        forceOverride = confirm(`Do you want to overrite sserver remote : ${existingRemote.name} ?`);
                    }
                    
                    if (forceOverride) {
                        registryRemotes = registryRemotes.filter(r => r.name !== localRemote.name);
                        registryRemotes.push(localRemote);
                        updated = true;
                    } else {
                        ignoredConflict = true;
                        console.log(`Skipping update remote ${existingRemote.name}`);
                    }
                }
            } else {
                registryRemotes.push(localRemote);
                updated = true;
            }
        })

        if (updated) {
            try {
                if (await dataLayer.setRemotesByOrigin(remoteIdentifier, registryRemotes)) {
                    console.log('Push to registry Complete');
                } else {
                    console.error('Unable to push remotes to registry');
                }
            } catch (error) {
                console.error('Unable to push remotes to registry');
            }
        } else {
            if (!ignoredConflict) {
                if (remotesSynced(result, registryRemotes, remote)) {
                    console.log('Everything is up-to-date');
                } else {
                     // TODO: Some remote remained unsynced
                }
            }
        }
    }).catch((err) => {
        console.error(err.message);
    });
}