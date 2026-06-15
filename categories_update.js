// Run these in MongoDB Compass > mongosh tab, or Atlas > Data Explorer > Aggregation / mongosh
// Switch to your DB first: use urbannook

db.categories.updateOne(
  { slug: "cars" },
  { $set: { image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=600&fit=crop" } }
);

db.categories.updateOne(
  { slug: "superheroes" },
  { $set: { image: "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=600&h=600&fit=crop" } }
);

db.categories.updateOne(
  { slug: "anime" },
  { $set: { image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&h=600&fit=crop" } }
);

db.categories.updateOne(
  { slug: "desk-accessories" },
  { $set: { image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=600&fit=crop" } }
);
