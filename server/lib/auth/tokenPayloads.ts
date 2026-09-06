import { z } from "zod";

// What we expect an access-token JWT to contain. Identity is flattened (not
// an embedded Prisma user object) and carries no privilege claim --
// admin_procedure reads `type` from the database at the point of use
// instead, so a demotion takes effect immediately rather than after up to
// ACCESS_TOKEN_TTL_SECONDS (ADR-0009 KTD16). `session_id` is the unrelated
// low-entropy *device* session used for WebSocket routing (see
// docs/glossary.md); `login_session_id` is the login session this token
// belongs to, checked against the deny list on every request.
//
// This lives in its own leaf module (zod only, no `@server/*` imports) so
// the Express `Request._user` type declaration can reference
// `AccessTokenPayload` without dragging `@server/init` -- and therefore
// express + passport -- into a load cycle that flips the `Request.user`
// declaration merge in @types/passport's favour.
export const access_token_payload_schema = z.object({
  user_id: z.number().int(),
  email: z.string(),
  session_id: z.string(),
  login_session_id: z.number().int(),
  typ: z.literal("access"),
});

export type AccessTokenPayload = z.infer<typeof access_token_payload_schema>;

// What a cast token -- minted per track for Chromecast playback -- must
// contain. The `typ` discriminator is what makes it structurally distinct
// from an access token, so the two can never be substituted for one another
// (ADR-0009 KTD7, R11). `login_session_id` binds the token to a revocable
// session, checked against the same deny list as the access-token path.
export const cast_token_payload_schema = z.object({
  for: z.string(),
  track_id: z.number().int(),
  album_art_filename: z.string().nullable(),
  login_session_id: z.number().int(),
  typ: z.literal("cast"),
});

export type CastTokenPayload = z.infer<typeof cast_token_payload_schema>;
