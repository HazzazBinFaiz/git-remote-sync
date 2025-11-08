export function getRemotesByOrigin(remoteidentifier: string) {
    return [
        {
            name: "origin",
            refs: {
                fetch: "git@github.com:Easy-IT-Solution-Ltd/crowd-world-web.git",
                push: "git@github.com:Easy-IT-Solution-Ltd/crowd-world-web.git",
            },
        },
        {
            name: "server",
            refs: {
                fetch: "ssh://onlineedubd@onlineedubd.com/home/onlineedubd/alauddinexpress.com",
                push: "ssh://onlineedubd@onlineedubd.com/home/onlineedubd/alauddinexpress.com",
            },
        }
    ];
}