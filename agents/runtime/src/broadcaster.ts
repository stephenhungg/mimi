// livekit broadcaster — sends agent state over the room data channel.
// uses RoomServiceClient.sendData which broadcasts server-side without
// spinning up a real participant. one helper per outbound message kind.

import { AccessToken, DataPacket_Kind, RoomServiceClient } from "livekit-server-sdk";

import {
  ENV,
  SPECIES_DESK,
  type AgentState,
  type Broadcast,
  type Mood,
  type Position,
  type Species,
} from "@mimi/types";

export interface BroadcasterOptions {
  url: string;
  apiKey: string;
  apiSecret: string;
  room: string;
  identity: string;
  species: Species;
  name: string;
}

export class LiveKitBroadcaster {
  private readonly room: string;
  private readonly identity: string;
  private readonly species: Species;
  private readonly name: string;
  private readonly roomService: RoomServiceClient;
  private readonly url: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(opts: BroadcasterOptions) {
    this.url = opts.url;
    this.apiKey = opts.apiKey;
    this.apiSecret = opts.apiSecret;
    this.room = opts.room;
    this.identity = opts.identity;
    this.species = opts.species;
    this.name = opts.name;
    // RoomServiceClient takes a host (the http(s) form of the livekit url).
    const host = opts.url.replace(/^ws/, "http");
    this.roomService = new RoomServiceClient(host, opts.apiKey, opts.apiSecret);
  }

  static fromEnv(env: Record<string, string | undefined>, opts: {
    identity: string;
    species: Species;
    name: string;
  }): LiveKitBroadcaster {
    const url = required(env, ENV.LIVEKIT_URL);
    const apiKey = required(env, ENV.LIVEKIT_API_KEY);
    const apiSecret = required(env, ENV.LIVEKIT_API_SECRET);
    const room = required(env, ENV.LIVEKIT_ROOM);
    return new LiveKitBroadcaster({
      url, apiKey, apiSecret, room,
      identity: opts.identity, species: opts.species, name: opts.name,
    });
  }

  // mints a participant token. agents do not actually join — the broadcaster
  // publishes via server api. token is generated here in case downstream
  // code wants to surface it (e.g. for debug).
  async mintToken(): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: this.identity,
      name: this.name,
    });
    at.addGrant({ roomJoin: true, room: this.room, canPublishData: true });
    return at.toJwt();
  }

  // announce presence + initial pose. call once on startup.
  async start(): Promise<void> {
    await this.mintToken(); // just to validate creds early
    const home = SPECIES_DESK[this.species];
    await this.broadcast({
      type: "presence",
      identity: this.identity,
      kind: "agent",
      species: this.species,
      name: this.name,
      pos: { x: home[0], z: home[1] },
    });
  }

  async broadcast(msg: Broadcast): Promise<void> {
    const data = new TextEncoder().encode(JSON.stringify(msg));
    await this.roomService.sendData(this.room, data, DataPacket_Kind.RELIABLE, {});
  }

  async broadcastState(state: AgentState, pos?: Position, mood?: Mood): Promise<void> {
    const msg: Broadcast = {
      type: "agent_state",
      identity: this.identity,
      species: this.species,
      state,
      ...(pos ? { pos } : {}),
      ...(mood ? { mood } : {}),
    };
    await this.broadcast(msg);
  }

  async broadcastSpeak(text: string): Promise<void> {
    await this.broadcast({
      type: "agent_speak",
      identity: this.identity,
      species: this.species,
      text,
      animalese: true,
    });
  }

  // there is no socket to close — this is server-side rpc. provided for
  // symmetry with future participant-mode implementations.
  async disconnect(): Promise<void> {
    return;
  }
}

function required(env: Record<string, string | undefined>, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`agent-runtime/broadcaster: missing env ${key}`);
  return v;
}
