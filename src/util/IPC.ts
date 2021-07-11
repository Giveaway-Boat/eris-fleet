import {Cluster} from "../clusters/Cluster";
import {EventEmitter} from "events";
import {nanoid} from "nanoid";
import * as Admiral from "../sharding/Admiral";

export class IPC extends EventEmitter {
	public constructor() {
		super();
	}

	/**
	 * Broadcast an event to all clusters and services
	 * @param op Name of the event
	 * @param message Message to send
	*/
	public broadcast(op: string, message?: unknown): void {
		if (!message) message = null;
		if (process.send) process.send({op: "broadcast", event: {op, msg: message}});
	}

	/**
	 * Broadcast a code to be evaluated in all clusters
	 * @param code Code to eval in all clusters
	 * @param workerID Worker ID
	 */
	public broadcastEval<T = string>(code: string | ((cluster: Cluster) => T), workerID: number): Promise<T extends string ? any[] : T[]> {
		const UUID = nanoid(32);
		code = typeof code === 'string' ? code : `(${code})(this)`;

		if (process.send) process.send({ op: "broadcastEval", UUID, workerID, code });

		return new Promise((resolve, reject) => {
			const callback = (r: any) => {
				this.removeListener(UUID, callback);

				if (r.success === true) resolve(r.value);
				else reject(r.value);
			};

			this.on(UUID, callback);
		});
	}

	/**
	 * Broadcast to the master process
	 * @param op Name of the event
	 * @param message Message to send
	*/
	public admiralBroadcast(op: string, message?: unknown): void {
		if (!message) message = null;
		if (process.send) process.send({op: "admiralBroadcast", event: {op, msg: message}});
	}

	/**
	 * Send a message to a specific cluster
	 * @param cluster ID of the cluster
	 * @param op Name of the event
	 * @param message Message to send
	*/
	public sendTo(cluster: number, op: string, message?: unknown): void {
		if (!message) message = null;
		if (process.send) process.send({op: "sendTo", cluster: cluster, event: {msg: message, op}});
	}

	/**
	 * Fetch a user from the Eris client on any cluster
	 * @param id User ID
	 * @returns The Eris user object converted to JSON
	*/
	public async fetchUser(id: string): Promise<any> {
		if (process.send) process.send({op: "fetchUser", id});

		return new Promise((resolve, reject) => {
			const callback = (r: unknown) => {
				this.removeListener(id, callback);
				resolve(r);
			};

			this.on(id, callback);
		});
	}

	/**
	 * Fetch a guild from the Eris client on any cluster
	 * @param id Guild ID
	 * @returns The Eris guild object converted to JSON
	*/
	public async fetchGuild(id: string): Promise<any> {
		if (process.send) process.send({op: "fetchGuild", id});

		return new Promise((resolve, reject) => {
			const callback = (r: unknown) => {
				this.removeListener(id, callback);
				resolve(r);
			};

			this.on(id, callback);
		});
	}

	/**
	 * Fetch a Channel from the Eris client on any cluster
	 * @param id Channel ID
	 * @returns The Eris channel object converted to JSON
	*/
	public async fetchChannel(id: string): Promise<any> {
		if (process.send) process.send({op: "fetchChannel", id});

		return new Promise((resolve, reject) => {
			const callback = (r: unknown) => {
				this.removeListener(id, callback);
				resolve(r);
			};

			this.on(id, callback);
		});
	}

	/**
	 * Fetch a user from the Eris client on any cluster
	 * @param guildID Guild ID
	 * @param memberID the member's user ID
	 * @returns The Eris member object converted to JSON
	*/
	public async fetchMember(guildID: string, memberID: string): Promise<any> {
		const UUID = JSON.stringify({guildID, memberID});
		if (process.send) process.send({op: "fetchMember", id: UUID});

		return new Promise((resolve, reject) => {
			const callback = (r: any) => {
				if (r) r.id = memberID;
				this.removeListener(UUID, callback);
				resolve(r);
			};

			this.on(UUID, callback);
		});
	}

	/**
	 * Execute a service command
	 * @param service Name of the service
	 * @param message Whatever message you want to send with the command
	 * @param receptive Whether you expect something to be returned to you from the command
	*/
	public async command(service: string, message?: unknown, receptive?: boolean): Promise<unknown> {
		if (!message) message = null;
		if (!receptive) receptive = false;
		const UUID = JSON.stringify({timestamp: Date.now(), message, service, receptive});
		if (process.send) process.send({op: "serviceCommand", 
			command: {
				service,
				msg: message,
				UUID,
				receptive
			}
		});

		if (receptive) {
			return new Promise((resolve, reject) => {
				const callback = (r: any) => {
					this.removeListener(UUID, callback);

					if (r.value === undefined || r.value === null || r.value.constructor !== ({}).constructor) {
						resolve(r.value);
					} else {
						if (r.value.err) {
							reject(r.value.err);
						} else {
							resolve(r.value);
						}
					}
				};
	
				this.on(UUID, callback);
			});
		}
	}

	/**
	 * @returns The latest stats
	*/
	public async getStats(): Promise<Admiral.Stats> {
		if (process.send) process.send({op: "getStats"});

		return new Promise((resolve, reject) => {
			const callback = (r: Admiral.Stats) => {
				this.removeListener("statsReturn", callback);
				resolve(r);
			};

			if (process.send) this.on("statsReturn", callback);
		});
	}

	/**
	 * Restarts a specific cluster
	 * @param clusterID ID of the cluster to restart
	 * @param hard Whether to ignore the soft shutdown function
	*/
	public restartCluster(clusterID: number, hard?: boolean): void {
		if (process.send) process.send({op: "restartCluster", clusterID, hard: hard ? true : false});
	}

	/**
	 * Restarts all clusters
	 * @param hard Whether to ignore the soft shutdown function
	*/
	public restartAllClusters(hard?: boolean): void {
		if (process.send) process.send({op: "restartAllClusters", hard: hard ? true : false});
	}

	/**
	 * Restarts a specific service
	 * @param serviceName Name of the service
	 * @param hard Whether to ignore the soft shutdown function
	*/
	public restartService(serviceName: string, hard?: boolean): void {
		if (process.send) process.send({op: "restartService", serviceName, hard: hard ? true : false});
	}

	/**
	 * Restarts all services
	 * @param hard Whether to ignore the soft shutdown function
	*/
	public restartAllServices(hard?: boolean): void {
		if (process.send) process.send({op: "restartAllServices", hard: hard ? true : false});
	}

	/**
	 * Shuts down a cluster
	 * @param clusterID The ID of the cluster to shutdown
	 * @param hard Whether to ignore the soft shutdown function
	*/
	public shutdownCluster(clusterID: number, hard?: boolean): void {
		if (process.send) process.send({op: "shutdownCluster", clusterID, hard: hard ? true : false});
	}

	/**
	 * Shuts down a cluster
	 * @param serviceName The name of the service
	 * @param hard Whether to ignore the soft shutdown function
	*/
	public shutdownService(serviceName: string, hard?: boolean): void {
		if (process.send) process.send({op: "shutdownService", serviceName, hard: hard ? true : false});
	}

	/**
	 * Shuts down everything and exists the master process
	 * @param hard Whether to ignore the soft shutdown function
	*/
	public totalShutdown(hard?: boolean): void {
		if (process.send) process.send({op: "totalShutdown", hard: hard ? true : false});
	}

	/**
	 * Reshards all clusters
	*/
	public reshard(): void {
		if (process.send) process.send({op: "reshard"});
	}

    /**
     * Make an API request
     * @arg {String} method Uppercase HTTP method
     * @arg {String} url URL of the endpoint
     * @arg {Boolean} [auth] Whether to add the Authorization header and token or not
     * @arg {Object} [body] Request payload
     * @arg {Object} [file] File object
     * @arg {Buffer} file.file A buffer containing file data
     * @arg {String} file.name What to name the file
	 * @arg {String} _route What route to send request to
	 * @arg {Boolean} short Idk what this does
	 * @arg {Number} workerID Worker ID
     * @returns {Promise<Object>} Resolves with the returned JSON data
    */
	public async requestAPI(method: string, url: string, auth: boolean, body: any, file: any, _route: string, short: boolean, workerID: number): Promise<unknown> {
		const UUID = nanoid(32);
		if (process.send) process.send({ op: "apiRequest", UUID, workerID, data: { method, url, auth, body, file, _route, short } });

		return new Promise((resolve, reject) => {
			const callback = (r: any) => {
				this.removeListener(UUID, callback);

				if (r.success === true) resolve(r.response);
				else reject (r.response);
			};
	
			this.on(UUID, callback);
	    });
	}

	
}