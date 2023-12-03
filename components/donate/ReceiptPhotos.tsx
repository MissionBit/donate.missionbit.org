import * as React from "react";
import clsx from "clsx";
import Image from "next/legacy/image";
import styles from "./ReceiptPhotos.module.scss";

function loadPhoto(postfix: string, alt: string) {
  return {
    alt,
    src: require(
      /* webpackInclude: /\.jpg$/ */ `public/images/donate/donate-receipt-${postfix}.jpg`,
    ).default,
  };
}

const PHOTOS = {
  "1": loadPhoto("1", "Mission Bit Team"),
  "2": loadPhoto("2", "Students at Demo Day"),
  "3": loadPhoto("3", "Family at Demo Day"),
} as const;

export const Photo: React.FC<{
  photo: keyof typeof PHOTOS;
}> = ({ photo }) => {
  const { alt, src } = PHOTOS[photo];
  return <Image src={src} alt={alt} loading="eager" />;
};

export const ReceiptPhotos: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <section className={clsx(className, styles.root)}>
      <Photo photo="1" />
      <Photo photo="2" />
      <Photo photo="3" />
    </section>
  );
};

export default ReceiptPhotos;
