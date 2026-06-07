import LampToggle from "../component/LampToggle";

const LAMP_ON_SOURCES = [
  "/assets/lamps/bmw-brake-on.webp",
  "/assets/lamps/bmw-brake-on.png",
  "/assets/lamps/bmw-brake-on.jpg",
  "/assets/lamps/bmw-brake-on.jpeg",
];
const LAMP_OFF_SOURCES = [
  "/assets/lamps/bmw-brake-off.webp",
  "/assets/lamps/bmw-brake-off.png",
  "/assets/lamps/bmw-brake-off.jpg",
  "/assets/lamps/bmw-brake-off.jpeg",
];

const LampDemoPage = () => {
  return (
    <div className="min-h-screen bg-[#1c3026] text-[#F5DEB3] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-light tracking-wide">
            Lamp Animation Test
          </h1>
          <p className="text-[#F5DEB3]/60 text-xs md:text-sm uppercase tracking-[0.25em] mt-2">
            BMW M Brake Disc Lamp
          </p>
        </div>

        <div className="relative max-w-[500px] aspect-square md:aspect-auto md:h-[520px] rounded-2xl overflow-hidden shadow-2xl w-full bg-[#e8e6e1]">
          <div className="w-full h-full flex items-center justify-center p-6">
            <LampToggle
              onSrc={LAMP_ON_SOURCES}
              offSrc={LAMP_OFF_SOURCES}
              alt="BMW M Brake Disc Lamp"
            />
          </div>
        </div>

        <p className="text-[#F5DEB3]/50 text-xs text-center max-w-md">
          Tap the power button to toggle the lamp on and off. The image
          crossfades and a pulsing glow halo appears in the on state.
        </p>
      </div>
    </div>
  );
};

export default LampDemoPage;
