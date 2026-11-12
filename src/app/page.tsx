import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { SixMoodsSection } from "@/components/SixMoodsSection";
import { TryTheLookSection } from "@/components/TryTheLookSection";
import { PickASilkSection } from "@/components/PickASilkSection";
import { TheRackSection } from "@/components/TheRackSection";
import { MuseFilmSection } from "@/components/MuseFilmSection";
import { MuseReelsSection } from "@/components/MuseReelsSection";
import { BridalSection } from "@/components/BridalSection";
import { AccountLink, AccountLinkLoader } from "@/components/AccountLink";
import { FeaturedSection, FeaturedSkeleton, PromiseMarquee } from "@/components/FeaturedSection";
import { Reveal } from "@/components/Reveal";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#12231a]">
      <Navbar
        accountSlot={
          <Suspense fallback={<AccountLink user={null} />}>
            <AccountLinkLoader />
          </Suspense>
        }
      />
      <HeroSection />
      <PromiseMarquee />
      <Reveal y={40}><SixMoodsSection /></Reveal>
      <Reveal y={40}><TryTheLookSection /></Reveal>
      <Reveal y={40}><PickASilkSection /></Reveal>
      <Suspense fallback={<FeaturedSkeleton />}>
        <FeaturedSection />
      </Suspense>
      <Reveal y={40}><TheRackSection /></Reveal>
      <Reveal y={40}><MuseFilmSection /></Reveal>
      <Reveal y={40}><MuseReelsSection /></Reveal>
      <Reveal y={40}><BridalSection /></Reveal>
      <Footer />
    </main>
  );
}
