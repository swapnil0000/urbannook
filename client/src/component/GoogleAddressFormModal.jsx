import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { useCreateAddressMutation } from "../store/api/userApi";

// Inject shimmer keyframe once
if (typeof document !== "undefined" && !document.getElementById("gmap-shimmer-style")) {
  const s = document.createElement("style");
  s.id = "gmap-shimmer-style";
  s.textContent = `@keyframes skeletonShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`;
  document.head.appendChild(s);
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Must be defined OUTSIDE the component to prevent useLoadScript from re-loading
const GOOGLE_LIBRARIES = ["places"];
const DEFAULT_CENTER   = { lat: 28.7041, lng: 77.1025 }; // Delhi fallback

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: "greedy",
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
};

const ADDRESS_TYPES = [
  { label: "Home",  icon: "fa-house" },
  { label: "Work",  icon: "fa-briefcase" },
  { label: "Hotel", icon: "fa-hotel" },
  { label: "Other", icon: "fa-location-dot" },
];

const EMPTY_FORM = {
  addressType: "Home",
  buildingName: "",
  street: "",
  floor: "",
  tower: "",
  landmark: "",
  fullName: "",
  mobileNumber: "",
  city: "",
  state: "",
  pinCode: "",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FormField = ({ label, required, placeholder, value, onChange, icon }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <i className={`fa-solid ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs`} />
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-xl px-3 py-3 text-sm transition-all outline-none ${
          icon ? "pl-9" : ""
        } bg-white border-gray-200 text-[#2e443c] focus:border-[#a89068] placeholder:text-gray-300`}
      />
    </div>
  </div>
);

const LocationSummaryCard = ({ deliveryAddressFull }) => {
  if (!deliveryAddressFull) return null;
  return (
    <div className="m-3 bg-white rounded-xl border border-[#a89068]/30 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-[#a89068]/10 flex items-center justify-center shrink-0 mt-0.5">
          <i className="fa-solid fa-location-dot text-[#a89068] text-xs" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-0.5">
            Delivering your order to
          </p>
          <p className="text-xs text-[#2e443c] leading-snug break-words">{deliveryAddressFull}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Helper: extract structured fields from Google geocode address_components ──
const extractFromComponents = (addressComponents = [], formattedAddress = "") => {
  const d = {
    city: "", state: "", pinCode: "", locality: "",
    building: "", streetNumber: "", route: "", sublocality: "",
  };
  addressComponents.forEach((comp) => {
    const t = comp.types;
    if      (t.includes("administrative_area_level_1")) d.state        = comp.long_name;
    else if (t.includes("locality"))                    d.city         = comp.long_name;
    else if (t.includes("administrative_area_level_3")) d.city         = d.city || comp.long_name;
    else if (t.includes("administrative_area_level_2")) d.city         = d.city || comp.long_name;
    else if (t.includes("postal_code"))                 d.pinCode      = comp.long_name;
    else if (t.includes("premise") || t.includes("subpremise")) d.building = d.building || comp.long_name;
    else if (t.includes("street_number"))               d.streetNumber = comp.long_name;
    else if (t.includes("route"))                       d.route        = comp.long_name;
    else if (t.includes("sublocality_level_1"))         d.sublocality  = comp.long_name;
    else if (t.includes("sublocality"))                 d.sublocality  = d.sublocality || comp.long_name;
    else if (t.includes("neighborhood"))                d.sublocality  = d.sublocality || comp.long_name;
  });
  d.locality = d.sublocality;
  // Build a usable street string: "42 MG Road" or just "MG Road" or sublocality fallback
  d.street = [d.streetNumber, d.route].filter(Boolean).join(" ") || d.sublocality;
  return { ...d, formattedAddress };
};

// ─── Main Component ───────────────────────────────────────────────────────────

const GoogleAddressFormModal = ({
  isOpen,
  onClose,
  onAddressConfirm,
  showNotification,
  prefillName  = "",
  prefillPhone = "",
  defaultCoords = null, // { lat, long }
}) => {
  // Load Google Maps JS SDK once — must not be called conditionally
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  // ── Refs ───────────────────────────────────────────────────────────────────
  const mapRef              = useRef(null);  // google.maps.Map instance
  const geocoderRef         = useRef(null);  // google.maps.Geocoder
  const autocompleteRef     = useRef(null);  // google.maps.places.AutocompleteService
  const placesServiceRef    = useRef(null);  // google.maps.places.PlacesService
  const isProgrammaticMove  = useRef(false); // blocks onIdle during panTo animations
  const searchDebounce      = useRef(null);
  const initDoneRef         = useRef(false); // prevents double-init on StrictMode

  // ── State ──────────────────────────────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchResults,  setSearchResults]  = useState([]);
  const [isSearching,    setIsSearching]    = useState(false);
  const [isLocating,     setIsLocating]     = useState(false);
  const [locationSummary, setLocationSummary] = useState(null);
  // locationSummary: { placeId, formattedAddress, name, locality, city, state, pinCode, lat, long }

  const [form,          setForm]          = useState({ ...EMPTY_FORM });
  const [errors,        setErrors]        = useState({});
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  // ── RTK mutation ───────────────────────────────────────────────────────────
  const [createAddress] = useCreateAddressMutation();

  // ── Pre-fill contact from parent ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setForm(f => ({
        ...f,
        fullName:     f.fullName     || prefillName,
        mobileNumber: f.mobileNumber || prefillPhone,
      }));
    }
  }, [isOpen, prefillName, prefillPhone]);

  // ── Reset on close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setForm({ ...EMPTY_FORM, fullName: prefillName, mobileNumber: prefillPhone });
      setLocationSummary(null);
      setSearchQuery("");
      setSearchResults([]);
      setErrors({});
      initDoneRef.current = false;
    }
  }, [isOpen]);

  // ── Reverse geocode ────────────────────────────────────────────────────────
  // fillAddress=true → also fill buildingName + street (used by "Go to location")
  // fillAddress=false → only city/state/pinCode (used by map drag)
  const reverseGeocode = useCallback(async (lat, lng, fillAddress = false) => {
    if (!geocoderRef.current) return;
    try {
      const { results, status } = await new Promise((resolve) =>
        geocoderRef.current.geocode(
          { location: { lat, lng } },
          (r, s) => resolve({ results: r, status: s }),
        )
      );
      if (status === "OK" && results?.length > 0) {
        const top = results[0];
        const d = extractFromComponents(top.address_components, top.formatted_address);
        setLocationSummary(prev => ({
          placeId:          prev?.placeId          || top.place_id || "N/A",
          formattedAddress: prev?.formattedAddress || d.formattedAddress,
          name:             prev?.name             || d.locality || d.city || "",
          locality:         d.locality,
          city:             d.city,
          state:            d.state,
          pinCode:          d.pinCode,
          lat,
          long: lng,
        }));
        setForm(f => ({
          ...f,
          city:    d.city    || f.city,
          state:   d.state   || f.state,
          pinCode: d.pinCode || f.pinCode,
          ...(fillAddress && {
            buildingName: d.building || f.buildingName,
            street:       d.street   || f.street,
          }),
        }));
      }
    } catch (err) {
      console.error("[GoogleAddressFormModal] reverseGeocode error:", err);
    }
  }, []);

  // ── Map load callback ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (window.google) {
      geocoderRef.current      = new window.google.maps.Geocoder();
      autocompleteRef.current  = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);
    }

    if (initDoneRef.current) return;
    initDoneRef.current = true;

    // Block onIdle during initial positioning
    isProgrammaticMove.current = true;

    const resolveStart = () =>
      new Promise((resolve) => {
        // If parent passed saved coords, use those — no geolocation needed
        if (defaultCoords) return resolve({ lat: defaultCoords.lat, lng: defaultCoords.long });

        // Only silently try geolocation if permission is already granted (no popup)
        // If state is "prompt" or "denied", fall back to Delhi — user can click the button to trigger prompt
        if (!navigator.geolocation) return resolve(null);
        navigator.permissions
          .query({ name: "geolocation" })
          .then((perm) => {
            if (perm.state === "granted") {
              navigator.geolocation.getCurrentPosition(
                ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: false, timeout: 4000, maximumAge: 120000 },
              );
            } else {
              resolve(null); // fall back to Delhi — no popup on initial load
            }
          })
          .catch(() => resolve(null)); // permissions API unsupported — just use Delhi
      });

    resolveStart().then((start) => {
      if (start) {
        map.panTo({ lat: start.lat, lng: start.lng });
        map.setZoom(17);
        // Wait for animation, then reverse geocode starting position
        setTimeout(async () => {
          isProgrammaticMove.current = false;
          await reverseGeocode(start.lat, start.lng);
        }, 1200);
      } else {
        setTimeout(() => { isProgrammaticMove.current = false; }, 1200);
      }
    });
  }, [defaultCoords, reverseGeocode]);

  // ── onIdle: fires when map stops moving ───────────────────────────────────
  const handleMapIdle = useCallback(() => {
    if (isProgrammaticMove.current) return;
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    reverseGeocode(center.lat(), center.lng());
  }, [reverseGeocode]);

  // ── Search bar ─────────────────────────────────────────────────────────────
  const handleSearch = (val) => {
    setSearchQuery(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (val.length < 2) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    searchDebounce.current = setTimeout(() => {
      if (!autocompleteRef.current || !window.google) { setIsSearching(false); return; }
      // No types restriction — lets Google return PGs, shops, bylanes, everything
      autocompleteRef.current.getPlacePredictions(
        {
          input: val,
          componentRestrictions: { country: "in" },
          language: "en",
        },
        (predictions, status) => {
          setIsSearching(false);
          const OK = window.google.maps.places.PlacesServiceStatus.OK;
          setSearchResults(status === OK && predictions?.length ? predictions : []);
        },
      );
    }, 400);
  };

  // ── Search result click ────────────────────────────────────────────────────
  const handleSelectResult = (item) => {
    if (!placesServiceRef.current || !window.google) return;
    setSearchResults([]);
    setSearchQuery("");

    const mainText      = item.structured_formatting?.main_text      || item.description || "";
    const secondaryText = item.structured_formatting?.secondary_text || "";
    const streetHint    = secondaryText.split(",")[0]?.trim()        || "";

    // Immediately clear old location data so stale city/state/pinCode never bleeds through
    setLocationSummary({
      placeId:          item.place_id,
      formattedAddress: item.description || mainText,
      name:             mainText,
      locality:         secondaryText,
      city:             "",
      state:            "",
      pinCode:          "",
      lat:              null,
      long:             null,
    });
    setForm(f => ({
      ...f,
      buildingName: mainText   || f.buildingName,
      street:       streetHint || f.street,
      city:         "",
      state:        "",
      pinCode:      "",
    }));

    // Fetch full place details — lat/lng + accurate address components
    placesServiceRef.current.getDetails(
      {
        placeId: item.place_id,
        fields: ["geometry", "formatted_address", "address_components", "name"],
      },
      (place, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place?.geometry?.location
        ) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const d   = extractFromComponents(
          place.address_components || [],
          place.formatted_address  || item.description || mainText,
        );

        // Block onIdle during programmatic pan
        isProgrammaticMove.current = true;
        setTimeout(() => { isProgrammaticMove.current = false; }, 2000);
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(17);

        setLocationSummary({
          placeId:          item.place_id,
          formattedAddress: place.formatted_address || item.description || mainText,
          name:             place.name || mainText,
          locality:         d.locality || secondaryText,
          city:             d.city,
          state:            d.state,
          pinCode:          d.pinCode,
          lat,
          long:             lng,
        });
        setForm(f => ({
          ...f,
          buildingName: place.name || mainText || f.buildingName,
          street:       d.street   || streetHint || f.street,
          city:         d.city,
          state:        d.state,
          pinCode:      d.pinCode,
        }));
      },
    );
  };

  // ── "Go to current location" ───────────────────────────────────────────────
  const handleLocate = async () => {
    if (!navigator.geolocation) {
      showNotification("Location not supported on this device", "error");
      return;
    }
    setIsLocating(true);

    // Check current permission state before calling getCurrentPosition
    // This lets us show a helpful message if already denied instead of silently failing
    let permState = "prompt";
    try {
      const perm = await navigator.permissions.query({ name: "geolocation" });
      permState = perm.state; // "granted" | "denied" | "prompt"
    } catch {
      // permissions API not supported (some browsers) — just proceed
    }

    if (permState === "denied") {
      setIsLocating(false);
      showNotification(
        "Location blocked. Please enable it in your browser/phone settings and try again.",
        "error",
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;

        isProgrammaticMove.current = true;
        setTimeout(() => { isProgrammaticMove.current = false; }, 2000);
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(17);

        setLocationSummary(prev => ({ ...(prev || {}), lat, long: lng }));
        await reverseGeocode(lat, lng, true);
        setIsLocating(false);
      },
      () => {
        // Denied at prompt — silently fall back to Delhi
        isProgrammaticMove.current = true;
        setTimeout(() => { isProgrammaticMove.current = false; }, 2000);
        mapRef.current?.panTo(DEFAULT_CENTER);
        mapRef.current?.setZoom(14);
        setIsLocating(false);
      },
      { enableHighAccuracy: true },
    );
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setField = (key) => (val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!locationSummary)         errs.location     = "Please pin your location on the map first";
    if (!form.pinCode?.trim())    errs.pinCode      = "Pincode is required";
    if (!form.city?.trim())       errs.city         = "City / District is required";
    if (!form.buildingName?.trim()) errs.buildingName = "House No. / Building is required";
    if (!form.street?.trim())     errs.street       = "Street / Colony is required";
    if (!form.fullName?.trim())   errs.fullName     = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      if (!locationSummary) showNotification("Please pin your delivery location on the map", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        lat:              locationSummary.lat,
        long:             locationSummary.long,
        placeId:          locationSummary.placeId,
        formattedAddress: locationSummary.formattedAddress,
        city:             form.city,
        state:            form.state,
        pinCode:          form.pinCode,
        addressType:      form.addressType,
        landmark:         form.landmark,
        // legacy concat field — preserved for backward compat
        flatOrFloorNumber: [form.buildingName, form.street, form.floor, form.tower]
          .filter(Boolean).join(", "),
        // v2 fields
        buildingName:  form.buildingName,
        street:        form.street,
        floor:         form.floor,
        tower:         form.tower,
        fullName:      form.fullName,
        mobileNumber:  form.mobileNumber,
      };

      const result = await createAddress(payload).unwrap();
      if (result.success) {
        const deliveryAddressFull = [
          form.buildingName,
          form.street,
          form.floor,
          form.tower,
          form.landmark ? `Near ${form.landmark}` : "",
          form.city,
          form.state,
          form.pinCode,
        ].filter(Boolean).join(", ");

        onAddressConfirm(locationSummary, result.data?.addressId, deliveryAddressFull);
        onClose();
        showNotification(result.message || "Address saved successfully", "success");
      }
    } catch (err) {
      const msg = err?.data?.message || "Failed to save address";
      if (err?.status === 400 && msg.includes("5")) {
        showNotification("Maximum 5 addresses allowed. Please delete one first.", "error");
      } else {
        showNotification(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ── Preview string shown above the form ────────────────────────────────────
  const deliveryPreview = [
    form.buildingName,
    form.street,
    form.floor,
    form.tower,
    form.landmark ? `Near ${form.landmark}` : "",
    form.city,
    form.state,
    form.pinCode,
  ].filter(Boolean).join(", ") || null;

  // ─── Map Section ───────────────────────────────────────────────────────────
  const MapSection = (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 bg-white border-b border-gray-100 relative z-20 shrink-0">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search area, street, landmark..."
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-9 text-sm text-[#2e443c] focus:border-[#a89068] focus:bg-white outline-none placeholder:text-gray-300 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          )}
        </div>

        {/* Search results dropdown — fixed on mobile to avoid overflow-hidden clipping */}
        {(searchQuery.length > 0 || isSearching) && (
          <div className="fixed left-4 right-4 md:absolute md:left-3 md:right-3 md:top-[105%] top-[72px] bg-white border border-gray-200 rounded-xl shadow-xl z-[10000] max-h-[220px] overflow-y-auto">
            {isSearching ? (
              <div className="p-5 flex items-center justify-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, i) => (
                <button
                  key={item.place_id || i}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3 group"
                >
                  <i className="fa-solid fa-location-dot text-gray-300 group-hover:text-[#a89068] text-xs mt-1 shrink-0 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#2e443c] font-medium truncate group-hover:text-[#a89068] transition-colors">
                      {item.structured_formatting?.main_text || item.description}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {item.structured_formatting?.secondary_text}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-400">
                No results found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map canvas */}
      <div className="relative flex-1 min-h-0 bg-gray-100">
        {loadError ? (
          <div className="flex items-center justify-center h-full text-sm text-red-500 p-4 text-center">
            <div className="text-center">
              <i className="fa-solid fa-circle-exclamation text-2xl mb-2 block" />
              Failed to load Google Maps. Check your API key.
            </div>
          </div>
        ) : !isLoaded ? (
          /* ── Skeleton while Google Maps JS SDK loads ── */
          <div className="w-full h-full relative overflow-hidden bg-[#e8eaed]">
            {/* Fake map grid lines */}
            <div className="absolute inset-0 opacity-20">
              {[20, 40, 60, 80].map(p => (
                <div key={`h${p}`} className="absolute w-full h-px bg-gray-400" style={{ top: `${p}%` }} />
              ))}
              {[20, 40, 60, 80].map(p => (
                <div key={`v${p}`} className="absolute h-full w-px bg-gray-400" style={{ left: `${p}%` }} />
              ))}
            </div>
            {/* Shimmer overlay */}
            <div className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.6s infinite linear",
              }} />
            {/* Center loading card */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3 border border-white/40">
                <div className="w-6 h-6 border-[3px] border-[#a89068]/30 border-t-[#a89068] rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[#2e443c] leading-tight">Loading map…</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Setting up your location</p>
                </div>
              </div>
            </div>
            {/* Fake zoom controls skeleton */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1">
              <div className="w-8 h-8 bg-white/80 rounded shadow animate-pulse" />
              <div className="w-8 h-8 bg-white/80 rounded shadow animate-pulse" />
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={17}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
            onIdle={handleMapIdle}
          />
        )}

        {/* Floating center pin — shown over map and skeleton */}
        {isLoaded && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
            <i className="fa-solid fa-location-dot text-4xl text-[#a89068] drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)]" />
            <div className="w-2 h-1 bg-black/40 rounded-full absolute -bottom-0.5 left-1/2 -translate-x-1/2 blur-[2px]" />
          </div>
        )}

        {/* "Go to current location" FAB */}
        {isLoaded && (
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            title="Go to current location"
            className="absolute bottom-4 right-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-[#a89068] hover:bg-[#a89068] hover:text-white transition-all disabled:opacity-60 border border-gray-200"
          >
            <i className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-location-crosshairs"} text-sm`} />
          </button>
        )}

        {/* Hint card — shown after map loads, before user sets a location */}
        {isLoaded && !locationSummary && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] px-4">
            {/* Mobile: compact horizontal pills row. Desktop: vertical 3-step card */}
            {/* Mobile hint — 3 icon pills in a row */}
            <div className="flex md:hidden gap-2 justify-center">
              {[
                { icon: "fa-magnifying-glass", label: "Search above" },
                { icon: "fa-hand-pointer",     label: "Drag pin" },
                { icon: "fa-location-crosshairs", label: "Use location" },
              ].map(({ icon, label }) => (
                <div key={label} className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-[#a89068]/20 px-2.5 py-2 flex flex-col items-center gap-1 min-w-[72px]">
                  <i className={`fa-solid ${icon} text-[#a89068] text-sm`} />
                  <p className="text-[9px] font-semibold text-[#2e443c] text-center leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* Desktop hint — vertical card */}
            <div className="hidden md:block bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-[#a89068]/20 p-4 w-full max-w-[260px]">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a89068] text-center mb-3">
                Set your delivery location
              </p>
              <div className="space-y-2.5">
                {[
                  { icon: "fa-magnifying-glass",    label: "Search", desc: "your area, street or landmark above" },
                  { icon: "fa-hand-pointer",         label: "Drag the map", desc: "to move the pin to your door" },
                  { icon: "fa-location-crosshairs",  label: "Tap the button", desc: "bottom-right to use your location" },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#a89068]/10 flex items-center justify-center shrink-0">
                      <i className={`fa-solid ${icon} text-[#a89068] text-[10px]`} />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-tight">
                      <span className="font-semibold text-[#2e443c]">{label}</span> {desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location summary card */}
      <LocationSummaryCard deliveryAddressFull={deliveryPreview} />
    </div>
  );

  // ─── Form Section ──────────────────────────────────────────────────────────
  const FormSection = (
    <div className="flex flex-col md:h-full md:overflow-y-auto">
      <div className="p-5 space-y-5">

        {/* Location error */}
        {errors.location && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <i className="fa-solid fa-triangle-exclamation text-red-400 text-xs shrink-0" />
            <p className="text-xs text-red-600">{errors.location}</p>
          </div>
        )}

        {/* City / State / Pincode — auto-filled, editable */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FormField
                label="Pincode"
                required
                placeholder="6-digit"
                value={form.pinCode}
                onChange={setField("pinCode")}
              />
              {errors.pinCode && (
                <p className="text-[11px] text-red-500 mt-1">{errors.pinCode}</p>
              )}
            </div>
            <div>
              <FormField
                label="City / District"
                required
                placeholder="e.g. Bengaluru"
                value={form.city}
                onChange={setField("city")}
              />
              {errors.city && (
                <p className="text-[11px] text-red-500 mt-1">{errors.city}</p>
              )}
            </div>
            <FormField
              label="State"
              placeholder="e.g. Karnataka"
              value={form.state}
              onChange={setField("state")}
            />
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Address details */}
        <div className="space-y-3">
          <FormField
            label="House No. / Building"
            required
            placeholder="e.g. H-42, Sunrise Apartments"
            value={form.buildingName}
            onChange={setField("buildingName")}
            icon="fa-house"
          />
          {errors.buildingName && (
            <p className="text-[11px] text-red-500 -mt-2">{errors.buildingName}</p>
          )}

          <FormField
            label="Street / Colony"
            required
            placeholder="e.g. Sector 51, MG Road"
            value={form.street}
            onChange={setField("street")}
            icon="fa-road"
          />
          {errors.street && (
            <p className="text-[11px] text-red-500 -mt-2">{errors.street}</p>
          )}

          <FormField
            label="Tower / Wing"
            placeholder="e.g. Tower B"
            value={form.tower}
            onChange={setField("tower")}
            icon="fa-chess-rook"
          />

          <FormField
            label="Nearby Landmark"
            placeholder="e.g. Near metro station"
            value={form.landmark}
            onChange={setField("landmark")}
            icon="fa-map-pin"
          />
        </div>

        {/* Delivery contact */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">
            Your delivery contact
          </p>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormField
              label="Your name"
              required
              placeholder="Full name"
              value={form.fullName}
              onChange={setField("fullName")}
              icon="fa-user"
            />
            {errors.fullName && (
              <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>
            )}
          </div>
          <FormField
            label="Mobile number"
            placeholder="10-digit number"
            value={form.mobileNumber}
            onChange={setField("mobileNumber")}
            icon="fa-phone"
          />
        </div>

        {/* Save CTA */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-[#2e443c] text-[#F5DEB3] rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#1c3026] transition-colors disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk text-sm" />
              Save Address
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl h-[93dvh] sm:h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-serif text-[#2e443c] text-lg leading-tight">
              Set Delivery Address
            </h3>
            <p className="text-[10px] text-[#a89068] uppercase tracking-widest font-bold mt-0.5">
              Pin your location, then fill in the details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>
        </div>

        {/* Body — mobile: scrollable column, desktop: side-by-side */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:flex md:flex-row">

          {/* Map — 310px on mobile, fills left 55% on desktop */}
          <div className="h-[310px] shrink-0 flex flex-col md:h-full md:w-[55%] md:border-r md:border-gray-100">
            {MapSection}
          </div>

          {/* Form */}
          <div className="md:flex-1 md:overflow-y-auto">
            {FormSection}
          </div>

        </div>
      </div>
    </div>
  );
};

export default GoogleAddressFormModal;
