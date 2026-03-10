import { validateUpdateUserAddress } from "../utils/ValidateRes.js";
import UserAddress from "../model/userAddress.model.js";
import { v7 as uuidv7 } from "uuid";
import Address from "../model/address.new.model.js";
import axios from "axios";
import env from "../config/envConfigSetup.js";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from "../utils/errors.js";

const getSearchSuggestionsService = async ({ userId, userSearchInput }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!userSearchInput) {
    throw new ValidationError("userSearchInput are required");
  }

  const inputSearchAutoCompleteRes = await axios.get(
    env.OLA_MAP_AUTO_COMPLETE_URL,
    {
      params: {
        input: userSearchInput,
        api_key: env.OLA_MAP_API_KEY,
      },
      headers: {
        "X-Request-Id": "urbannook-request",
        Accept: "application/json",
      },
    },
  );

  const predictions = inputSearchAutoCompleteRes?.data?.predictions || [];

  if (predictions.length === 0) {
    throw new NotFoundError("No addresses found for these coordinates");
  }

  return {
    statusCode: 200,
    message: "addresses found for these coordinates",
    data: predictions,
    success: true,
  };
};

const getAddressSuggestionsService = async ({ userId, lat, long }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!lat || !long) {
    throw new ValidationError("Coordinates are required");
  }

  const mapReverseGeoLocationApiRes = await axios.get(
    env.OLA_MAP_ADDRESS_SUGGESTION_URL,
    {
      params: {
        latlng: `${lat},${long}`,
        api_key: env.OLA_MAP_API_KEY,
      },
      headers: {
        "X-Request-Id": "urbannook-request",
        Accept: "application/json",
      },
    },
  );

  const results = mapReverseGeoLocationApiRes?.data?.results || [];

  if (results.length === 0) {
    throw new NotFoundError("No addresses found for these coordinates");
  }

  const addressSuggestions = results.map((res) => {
    const details = {
      city: "",
      state: "",
      pinCode: "",
      locality: "",
    };

    if (res.address_components) {
      res.address_components.forEach((comp) => {
        if (comp.types.includes("administrative_area_level_1")) {
          details.state = comp.long_name || comp.short_name;
        } else if (
          comp.types.includes("locality") ||
          comp.types.includes("administrative_area_level_2")
        ) {
          details.city = comp.long_name || comp.short_name;
        } else if (
          comp.types.includes("sublocality") ||
          comp.types.includes("neighborhood")
        ) {
          details.locality = comp.long_name || comp.short_name;
        } else if (comp.types.includes("postal_code")) {
          details.pinCode = comp.long_name || comp.short_name;
        }
      });
    }

    return {
      placeId: res.place_id,
      formattedAddress: res.formatted_address,
      name: res.name,
      city: details.city,
      state: details.state,
      pinCode: details.pinCode,
      locality: details.locality,
    };
  });

  return {
    statusCode: 200,
    message: "Suggestions fetched successfully",
    data: addressSuggestions,
    success: true,
  };
};

const createAddressService = async ({
  userId,
  lat,
  long,
  placeId,
  formattedAddress,
  city,
  state,
  pinCode,
  landmark,
  flatOrFloorNumber,
  addressType,
  isDefault,
}) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!placeId || !formattedAddress) {
    throw new ValidationError("Please select a valid address from suggestions");
  }

  let userAddress = await UserAddress.findOne({ userId });
  if (!userAddress) {
    userAddress = await UserAddress.create({ userId, addresses: [] });
  }

  if (userAddress.addresses.length >= 5) {
    throw new ValidationError("Maximum 5 addresses allowed");
  }

  const numLat = Number(lat);
  const numLong = Number(long);
  const normalizedFlat = flatOrFloorNumber?.trim() || "";
  const normalizedLandmark = landmark?.trim() || "";

  // --- DUPLICATE CHECK LOGIC ---
  const userAddressIds = userAddress?.addresses || [];

  // Step 1: Check if the CURRENT USER already has an address at this location
  // We split this into two queries because MongoDB doesn't allow $near inside $or
  let existingUserAddress = await Address.findOne({
    addressId: { $in: userAddressIds },
    $or: [
      { placeId: { $ne: "N/A", $eq: placeId } },
      { formattedAddress: { $regex: new RegExp(`^${formattedAddress.trim()}$`, "i") } },
    ],
  });

  if (!existingUserAddress) {
    existingUserAddress = await Address.findOne({
      addressId: { $in: userAddressIds },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [numLong, numLat] },
          $maxDistance: 10,
        },
      },
    });
  }

  if (existingUserAddress) {
    // Update the existing record with any new details (flat, landmark, etc.) to keep it current
    await Address.updateOne(
      { addressId: existingUserAddress.addressId },
      {
        $set: {
          location: { type: "Point", coordinates: [numLong, numLat] },
          placeId,
          formattedAddress,
          city,
          state,
          pinCode: Number(pinCode),
          landmark: normalizedLandmark,
          flatOrFloorNumber: normalizedFlat,
          addressType: addressType || "Home",
        },
      }
    );

    return {
      statusCode: 200,
      data: { addressId: existingUserAddress.addressId },
      message: "Address already in your saved list",
      success: true,
    };
  }

  // Step 2: Sibling Case - Check if ANY address in DB matches location AND flat/landmark exactly
  let siblingAddress = await Address.findOne({
    $and: [
      {
        $or: [
          { placeId: { $ne: "N/A", $eq: placeId } },
          { formattedAddress: { $regex: new RegExp(`^${formattedAddress.trim()}$`, "i") } },
        ],
      },
      { flatOrFloorNumber: normalizedFlat },
      { landmark: normalizedLandmark },
    ],
  });

  if (!siblingAddress) {
    siblingAddress = await Address.findOne({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [numLong, numLat] },
          $maxDistance: 10,
        },
      },
      flatOrFloorNumber: normalizedFlat,
      landmark: normalizedLandmark,
    });
  }

  if (siblingAddress) {
    // Link the existing sibling address to this user
    await UserAddress.updateOne(
      { userId },
      { $addToSet: { addresses: siblingAddress.addressId } }
    );

    return {
      statusCode: 200,
      data: { addressId: siblingAddress.addressId },
      message: "Address selected from saved locations",
      success: true,
    };
  }

  const newAddress = await Address.create({
    addressId: uuidv7(),
    location: {
      type: "Point",
      coordinates: [numLong, numLat],
    },
    placeId,
    formattedAddress,
    addressType: addressType || "Home",
    landmark,
    flatOrFloorNumber,
    isDefault: Boolean(isDefault),
    city,
    state,
    pinCode: Number(pinCode),
  });

  // Link new address to the user
  await UserAddress.updateOne(
    { userId },
    { $addToSet: { addresses: newAddress.addressId } },
  );

  return {
    statusCode: 201,
    data: { addressId: newAddress.addressId },
    message: "Address saved successfully",
    success: true,
  };
};

const updatedAddressService = async ({
  userId,
  lat,
  long,
  city,
  state,
  pinCode,
  formattedAddress,
  addressId,
  placeId,
  landmark,           
  flatOrFloorNumber,  
}) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  const validateNewAddress = validateUpdateUserAddress({
    lat,
    long,
    city,
    state,
    pinCode,
    formattedAddress,
    addressId,
    placeId,
  });

  if (!validateNewAddress.success) {
    throw new ValidationError(
      validateNewAddress.message,
      validateNewAddress.data,
    );
  }

  let userAddress = await UserAddress.findOne({ userId, addresses: addressId });

  if (!userAddress) {
    throw new NotFoundError("Address not found for this user");
  }

  const updated = await Address.findOneAndUpdate(
    { addressId },
    {
      $set: {
        location: {
          type: "Point",
          coordinates: [Number(long), Number(lat)],
        },
        city,
        state,
        pinCode,
        formattedAddress,
        landmark,            // Update mein add kiya
        flatOrFloorNumber,    // Update mein add kiya
      },
    },
    {
      new: true,
      lean: true,
    },
  );

  if (!updated) {
    throw new NotFoundError("Address not found");
  }

  return {
    statusCode: 200,
    message: "Address updated successfully",
    data: {
      addressId: updated.addressId,
    },
    success: true,
  };
};

const getSavedAddressService = async ({ userId }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  // user - address mappings with address id - uuid v7
  const userSavedAddressIds = await UserAddress.findOne({ userId });
  const extractingAddressFromAddressIds = await Address.find(
    {
      addressId: userSavedAddressIds?.addresses,
    },
    {
      formattedAddress: 1,
      addressType: 1,
      flatOrFloorNumber: 1,
      city: 1,
      state: 1,
      pinCode: 1,
      landmark: 1,
      addressId: 1,
      location: 1,
      _id: 0,
    },
  ).lean();

  const foundAddressMap = new Map(
    extractingAddressFromAddressIds.map((addr) => [addr.addressId, addr])
  );

  // Detect orphaned IDs (IDs in UserAddress but not in Address collection)
  const orphanedIds = (userSavedAddressIds?.addresses || []).filter(
    (id) => !foundAddressMap.has(id)
  );

  // If orphaned IDs detected, clean them up
  if (orphanedIds.length > 0) {
    console.log(
      `[WARN] Orphaned address IDs detected for userId: ${userId}, orphaned IDs: ${orphanedIds.join(", ")}`
    );

    // Remove orphaned IDs from UserAddress
    await UserAddress.updateOne(
      { userId },
      { $pull: { addresses: { $in: orphanedIds } } }
    );
  }

  // Return only valid addresses (filter out orphaned IDs)
  const validAddressIds = (userSavedAddressIds?.addresses || []).filter((id) =>
    foundAddressMap.has(id)
  );

  return {
    statusCode: 200,
    message: "Saved Address Ids",
    data: {
      extractingAddressFromAddressIds,
      addressId: validAddressIds,
    },
    success: true,
  };
};

const deleteSavedAddressService = async ({ userId, addressId }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  // REVERSE ORDER: Remove from UserAddress FIRST
  await UserAddress.findOneAndUpdate(
    { userId },
    { $pull: { addresses: addressId } },
    { new: true },
  );

  // Then attempt to delete from Address collection
  try {
    const deletedAddress = await Address.findOneAndDelete({
      addressId,
    });

    if (!deletedAddress) {
      // Address not found - this is an orphaned ID case
      console.log(
        `[WARN] Orphaned address ID removed for userId: ${userId}, addressId: ${addressId}`
      );
    }
  } catch (error) {
    // Log error but don't throw - deletion is idempotent
    console.log(
      `[WARN] Error deleting address from Address collection: ${error.message}`
    );
  }

  // Always return success - idempotent deletion
  return {
    statusCode: 200,
    message: "Address deleted successfully",
    data: null,
    success: true,
  };
};

export {
  getAddressSuggestionsService,
  createAddressService,
  updatedAddressService,
  getSearchSuggestionsService,
  getSavedAddressService,
  deleteSavedAddressService,
};
