import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const redirectUri = process.env.CALLBACK_URL;

const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

// Function to exchange the authorization code for an access token
export const getAccessToken = async (authCode) => {
  const { tokens } = await oauth2Client.getToken(authCode);
  oauth2Client.setCredentials(tokens); // Set the credentials on the OAuth2 client
  return tokens;
};

// Function to fetch user information using the access token
export const getUserInfo = async () => {
  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: "v2",
  });

  const { data } = await oauth2.userinfo.get();
  return data; // Return user data
};

export const getGoogleUserInfo = async (code) => {
  const tokens = await getAccessToken(code);
  return await getUserInfo();
};
