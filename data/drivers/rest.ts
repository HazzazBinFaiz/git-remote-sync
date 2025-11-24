// ...existing code...
import { createKVStore, type IDataLayer, type KVStore, type Origin } from "..";

let baseUrl = "http://127.0.0.1:3000";
const authTokenKey = 'rest_auth_token';

export class RESTDataLayer implements IDataLayer {
    identifier = "rest";
    kvStore: KVStore;
    token: string | null = null;

    constructor(providedBaseUrl : string|undefined) {
        if (providedBaseUrl) {
            baseUrl = providedBaseUrl.toString().replace(/\/+$/, '');
        }
        this.kvStore = createKVStore();
    }

    async init(): Promise<boolean> {
        this.token = await this.kvStore.get(authTokenKey);
        return true;
    }

    private getToken(): string | null {
        return this.token;
    }

    private async setToken(token: string | null) {
        this.token = token;
        await this.kvStore.set(authTokenKey, token);
    }

    private async request<T = any>(path: string, opts: { method?: string; body?: any; auth?: boolean } = {}): Promise<{ ok: boolean; status: number; data?: T; }> {
        const url = `${baseUrl}${path}`;
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        let body: string | undefined;
        if (opts.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(opts.body);
        }
        if (opts.auth) {
            const token = this.getToken();
            if (!token) return { ok: false, status: 401 };
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const res = await fetch(url, { method: opts.method ?? 'GET', headers, body });
            let parsed: any;
            try {
                parsed = await res.json();
            } catch {
                parsed = undefined;
            }
            return { ok: res.ok, status: res.status, data: parsed };
        } catch {
            return { ok: false, status: 0 };
        }
    }

    

    async register(email: string, password: string): Promise<boolean> {
        const r = await this.request('/register', { method: 'POST', body: { email, password } });
        if (!r.ok || !r.data) return false;
        // server returns { id, email, token }
        // @ts-ignore
        const token = (r.data as any).token;
        if (typeof token === 'string') {
            this.setToken(token);
            return true;
        }
        return false;
    }

    async login(email: string, password: string): Promise<boolean> {
        const r = await this.request('/login', { method: 'POST', body: { email, password } });
        if (!r.ok || !r.data) return false;
        // @ts-ignore
        const token = (r.data as any).token;
        if (typeof token === 'string') {
            this.setToken(token);
            return true;
        }
        return false;
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    async logout(): Promise<boolean> {
        this.setToken(null);
        return true;
    }

    async getRemoteByOrigin(remoteIdentifier: string): Promise<Origin[]> {
        const path = `/repository?identifier=${encodeURIComponent(remoteIdentifier)}`;
        const r = await this.request(path, { auth: true });
        if (!r.ok || !r.data) return [];
        // Expect repository object with remotes field (array or JSON string)
        // @ts-ignore
        let remotes = (r.data as any).remotes ?? [];
        if (typeof remotes === 'string') {
            try { remotes = JSON.parse(remotes); } catch { remotes = []; }
        }
        return Array.isArray(remotes) ? remotes as Origin[] : [];
    }

    async setRemotesByOrigin(remoteIdentifier: string, origins: Origin[]): Promise<boolean> {
        const r = await this.request('/repository', { method: 'POST', auth: true, body: { identifier: remoteIdentifier, remotes: origins } });
        return r.ok;
    }

    async listRemotes(): Promise<{ [key: string]: Origin[]; }> {
        const r = await this.request('/repositories', { auth: true });
        if (!r.ok || !r.data) return {};
        // Expect an array of repositories
        const data = r.data as any;
        if (!Array.isArray(data)) return {};
        const out: { [key: string]: Origin[] } = {};
        for (const repo of data) {
            const id = repo.identifier ?? repo.id ?? '';
            let remotes = repo.remotes ?? [];
            if (typeof remotes === 'string') {
                try { remotes = JSON.parse(remotes); } catch { remotes = []; }
            }
            if (id) out[id] = Array.isArray(remotes) ? remotes as Origin[] : [];
        }
        return out;
    }

    async deleteRemoteByOrigin(remoteIdentifier: string): Promise<boolean> {
        const r = await this.request('/repository', { method: 'DELETE', auth: true, body: { identifier: remoteIdentifier } });
        return r.ok;
    }
}
