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

const FormField = ({ label, required, placeholder, value, onChange, icon, maxLength }) => (
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
        maxLength={maxLength}
        className={`w-full border rounded-xl px-3 py-3 text-sm transition-all outline-none ${
          icon ? "pl-9" : ""
        } bg-white border-gray-200 text-ink focus:border-brand placeholder:text-gray-300`}
      />
    </div>
  </div>
);

const LocationSummaryCard = ({ deliveryAddressFull }) => {
  if (!deliveryAddressFull) return null;
  return (
    <div className="m-3 bg-white rounded-xl border border-brand/30 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
          <i className="fa-solid fa-location-dot text-brand text-xs" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand mb-0.5">
            Delivering your order to
          </p>
          <p className="text-xs text-ink leading-snug break-words">{deliveryAddressFull}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Helper: extract structured fields from Google geocode address_components ──
// Supports both old API (long_name) and new Places API (longText)
const extractFromComponents = (addressComponents = [], formattedAddress = "") => {
  const d = {
    city: "", state: "", pinCode: "", locality: "",
    building: "", streetNumber: "", route: "", sublocality: "",
  };
  addressComponents.forEach((comp) => {
    const t    = comp.types || [];
    const name = comp.longText || comp.long_name || ""; // new API uses longText
    if      (t.includes("administrative_area_level_1")) d.state        = name;
    else if (t.includes("locality"))                    d.city         = name;
    else if (t.includes("administrative_area_level_3")) d.city         = d.city || name;
    else if (t.includes("administrative_area_level_2")) d.city         = d.city || name;
    else if (t.includes("postal_code"))                 d.pinCode      = name;
    else if (t.includes("premise") || t.includes("subpremise")) d.building = d.building || name;
    else if (t.includes("street_number"))               d.streetNumber = name;
    else if (t.includes("route"))                       d.route        = name;
    else if (t.includes("sublocality_level_1"))         d.sublocality  = name;
    else if (t.includes("sublocality"))                 d.sublocality  = d.sublocality || name;
    else if (t.includes("neighborhood"))                d.sublocality  = d.sublocality || name;
  });
  d.locality = d.sublocality;
  d.street   = [d.streetNumber, d.route].filter(Boolean).join(" ") || d.sublocality;
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
  isGuest = false,
  initialData = null,
}) => {
  // Load Google Maps JS SDK once — must not be called conditionally
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_LIBRARIES,
  });

  // ── Refs ───────────────────────────────────────────────────────────────────
  const mapRef             = useRef(null);  // google.maps.Map instance
  const geocoderRef        = useRef(null);  // google.maps.Geocoder (not deprecated)
  const sessionTokenRef    = useRef(null);  // AutocompleteSessionToken for billing grouping
  const isProgrammaticMove = useRef(false); // blocks onIdle during panTo animations
  const searchDebounce     = useRef(null);
  const searchRequestId    = useRef(0);     // incremented per-call; stale responses are dropped
  const initDoneRef        = useRef(false); // prevents double-init on StrictMode
  const userEditedPinCode  = useRef(false); // true when user manually typed in pincode — prevent map geocoder from overwriting
  const searchBarRef       = useRef(null);  // ref to the search bar container for dropdown positioning

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
  const [mapCollapsed,  setMapCollapsed]  = useState(false);
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});

  // ── RTK mutation ───────────────────────────────────────────────────────────
  const [createAddress] = useCreateAddressMutation();

  // ── Pre-fill contact from parent ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Create a base form from EMPTY_FORM and merge initialData to ensure all fields exist
        const updatedForm = {
          ...EMPTY_FORM,
          ...initialData,
          fullName: initialData.fullName || prefillName,
          mobileNumber: initialData.mobileNumber || prefillPhone,
        };
        setForm(updatedForm);

        if (initialData.lat && initialData.long) {
          setLocationSummary({
            lat: initialData.lat,
            long: initialData.long,
            placeId: initialData.placeId || "N/A",
            formattedAddress: initialData.formattedAddress || "",
            city: initialData.city || updatedForm.city || "",
            state: initialData.state || updatedForm.state || "",
            pinCode: initialData.pinCode || updatedForm.pinCode || "",
          });
          initDoneRef.current = true; // Mark init as done so we don't auto-locate
        }
      } else {
        setForm(f => ({
          ...f,
          fullName:     f.fullName     || prefillName,
          mobileNumber: f.mobileNumber || prefillPhone,
        }));
      }
    }
  }, [isOpen, prefillName, prefillPhone, initialData]);

  // ── Cleanup debounce timer on unmount ─────────────────────────────────────
  useEffect(() => () => clearTimeout(searchDebounce.current), []);

  // ── Hide navbar while modal is open ───────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle("address-modal-open", isOpen);
    return () => document.body.classList.remove("address-modal-open");
  }, [isOpen]);

  // ── Reset on close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setForm({ ...EMPTY_FORM, fullName: prefillName, mobileNumber: prefillPhone });
      setLocationSummary(null);
      setSearchQuery("");
      setSearchResults([]);
      setErrors({});
      setMapCollapsed(false);
      initDoneRef.current = false;
      userEditedPinCode.current = false;
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
          // don't overwrite pincode if user manually typed it
          pinCode: userEditedPinCode.current ? f.pinCode : (d.pinCode || f.pinCode),
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
      geocoderRef.current   = new window.google.maps.Geocoder();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
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

  // Clears the manual-pin-guard when user intentionally drags the map
  const handleMapDragStart = useCallback(() => {
    userEditedPinCode.current = false;
  }, []);

  // Collapses map on mobile when form inputs are focused
  const handleFormInputFocus = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMapCollapsed(true);
    }
  }, []);

  // Auto-fetch city/state from India Post API when pincode is 6 digits
  const fetchPincodeData = useCallback(async (pin) => {
    if (!/^\d{6}$/.test(pin)) return;
    setIsFetchingPincode(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setForm(f => ({
          ...f,
          city:  f.city  || po.District || po.Block || "",
          state: f.state || po.State    || "",
        }));
      }
    } catch { /* silent */ } finally {
      setIsFetchingPincode(false);
    }
  }, []);

  // Calculates where the search dropdown should appear (fixed to viewport)
  const updateDropdownStyle = useCallback(() => {
    if (!searchBarRef.current) return;
    const rect = searchBarRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      right: window.innerWidth - rect.right,
      zIndex: 10000,
    });
  }, []);

  // ── Search bar ─────────────────────────────────────────────────────────────
  const handleSearch = (val) => {
    updateDropdownStyle();
    setSearchQuery(val);
    clearTimeout(searchDebounce.current);

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Only fire when the current word being typed is complete enough.
    // "last word >= 3 chars" OR input ends with a space (word just finished).
    const lastWord = trimmed.split(/\s+/).at(-1) ?? "";
    const wordReady = val.endsWith(" ") || lastWord.length >= 3;
    if (!wordReady) {
      setIsSearching(false);
      return;
    }

    // Capture id BEFORE the timeout so we can detect stale responses
    const thisId = ++searchRequestId.current;
    setIsSearching(true);

    searchDebounce.current = setTimeout(async () => {
      if (!window.google?.maps?.places?.AutocompleteSuggestion) {
        if (thisId === searchRequestId.current) setIsSearching(false);
        return;
      }
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }
        const { suggestions } = await window.google.maps.places.AutocompleteSuggestion
          .fetchAutocompleteSuggestions({
            input: trimmed,
            includedRegionCodes: ["in"],
            language: "en",
            sessionToken: sessionTokenRef.current,
          });
        // A newer request has already been fired — discard this response
        if (thisId !== searchRequestId.current) return;
        setSearchResults(suggestions || []);
      } catch (err) {
        if (thisId !== searchRequestId.current) return;
        console.error("[Search] AutocompleteSuggestion error:", err);
        setSearchResults([]);
      } finally {
        if (thisId === searchRequestId.current) setIsSearching(false);
      }
    }, 800);
  };

  // ── Search result click ────────────────────────────────────────────────────
  const handleSelectResult = async (item) => {
    if (!window.google?.maps?.places?.Place) return;
    setSearchResults([]);
    setSearchQuery("");

    // New API: item is a Suggestion, prediction lives in item.placePrediction
    const pred        = item.placePrediction;
    const mainText    = pred?.mainText?.text    || pred?.text?.text    || "";
    const secondary   = pred?.secondaryText?.text                      || "";
    const placeId     = pred?.placeId                                  || "";
    const fullDesc    = pred?.text?.text        || mainText            || "";
    const streetHint  = secondary.split(",")[0]?.trim()                || "";

    // Clear old fields immediately — no stale bleed-through
    userEditedPinCode.current = false; // Places API result should set pinCode
    setLocationSummary({
      placeId,
      formattedAddress: fullDesc,
      name:             mainText,
      locality:         secondary,
      city: "", state: "", pinCode: "", lat: null, long: null,
    });
    setForm(f => ({
      ...f,
      buildingName: mainText   || f.buildingName,
      street:       streetHint || f.street,
      city: "", state: "", pinCode: "",
    }));

    try {
      // Use Place (New API) to fetch details
      const place = new window.google.maps.places.Place({ id: placeId });
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "addressComponents", "location"],
        sessionToken: sessionTokenRef.current, // groups autocomplete + details for billing
      });

      // Session token consumed — create a fresh one for next search
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

      const lat = place.location?.lat();
      const lng = place.location?.lng();
      if (lat == null || lng == null) return;

      const d = extractFromComponents(
        place.addressComponents || [],
        place.formattedAddress  || fullDesc,
      );

      isProgrammaticMove.current = true;
      setTimeout(() => { isProgrammaticMove.current = false; }, 2000);
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(17);

      setLocationSummary({
        placeId,
        formattedAddress: place.formattedAddress || fullDesc,
        name:             place.displayName      || mainText,
        locality:         d.locality             || secondary,
        city:             d.city,
        state:            d.state,
        pinCode:          d.pinCode,
        lat,
        long: lng,
      });
      setForm(f => ({
        ...f,
        buildingName: place.displayName || mainText || f.buildingName,
        street:       d.street          || streetHint || f.street,
        city:         d.city,
        state:        d.state,
        pinCode:      d.pinCode,
      }));
    } catch (err) {
      console.error("[handleSelectResult] Place.fetchFields error:", err);
    }
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

        userEditedPinCode.current = false;
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
    // locationSummary is NOT required — user can fill form manually without map
    if (!/^\d{6}$/.test(String(form.pinCode || "").trim())) errs.pinCode = "Enter a valid 6-digit pincode";
    if (!form.city?.trim())         errs.city         = "City / District is required";
    if (!form.state?.trim())        errs.state        = "State is required";
    if (!form.buildingName?.trim()) errs.buildingName = "House No. / Building is required";
    if (!form.street?.trim())       errs.street       = "Street / Colony is required";
    if (!isGuest && !form.fullName?.trim()) errs.fullName = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      // Build fallback formattedAddress from typed fields if user didn't use the map
      const manualAddress = [
        form.buildingName, form.street, form.tower,
        form.landmark ? `Near ${form.landmark}` : "",
        form.city, form.state, form.pinCode,
      ].filter(Boolean).join(", ");

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

      const summaryForParent = {
        ...(locationSummary || {
          placeId: "N/A",
          formattedAddress: manualAddress,
          lat: 0,
          long: 0,
        }),
        city: form.city,
        state: form.state,
        pinCode: form.pinCode,
        landmark: form.landmark || "",
        flatNo: [form.buildingName, form.street, form.floor, form.tower].filter(Boolean).join(", "),
        form: { ...form }, // Pass the full form for editing later
      };

      // For guest users, skip API call and just pass address data back
      if (isGuest) {
        onAddressConfirm(summaryForParent, null, deliveryAddressFull);
        showNotification("Address added successfully", "success");
        setIsSubmitting(false);
        onClose();
        return;
      }

      const payload = {
        lat:              locationSummary?.lat  ?? 0,
        long:             locationSummary?.long ?? 0,
        placeId:          locationSummary?.placeId          || "N/A",
        formattedAddress: locationSummary?.formattedAddress || manualAddress,
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
        onAddressConfirm(summaryForParent, result.data?.addressId, deliveryAddressFull);
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
    <div className="flex flex-col h-full relative">
      {locationSummary && (
        <button
          type="button"
          onClick={() => {
            setLocationSummary(null);
            setSearchQuery("");
            setSearchResults([]);
            setForm({ ...EMPTY_FORM, fullName: prefillName, mobileNumber: prefillPhone });
            setErrors({});
            initDoneRef.current = false;
            userEditedPinCode.current = false;
            if (window.google?.maps?.places?.AutocompleteSessionToken) {
              sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            }
            if (mapRef.current) {
              isProgrammaticMove.current = true;
              mapRef.current.panTo(DEFAULT_CENTER);
              mapRef.current.setZoom(12);
              setTimeout(() => { isProgrammaticMove.current = false; }, 1200);
            }
          }}
          className="absolute top-3 right-3 z-[50] bg-white/95 backdrop-blur-sm shadow-lg border border-gray-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-1.5 active:scale-95"
        >
          <i className="fa-solid fa-location-dot-slash text-[9px]" />
          Clear
        </button>
      )}

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
              {[20, 40, 60, 80].map((p) => (
                <div
                  key={`h${p}`}
                  className="absolute w-full h-px bg-gray-400"
                  style={{ top: `${p}%` }}
                />
              ))}
              {[20, 40, 60, 80].map((p) => (
                <div
                  key={`v${p}`}
                  className="absolute h-full w-px bg-gray-400"
                  style={{ left: `${p}%` }}
                />
              ))}
            </div>
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.6s infinite linear",
              }}
            />
            {/* Center loading card */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3 border border-white/40">
                <div className="w-6 h-6 border-[3px] border-brand/30 border-t-brand rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-ink leading-tight">
                    Loading map…
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    Setting up your location
                  </p>
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
            onDragStart={handleMapDragStart}
          />
        )}

        {/* Floating center pin — shown over map and skeleton */}
        {isLoaded && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
            <i className="fa-solid fa-location-dot text-4xl text-brand drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)]" />
            <div className="w-2 h-1 bg-black/40 rounded-full absolute -bottom-0.5 left-1/2 -translate-x-1/2 blur-[2px]" />
          </div>
        )}

        {/* Hint card — shown after map loads, before user sets a location */}
        {isLoaded && !locationSummary && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-[5] px-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-brand/15 px-3.5 py-2 flex items-center gap-2 max-w-xs">
              <i className="fa-solid fa-hand-pointer text-brand text-xs shrink-0" />
              <p className="text-[11px] text-gray-500 leading-snug">
                Drag the pin or search above to set location
              </p>
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
    <div className="flex flex-col pb-6" onFocus={handleFormInputFocus}>
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
            {/* Pincode — custom field with inputMode + auto-fetch */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                Pincode <span className="text-red-400">*</span>
                {isFetchingPincode && (
                  <span className="w-3 h-3 border border-brand border-t-transparent rounded-full animate-spin inline-block shrink-0" />
                )}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.pinCode}
                placeholder="6-digit"
                maxLength={6}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                  userEditedPinCode.current = true;
                  setField("pinCode")(cleaned);
                  if (cleaned.length === 6) fetchPincodeData(cleaned);
                }}
                className={`w-full border rounded-xl px-3 py-3 text-sm transition-all outline-none bg-white text-ink focus:border-brand placeholder:text-gray-300 ${
                  errors.pinCode ? "border-red-300 focus:border-red-400" : "border-gray-200"
                }`}
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
            <div>
              <FormField
                label="State"
                required
                placeholder="e.g. Karnataka"
                value={form.state}
                onChange={setField("state")}
              />
              {errors.state && (
                <p className="text-[11px] text-red-500 mt-1">{errors.state}</p>
              )}
            </div>
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
          className="w-full py-4 bg-ink text-white rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-serif text-ink text-base leading-tight">
              Set Delivery Address
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Body — flex col on mobile (map stacked above form), flex row on desktop */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Map — collapsible on mobile (h-0 = hidden), full height column on desktop */}
          <div className={`shrink-0 flex flex-col overflow-hidden md:h-full md:w-[55%] md:border-r md:border-gray-100 transition-[height] duration-300 ${mapCollapsed ? "h-0 md:h-full" : "h-[260px]"}`}>
            {MapSection}
          </div>

          {/* Form column — fills all remaining height, scrolls independently */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden md:flex-1">

            {/* Search bar — sits below map on mobile, top of right panel on desktop */}
            <div ref={searchBarRef} className="shrink-0 px-3 py-2.5 bg-white border-b border-gray-100">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  {isSearching
                    ? <div className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    : <i className="fa-solid fa-magnifying-glass text-brand text-sm" />
                  }
                </div>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search street, area or landmark…"
                  autoComplete="off"
                  className="w-full h-11 bg-surface border-2 border-brand/35 rounded-xl pl-10 pr-11 text-sm text-ink font-medium focus:border-brand focus:bg-white focus:shadow-[0_0_0_3px_rgba(223,0,36,0.12)] outline-none placeholder:text-gray-400 placeholder:font-normal transition-all"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                      className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[9px] text-gray-600" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLocate}
                      disabled={isLocating || !isLoaded}
                      title="Use my current location"
                      className="w-7 h-7 rounded-lg bg-brand/10 hover:bg-brand/20 flex items-center justify-center text-brand transition-colors disabled:opacity-40"
                    >
                      <i className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-location-crosshairs"} text-xs`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Dropdown */}
              {(searchQuery.length > 0 || isSearching) && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[260px] overflow-y-auto" style={dropdownStyle}>
                  {isSearching ? (
                    <div className="p-4 flex items-center justify-center gap-2.5 text-gray-400">
                      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="text-xs font-medium">Searching…</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item, i) => {
                      const pred = item.placePrediction;
                      const mainText = pred?.mainText?.text || pred?.text?.text || "";
                      const subText = pred?.secondaryText?.text || "";
                      const key = pred?.placeId || i;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectResult(item)}
                          className="w-full text-left px-4 py-3 active:bg-surface hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-3 group"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-brand/10 flex items-center justify-center shrink-0 transition-colors">
                            <i className="fa-solid fa-location-dot text-gray-400 group-hover:text-brand text-xs transition-colors" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-ink font-medium leading-snug group-hover:text-brand transition-colors">{mainText}</p>
                            {subText && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-1">{subText}</p>}
                          </div>
                          <i className="fa-solid fa-chevron-right text-gray-200 text-[10px] shrink-0 group-hover:text-brand transition-colors" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-5 text-center">
                      <i className="fa-solid fa-magnifying-glass text-gray-200 text-xl mb-2 block" />
                      <p className="text-sm text-gray-400 font-medium">No results found</p>
                      <p className="text-[11px] text-gray-300 mt-0.5">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile strip — tap to expand map when it's collapsed */}
            <button
              type="button"
              onClick={() => setMapCollapsed(false)}
              className={`md:hidden shrink-0 w-full flex items-center gap-2.5 px-4 py-2.5 border-b border-hair transition-all ${mapCollapsed ? "bg-surface" : "pointer-events-none opacity-0 h-0 py-0 border-0 overflow-hidden"}`}
            >
              <div className="w-6 h-6 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-map-location-dot text-brand text-[10px]" />
              </div>
              <p className="text-xs text-ink font-medium truncate flex-1">
                {locationSummary?.formattedAddress || deliveryPreview || "Tap to expand map"}
              </p>
              <span className="text-[10px] text-brand font-bold shrink-0 flex items-center gap-1 pl-2">
                Map <i className="fa-solid fa-chevron-up text-[9px]" />
              </span>
            </button>
            {/* Scrollable form */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {FormSection}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
// check action
export default GoogleAddressFormModal;
