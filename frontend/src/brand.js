import { getConfig } from "./config";
import logoDarkBackground from "./assets/brand/logo-dark-bg.svg";
import logoLightBackground from "./assets/brand/logo-light-bg.svg";
import symbol from "./assets/brand/symbol.svg";

// Single place for the product identity. The product name is still to be
// decided, so it can be changed with VITE_BRAND_NAME without touching code.
const brand = {
  name: getConfig("VITE_BRAND_NAME", "Cerqueira Labs"),
  logos: {
    onDark: logoDarkBackground,
    onLight: logoLightBackground,
    symbol,
  },
};

export const getLogoFor = (paletteType) =>
  paletteType === "dark" ? brand.logos.onDark : brand.logos.onLight;

export default brand;
