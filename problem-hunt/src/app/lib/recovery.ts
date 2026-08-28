export type RecoveryCallback = {
  code: string | null;
  flowId: string | null;
  hasPayload: boolean;
  error: string | null;
};

function getCallbackParams(location: Pick<Location, "search" | "hash">): URLSearchParams {
  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));

  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  return params;
}

export function getRecoveryCallback(location: Pick<Location, "search" | "hash">): RecoveryCallback {
  const params = getCallbackParams(location);
  const errorDescription = params.get("error_description");
  const errorCode = params.get("error_code");
  const error = params.get("error");
  const hasPayload = params.has("code") || params.has("access_token") || params.has("refresh_token");

  return {
    code: params.get("code"),
    flowId: params.get("sb_flow_id"),
    hasPayload,
    error: errorDescription || errorCode || error,
  };
}

export function isRecoveryCallback(location: Pick<Location, "search" | "hash">): boolean {
  const params = getCallbackParams(location);
  const hasCallbackData = params.has("code") || params.has("access_token") || params.has("refresh_token") || params.has("error") || params.has("error_code");
  // PKCE recovery redirects may contain only `code`; implicit-flow redirects
  // normally include `type=recovery` with the tokens in the hash.
  return hasCallbackData;
}
