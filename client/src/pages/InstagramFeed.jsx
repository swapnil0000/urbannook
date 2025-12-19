import React, { useState } from 'react';

const instagramPosts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    likes: 1234,
    caption: "Minimalist workspace essentials ✨ #UrbanNook #Aesthetic",
    hashtags: ["#minimalist", "#workspace", "#aesthetic"]
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
    likes: 892,
    caption: "New keychain collection just dropped! 🔑",
    hashtags: ["#keychains", "#newcollection", "#style"]
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=400&fit=crop",
    likes: 2156,
    caption: "Desk setup goals 💫 Tag a friend who needs this!",
    hashtags: ["#desksetup", "#goals", "#productivity"]
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=400&fit=crop",
    likes: 756,
    caption: "Cozy corner vibes with our poster collection 🎨",
    hashtags: ["#posters", "#homedecor", "#cozy"]
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1586717799252-bd134ad00e26?w=400&h=400&fit=crop",
    likes: 1543,
    caption: "Perfect accessories for your aesthetic lifestyle ✨",
    hashtags: ["#accessories", "#lifestyle", "#aesthetic"]
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=400&fit=crop",
    likes: 987,
    caption: "Customer love! Thanks for sharing @username 💕",
    hashtags: ["#customerlove", "#repost", "#grateful"]
  }
];

const InstagramFeed = () => {
  const [hoveredPost, setHoveredPost] = useState(null);

  return (
    <section className="bg-bgSecondary py-20 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <i className="fa-brands fa-instagram text-4xl text-primary"></i>
            <h2 className="text-4xl font-bold text-textPrimary">
              Follow Us on Instagram
            </h2>
          </div>
          <div className="w-20 h-1 bg-accent mx-auto mb-4"></div>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto mb-6">
            Get inspired by our community and see how customers style their spaces with UrbanNook products
          </p>
          <a
            href="https://instagram.com/urbannook"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
          >
            <i className="fa-brands fa-instagram"></i>
            @urbannook
          </a>
        </div>

        {/* Instagram Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {instagramPosts.map((post) => (
            <div
              key={post.id}
              className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg"
              onMouseEnter={() => setHoveredPost(post.id)}
              onMouseLeave={() => setHoveredPost(null)}
            >
              {/* Image */}
              <img
                src={post.image}
                alt={`Instagram post ${post.id}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />

              {/* Overlay */}
              <div
                className={`absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center transition-opacity duration-300 ${
                  hoveredPost === post.id ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="text-center text-white p-4">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <div className="flex items-center gap-1">
                      <i className="fa-solid fa-heart text-red-500"></i>
                      <span className="text-sm font-semibold">{post.likes.toLocaleString()}</span>
                    </div>
                    <i className="fa-solid fa-comment text-lg"></i>
                  </div>
                  <p className="text-xs leading-tight line-clamp-3">
                    {post.caption}
                  </p>
                </div>
              </div>

              {/* Instagram Icon */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <i className="fa-brands fa-instagram text-white text-xl"></i>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-bgPrimary rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-textPrimary mb-4">
              Share Your UrbanNook Style
            </h3>
            <p className="text-textSecondary mb-6">
              Tag us in your posts for a chance to be featured! Use #UrbanNookStyle and show us how you've styled your space.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {["#UrbanNookStyle", "#AestheticVibes", "#MinimalistLife", "#DeskGoals"].map((tag) => (
                <span
                  key={tag}
                  className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <button className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-all">
              Upload Your Photo
            </button>
          </div>
        </div>

        {/* Instagram Stats */}
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">25K+</div>
            <div className="text-textSecondary">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">500+</div>
            <div className="text-textSecondary">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">1M+</div>
            <div className="text-textSecondary">Likes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">15K+</div>
            <div className="text-textSecondary">User Posts</div>
          </div>
        </div> */}
      </div>
    </section>
  );
};

export default InstagramFeed;