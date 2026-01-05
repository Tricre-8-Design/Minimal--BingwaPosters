import { BackgroundWrapper } from "@/components/ui/background-wrapper"

export default function LoadingScreen() {
  return (
    <BackgroundWrapper className="flex flex-col items-center justify-center">
      {/* Main Content */}
      <div className="z-10 flex flex-col items-center gap-6">
        {/* Logo with breathing animation */}
        <div className="relative animate-breathing" style={{ animationDuration: '1.2s' }}>
          <img 
            src="/logo.svg" 
            alt="Bingwa Logo" 
            className="w-[72px] md:w-24 h-auto drop-shadow-lg"
          />
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-2 text-center animate-fadeUp">
          <h2 className="text-white font-medium text-lg md:text-xl drop-shadow-md font-space">
            Preparing your posters…
          </h2>
          <p className="text-white/80 text-sm md:text-base font-inter">
            Bingwa style, almost ready
          </p>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
