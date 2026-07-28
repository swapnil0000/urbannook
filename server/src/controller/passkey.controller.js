import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import User from "../model/user.model.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import {
  NotFoundError,
  AuthenticationError,
  ValidationError,
} from "../utils/errors.js";
import cookieOptions, { refreshCookieOptions } from "../config/config.js";
import { rpID, rpName, expectedOrigin } from "../config/webauthn.config.js";

/**
 * POST /api/v1/user/passkey/register/options   (auth required)
 * Step 1 of enrolling a passkey for the logged-in user.
 */
const passkeyRegisterOptions = asyncHandler(async (req, res) => {
  const user = await User.findOne({ userId: req.user.userId });
  if (!user) throw new NotFoundError("User not found");

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: isoUint8Array.fromUTF8String(user.userId),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    // Don't let the user enroll the same authenticator twice
    excludeCredentials: (user.passkeys || []).map((pk) => ({
      id: pk.credentialID,
      transports: pk.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Persist the challenge to verify against in step 2
  user.currentChallenge = options.challenge;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiRes(200, "Passkey registration options", options, true));
});

/**
 * POST /api/v1/user/passkey/register/verify   (auth required)
 * Step 2: verify the attestation and store the new credential.
 * Body = the object returned by @simplewebauthn/browser startRegistration().
 */
const passkeyRegisterVerify = asyncHandler(async (req, res) => {
  const user = await User.findOne({ userId: req.user.userId });
  if (!user) throw new NotFoundError("User not found");
  if (!user.currentChallenge) {
    throw new ValidationError("No pending passkey registration. Please retry.");
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: user.currentChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    throw new ValidationError(err?.message || "Passkey verification failed");
  }

  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    throw new ValidationError("Could not verify passkey");
  }

  const { credential } = registrationInfo; // { id, publicKey (Uint8Array), counter, transports }

  // Guard against duplicate enrollment
  const already = (user.passkeys || []).some((pk) => pk.credentialID === credential.id);
  if (!already) {
    user.passkeys.push({
      credentialID: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter || 0,
      transports: credential.transports || req.body?.response?.transports || [],
      deviceName: req.body?.deviceName || "Passkey",
      createdAt: new Date(),
    });
  }

  user.currentChallenge = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiRes(200, "Passkey registered successfully", { verified: true }, true));
});

/**
 * POST /api/v1/user/passkey/login/options   (public)
 * Step 1 of signing in with a passkey. Body: { email }.
 */
const passkeyLoginOptions = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ValidationError("Email is required");

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(user.passkeys || []).length) {
    throw new NotFoundError("No passkey found for this account");
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.passkeys.map((pk) => ({
      id: pk.credentialID,
      transports: pk.transports,
    })),
    userVerification: "preferred",
  });

  user.currentChallenge = options.challenge;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiRes(200, "Passkey login options", options, true));
});

/**
 * POST /api/v1/user/passkey/login/verify   (public)
 * Step 2: verify the assertion and, on success, mint the SAME session as any
 * other login path (userAccessToken + userRefreshToken cookies).
 * Body: { email, assertion } where assertion = startAuthentication() result.
 */
const passkeyLoginVerify = asyncHandler(async (req, res) => {
  const { email, assertion } = req.body;
  if (!email || !assertion) {
    throw new ValidationError("Email and passkey assertion are required");
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) throw new NotFoundError("User not found");
  if (!user.currentChallenge) {
    throw new AuthenticationError("No pending passkey login. Please retry.");
  }

  const passkey = (user.passkeys || []).find((pk) => pk.credentialID === assertion.id);
  if (!passkey) throw new AuthenticationError("Unknown passkey for this account");

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: user.currentChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credentialID,
        publicKey: isoBase64URL.toBuffer(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });
  } catch (err) {
    throw new AuthenticationError(err?.message || "Passkey authentication failed");
  }

  const { verified, authenticationInfo } = verification;
  if (!verified) throw new AuthenticationError("Passkey authentication failed");

  // Advance the signature counter (replay protection) and clear the challenge
  passkey.counter = authenticationInfo.newCounter;
  user.currentChallenge = undefined;

  // Issue the session exactly like every other login path
  const userAccessToken = user.genAccessToken();
  const userRefreshToken = user.genRefreshToken();
  user.userRefreshToken = userRefreshToken;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .cookie("userAccessToken", userAccessToken, cookieOptions)
    .cookie("userRefreshToken", userRefreshToken, refreshCookieOptions)
    .json(
      new ApiRes(
        200,
        "Passkey login successful",
        {
          userId: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          userAccessToken,
        },
        true,
      ),
    );
});

/**
 * GET /api/v1/user/passkey/status   (auth required)
 * Lightweight check so the client can decide whether to show the
 * "enable a passkey" prompt after login.
 */
const passkeyStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({ userId: req.user.userId }).select("passkeys").lean();
  const hasPasskey = !!(user?.passkeys && user.passkeys.length);
  return res.status(200).json(new ApiRes(200, "Passkey status", { hasPasskey }, true));
});

export {
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  passkeyLoginOptions,
  passkeyLoginVerify,
  passkeyStatus,
};
