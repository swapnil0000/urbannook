import { useState, useRef, useEffect, useCallback } from "react";
import {
  useSearchAddressMutation,
  useGetAddressSuggestionsMutation,
  useCreateAddressMutation,
} from "../store/api/userApi";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_COORDS = { lat: 28.7041, long: 77.1025 }; // Delhi fallback

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

// ─── Sub-component: AddressTypeChips ─────────────────────────────────────────

const AddressTypeChips = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {ADDRESS_TYPES.map(({ label, icon }) => (
      <button
        key={label}
        type="button"
        onClick={() => onChange(label)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
          value === label
            ? "bg-[#2e443c] text-white border-[#2e443c]"
            : "bg-white text-gray-600 border-gray-200 hover:border-[#a89068] hover:text-[#a89068]"
        }`}
      >
        <i className={`fa-solid ${icon} text-[10px]`}></i>
        {label}
      </button>
    ))}
  </div>
);

// ─── Sub-component: FormField ────────────────────────────────────────────────

const FormField = ({ label, required, placeholder, value, onChange, readOnly, icon, hint }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <i className={`fa-solid ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs`}></i>
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full border rounded-xl px-3 py-3 text-sm transition-all outline-none ${
          icon ? "pl-9" : ""
        } ${
          readOnly
            ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-white border-gray-200 text-[#2e443c] focus:border-[#a89068] placeholder:text-gray-300"
        }`}
      />
    </div>
    {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

// ─── Sub-component: LocationSummaryCard ──────────────────────────────────────

const LocationSummaryCard = ({ locationSummary, deliveryAddressFull, onChangePinClick }) => {
  if (!locationSummary) return null;
  return (
    <div className="m-3 bg-white rounded-xl border border-[#a89068]/30 p-3 shadow-sm">
      {/* <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#a89068]/10 flex items-center justify-center shrink-0 mt-0.5">
            <i className="fa-solid fa-location-dot text-[#a89068] text-xs"></i>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-0.5">
              Delivering your order to
            </p>
            <p className="text-sm font-semibold text-[#2e443c] leading-tight truncate">
              {locationSummary.name || locationSummary.locality || locationSummary.formattedAddress?.split(",")[0] || locationSummary.city}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {[locationSummary.city, locationSummary.state, locationSummary.pinCode]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onChangePinClick}
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#a89068] border border-[#a89068]/30 px-2 py-1 rounded-lg hover:bg-[#a89068]/10 transition-colors"
        >
          Change
        </button>
      </div> */}

      {/* Full delivery address preview — shows what will be saved */}
      {deliveryAddressFull && (
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-[#a89068]/10 flex items-center justify-center shrink-0 mt-0.5">
            <i className="fa-solid fa-location-dot text-[#a89068] text-xs"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89068] mb-0.5">
              Delivering your order to
            </p>
            <p className="text-xs text-[#2e443c] leading-snug break-words">
              {deliveryAddressFull}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AddressFormModal = ({
  isOpen,
  onClose,
  onAddressConfirm,
  showNotification,
  prefillName = "",
  prefillPhone = "",
  defaultCoords = null, // { lat, long } — pass last saved address coords from parent
}) => {
  // ── Map state ──────────────────────────────────────────────────────────────
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const searchDebounce = useRef(null);
  const mapMoveDebounce = useRef(null);
  const isProgrammaticMove = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSummary, setLocationSummary] = useState(null);
  // locationSummary: { placeId, formattedAddress, name, locality, city, state, pinCode }

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── API mutations ──────────────────────────────────────────────────────────
  const [searchAddress] = useSearchAddressMutation();
  const [getAddressSuggestions] = useGetAddressSuggestionsMutation();
  const [createAddress] = useCreateAddressMutation();

  // ── Pre-fill contact from parent ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setForm(f => ({
        ...f,
        fullName: f.fullName || prefillName,
        mobileNumber: f.mobileNumber || prefillPhone,
      }));
    }
  }, [isOpen, prefillName, prefillPhone]);

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setForm({ ...EMPTY_FORM, fullName: prefillName, mobileNumber: prefillPhone });
      setLocationSummary(null);
      setSearchQuery("");
      setSearchResults([]);
      setErrors({});
    }
  }, [isOpen]);

  // ── OpenLayers map init ───────────────────────────────────────────────────
  const initMap = useCallback(async (lon, lat) => {
    const [
      { default: Map },
      { default: View },
      { default: TileLayer },
      { default: OSM },
      { fromLonLat, toLonLat },
    ] = await Promise.all([
      import("ol/Map"),
      import("ol/View"),
      import("ol/layer/Tile"),
      import("ol/source/OSM"),
      import("ol/proj"),
    ]);

    import("ol/ol.css");

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
        mapRef.current = null;
      }
      if (!mapElement.current) return;

      mapRef.current = new Map({
        target: mapElement.current,
        layers: [new TileLayer({ source: new OSM() })],
        view: new View({ center: fromLonLat([lon, lat]), zoom: 17 }),
      });

      mapRef.current.on("moveend", () => {
        if (isProgrammaticMove.current) return;
        if (mapMoveDebounce.current) clearTimeout(mapMoveDebounce.current);
        mapMoveDebounce.current = setTimeout(() => {
          const center = mapRef.current.getView().getCenter();
          const [lng, lt] = toLonLat(center);
          reverseGeocode(lt, lng);
        }, 800);
      });

      setTimeout(() => mapRef.current?.updateSize(), 100);
    }, 150);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Resolve starting coords: defaultCoords prop → silent geolocation → Delhi fallback
    const resolveStartCoords = () =>
      new Promise((resolve) => {
        if (defaultCoords) return resolve(defaultCoords);
        if (!navigator.geolocation) return resolve(DEFAULT_COORDS);
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ lat: coords.latitude, long: coords.longitude }),
          () => resolve(DEFAULT_COORDS),
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 120000 },
        );
      });

    resolveStartCoords().then((start) => {
      initMap(start.long, start.lat);
      // Pre-populate form fields if we have a real starting location (not Delhi fallback)
      if (start !== DEFAULT_COORDS) {
        reverseGeocode(start.lat, start.long);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
        mapRef.current = null;
      }
      if (mapMoveDebounce.current) clearTimeout(mapMoveDebounce.current);
    };
  }, [isOpen, initMap]);

  // ── Reverse geocode (map pin → location summary) ─────────────────────────
  const reverseGeocode = async (lat, lng) => {
    try {
      const result = await getAddressSuggestions({ lat, long: lng }).unwrap();
      if (result.success && result.data?.length > 0) {
        const top = result.data[0];
        const displayName =
          top.name || top.locality || top.formattedAddress?.split(",")[0] || top.city || "";
        setLocationSummary({
          placeId: top.placeId,
          formattedAddress: top.formattedAddress,
          name: displayName,
          locality: top.locality || "",
          city: top.city,
          state: top.state,
          pinCode: top.pinCode,
          lat,
          long: lng,
        });
        setForm(f => ({
          ...f,
          city:    top.city    || f.city,
          state:   top.state   || f.state,
          pinCode: top.pinCode ? String(top.pinCode) : f.pinCode,
        }));
      }
    } catch (err) {
      console.error("Reverse geocode error:", err);
    }
  };

  // ── Search bar ────────────────────────────────────────────────────────────
  const handleSearch = (val) => {
    setSearchQuery(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (val.length < 3) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const result = await searchAddress(val).unwrap();
        if (result.success) setSearchResults(result.data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 700);
  };

  const handleSelectResult = async (item) => {
    try {
      const { fromLonLat } = await import("ol/proj");
      const lat = item?.geometry?.location?.lat;
      const lng = item?.geometry?.location?.lng;
      if (lat == null || lng == null) return;

      // Block moveend during animation; safety timeout resets flag even if callback never fires
      isProgrammaticMove.current = true;
      const ANIM_DURATION = 800;
      const safetyReset = setTimeout(() => { isProgrammaticMove.current = false; }, ANIM_DURATION + 500);
      mapRef.current?.getView()?.animate(
        { center: fromLonLat([lng, lat]), zoom: 17, duration: ANIM_DURATION },
        () => { clearTimeout(safetyReset); isProgrammaticMove.current = false; },
      );

      setSearchResults([]);
      setSearchQuery("");

      const mainText      = String(item?.structured_formatting?.main_text || item?.description || "").trim();
      const secondaryFull = String(item?.structured_formatting?.secondary_text || "").trim();
      // secondary_text: "Anka Street, Parlakhemundi, Odisha" — take only first segment as street hint
      const streetHint    = secondaryFull.split(",")[0]?.trim() || "";
      const placeId       = item?.place_id || "N/A";
      const formattedAddr = item?.description || mainText || secondaryFull || "Unknown location";

      // Set location summary from search result immediately (so card shows at once)
      setLocationSummary({
        placeId,
        formattedAddress: formattedAddr,
        name: mainText,
        locality: secondaryFull,
        city: "",
        state: "",
        pinCode: "",
        lat,
        long: lng,
      });

      // Fill building + street from search result — all fields stay editable
      setForm(f => ({
        ...f,
        buildingName: mainText || f.buildingName,
        street: streetHint || f.street,
      }));

      // Enrich city / state / pinCode via reverse geocode
      try {
        const result = await getAddressSuggestions({ lat, long: lng }).unwrap();
        if (result?.success && result?.data?.length > 0) {
          const top = result.data[0];
          setLocationSummary(prev => ({
            ...prev,
            city:    top?.city    || prev.city,
            state:   top?.state   || prev.state,
            pinCode: top?.pinCode || prev.pinCode,
          }));
          setForm(f => ({
            ...f,
            city:    top?.city    || f.city,
            state:   top?.state   || f.state,
            pinCode: top?.pinCode ? String(top.pinCode) : f.pinCode,
          }));
        }
      } catch (enrichErr) {
        // Reverse geocode failed — city/state/pinCode stay empty, user fills manually
        console.warn("[AddressForm] reverse geocode enrich failed:", enrichErr?.message);
      }
    } catch (err) {
      console.error("[AddressForm] handleSelectResult crashed:", err);
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  // ── "Go to current location" ──────────────────────────────────────────────
  const handleLocate = () => {
    if (!navigator.geolocation) {
      showNotification("Geolocation not supported by your browser", "error");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { fromLonLat } = await import("ol/proj");
        isProgrammaticMove.current = true;
        const safetyReset = setTimeout(() => { isProgrammaticMove.current = false; }, 1500);
        mapRef.current?.getView()?.animate(
          { center: fromLonLat([coords.longitude, coords.latitude]), zoom: 17, duration: 1000 },
          () => { clearTimeout(safetyReset); isProgrammaticMove.current = false; },
        );
        await reverseGeocode(coords.latitude, coords.longitude);
        setIsLocating(false);
      },
      () => {
        showNotification("Location access denied", "error");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // ── Form field updater ────────────────────────────────────────────────────
  const setField = (key) => (val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!locationSummary) errs.location = "Please pin your location on the map first";
    if (!form.pinCode.trim()) errs.pinCode = "Pincode is required";
    if (!form.city.trim()) errs.city = "City / District is required";
    if (!form.buildingName.trim()) errs.buildingName = "House No. / Building is required";
    if (!form.street.trim()) errs.street = "Street / Colony is required";
    if (!form.fullName.trim()) errs.fullName = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      if (!locationSummary) {
        showNotification("Please pin your delivery location on the map", "error");
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        lat: locationSummary.lat,
        long: locationSummary.long,
        placeId: locationSummary.placeId,
        formattedAddress: locationSummary.formattedAddress,
        city: form.city,
        state: form.state,
        pinCode: form.pinCode,
        addressType: form.addressType,
        landmark: form.landmark,
        // legacy field: concatenate for backward compat
        flatOrFloorNumber: [form.buildingName, form.street, form.floor, form.tower].filter(Boolean).join(", "),
        // v2 fields
        buildingName: form.buildingName,
        street: form.street,
        floor: form.floor,
        tower: form.tower,
        fullName: form.fullName,
        mobileNumber: form.mobileNumber,
      };

      const result = await createAddress(payload).unwrap();
      if (result.success) {
        // Build deliveryAddressFull same as the service does — pass to parent for display
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
      const msg = err.data?.message || "Failed to save address";
      if (err.status === 400 && msg.includes("5")) {
        showNotification("Maximum 5 addresses allowed. Please delete one first.", "error");
      } else {
        showNotification(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ─── Map Section JSX ───────────────────────────────────────────────────────
  const MapSection = (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 bg-white border-b border-gray-100 relative z-20 shrink-0">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs z-10"></i>
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
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {(searchQuery.length > 0 || isSearching) && (
          <div className="absolute left-3 right-3 top-[105%] bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-[220px] overflow-y-auto">
            {isSearching ? (
              <div className="p-5 flex items-center justify-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3 group"
                >
                  <i className="fa-solid fa-location-dot text-gray-300 group-hover:text-[#a89068] text-xs mt-1 shrink-0 transition-colors"></i>
                  <div className="min-w-0">
                    <p className="text-sm text-[#2e443c] font-medium truncate group-hover:text-[#a89068] transition-colors">
                      {item.structured_formatting?.main_text}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {item.structured_formatting?.secondary_text}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-400">
                No results for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0 bg-gray-100">
        <div
          ref={mapElement}
          className="w-full h-full"
          style={{ touchAction: "pan-x pan-y" }}
        />

        {/* Center pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
          <i className="fa-solid fa-location-dot text-4xl text-[#a89068] drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)]"></i>
          <div className="w-2 h-1 bg-black/40 rounded-full absolute -bottom-0.5 left-1/2 -translate-x-1/2 blur-[2px]"></div>
        </div>

        {/* "Go to current location" FAB */}
        <button
          type="button"
          onClick={handleLocate}
          disabled={isLocating}
          title="Go to current location"
          className="absolute bottom-4 right-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-[#a89068] hover:bg-[#a89068] hover:text-white transition-all disabled:opacity-60 border border-gray-200"
        >
          <i className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-location-crosshairs"} text-sm`}></i>
        </button>

        {/* No location yet hint */}
        {!locationSummary && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] px-8">
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-white/30 text-center shadow-lg">
              <i className="fa-solid fa-hand-pointer text-xl text-[#a89068] mb-2 animate-bounce"></i>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#a89068] mb-1">Drag to pinpoint</p>
              <p className="text-xs text-gray-500">Move the map to set your exact delivery location</p>
            </div>
          </div>
        )}
      </div>

      {/* Location summary card */}
      <LocationSummaryCard
        locationSummary={locationSummary}
        deliveryAddressFull={
          [form.buildingName, form.street, form.floor, form.tower,
           form.landmark ? `Near ${form.landmark}` : "",
           form.city, form.state, form.pinCode]
            .filter(Boolean).join(", ") || null
        }
        onChangePinClick={() => setLocationSummary(null)}
      />

    </div>
  );

  // ─── Form Section JSX ──────────────────────────────────────────────────────
  const FormSection = (
    <div className="flex flex-col md:h-full md:overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* Location error */}
        {errors.location && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <i className="fa-solid fa-triangle-exclamation text-red-400 text-xs shrink-0"></i>
            <p className="text-xs text-red-600">{errors.location}</p>
          </div>
        )}

        {/* Auto-filled area fields — editable by user */}
        <div className="space-y-3">
          {/* <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-map-pin text-[#a89068] text-xs"></i>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a89068]">
              Area — auto-filled from map pin, editable
            </p>
            {locationSummary && (
              <button
                type="button"
                onClick={() => { setLocationSummary(null); setForm(f => ({ ...f, city: "", state: "", pinCode: "" })); }}
                className="ml-auto text-[10px] text-[#a89068] underline underline-offset-2"
              >
                Reset pin
              </button>
            )}
          </div> */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FormField
                label="Pincode"
                required
                placeholder="6-digit pincode"
                value={form.pinCode}
                onChange={setField("pinCode")}
                // icon="fa-hashtag"
              />
              {errors.pinCode && (
                <p className="text-[11px] text-red-500 mt-1">
                  {errors.pinCode}
                </p>
              )}
            </div>
            <div>
              <FormField
                label="City / District"
                required
                placeholder="e.g. Bengaluru"
                value={form.city}
                onChange={setField("city")}
                // icon="fa-city"
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
              // icon="fa-map"
            />
          </div>
          {/* <FormField
            label="State"
            placeholder="e.g. Karnataka"
            value={form.state}
            onChange={setField("state")}
            icon="fa-map"
          /> */}
        </div>

        <div className="h-px bg-gray-100"></div>

        {/* Address type */}
        {/* <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            Address Type
          </p>
          <AddressTypeChips
            value={form.addressType}
            onChange={setField("addressType")}
          />
        </div> */}

        {/* Specific location inputs */}
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
            <p className="text-[11px] text-red-500 -mt-2">
              {errors.buildingName}
            </p>
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
            label="Nearby landmark"
            placeholder="e.g. Near metro station"
            value={form.landmark}
            onChange={setField("landmark")}
            icon="fa-map-pin"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">
            Your delivery contact
          </p>
          <div className="flex-1 h-px bg-gray-100"></div>
        </div>

        {/* Contact details — side by side */}
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
              <div className="w-4 h-4 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk text-sm"></i>
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

        {/* ── Modal Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-serif text-[#2e443c] text-lg leading-tight">Set Delivery Address</h3>
              <p className="text-[10px] text-[#a89068] uppercase tracking-widest font-bold mt-0.5">
                Pin your location, then fill in the details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        {/* Mobile: single column scroll (compact map + form below) */}
        {/* Desktop: side-by-side (map left 55%, form right) */}
        {/* Mobile: one single scrollable column — map (200px) then form flows below   */}
        {/* Desktop: side-by-side, each col scrolls independently                      */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:flex md:flex-row">

          {/* Map */}
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

export default AddressFormModal;
