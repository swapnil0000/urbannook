import mongoose from "mongoose";

// Read-only view of the admin-owned `blog_posts` collection (Admin → Blog,
// urbannook-admin/server/models/blogPost.model.js owns the schema and writes).
const blogPostSchema = new mongoose.Schema(
  {
    slug: String,
    title: String,
    excerpt: String,
    contentHtml: String,
    coverImage: String,
    coverAlt: String,
    videoUrl: String,
    tags: [String],
    productIds: [String],
    skus: [String],
    metaTitle: String,
    metaDescription: String,
    author: String,
    status: String,
    publishedAt: Date,
    readingMinutes: Number,
  },
  { strict: false, timestamps: true, collection: "blog_posts" },
);

const BlogPost = mongoose.model("BlogPost", blogPostSchema);
export default BlogPost;
