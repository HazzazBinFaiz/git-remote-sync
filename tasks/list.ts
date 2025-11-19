import simpleGit from "simple-git";
import { type IDataLayer, type Origin } from "../data";
import { getRemoteIdentifier, remotesSynced } from "./utils";

export async function list(dataLayer: IDataLayer, printRemoteNames: boolean = false, printRemoteUrls: boolean = false) {
    if (!dataLayer.isLoggedIn()) {
        console.error('User not logged in. Use login command to log in first');
        return;
    }

    let remotes: {[key: string]: Origin[]};

    console.log('Fetching remotes from registry...');

    try {
        remotes = await dataLayer.listRemotes();
    } catch(error) {
        console.error('Unable to fetch remotes from registry');
        return;
    }

    if (remotes == undefined || Object.keys(remotes).length === 0) {
        console.log('No remotes found in registry');
        return;
    }

    let i = 1;
    const digits = remotes ? Object.keys(remotes).length.toString().length : 1;

    console.log(`Total ${Object.keys(remotes).length} item(s) found in registry:\n`);

    for (const [remoteIdentifier, origins] of Object.entries(remotes)) {
        console.log(`${i.toString().padEnd(digits, " ")} : ${remoteIdentifier}`);
        if (printRemoteNames || printRemoteUrls) {
            let j = 1;
            const originDigits = origins.length.toString().length;
            for (const origin of origins) {
                let line = `  - ${j.toString().padEnd(originDigits, " ")} : `;
                if (printRemoteUrls) {
                    line += `${origin.refs.fetch} (${origin.name})`
                } else {
                    line += `${origin.name}`;
                }
                console.log(line);
                j++;
            }
        }
        i++;
    }
}