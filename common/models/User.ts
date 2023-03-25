import { AudioQuality, UserType } from "../types";
import { Base } from "./Base";

export interface UserAuth {
  id?: string;
  name?: string;
  email?: string;
  access_token?: string;
  type?: "google_oauth";
}

export interface UserSettings {
  audio_quality?: AudioQuality;
}

export interface User extends Base {
  email: string;
  type: UserType;
  settings: UserSettings;
  auth?: UserAuth;
}
