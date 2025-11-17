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


        const localRemotesWithoutOrigin = result.filter(r => r.name != remote).sort((a, b) => a.name.localeCompare(b.name));
        const registryRemotesWithoutOrigin = remotes.filter(r => r.name != remote).sort((a, b) => a.name.localeCompare(b.name));

        const localRemoteNames = localRemotesWithoutOrigin.map(r => r.name).sort();
        const registryRemoteNames = registryRemotesWithoutOrigin.map(r => r.name).sort();

        if (localRemoteNames.length === 0 && registryRemoteNames.length === 0) {
            console.log('No remotes found locally or in registry to sync');
            return;
        }

        const localHasExtra = localRemoteNames.filter(name => !registryRemoteNames.includes(name));
        const registryHasExtra = registryRemoteNames.filter(name => !localRemoteNames.includes(name));

        const localHasUnsyncedRemotes = localRemotesWithoutOrigin.filter(local => {
            const registry = registryRemotesWithoutOrigin.find(r => r.name === local.name);
            return registry && (registry.refs.push !== local.refs.push || registry.refs.fetch !== local.refs.fetch);
        });
        const localHasUnsynced = localHasUnsyncedRemotes.map(r => r.name);

        const remoteHasUnsyncedRemotes = registryRemotesWithoutOrigin.filter(registry => {
            const local = localRemotesWithoutOrigin.find(r => r.name === registry.name);
            return local && (registry.refs.push !== local.refs.push || registry.refs.fetch !== local.refs.fetch);
        });
        const remoteHasUnsynced = remoteHasUnsyncedRemotes.map(r => r.name);
        
        if (
            remotesSynced(result, remotes, remote, false)
            && localHasExtra.length === 0
            && registryHasExtra.length === 0
            && localHasUnsynced.length === 0
            && remoteHasUnsynced.length === 0
        ) {
            console.log('All remotes are synced with registry');
            console.log(`Registry has : ${registryRemoteNames.join(',')}`);
            console.log(`Local has    : ${localRemoteNames.join(',')}`);
        } else {
            let shouldPull = false;
            let shouldPush = false;

            if (localHasExtra.length > 0) {
                console.log(`Local has extra remotes not in registry : ${localHasExtra.join(',')}`);
                shouldPush = true;
                localHasExtra.forEach(name => {
                    console.log(`    ${name} : ${localRemotesWithoutOrigin.find(r => r.name === name)?.refs.push}`);
                });
            }
            if (registryHasExtra.length > 0) {
                console.log(`Registry has extra remotes not locally : ${registryHasExtra.join(',')}`);
                shouldPull = true;
                registryHasExtra.forEach(name => {
                    console.log(`    ${name} : ${registryRemotesWithoutOrigin.find(r => r.name === name)?.refs.push}`);
                });
            }

            const commonUnsynced = localHasUnsynced.filter(name => remoteHasUnsynced.includes(name));
            if (commonUnsynced.length > 0) {
                console.log(`Remotes with diverged URL : ${commonUnsynced.join(',')}`);
                shouldPull = true;
                shouldPush = true;
                commonUnsynced.forEach(name => {
                    const local = localRemotesWithoutOrigin.find(r => r.name === name);
                    const remote = registryRemotesWithoutOrigin.find(r => r.name === name);
                    console.log(`    ${name} :`);
                    console.log(`        Local   : ${local?.refs.push}`);
                    console.log(`        Registry: ${remote?.refs.push}`);
                });
            }

            const localHasUnsyncedOnly = localHasUnsynced.filter(name => !remoteHasUnsynced.includes(name));

            if (localHasUnsyncedOnly.length > 0) {
                console.log(`Local has unsynced remotes : ${localHasUnsynced.join(',')}`);
            }

            const remoteHasUnsyncedOnly = remoteHasUnsynced.filter(name => !localHasUnsynced.includes(name));
            if (remoteHasUnsyncedOnly.length > 0) {
                console.log(`Registry has unsynced remotes : ${remoteHasUnsynced.join(',')}`);
            }
        }
        
    }).catch((err) => {
        console.error(err.message);
    });
}