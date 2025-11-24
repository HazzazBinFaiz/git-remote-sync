import simpleGit from "simple-git";
import { type IDataLayer, type Origin } from "../data";
import { getRemoteIdentifier, remotesSynced } from "./utils";
import { keyBy } from "lodash";

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

        const localRemotesWithoutOriginKeyed = keyBy(localRemotesWithoutOrigin, 'name');
        const registryRemotesWithoutOriginKeyed =  keyBy(registryRemotesWithoutOrigin, 'name');

        const allKeys = Array.from(new Set([
            ...Object.keys(localRemotesWithoutOriginKeyed),
            ...Object.keys(registryRemotesWithoutOriginKeyed)
        ])).sort();

        if (allKeys.length === 0) {
            console.log("No remotes to show status for.");
            return;
        }


        const maxKeyLength = allKeys.reduce((max, key) => Math.max(max, key.length), 0);
        
        console.log("Status:");
        let shouldPull = false;
        let shouldPush = false; 

        for (const key of allKeys) {
            const local = localRemotesWithoutOriginKeyed[key];
            const registry = registryRemotesWithoutOriginKeyed[key];

            let str = key.padEnd(maxKeyLength + 4, '-');

            if (local && registry) {
                if (local.refs.push === registry.refs.push &&
                    local.refs.fetch === registry.refs.fetch) {
                    str += ' Synced';
                } else {
                    str += ` Diverged. Local : ${local.refs.fetch} <> Registry: ${registry.refs.fetch}`;
                }
                shouldPull = true;
                shouldPush = true;
            } else if (!local && registry) {
                str += ' Registry Only'
                shouldPull = true;
            } else if (local && !registry) {
                str += ' Local Only';
                shouldPush = true;
            }
            console.log(str);
             
        }
        console.log("");

        if (shouldPull && !shouldPush) {
            console.log('Run "pull" command to sync local remotes with registry');
        } else if (!shouldPull && shouldPush) {
            console.log('Run "push" command to sync registry remotes with local');
        } else if (shouldPull && shouldPush) {
            console.log('Run "pull" or "push" commands to sync local and registry remotes');
        }
    }).catch((err) => {
        console.error(err.message);
    });
}