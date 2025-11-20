import { type IDataLayer, type Origin } from "../data";
import lunr from "lunr";

export async function search(dataLayer: IDataLayer, query: string, searchUrlToo: boolean = true, closeAfterAnswer: boolean = false) {
    if (!dataLayer.isLoggedIn()) {
        console.error('User not logged in. Use login command to log in first');
        return;
    }

    let remotes: { [key: string]: Origin[] };

    console.log('Fetching remotes from registry...');

    try {
        remotes = await dataLayer.listRemotes();
    } catch (error) {
        console.error('Unable to fetch remotes from registry');
        return;
    }

    if (remotes == undefined || Object.keys(remotes).length === 0) {
        console.log('No remotes found in registry');
        return;
    }

    console.log(`Searching for "${query}" in registry...`);

    const documents = Object.entries(remotes).map(([identifier, origins]) => {
        return origins.map(origin => ({ identifier, remote: origin.name, url: origin.refs.fetch }));
    }).flat();

    let idx = lunr(function () {
        this.ref('identifier')
        this.field('identifier')
        this.field('remote')
        if (searchUrlToo) {
            this.field('url')
        }

        documents.forEach(function (doc) {
            //@ts-ignore
            this.add(doc)
        }, this)
    });

    searchFromIndex(remotes, idx, query);

    if (closeAfterAnswer) {
        return;
    } else {
        while (true) {
            let newQuery = prompt('Enter new search query (leave empty to exit):');
            if (newQuery) {
                searchFromIndex(remotes, idx, newQuery);
            } else {
                break;
            }
        }
    }
}

function searchFromIndex(remotes: { [x: string]: Origin[]; }, index: lunr.Index, query: any) {
    const results = index.search(`*${query}*`);

    if (results.length === 0) {
        console.log('No matching remotes found in registry');
        return;
    }

    console.log(`Found ${results.length} matching remotes:`);


    let i = 1;
    const digits = results.length.toString().length;
    for (const result of results) {
        const origins = remotes[result.ref] ?? null;
        if (origins) {
            console.log(`${i.toString().padEnd(digits, " ")} : ${result.ref}`);
            const originDigits = origins.length.toString().length;
            let j = 1;
            for (const origin of origins) {
                let line = `  - ${j.toString().padEnd(originDigits, " ")} : `;
                line += `${origin.refs.fetch} (${origin.name})`
                console.log(line);
                j++;
            }
            i++;
        }
    }
}
