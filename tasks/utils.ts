import inquirer from "inquirer";
import type { RemoteWithRefs } from "simple-git";
import type { Origin } from "../data";

export default async function confirm(message : string) : Promise<boolean>
{
    try {
        const answers = await inquirer.prompt([
            { type: 'confirm', message: message, name: 'confirmation' }
        ]);

        return answers.confirmation;
    } catch (error : any) {
        if (error.isTtyError) {
            console.log('Prompt is not available in this environment')
        } else {
            console.log('Unable to ask about reconciliation')
        }
    }
    return false;
}

export function getRemoteIdentifier(remotes: RemoteWithRefs[], remote: string) : string|null {
    const remoteNames = remotes.map(r => r.name);
    if (!remoteNames.includes(remote)) {
        console.error(`Remote '${remote}' not found. Available remotes: ${remoteNames.join(", ")}`);
        return null;
    }

    const originUrl = remotes.find(r => r.name === remote)?.refs.push;

    if (!originUrl) {
        console.error(`No push URL found for remote '${remote}'.`);
        return null;
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
        return null;
    }

    if (match[1] === undefined) {
        console.error(`Could not extract repository identifier from URL: ${originUrl}`);
        return null;
    }

    return match[1].toLowerCase() ;
}


export function remotesSynced(localRemotes : Origin[], registryRemotes : Origin[], remoteName : string) : boolean {
    const localRemoteNames = localRemotes.filter(r => r.name != remoteName).map(r => r.name).sort();
    const registryRemoteNames = registryRemotes.filter(r => r.name != remoteName).map(r => r.name).sort();

    let synced = true;
    registryRemoteNames.forEach(registryRemoteName => {
        if (!localRemoteNames.includes(registryRemoteName)) {
            synced = false;
        }
    });

    localRemoteNames.forEach(localRemoteName => {
        if (!registryRemoteNames.includes(localRemoteName)) {
            synced = false;
        }
    });

    const registryRemoteExtraNames = registryRemoteNames.filter(r => !localRemoteNames.includes(r));
    const localRemoteExtraNames = localRemoteNames.filter(r => !registryRemoteNames.includes(r));

    if (!synced) {
        if (registryRemoteExtraNames.length > 0) {
            console.log(`Registry has extra : ${registryRemoteExtraNames.join(',')}`);
        }
        if (localRemoteExtraNames.length > 0) {
            console.log(`Local has extra    : ${localRemoteExtraNames.join(',')}`);
        }
    }

    return synced;
}