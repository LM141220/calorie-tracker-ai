import Image from "next/image";

type BrandMarkProps = {
  className: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      <Image
        alt=""
        className="object-contain"
        fill
        priority
        sizes="48px"
        src="/icons/lumo-logo.png"
      />
    </span>
  );
}
