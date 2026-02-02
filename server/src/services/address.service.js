import {
  validateUserAddress,
  validateUpdateUserAddress,
} from "../utlis/ValidateRes.js";
import UserAddress from "../model/userAddress.model.js";
import { v7 as uuidv7 } from "uuid";
import Address from "../model/address.new.model.js";
const createAddressService = async ({
  userId,
  lat,
  long,
  city,
  state,
  pinCode,
  placeId,
  formattedAddress,
  landmark,
  flatOrFloorNumber,
  addressType,
  isDefault,
}) => {
  try {
    if (!userId) {
      return { statusCode: 401, message: "Unauthorized", success: false };
    }
    const validateNewAddress = validateUserAddress({
      lat,
      long,
      city,
      state,
      pinCode,
      placeId,
      formattedAddress,
    });

    if (!validateNewAddress.success) {
      return {
        statusCode: validateNewAddress.statusCode,
        data: validateNewAddress.data,
        message: validateNewAddress.message,
        success: validateNewAddress.success,
      };
    }
    let userAddress = await UserAddress.findOne({ userId });

    if (!userAddress) {
      userAddress = await UserAddress.create({
        userId,
        addresses: [],
      });
    }
    if (userAddress.addresses.length >= 5) {
      return {
        statusCode: 400,
        data: null,
        message: "Maximum 5 addresses allowed",
        success: false,
      };
    }
    //Duplicate check (Google placeId based)
    const existingAddress = await Address.findOne({ placeId });

    if (existingAddress) {
      if (userAddress.addresses.includes(existingAddress.addressId)) {
        return {
          statusCode: 200,
          data: null,
          message: "Address already exists",
          success: true,
        };
      }

      // Same place but new user (sibling case)
      await UserAddress.updateOne(
        { userId },
        { $addToSet: { addresses: existingAddress.addressId } },
      );
    }
    const newAddress = await Address.create({
      addressId: uuidv7(),
      location: {
        type: "Point",
        coordinates: [Number(long), Number(lat)],
      },
      placeId,
      formattedAddress,
      addressType,
      landmark,
      flatOrFloorNumber,
      isDefault: Boolean(isDefault),
      city,
      state,
      pinCode,
    });

    // Map to user
    await UserAddress.updateOne(
      { userId },
      { $addToSet: { addresses: newAddress.addressId } },
    );
    return {
      statusCode: 201,
      data: { addressId: newAddress.addressId },
      message: "Address added successfully",
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      data: `Internal Server Error - ${error.message}`,
      message: null,
      success: false,
    };
  }
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
}) => {
  if (!userId) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
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
    return {
      statusCode: validateNewAddress.statusCode,
      message: validateNewAddress.message,
      data: validateNewAddress.data,
      success: validateNewAddress.success,
    };
  }
  let userAddress = await UserAddress.findOne({ userId, addresses: addressId });
  if (!userAddress) {
    return {
      statusCode: 404,
      message: "Address not found for this user",
      data: null,
      success: false,
    };
  }

  // Duplicate check (excluding the editing current address)
  const duplicateAddress = await Address.findOne({
    addressId: { $ne: addressId },
    "location.coordinates": [Number(long), Number(lat)],
  }).lean();

  if (duplicateAddress) {
    return {
      statusCode: 409,
      message: "Another address with same location already exists",
      data: {
        duplicateAddressId: duplicateAddress.addressId,
      },
      success: false,
    };
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
      },
    },
    {
      new: true,
      lean: true,
    },
  );

  if (!updated) {
    return {
      statusCode: 404,
      message: "Address not found",
      data: null,
      success: false,
    };
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

export { createAddressService, updatedAddressService };
