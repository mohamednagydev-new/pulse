import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { issueTokens } from '../lib/session';

export const oauthRouter = Router();

interface ProviderConf {
  id?: string;
  secret?: string;
  auth: string;
  token: string;
  scope: string;
}

const providers: Record<string, ProviderConf> = {
  google: {
    id: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
  },
  facebook: {
    id: process.env.FACEBOOK_CLIENT_ID,
    secret: process.env.FACEBOOK_CLIENT_SECRET,
    auth: 'https://www.facebook.com/v18.0/dialog/oauth',
    token: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scope: 'email public_profile',
  },
};

// redirect_uri routes through the web origin (vite proxy in dev) so the refresh
// cookie is set on the same origin the SPA runs on.
function redirectUri(provider: string) {
  return `${env.WEB_ORIGIN}/api/auth/${provider}/callback`;
}

oauthRouter.get('/:provider', (req, res) => {
  const p = providers[req.params.provider];
  if (!p) return res.status(404).send('Unknown provider');
  if (!p.id || !p.secret) return res.redirect(`${env.WEB_ORIGIN}/login?oauth=unconfigured`);

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600_000, path: '/' });

  const url = new URL(p.auth);
  url.searchParams.set('client_id', p.id);
  url.searchParams.set('redirect_uri', redirectUri(req.params.provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', p.scope);
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

oauthRouter.get('/:provider/callback', async (req, res) => {
  const name = req.params.provider;
  const p = providers[name];
  const fail = () => res.redirect(`${env.WEB_ORIGIN}/login?oauth=error`);
  if (!p || !p.id || !p.secret) return fail();

  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code || !state || state !== req.cookies?.oauth_state) return fail();

  try {
    let profile: { id: string; email?: string; emailVerified?: boolean; firstName?: string; lastName?: string; avatar?: string };

    if (name === 'google') {
      const tokenRes = await fetch(p.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: p.id,
          client_secret: p.secret,
          redirect_uri: redirectUri(name),
          grant_type: 'authorization_code',
        }),
      });
      const tok: any = await tokenRes.json();
      const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const u: any = await uRes.json();
      profile = { id: u.id, email: u.email, emailVerified: u.verified_email === true, firstName: u.given_name, lastName: u.family_name, avatar: u.picture };
    } else {
      const tokenRes = await fetch(
        `${p.token}?client_id=${p.id}&client_secret=${p.secret}&redirect_uri=${encodeURIComponent(redirectUri(name))}&code=${code}`,
      );
      const tok: any = await tokenRes.json();
      const uRes = await fetch(
        `https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture&access_token=${tok.access_token}`,
      );
      const u: any = await uRes.json();
      // Facebook only returns an email once the account has confirmed it, so
      // presence is the verification signal.
      profile = { id: u.id, email: u.email, emailVerified: Boolean(u.email), firstName: u.first_name, lastName: u.last_name, avatar: u.picture?.data?.url };
    }

    if (!profile.id) return fail();
    const email = profile.email || `${name}_${profile.id}@fitit.local`;

    // Match the provider identity first — that link is always trusted.
    let user = await prisma.user.findFirst({ where: { provider: name, providerId: profile.id } });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        // Linking a provider into an existing password account by email alone is
        // an account-takeover path unless the provider vouches for the address.
        if (!profile.emailVerified) {
          return res.redirect(`${env.WEB_ORIGIN}/login?oauth=email_conflict`);
        }
        // Persist the link so future logins match on provider/providerId directly.
        user = byEmail.provider
          ? byEmail
          : await prisma.user.update({ where: { id: byEmail.id }, data: { provider: name, providerId: profile.id } });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            firstName: profile.firstName || 'Member',
            lastName: profile.lastName || '',
            provider: name,
            providerId: profile.id,
            avatarUrl: profile.avatar,
          },
        });
      }
    }

    await issueTokens(res, user);
    res.clearCookie('oauth_state', { path: '/' });
    res.redirect(`${env.WEB_ORIGIN}/?oauth=success`);
  } catch (e) {
    console.error('OAuth error', e);
    fail();
  }
});
