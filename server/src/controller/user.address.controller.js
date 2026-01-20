import { validateUserAddress } from "../utlis/CommonResponse.js";
import User from "../model/user.model.js";
import NewAddress from "../model/address.new.model.js";
import UserAddress from "../model/userAddress.model.js";
import { v7 as uuidv7 } from "uuid";
import { ApiError, ApiRes } from "../utlis/index.js";
const userAddressUpdate = async (req, res) => {
  try {
    const { userId } = req.user;
    const { addressId, lat, long, city, state, pinCode, formattedAdress } =
      req.body || {};
    if (!userId) {
      return res
        .status(401)
        .json(new ApiError(401, "Unauthorized", null, false));
    }
    if (!addressId) {
      return res
        .status(404)
        .json(
          new ApiError(
            401,
            "addressId is req for updating the particular address",
            null,
            false,
          ),
        );
    }
    const userAddress = validateUserAddress({
      lat,
      long,
      city,
      state,
      pinCode,
      formattedAdress,
    });

    if (!userAddress.success) {
      return res
        .status(userAddress.statusCode)
        .json(
          new ApiError(
            userAddress.statusCode,
            userAddress.message,
            userAddress.data,
            false,
          ),
        );
    }

    const updateFields = {};
    if (lat !== undefined) updateFields.lat = String(lat); // type match with schema
    if (long !== undefined) updateFields.long = String(long);
    if (city !== undefined) updateFields.city = city;
    if (state !== undefined) updateFields.state = state;
    if (pinCode !== undefined) updateFields.pinCode = pinCode;
    if (formattedAdress !== undefined)
      updateFields.formattedAdress = formattedAdress;
    const updatedAddress = await NewAddress.findOneAndUpdate(
      { addressId },
      { $set: updateFields },
      { new: true },
    ).select("-_id -__v");

    if (updatedAddress) {
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            "No changes done. Same values already saved.",
            null,
            true,
          ),
        );
    }
    return res.status(200).json(
      new ApiRes(
        200,
        "Profile updated successfully",
        {
          userAddressUpdate,
        },
        true,
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

const userCreateAddress = async (req, res) => {
  try {
    const { userId } = req.user;
    const { lat, long, city, state, pinCode, formattedAdress } = req.body || {};
    if (!userId) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }
    const validateNewAddress = validateUserAddress({
      lat,
      long,
      city,
      state,
      pinCode,
      formattedAdress,
    });

    if (!validateNewAddress.success) {
      return res
        .status(validateNewAddress.statusCode)
        .json(
          new ApiError(
            validateNewAddress.statusCode,
            validateNewAddress.message,
            validateNewAddress.data,
            false,
          ),
        );
    }
    const user = await User.findOne({ userId });
    const existingAddress = await UserAddress.aggregate([
      { $match: { user: user._id } },
      {
        $lookup: {
          from: "addresses",
          let: { addressIds: "$addresses" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$addressIds"] } } },
            { $match: { lat: String(lat), long: String(long) } },
          ],
          as: "addressDetails",
        },
      },
      { $match: { "addressDetails.0": { $exists: true } } }, // exists → duplicate
    ]);

    if (existingAddress.length > 0) {
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            `Address already exists of currentUser with lat : ${lat}, long : ${long}`,
            null,
            false,
          ),
        );
    }
    const newAddress = await NewAddress.create({
      addressId: uuidv7(),
      lat,
      long,
      city,
      state,
      pinCode,
      formattedAdress,
    });

    let userAddress = await UserAddress.findOne({ user: user._id });
    if (!userAddress) {
      await UserAddress.create({
        user: user._id,
        addresses: [newAddress._id],
      });
    } else {
      // If mapping exists, add new address to addresses array
      await UserAddress.updateOne(
        { user: user._id },
        { $addToSet: { addresses: newAddress._id } },
      );
    }
    return res.status(200).json(
      new ApiRes(
        201,
        "Address created and mapped successfully",
        {
          addressId: newAddress.addressId,
        },
        true,
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
