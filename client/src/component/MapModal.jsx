import { useState, useRef, useEffect } from "react";
import {
  useSearchAddressMutation,
  useGetAddressSuggestionsMutation,
  useCreateAddressMutation,
} from "../store/api/userApi";

// Lazy load OpenLayers components
import("ol/ol.css");

const MapModal = ({ 
  showMapModal, 
  setShowMapModal, 
  preciseDetails, 
  setPreciseDetails,
  onAddressConfirm,
  showNotification 
}) => {
  const [mapSuggestions, setMapSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedAddressType, setSelectedAddressType] = useState("Home");
  
  const mapElement = useRef();
  const mapRef = useRef();
  const searchDebounceTimer = useRef(null);
  const mapDebounceTimer = useRef(null);
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  // RTK Query mutations
  const [searchAddress] = useSearchAddressMutation();
  const [getAddressSuggestions] = useGetAddressSuggestionsMutation();
  const [createAddress] = useCreateAddressMutation();

  // Lazy load OpenLayers
  const initializeMap = async (lon, lat) => {
    const [
      { default: Map },
      { default: View },
      { default: TileLayer },
      { default: OSM },
      { fromLonLat, toLonLat }
    ] = await Promise.all([
      import("ol/Map"),
      import("ol/View"),
      import("ol/layer/Tile"),
      import("ol/source/OSM"),
      import("ol/proj")
    ]);

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
        mapRef.current = null;
      }

      if (mapElement.current) {
        mapRef.current = new Map({
          target: mapElement.current,
          layers: [new TileLayer({ source: new OSM() })],
          view: new View({
            center: fromLonLat([lon, lat]),
            zoom: 17,
          }),
        });

        mapRef.current.on("moveend", () => {
          if (mapDebounceTimer.current) clearTimeout(mapDebounceTimer.current);
          mapDebounceTimer.current = setTimeout(() => {
            const center = mapRef.current.getView().getCenter();
            const [lonArr, latArr] = toLonLat(center);
            fetchSuggestions(latArr, lonArr);
          }, 800);
        });

        setTimeout(() => mapRef.current.updateSize(), 100);
      }
    }, 150);
  };

  const fetchSuggestions = async (lat, lng) => {
    try {
      const result = await getAddressSuggestions({ lat, long: lng }).unwrap();
      if (result.success) setMapSuggestions(result.data);
    } catch (err) {
      console.error("API Error:", err);
    }
  };

  const getUserCurrentLocation = async () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const { fromLonLat } = await import("ol/proj");
          
          if (mapRef.current) {
            mapRef.current.getView().animate({
              center: fromLonLat([longitude, latitude]),
              duration: 1000,
              zoom: 17,
            });
          }
          fetchSuggestions(latitude, longitude);
          setIsLocating(false);
          setSearchResults([]);
        },
        () => {
          showNotification("Location access denied", "error");
          setIsLocating(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleSearchPlaces = (val) => {
    setSearchQuery(val);
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    if (val.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceTimer.current = setTimeout(async () => {
      try {
        const result = await searchAddress(val).unwrap();
        if (result.success) setSearchResults(result.data);
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 800);
  };

  const handleSelectSearchResult = async (item) => {
    const { fromLonLat } = await import("ol/proj");
    const lat = item.geometry.location.lat;
    const long = item.geometry.location.lng;
    
    if (mapRef.current) {
      mapRef.current.getView().animate({
        center: fromLonLat([long, lat]),
        duration: 800,
        zoom: 17,
      });
    }
    setSearchResults([]);
    setSearchQuery("");
    fetchSuggestions(lat, long);
  };

  const handleConfirmAddress = async (suggestion) => {
    const { toLonLat } = await import("ol/proj");
    const center = mapRef.current.getView().getCenter();
    const [lon, lat] = toLonLat(center) 
    
    try {
      const addressData = {
        lat: lat,
        long: lon,
        placeId: suggestion.placeId,
        formattedAddress: suggestion.formattedAddress,
        city: suggestion.city,
        state: suggestion.state,
        pinCode: suggestion.pinCode,
        landmark: preciseDetails.landmark,
        flatOrFloorNumber: preciseDetails.flatNo,
        addressType: selectedAddressType,
      };
      
      const result = await createAddress(addressData).unwrap();
      if (result.success) {
        onAddressConfirm(suggestion, result.data?.addressId);
        setShowMapModal(false);
        showNotification(result?.message, "success");
      }
    } catch (err) {
      const errorMessage = err.data?.message || "Failed to save address";
      
      // Handle address limit error
      if (err.status === 400 && errorMessage.includes("5")) {
        showNotification("Maximum 5 addresses allowed. Please delete an existing address first.", "error");
      } else {
        showNotification(errorMessage, "error");
      }
    }
  };

  useEffect(() => {
    if (showMapModal) {
      const defaultLat = 28.7041;
      const defaultLon = 77.1025;
      initializeMap(defaultLon, defaultLat);
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
        mapRef.current = null;
      }
    };
  }, [showMapModal]);

  if (!showMapModal) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${showMapModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-[#f5f7f8] w-full max-w-3xl h-[95vh] sm:h-[85vh] sm:rounded-[2rem] overflow-hidden border-t sm:border border-white/20 shadow-2xl flex flex-col transform transition-all duration-300 ${showMapModal ? 'translate-y-0 scale-100' : 'translate-y-full scale-95'}`}>
          {/* Header */}
          <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
            <div>
              <h3 className="font-serif text-[#2e443c] text-xl">Set Delivery Location</h3>
              <p className="text-[10px] text-[#a89068] uppercase tracking-widest mt-0.5 font-bold">
                Move pin to exact location
              </p>
            </div>
            <button 
              onClick={() => setShowMapModal(false)} 
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* Search Controls */}
          <div className="p-5 bg-[#f5f7f8] shrink-0 relative z-[110] border-b border-gray-200">
            <button
              onClick={getUserCurrentLocation}
              disabled={isLocating}
              className="w-full py-3.5 mb-4 rounded-xl bg-[#a89068]/10 border border-[#a89068]/30 text-[#a89068] font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#a89068]/20 transition-all disabled:opacity-50"
            >
              <i className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-location-crosshairs"} text-sm`}></i>
              {isLocating ? "Locating device..." : "Use Current Location"}
            </button>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchPlaces(e.target.value)}
                placeholder="Search area, street, landmark..."
                className="w-full bg-white border border-gray-300 rounded-xl p-4 pl-12 text-sm text-[#2e443c] focus:border-[#a89068] outline-none placeholder:text-gray-400 shadow-sm"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>

            {/* Search Results */}
            {(searchQuery.length > 0 || isSearching) && (
              <div className="absolute left-5 right-5 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-[120] max-h-[300px] overflow-y-auto">
                {isSearching ? (
                  <div className="w-full p-8 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-4 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#a89068]/10">
                        <i className="fa-solid fa-location-dot text-gray-400 group-hover:text-[#a89068] transition-colors"></i>
                      </div>
                      <div>
                        <p className="text-sm text-[#2e443c] font-medium group-hover:text-[#a89068] transition-colors">
                          {item.structured_formatting.main_text}
                        </p>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                          {item.structured_formatting.secondary_text}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-gray-400">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="relative flex-1 min-h-[300px] w-full bg-gray-100">
            <div ref={mapElement} className="w-full h-full" />

            {/* Center Pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
              <i className="fa-solid fa-location-dot text-4xl text-[#a89068] drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"></i>
              <div className="w-2 h-1 bg-black/50 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 blur-[2px]"></div>
            </div>

            {/* Loading State */}
            {mapSuggestions.length === 0 && !isSearching && !isLocating && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-8">
                <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center shadow-xl">
                  <i className="fa-solid fa-hand-pointer text-2xl text-[#a89068] mb-3 animate-bounce"></i>
                  <p className="text-[11px] text-[#a89068] uppercase tracking-[0.2em] font-bold mb-1">Navigation Required</p>
                  <p className="text-sm text-gray-600 leading-relaxed font-light">
                    Drag the map to pinpoint<br/>your exact location
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Address Selection */}
          <div className="p-5 bg-white h-[280px] flex flex-col shrink-0 border-t border-gray-200 relative z-[110]">
            {/* Address Type Selector */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-2 flex items-center gap-2">
                <i className="fa-solid fa-tag"></i> Address Type
              </p>
              <div className="flex gap-2">
                {["Home", "Work", "Other"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedAddressType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedAddressType === type
                        ? "bg-[#a89068] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-3 flex items-center gap-2">
              <i className="fa-solid fa-list-ul"></i> Select Nearest Match
            </p>
            <div className="space-y-3 overflow-y-auto pr-2 flex-1">
              {mapSuggestions.length > 0 ? (
                mapSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleConfirmAddress(s)}
                    className="w-full text-left p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#a89068]/50 hover:bg-[#a89068]/5 transition-all group flex items-center justify-between"
                  >
                    <div className="pr-4">
                      <p className="text-sm text-[#2e443c] group-hover:text-[#a89068] line-clamp-1 transition-colors font-medium">
                        {s.formattedAddress}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                        {s.city}, {s.state} - <span className="text-gray-800 font-mono">{s.pinCode}</span>
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center group-hover:bg-[#a89068] group-hover:text-white text-gray-300 border border-gray-200 transition-colors shrink-0">
                      <i className="fa-solid fa-check text-xs"></i>
                    </div>
                  </button>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                  Searching for nearby addresses...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  
  );
};

export default MapModal;