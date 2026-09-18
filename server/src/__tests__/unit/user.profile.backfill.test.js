/**
 * Checkout backfill: a WhatsApp-login account starts with a placeholder email
 * and a generated name. Checkout is the first time the customer tells us who
 * they really are, and those details have to land on the account.
 */

import { v7 as uuid7 } from "uuid";
import User from "../../model/user.model.js";
import { backfillUserProfileFromCheckout } from "../../services/user.profile.service.js";
import {
  isPlaceholderEmail,
  buildPlaceholderEmail,
} from "../../utils/placeholderEmail.js";

/** A fresh WhatsApp-login account, exactly as the auth service creates one */
const createWhatsAppUser = (mobileNumber = 9876543210) =>
  User.create({
    userId: uuid7(),
    name: `User ${String(mobileNumber).slice(-4)}`,
    email: buildPlaceholderEmail(mobileNumber),
    password: null,
    mobileNumber,
    isVerified: true,
    role: "USER",
  });

describe("isPlaceholderEmail", () => {
  it("recognises generated addresses", () => {
    expect(isPlaceholderEmail("9876543210@wa.urbannook.in")).toBe(true);
    expect(isPlaceholderEmail("9876543210@WA.URBANNOOK.IN")).toBe(true);
  });

  it("leaves real addresses alone", () => {
    expect(isPlaceholderEmail("swapnil@gmail.com")).toBe(false);
    expect(isPlaceholderEmail("someone@urbannook.in")).toBe(false);
    expect(isPlaceholderEmail(null)).toBe(false);
    expect(isPlaceholderEmail(undefined)).toBe(false);
  });
});

describe("backfillUserProfileFromCheckout", () => {
  it("replaces the placeholder email and name with what checkout collected", async () => {
    const user = await createWhatsAppUser();

    const res = await backfillUserProfileFromCheckout({
      userId: user.userId,
      email: "Swapnil@Gmail.com ",
      name: "Swapnil Srivastav",
      mobile: "9876543210",
    });

    expect(res.updated).toEqual(expect.arrayContaining(["email", "name"]));

    const fresh = await User.findOne({ userId: user.userId }).lean();
    expect(fresh.email).toBe("swapnil@gmail.com"); // lowercased and trimmed
    expect(fresh.name).toBe("Swapnil Srivastav");
  });

  it("never overwrites a real email or name", async () => {
    const user = await User.create({
      userId: uuid7(),
      name: "Existing Person",
      email: "existing@example.com",
      mobileNumber: 9876543211,
      isVerified: true,
      role: "USER",
    });

    const res = await backfillUserProfileFromCheckout({
      userId: user.userId,
      email: "someoneelse@example.com",
      name: "Someone Else",
      mobile: "9999999999",
    });

    expect(res.updated).toEqual([]);

    const fresh = await User.findOne({ userId: user.userId }).lean();
    expect(fresh.email).toBe("existing@example.com");
    expect(fresh.name).toBe("Existing Person");
    expect(fresh.mobileNumber).toBe(9876543211);
  });

  it("leaves the placeholder alone when the email belongs to someone else", async () => {
    await User.create({
      userId: uuid7(),
      name: "Google Signup",
      email: "shared@example.com",
      isVerified: true,
      role: "USER",
    });

    const waUser = await createWhatsAppUser(9876500011);

    const res = await backfillUserProfileFromCheckout({
      userId: waUser.userId,
      email: "shared@example.com",
      name: "Shared Person",
      mobile: "9876500011",
    });

    // Merging two accounts is a separate job, so nothing is touched here
    expect(res.skipped).toBe("EMAIL_BELONGS_TO_ANOTHER_ACCOUNT");

    const fresh = await User.findOne({ userId: waUser.userId }).lean();
    expect(isPlaceholderEmail(fresh.email)).toBe(true);
    expect(await User.countDocuments({ email: "shared@example.com" })).toBe(1);
  });

  it("fills a missing mobile number", async () => {
    const user = await User.create({
      userId: uuid7(),
      name: "Google Signup",
      email: "nomobile@example.com",
      mobileNumber: null,
      isVerified: true,
      role: "USER",
    });

    await backfillUserProfileFromCheckout({
      userId: user.userId,
      email: "nomobile@example.com",
      name: "Google Signup",
      mobile: "+91 98765 43210",
    });

    const fresh = await User.findOne({ userId: user.userId }).lean();
    expect(fresh.mobileNumber).toBe(9876543210); // country code stripped
  });

  it("does not throw on junk input", async () => {
    await expect(
      backfillUserProfileFromCheckout({ userId: "does-not-exist" }),
    ).resolves.toEqual({ updated: [] });

    await expect(backfillUserProfileFromCheckout({})).resolves.toEqual({
      updated: [],
    });
  });
});
