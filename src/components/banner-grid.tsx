import { banners } from "@/data/banners";
import { BannerCard } from "./banner-card";

export function BannerGrid() {
  return (
    <section id="services">
      <h2 className="sr-only">서비스 포털</h2>
      <div className="flex flex-wrap items-start justify-center gap-x-4 gap-y-3 sm:justify-start">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} />
        ))}
      </div>
    </section>
  );
}
