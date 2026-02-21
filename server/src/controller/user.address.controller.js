import { ApiError, ApiRes } from "../utlis/index.js";
import {
  createAddressService,
  updatedAddressService,
  getAddressSuggestionsService,
  getSearchSuggestionsService,
  getSavedAddressService,
} from "../services/address.service.js";

const userAddressSearchFromInputController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { userSearchInput } = req.body || {};

    const getSearchSuggestionsServiceValidation =
      await getSearchSuggestionsService({
        userId,
        userSearchInput,
      });

    if (!getSearchSuggestionsServiceValidation.success) {
      return res
        .status(Number(getSearchSuggestionsServiceValidation.statusCode))
        .json(
          new ApiError(
            getSearchSuggestionsServiceValidation.statusCode,
            getSearchSuggestionsServiceValidation.message,
            getSearchSuggestionsServiceValidation.data,
            getSearchSuggestionsServiceValidation.success,
          ),
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          getSearchSuggestionsServiceValidation.statusCode,
          getSearchSuggestionsServiceValidation.message,
          getSearchSuggestionsServiceValidation.data,
          getSearchSuggestionsServiceValidation.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error from get address controller - ${error.message}`,
          null,
          false,
        ),
      );
  }
};

const userAddressSuggestionFromLatLngController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { lat, long } = req.body || {};

    const getAddressSuggestionsServiceValidation =
      await getAddressSuggestionsService({
        userId,
        lat,
        long,
      });

    if (!getAddressSuggestionsServiceValidation.success) {
      return res
        .status(Number(getAddressSuggestionsServiceValidation.statusCode))
        .json(
          new ApiError(
            getAddressSuggestionsServiceValidation.statusCode,
            getAddressSuggestionsServiceValidation.message,
            getAddressSuggestionsServiceValidation.data,
            getAddressSuggestionsServiceValidation.success,
          ),
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          getAddressSuggestionsServiceValidation.statusCode,
          getAddressSuggestionsServiceValidation.message,
          getAddressSuggestionsServiceValidation.data,
          getAddressSuggestionsServiceValidation.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error from get address controller - ${error.message}`,
          null,
          false,
        ),
      );
  }
};

const userCreateAddress = async (req, res) => {
  try {
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

    const createAddressServiceValidation = await createAddressService({
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

    if (!createAddressServiceValidation.success) {
      return res
        .status(Number(createAddressServiceValidation.statusCode))
        .json(
          new ApiError(
            createAddressServiceValidation.statusCode,
            createAddressServiceValidation.message,
            createAddressServiceValidation.data,
            createAddressServiceValidation.success,
          ),
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          createAddressServiceValidation.statusCode,
          createAddressServiceValidation.message,
          createAddressServiceValidation.data,
          createAddressServiceValidation.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false,
        ),
      );
  }
};

const userUpdateAddress = async (req, res) => {
  try {
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

    const userUpdatedAddressServiceValidation = await updatedAddressService({
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

    if (!userUpdatedAddressServiceValidation.success) {
      return res
        .status(Number(userUpdatedAddressServiceValidation.statusCode))
        .json(
          new ApiError(
            userUpdatedAddressServiceValidation.statusCode,
            userUpdatedAddressServiceValidation.message,
            userUpdatedAddressServiceValidation.data,
            false,
          ),
        );
    }

    return res
      .status(Number(userUpdatedAddressServiceValidation.statusCode))
      .json(
        new ApiRes(
          userUpdatedAddressServiceValidation.statusCode,
          userUpdatedAddressServiceValidation.data,
          userUpdatedAddressServiceValidation.message,
          userUpdatedAddressServiceValidation.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error - ${error.message}`,
          null,
          false,
        ),
      );
  }
};

const userSavedAddressController = async (req, res) => {
  const { userId } = req.user;
  const getSavedAddressServiceValidation = await getSavedAddressService({
    userId,
  });
  if (!getSavedAddressServiceValidation?.success) {
    return res
      .status(Number(getSavedAddressServiceValidation.statusCode))
      .json(
        new ApiError(
          getSavedAddressServiceValidation.statusCode,
          getSavedAddressServiceValidation.message,
          getSavedAddressServiceValidation.data,
          getSavedAddressServiceValidation.success,
        ),
      );
  }

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
};

export {
  userUpdateAddress as userAddressUpdate,
  userCreateAddress,
  userAddressSuggestionFromLatLngController,
  userAddressSearchFromInputController,
  userSavedAddressController,
};
