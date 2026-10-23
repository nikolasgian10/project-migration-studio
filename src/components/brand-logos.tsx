import mahleLogo from "@/assets/mahle-logo.png";
import qdasIcon from "@/assets/qdas-icon.png";

/**
 * Partner marks shown in the page header: the Q-DAS application icon and the
 * MAHLE wordmark. Both source files carry their own dark navy background, so
 * they are framed as tiles to read as intentional on the navy header band.
 */
export function BrandLogos({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={qdasIcon}
        alt="Q-DAS"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-white/20"
      />
      <span className="h-6 w-px shrink-0 bg-white/25" aria-hidden="true" />
      <img
        src={mahleLogo}
        alt="MAHLE"
        width={128}
        height={32}
        className="h-8 w-auto shrink-0 rounded-md ring-1 ring-white/20"
      />
    </div>
  );
}
