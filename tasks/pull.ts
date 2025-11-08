import simpleGit from "simple-git";
import { getRemotesByOrigin } from "../data";

export function pull(remote: string) {
    const git = simpleGit();

    git.getRemotes(true).then(result => {
        if (result.length === 0) {
            console.error("No remotes found in this repository.");
            return;
        }

        const remoteNames = result.map(r => r.name);
        if (!remoteNames.includes(remote)) {
            console.error(`Remote '${remote}' not found. Available remotes: ${remoteNames.join(", ")}`);
            return;
        }

        const originUrl = result.find(r => r.name === remote)?.refs.push;

        // Extract org/repo from https or ssh URL of github, gitlab or whatever
        // https://github.com/Easy-IT-Solution-Ltd/bullsouq-v12-web.git
        // git@github.com:Easy-IT-Solution-Ltd/bullsouq-v12-web.git
        if (!originUrl) {
            console.error(`No push URL found for remote '${remote}'.`);
            return;
        }

        let match = null;

        if (originUrl.startsWith("http")) {
            match = originUrl.match(/https?:\/\/[^\/]+\/([^\/]+\/[^\/]+)\.git?/);
            if (!match) {
                console.error(`Could not parse repository from URL: ${originUrl}`);
            }
        } else if (originUrl.startsWith("git@")) {
            match = originUrl.match(/git@[^:]+:([^\/]+\/[^\/]+)\.git?/);
            if (!match) {
                console.error(`Could not parse repository from URL: ${originUrl}`);
            }
        }

        if (match === null || match.length < 2) {
            console.error(`Unsupported remote URL format: ${originUrl}`);
            return;
        }

        if (match[1] === undefined) {
            console.error(`Could not extract repository identifier from URL: ${originUrl}`);
            return;
        }

        console.info(`Fetching remotes for repository for : ${match[1]}`);

        let remotes = getRemotesByOrigin(match[1]);

        remotes.forEach(r => {
            git.addRemote(r.name, r.refs.push).then(() => {
                console.log(`Added remote '${r.name}' with URL: ${r.refs.push}`);
            }).catch(err => {
                if (err.message.includes('remote ' + r.name + ' already exists')) {
                    console.log(`Remote '${r.name}' already exists. Skipping addition.`);
                } else {
                    console.error(`Error adding remote '${r.name}': ${err.message}`);
                }
            });
        });
        

    }).catch((err) => {
        console.error(err.message);
    });
}