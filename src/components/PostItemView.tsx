import React, { useState } from 'react';
import { Item, Category, ItemCondition } from '../types';

interface PostItemViewProps {
  onPostSuccess: (newItem: Item) => void;
}

export const PostItemView: React.FC<PostItemViewProps> = ({ onPostSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Furniture');
  const [condition, setCondition] = useState<ItemCondition>('Good');
  const [pinLocation, setPinLocation] = useState(true);
  const [locationText, setLocationText] = useState("Jing'an District, Shanghai");
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const defaultSampleImages: Record<Category, string> = {
    Furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    Tech: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=800',
    Books: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800',
    Apparel: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=800',
    'Home Decor': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800',
    All: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    Others: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=800',
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an item title');
      return;
    }

    setIsPosting(true);

    const finalImage =
      imagePreview ||
      imageUrlInput ||
      defaultSampleImages[category] ||
      defaultSampleImages['Furniture'];

    setTimeout(() => {
      const newItem: Item = {
        id: `item-${Date.now()}`,
        title: title.trim(),
        description: description.trim() || 'No description provided.',
        category,
        condition,
        location: locationText,
        district: locationText.split(',')[0] || "Jing'an District",
        city: locationText.split(',')[1]?.trim() || 'Shanghai',
        distanceKm: 0.5,
        imageUrl: finalImage,
        badge: 'NEW ARRIVAL',
        timeAgo: 'Just Posted',
        isAvailable: true,
        cost: 'Free',
        conditionDetails: [
          `Condition: ${condition}`,
          'Verified community upload',
          'Free pickup arrangement'
        ],
        pickupLogistics: 'Pick up available at creator location. Contact owner to arrange date.',
        owner: {
          id: 'me',
          name: 'You (Current User)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          joinedYear: 2024,
          itemsGiven: 1,
          isVerified: true,
        },
        lat: 31.23,
        lng: 121.45,
        createdAt: Date.now(),
      };

      onPostSuccess(newItem);
      setIsPosting(false);
    }, 600);
  };

  return (
    <main className="max-w-[800px] mx-auto px-4 py-6 mb-32">
      {/* Workspace Breadcrumbs Header */}
      <div className="mb-6 flex items-center space-x-2 text-xs text-[#91918e] border-b border-[#ececec] pb-3">
        <span className="hover:text-[#37352f] cursor-pointer">Community</span>
        <span>/</span>
        <span className="font-semibold text-[#37352f]">📝 Post Free Item</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Header Section */}
        <section className="space-y-1">
          <h2 className="text-2xl font-bold text-[#37352f] tracking-tight">Post Free Item</h2>
          <p className="text-xs text-[#91918e]">
            Share something you no longer need with your local community.
          </p>
        </section>

        {/* Media Upload Section */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-[#91918e]">Primary Photo</label>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs text-[#37352f] underline hover:text-[#df6b05]"
            >
              {showUrlInput ? 'Use file upload' : 'Paste Image URL'}
            </button>
          </div>

          {showUrlInput ? (
            <div className="space-y-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => {
                  setImageUrlInput(e.target.value);
                  setImagePreview(e.target.value);
                }}
                placeholder="https://images.unsplash.com/..."
                className="w-full p-2.5 bg-white border border-[#ececec] rounded-md text-xs text-[#37352f] focus:border-[#37352f] outline-none"
              />
            </div>
          ) : null}

          <div className="group relative cursor-pointer">
            {imagePreview ? (
              <div className="relative w-full aspect-[16/9] rounded-md overflow-hidden border border-[#ececec] bg-[#fbfbfa]">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview('');
                    setImageUrlInput('');
                  }}
                  className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <div className="custom-dashed w-full aspect-[16/9] flex flex-col items-center justify-center gap-2 bg-white hover:bg-[#efefed]/50 transition-colors rounded-md border border-[#ececec]">
                <span className="material-symbols-outlined text-[#91918e] text-3xl">add_a_photo</span>
                <span className="text-xs font-semibold text-[#37352f]">Click to upload or drag and drop</span>
                <span className="text-[11px] text-[#91918e]">JPG or PNG photo of the item</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:pointer-events-none"
              disabled={!!imagePreview}
            />
          </div>
        </section>

        {/* Form Content */}
        <section className="grid grid-cols-1 gap-5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#91918e] block">Item Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you giving away?"
              className="text-lg notion-input font-bold text-[#37352f] placeholder:text-[#91918e]"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#91918e] block">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us more about the item (condition, dimensions, pickup details)..."
              className="text-sm notion-input resize-none text-[#37352f] placeholder:text-[#91918e]"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#91918e] block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-white border border-[#ececec] rounded-md p-2 text-xs text-[#37352f] font-semibold focus:border-[#37352f] outline-none transition-all cursor-pointer"
              >
                <option value="Furniture">Furniture</option>
                <option value="Tech">Tech</option>
                <option value="Books">Books</option>
                <option value="Apparel">Apparel</option>
                <option value="Home Decor">Home Decor</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#91918e] block">Condition</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {(['New', 'Good', 'Fair'] as ItemCondition[]).map((cond) => {
                  const isSelected = condition === cond;
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setCondition(cond)}
                      className={`px-3 py-1 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#37352f] bg-[#37352f] text-white'
                          : 'border-[#ececec] text-[#37352f] hover:bg-[#efefed] bg-white'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Location Toggle */}
          <div className="p-3 bg-white rounded-md border border-[#ececec] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#91918e] text-base">location_on</span>
              <div>
                <p className="text-xs text-[#37352f] font-bold">Pin location</p>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="text-xs text-[#91918e] bg-transparent outline-none border-b border-transparent focus:border-[#ececec]"
                />
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pinLocation}
                onChange={(e) => setPinLocation(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#ececec] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#37352f]"></div>
            </label>
          </div>
        </section>

        {/* Action Button */}
        <section className="pt-3">
          <button
            type="submit"
            disabled={isPosting}
            className="w-full bg-[#37352f] text-white py-2.5 rounded-md text-xs font-bold uppercase tracking-wider active:scale-98 transition-transform hover:bg-black shadow-2xs cursor-pointer"
          >
            {isPosting ? 'Posting Item...' : 'POST FOR FREE'}
          </button>
          <p className="text-center mt-3 text-[11px] text-[#91918e]">
            By posting, you agree to our Community Guidelines.
          </p>
        </section>
      </form>
    </main>
  );
};
