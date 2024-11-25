import passport from "passport";
import { Strategy } from "passport-google-oauth20";

passport.use(
  new Strategy(
    {
      clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      //   passReqToCallback: true,
    },
    function (accessToken, refreshToken, profile, done) {
      try {
        // Check if profile and email are available before using them
        if (!profile || !profile.emails || !profile.emails[0]) {
          return done(new Error("No email found in profile"), null);
        }

        const user = {
          google_id: profile.id,
          display_name: profile.displayName,
          email: profile.emails?.[0]?.value,
          first_name: profile.name?.givenName,
          last_name: profile.name?.familyName,
          image: profile.photos[0]?.value,
          access_token: accessToken,
        };

        return done(null, user);
      } catch (err) {
        console.log(err.message);
        //getting error here in done
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  return done(null, user);
});

passport.deserializeUser(async (user, done) => {
  try {
    done(null, user);
  } catch (err) {
    console.error("Error in deserializeUser:", err);
    done(err, null);
  }
});
