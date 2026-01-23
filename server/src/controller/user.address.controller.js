import NewAddress from "../model/address.new.model.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import {
  createAddressService,
  updatedAddressService,
} from "../services/address.service.js";

const userCreateAddress = async (req, res) => {
  try {
    const { userId } = req.user;
    const {
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
    } = req.body || {};

    const createAddressServiceValidation = await createAddressService({
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
const userAddressUpdate = async (req, res) => {
  try {
    const { userId } = req.user;
    const { addressId, lat, long, city, state, pinCode, formattedAdress } =
      req.body || {};
    const userUpdatedAddressServiceValidation = updatedAddressService({
      userId,
      addressId,
      lat,
      long,
      city,
      state,
      pinCode,
      formattedAdress,
    });

    if (!userUpdatedAddressServiceValidation.success) {
      return res
        .status(userUpdatedAddressServiceValidation.statusCode)
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
      .status(200)
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

export { userAddressUpdate, userCreateAddress };
