import simpleGit from "simple-git";
import { type IDataLayer, type Origin } from "../data";
import { getRemoteIdentifier, remotesSynced } from "./utils";

export function pull(remote: string, dataLayer: IDataLayer, forceOverride = false) {
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

        let updated = false;

        remotes.forEach(async (registryRemote) => {
            if (registryRemote.name == remote) return; // Skip origin sync

            const existingRemote = result.find(r => r.name === registryRemote.name);

            if (existingRemote) {
                if (existingRemote.refs.push == registryRemote.refs.push && existingRemote.refs.fetch == registryRemote.refs.fetch) {
                    //console.log(`Remote ${remote.name} already exists and up-to-date. Skipping`);
                } else {
                    if (!forceOverride) {
                        console.log(`Registry : ${registryRemote.refs.push}`)
                        console.log(`Local    : ${existingRemote.refs.push}`)
                        forceOverride = confirm(`Do you want to override local remote : ${existingRemote.name} ?`);
                    }
                    
                    if (forceOverride) {
                        await git.removeRemote(existingRemote.name);
                        await git.addRemote(registryRemote.name, registryRemote.refs.push);
                        console.log(`Remote ${existingRemote.name} overridden and up-to-date with registry`);
                        updated = true;
                    } else {
                        console.log(`Skipping update remote ${existingRemote.name}`);
                    }
                }
            } else {
                await git.addRemote(registryRemote.name, registryRemote.refs.push);
                updated = true;
            }
        });

        if (!updated) {
            if (remotesSynced(result, remotes, remote)) {
                console.log('Everything is up-to-date');
            } else {
                // TODO: Some remote remained unsynced
            }
        }
    }).catch((err) => {
        console.error(err.message);
    });
}