import type { Species } from "@mimi/types";

export type PartId =
  | "tiger"
  | "bunny"
  | "otter"
  | "dog"
  | "giraffe-horns"
  | "hoodie"
  | "bowtie"
  | "scarf"
  | "lab-coat"
  | "laptop"
  | "envelope"
  | "carrot-pen"
  | "notepad"
  | "tiger-tail"
  | "dog-tail"
  | "otter-tail";

export type AnimationId =
  | "idle"
  | "walk"
  | "sit"
  | "type"
  | "wave"
  | "think"
  | "celebrate"
  | "confused"
  | "sleeping"
  | "pointing";

export interface AgentAvatarConfig {
  base: "mimi_base_v1";
  species: Species;
  body_tint: string;
  eye_color: string;
  ears: PartId | null;
  outfit: PartId | null;
  accessory: PartId | null;
  tail: PartId | null;
  motion_style: "shy" | "calm" | "hype" | "sleepy" | "sharp";
  default_animation: AnimationId;
}

export const V1_AGENTS: Record<Species, AgentAvatarConfig> = {
  tiger: {
    base: "mimi_base_v1",
    species: "tiger",
    body_tint: "#FFA040",
    eye_color: "#1F1916",
    ears: "tiger",
    outfit: "hoodie",
    accessory: "laptop",
    tail: "tiger-tail",
    motion_style: "sharp",
    default_animation: "type",
  },
  otter: {
    base: "mimi_base_v1",
    species: "otter",
    body_tint: "#A4C8E0",
    eye_color: "#1F1916",
    ears: "otter",
    outfit: "scarf",
    accessory: "envelope",
    tail: "otter-tail",
    motion_style: "calm",
    default_animation: "wave",
  },
  bunny: {
    base: "mimi_base_v1",
    species: "bunny",
    body_tint: "#F5E6D3",
    eye_color: "#1F1916",
    ears: "bunny",
    outfit: "scarf",
    accessory: "carrot-pen",
    tail: null,
    motion_style: "hype",
    default_animation: "idle",
  },
  giraffe: {
    base: "mimi_base_v1",
    species: "giraffe",
    body_tint: "#E8C77A",
    eye_color: "#1F1916",
    ears: "giraffe-horns",
    outfit: "lab-coat",
    accessory: "notepad",
    tail: null,
    motion_style: "calm",
    default_animation: "think",
  },
  dog: {
    base: "mimi_base_v1",
    species: "dog",
    body_tint: "#E5C896",
    eye_color: "#1F1916",
    ears: "dog",
    outfit: "bowtie",
    accessory: null,
    tail: "dog-tail",
    motion_style: "calm",
    default_animation: "idle",
  },
};
