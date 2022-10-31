import * as React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import { ssBrand } from "src/colors";
import Typography from "@material-ui/core/Typography";
import clsx from "clsx";
import { useNewLogo } from "components/NewLogoContext";
import NewLogo from "public/images/MissionBit_Logo_Primary_BlackRGB_NoMargin.svg";
import Image from "next/image";

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: ssBrand.mediumGrey,
    width: "100%",
    padding: theme.spacing(2, 6),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
      textAlign: "center",
    },
  },
  title: {
    fontSize: theme.typography.pxToRem(71),
    [theme.breakpoints.down("sm")]: {
      fontSize: theme.typography.pxToRem(40),
    },
  },
  extendedTitle: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  subTitle: {
    fontSize: theme.typography.pxToRem(35),
    fontWeight: theme.typography.fontWeightMedium,
    [theme.breakpoints.down("sm")]: {
      fontSize: theme.typography.pxToRem(16),
    },
  },
  withLogo: {
    paddingBottom: 6,
  },
  newLogoWrapper: {
    position: "relative",
    top: 6,
  },
}));

function logoScale(
  src: {
    readonly src: string;
    readonly width: number;
    readonly height: number;
  },
  height: number
) {
  return { src, height, width: height * (src.width / src.height) } as const;
}

export const Landing: React.FC<{ className?: string }> = ({ className }) => {
  const classes = useStyles();
  const newLogo = useNewLogo();
  return (
    <Box className={clsx(classes.root, className)}>
      <Typography
        variant="h1"
        className={clsx(classes.title, { [classes.withLogo]: newLogo })}
      >
        Donate
        {newLogo ? (
          <>
            {" "}
            to{" "}
            <span className={classes.newLogoWrapper}>
              <Image {...logoScale(NewLogo, 60)} />
            </span>
          </>
        ) : (
          <span className={classes.extendedTitle}> to Mission Bit</span>
        )}
      </Typography>
      <Typography className={classes.subTitle} color="textSecondary">
        Help us inspire youth of color to explore the world of STEM.
      </Typography>
    </Box>
  );
};

export default Landing;
