import { validateUpdateUserAddress } from "../utils/ValidateRes.js";
import UserAddress from "../model/userAddress.model.js";
import { v7 as uuidv7 } from "uuid";
import Address from "../model/address.new.model.js";
import axios from "axios";
import { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError,
  ConflictError,
  InternalServerError 
} from "../utils/errors.js";

const getSearchSuggestionsService = async ({ userId, userSearchInput }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }
  
  if (!userSearchInput) {
    throw new ValidationError("userSearchInput are required");
  }

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
    throw new ValidationError(validateNewAddress.message, validateNewAddress.data);
  }
  
  let userAddress = await UserAddress.findOne({ userId, addresses: addressId });
  
  if (!userAddress) {
    throw new NotFoundError("Address not found for this user");
  }

  // Duplicate check (excluding the editing current address)
  const duplicateAddress = await Address.findOne({
    addressId: { $ne: addressId },
    "location.coordinates": [Number(long), Number(lat)],
  }).lean();

  if (duplicateAddress) {
    throw new ConflictError(
      "Another address with same location already exists",
      { duplicateAddressId: duplicateAddress.addressId }
    );
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
      location: 1,
      formattedAddress: 1,
      addressType: 1,
      flatOrFloorNumber: 1,
      city: 1,
      state: 1,
      pinCode: 1,
      landmark:1,
      _id: 0,
    },
  ).lean();
  
  return {
    statusCode: 200,
    message: "Saved Address Ids",
    data: extractingAddressFromAddressIds,
    success: true,
  };
};

export {
  getAddressSuggestionsService,
  createAddressService,
  updatedAddressService,
  getSearchSuggestionsService,
  getSavedAddressService
};
