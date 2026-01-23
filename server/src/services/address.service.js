import {
  validateUserAddress,
  validateUpdateUserAddress,
} from "../utlis/ValidateRes.js";
import UserAddress from "../model/userAddress.model.js";
import { v7 as uuidv7 } from "uuid";
import Address from "../model/address.new.model.js";
const createAddressService = async ({
  userId,
  placeId,
  lat,
  long,
  formattedAddress,
  city,
  state,
  pinCode,
  landmark,
  flatNumber,
  addressType,
  isDefault,
}) => {
  try {
    if (!userId) {
      return { statusCode: 401, message: "Unauthorized", success: false };
    }
    const validateNewAddress = validateUserAddress({
      placeId,
      lat,
      long,
      city,
      state,
      pinCode,
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
      placeId,
      formattedAddress,
      city,
      state,
      pinCode,
      landmark,
      flatNumber,
      addressType,
      isDefault: Boolean(isDefault),
      location: {
        type: "Point",
        coordinates: [Number(long), Number(lat)],
      },
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
  addressId,
  lat,
  long,
  city,
  state,
  pinCode,
  formattedAdress,
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
    addressId,
    lat,
    long,
    city,
    state,
    pinCode,
    formattedAdress,
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
        formattedAddress: formattedAdress,
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
