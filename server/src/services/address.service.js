import { validateUpdateUserAddress } from "../utlis/ValidateRes.js";
import UserAddress from "../model/userAddress.model.js";
import { v7 as uuidv7 } from "uuid";
import Address from "../model/address.new.model.js";
import axios from "axios";

const getSearchSuggestionsService = async ({ userId, userSearchInput }) => {
  try {
    if (!userId)
      return { statusCode: 401, message: "Unauthorized", success: false };
    if (!userSearchInput)
      return {
        statusCode: 400,
        message: "userSearchInput are required",
        data: null,
        success: false,
      };

    const inputSearchAutoCompleteRes = await axios.get(
      process.env.OLA_MAP_AUTO_COMPLETE_URL,
      {
        params: {
          input: userSearchInput,
          api_key: process.env.OLA_MAP_API_KEY,
        },
        headers: {
          "X-Request-Id": "urbannook-request",
          Accept: "application/json",
        },
      },
    );
    const predictions = inputSearchAutoCompleteRes?.data?.predictions || [];
    if (predictions.length === 0) {
      return {
        statusCode: 404,
        message: "No addresses found for these coordinates",
        data: null,
        success: false,
      };
    }
    return {
      statusCode: 200,
      message: "addresses found for these coordinates",
      data: predictions,
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error from get search service: ${error.message}`,
      data: null,
      success: false,
    };
  }
};

const getAddressSuggestionsService = async ({ userId, lat, long }) => {
  try {
    if (!userId)
      return { statusCode: 401, message: "Unauthorized", success: false };
    if (!lat || !long)
      return {
        statusCode: 400,
        message: "Coordinates are required",
        data: null,
        success: false,
      };

    const mapReverseGeoLocationApiRes = await axios.get(
      process.env.OLA_MAP_ADDRESS_SUGGESTION_URL,
      {
        params: {
          latlng: `${lat},${long}`,
          api_key: process.env.OLA_MAP_API_KEY,
        },
        headers: {
          "X-Request-Id": "urbannook-request",
          Accept: "application/json",
        },
      },
    );

    const results = mapReverseGeoLocationApiRes?.data?.results || [];
    if (results.length === 0) {
      return {
        statusCode: 404,
        message: "No addresses found for these coordinates",
        data: null,
        success: false,
      };
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
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error from address suggestion service: ${error.message}`,
      data: null,
      success: false,
    };
  }
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
  try {
    if (!userId)
      return { statusCode: 401, message: "Unauthorized", success: false };

    if (!placeId || !formattedAddress) {
      return {
        statusCode: 400,
        message: "Please select a valid address from suggestions",
        success: false,
      };
    }

    let userAddress = await UserAddress.findOne({ userId });
    if (!userAddress) {
      userAddress = await UserAddress.create({ userId, addresses: [] });
    }

    if (userAddress.addresses.length >= 5) {
      return {
        statusCode: 400,
        message: "Maximum 5 addresses allowed",
        success: false,
      };
    }

    // Duplicate check (placeId based - Global Address Table)
    const existingAddress = await Address.findOne({ placeId });

    if (existingAddress) {
      // Case A: User already has this specific address in their list
      if (userAddress.addresses.includes(existingAddress.addressId)) {
        return {
          statusCode: 200,
          data: { addressId: existingAddress.addressId },
          message: "Address already exists in your list",
          success: true,
        };
      }

      // Case B: Sibling Case (Address exists in DB but not for this user)
      await UserAddress.updateOne(
        { userId },
        { $addToSet: { addresses: existingAddress.addressId } },
      );

      return {
        statusCode: 200,
        data: { addressId: existingAddress.addressId },
        message: "Address added successfully",
        success: true,
      };
    }

    const newAddress = await Address.create({
      addressId: uuidv7(),
      location: {
        type: "Point",
        coordinates: [Number(long), Number(lat)],
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

    // 5. Link new address to the user
    const res = await UserAddress.updateOne(
      { userId },
      { $addToSet: { addresses: newAddress.addressId } },
    );
    return {
      statusCode: 201,
      data: { addressId: newAddress.addressId },
      message: "Address saved successfully",
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Error from create address service: ${error.message}`,
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

export {
  getAddressSuggestionsService,
  createAddressService,
  updatedAddressService,
  getSearchSuggestionsService,
};
