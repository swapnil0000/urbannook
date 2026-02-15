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
    } = req.body || {};

    const createAddressServiceValidation = await createAddressService({
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

export { userUpdateAddress as userAddressUpdate, userCreateAddress };
