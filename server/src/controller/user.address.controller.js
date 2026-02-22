import { ApiRes } from "../utils/index.js";
import {
  createAddressService,
  updatedAddressService,
  getAddressSuggestionsService,
  getSearchSuggestionsService,
  getSavedAddressService
} from "../services/address.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const userAddressSearchFromInputController = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { userSearchInput } = req.body || {};

  const result = await getSearchSuggestionsService({
    userId,
    userSearchInput,
  });

  return res
    .status(200)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userAddressSuggestionFromLatLngController = asyncHandler(
  async (req, res) => {
    const { userId } = req.user;
    const { lat, long } = req.body || {};

    const result = await getAddressSuggestionsService({
      userId,
      lat,
      long,
    });

    return res
      .status(200)
      .json(
        new ApiRes(
          result.statusCode,
          result.message,
          result.data,
          result.success,
        ),
      );
  },
);

const userCreateAddress = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const {
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
  } = req.body || {};

  const result = await createAddressService({
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
  });

  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userUpdateAddress = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const {
    lat,
    long,
    city,
    state,
    pinCode,
    formattedAddress,
    addressId,
    placeId,
  } = req.body || {};

  const result = await updatedAddressService({
    userId,
    lat,
    long,
    city,
    state,
    pinCode,
    formattedAddress,
    addressId,
    placeId,
  });

  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

const userSavedAddressController = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const getSavedAddressServiceValidation = await getSavedAddressService({
    userId,
  });

  return res
    .status(Number(getSavedAddressServiceValidation.statusCode))
    .json(
      new ApiRes(
        getSavedAddressServiceValidation.statusCode,
        getSavedAddressServiceValidation.message,
        getSavedAddressServiceValidation.data,
        getSavedAddressServiceValidation.success,
      ),
    );
});

export {
  userUpdateAddress as userAddressUpdate,
  userCreateAddress,
  userAddressSuggestionFromLatLngController,
  userAddressSearchFromInputController,
  userSavedAddressController,
};
