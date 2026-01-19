import {
  addToWishList,
  deleteFromWishList,
} from "../services/user.wishlist.service.js";
const userAddToWishList = async (req, res) => {
  try {
    const { userEmail } = req.user;
    if (!userEmail) {
      return res
        .status(403)
        .json(new ApiError(403, `Unauthorized Access`, null, false));
    }
    const { productName } = req.body || {};

    // fieldMissing and Addition To WishList check
    const productAdditionToWishList = await addToWishList(
      userEmail,
      productName
    );

    if (!productAdditionToWishList?.success) {
      return res
        .status(Number(productAdditionToWishList?.statusCode))
        .json(
          new ApiError(
            productAdditionToWishList?.statusCode,
            productAdditionToWishList?.message,
            productAdditionToWishList?.data,
            productAdditionToWishList?.success
          )
        );
    }
    return res
      .status(Number(productAdditionToWishList?.statusCode))
      .json(
        new ApiRes(
          productAdditionToWishList?.statusCode,
          productAdditionToWishList?.message,
          productAdditionToWishList?.data,
          productAdditionToWishList?.success
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userGetProductWishList = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const userExist = await User.findOne({ userEmail });

    if (!userExist)
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            `User Email not found or user doesn't exist`,
            null,
            false
          )
        );
    const productIds = userExist?.addedToWishList.map((id) => {
      return id?.productId;
    });
    const productDetails = await Product.find({
      _id: productIds,
    }).select("-_id");

    if (!productDetails) {
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            `Nothing in wishlist for user ${userEmail}`,
            null,
            true
          )
        );
    }
    return res
      .status(200)
      .json(new ApiRes(200, `User WishList`, productDetails, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userDeleteFromProductWishList = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { productId } = req.params;
    const deleteProduct = await deleteFromWishList(userEmail, productId);
    if (!deleteProduct?.success) {
      return res
        .status(Number(deleteProduct?.statusCode))
        .json(
          new ApiError(
            deleteProduct?.statusCode,
            deleteProduct?.message,
            deleteProduct?.data,
            deleteProduct?.success
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          deleteProduct?.statusCode,
          deleteProduct?.message,
          deleteProduct?.data,
          deleteProduct?.success
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};
export {
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
};
