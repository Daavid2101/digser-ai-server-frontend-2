import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const config = {
  authority:
    "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_ROsnMh54Q",
  client_id: "3olbm25fr7ok3prb6pbqc1ahqo",
  redirect_uri: "http://localhost:5173/dashboard",
  response_type: "code",
  scope: "email openid phone",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
};

export const userManager = new UserManager(config);
