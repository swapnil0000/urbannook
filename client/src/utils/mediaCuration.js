// Pure selectors. Missing curation retains the existing automatic order.
export const orderedSelection = (available, selection, idOf, imageOf) => {
  if (!Array.isArray(selection)) return available;
  const byKey = new Map(available.map((item) => [`${idOf(item)}\n${imageOf(item)}`, item]));
  return selection.map(({ id, image }) => byKey.get(`${id}\n${image}`)).filter(Boolean);
};

export const reviewPhotos = (reviews) => reviews.flatMap((review) => {
  const images = review.images?.length ? review.images : review.imageUrls?.length ? review.imageUrls : review.imageUrl ? [review.imageUrl] : [];
  return images.map((image) => ({ id: String(review.id || review._id), image, review }));
});
